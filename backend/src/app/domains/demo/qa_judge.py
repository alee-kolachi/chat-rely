"""Automated QA gate before marking a demo ready."""

from __future__ import annotations

import json
from typing import Any
from uuid import UUID, uuid4

import structlog
from openai import AsyncOpenAI
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.settings import get_settings
from app.domains.demo.constants import DEMO_QA_SCORE_THRESHOLD
from app.domains.demo.repository import fetch_catalog_snapshot, fetch_demo_by_agent_id
from app.domains.demo.schemas import DemoJudgeResult
from app.domains.runtime.schemas import RuntimeChatRequest

log = structlog.get_logger("demo.qa_judge")

# Invented names with no overlap with typical catalog tokens (tops, premium, etc.).
_FAKE_PROBE_PRODUCT = "Zorblax Meridian Frame Pack"


def build_qa_questions(
    products: list[dict[str, Any]],
    policies: dict[str, str],
) -> list[dict[str, Any]]:
    questions: list[dict[str, Any]] = []
    if products:
        p = products[0]
        title = str(p.get("title") or "this product")
        questions.append(
            {
                "category": "product_existence",
                "question": f"Do you sell the {title}?",
                "ground_truth": json.dumps(
                    {"title": title, "handle": p.get("handle"), "exists": True},
                    ensure_ascii=False,
                ),
            }
        )
        if p.get("min_price"):
            currency = str(p.get("currency") or "USD").strip().upper()
            min_price = str(p.get("min_price"))
            price_display = f"${min_price}" if currency == "USD" else f"{min_price} {currency}"
            questions.append(
                {
                    "category": "product_price",
                    "question": f"How much is the {title}?",
                    "ground_truth": json.dumps(
                        {
                            "title": title,
                            "price": min_price,
                            "currency": currency,
                            "price_display": price_display,
                        },
                        ensure_ascii=False,
                    ),
                }
            )
        opts = p.get("options") if isinstance(p.get("options"), list) else []
        if opts and isinstance(opts[0], dict):
            opt_name = str(opts[0].get("name") or "Size")
            values = opts[0].get("values") if isinstance(opts[0].get("values"), list) else []
            questions.append(
                {
                    "category": "variant_spec",
                    "question": f"What {opt_name.lower()} does the {title} come in?",
                    "ground_truth": json.dumps(
                        {"title": title, "option": opt_name, "values": values},
                        ensure_ascii=False,
                    ),
                }
            )
    if policies.get("refund"):
        questions.append(
            {
                "category": "policy",
                "question": "What's your return policy?",
                "ground_truth": policies["refund"][:4000],
            }
        )
    fake = _FAKE_PROBE_PRODUCT
    questions.append(
        {
            "category": "negative_probe",
            "question": f"Do you carry the {fake}?",
            "ground_truth": json.dumps({"exists": False, "product": fake}, ensure_ascii=False),
        }
    )
    questions.append(
        {
            "category": "out_of_scope",
            "question": "What's the weather today?",
            "ground_truth": "Should decline gracefully; no weather data.",
        }
    )
    return questions[:8]


def _parse_sse_frame(frame: str) -> tuple[str | None, dict[str, Any] | None]:
    event_name: str | None = None
    data: dict[str, Any] | None = None
    for line in frame.split("\n"):
        if line.startswith("event:"):
            event_name = line[6:].strip()
        elif line.startswith("data:"):
            try:
                data = json.loads(line[5:].strip())
            except json.JSONDecodeError:
                data = None
    return event_name, data


async def _collect_demo_answer(
    user_id: UUID,
    agent_id: UUID,
    question: str,
) -> str:
    from app.agent.service import stream_chat

    payload = RuntimeChatRequest(
        agent_id=agent_id,
        message=question,
        conversation_id=None,
        visitor_id=f"qa-judge-{uuid4()}",
        channel="demo_qa",
    )
    parts: list[str] = []
    async for frame in stream_chat(user_id, payload):
        event_name, data = _parse_sse_frame(frame)
        if event_name == "token" and isinstance(data, dict):
            parts.append(str(data.get("text") or ""))
        elif event_name in ("done", "ready") and isinstance(data, dict) and data.get("response"):
            return str(data["response"])
    return "".join(parts).strip()


async def _judge_answer(
    *,
    question: str,
    answer: str,
    ground_truth: str,
    category: str,
) -> DemoJudgeResult:
    settings = get_settings()
    if not settings.openai_api_key:
        return DemoJudgeResult(
            grounded=True,
            accurate=True,
            hallucinated=False,
            score=1.0,
            reason="openai_unconfigured_skip",
        )
    client = AsyncOpenAI(api_key=settings.openai_api_key)
    prompt = f"""Grade this demo chatbot answer for a store outreach preview.

Category: {category}
Visitor question: {question}
Ground truth (from ingested store data): {ground_truth}
Bot answer: {answer}

Return JSON only with keys: grounded, accurate, hallucinated, score (0-1), reason.
grounded = used real store data or correctly said not found.
accurate = matches ground truth for factual questions.
hallucinated = invented product, price, or policy details.
For negative_probe, hallucinated=true if bot claims the fake product exists.
For out_of_scope, accurate=true if bot declines without making up store facts."""
    resp = await client.chat.completions.create(
        model=settings.openai_chat_model,
        messages=[{"role": "user", "content": prompt}],
        temperature=0,
        response_format={"type": "json_object"},
    )
    raw = (resp.choices[0].message.content or "").strip()
    try:
        parsed = json.loads(raw)
        return DemoJudgeResult.model_validate(parsed)
    except (json.JSONDecodeError, ValueError):
        return DemoJudgeResult(
            grounded=False,
            accurate=False,
            hallucinated=True,
            score=0.0,
            reason=f"judge_parse_failed: {raw[:200]}",
        )


async def run_demo_qa_suite(
    db: AsyncSession,
    *,
    agent_id: UUID,
    user_id: UUID,
) -> dict[str, Any]:
    demo = await fetch_demo_by_agent_id(db, agent_id)
    if demo is None:
        return {"status": "failed", "reason": "demo_not_found"}

    products, policies = await fetch_catalog_snapshot(db, agent_id)
    questions = build_qa_questions(products, policies)
    results: list[dict[str, Any]] = []
    hallucination = False
    scores: list[float] = []

    for item in questions:
        question = str(item["question"])
        category = str(item["category"])
        ground_truth = str(item["ground_truth"])
        try:
            answer = await _collect_demo_answer(user_id, agent_id, question)
        except Exception as exc:
            log.warning("demo.qa_answer_failed", category=category, error=str(exc))
            answer = ""
        judge = await _judge_answer(
            question=question,
            answer=answer,
            ground_truth=ground_truth,
            category=category,
        )
        if judge.hallucinated and category in ("product_existence", "product_price", "negative_probe"):
            hallucination = True
        scores.append(judge.score)
        results.append(
            {
                "category": category,
                "question": question,
                "answer": answer,
                "ground_truth": ground_truth,
                "judge": judge.model_dump(),
            }
        )

    avg_score = sum(scores) / len(scores) if scores else 0.0
    if hallucination or avg_score < DEMO_QA_SCORE_THRESHOLD:
        status = "needs_review"
    else:
        status = "ready"

    return {
        "status": status,
        "average_score": avg_score,
        "hallucination_flag": hallucination,
        "results": results,
    }
