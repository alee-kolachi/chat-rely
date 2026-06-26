"""Demo chat: route once (direct / rag / products), then run only that path."""

from __future__ import annotations

import json
import time
from collections.abc import AsyncIterator
from typing import Any
from uuid import UUID

import structlog

from app.agent.escalation import (
    EscalationTurnContext,
    build_escalation_info,
    visitor_empty_reply_fallback,
)
from app.agent.graph import stream_chat_graph
from app.agent.messages import build_turn_messages, slice_history_for_current_turn
from app.agent.product_cards import shorten_answer_for_product_cards
from app.agent.streaming import format_sse, stream_llm_sse
from app.agent.turn_intent import route_turn_intent
from app.domains.demo.demo_chat_prompts import (
    build_demo_kb_system_appendix,
    build_demo_kb_user_prompt,
)
from app.domains.runtime.prompts.system import (
    resolve_agent_type_prompt,
    resolve_brand_instructions,
    resolve_language_instruction,
    resolve_tone_instruction,
)
from app.domains.runtime.prompts.user import build_chitchat_user_prompt
from app.domains.runtime.service import response_used_fallback

log = structlog.get_logger("demo.chat_turn")


def _merge_rag_chunks(
    vector_chunks: list[dict[str, Any]],
    policy_chunks: list[dict[str, Any]],
    *,
    limit: int,
) -> list[dict[str, Any]]:
    seen: set[str] = set()
    merged: list[dict[str, Any]] = []
    for chunk in policy_chunks + vector_chunks:
        content = str(chunk.get("content") or "").strip()
        if not content or content in seen:
            continue
        seen.add(content)
        merged.append(chunk)
        if len(merged) >= limit:
            break
    return merged


async def _load_demo_rag_chunks(
    *,
    agent_id: UUID,
    user_message: str,
    maybe_retrieve_chunks,
    rag_prompt_chunk_count: int,
    min_similarity: float,
) -> tuple[list[dict[str, Any]], dict[str, Any], str]:
    from app.db.session import get_session_factory
    from app.domains.demo.demo_catalog_grounding import policy_grounding_chunks
    from app.domains.demo.repository import fetch_demo_policies

    vector_chunks, rag_billing, kb_reason = await maybe_retrieve_chunks(
        agent_id=agent_id,
        user_message=user_message,
        min_similarity=min_similarity,
        budget_seconds=8.0,
        meta_timing={},
    )
    async with get_session_factory()() as db:
        policies = await fetch_demo_policies(db, agent_id)
    policy_chunks = policy_grounding_chunks(policies, user_message, limit=2)
    merged = _merge_rag_chunks(
        vector_chunks,
        policy_chunks,
        limit=rag_prompt_chunk_count,
    )
    return merged, rag_billing, kb_reason


async def stream_demo_routed_turn(
    *,
    user_id: UUID,
    agent_id: UUID,
    conversation_id: UUID,
    user_message: str,
    config: dict[str, Any],
    history_rows: list[Any],
    history_limit: int,
    turn_started_at: float,
    maybe_retrieve_chunks,
    build_context_block,
    finalize_turn_persist,
    log_retrieval_trace,
    build_retrieval_expanded_query,
    rag_prompt_chunk_count: int,
) -> AsyncIterator[str]:
    t_turn = turn_started_at
    first_token_ms: float | None = None

    recent_user = [
        str(getattr(r, "content", "") or "").strip()
        for r in history_rows
        if str(getattr(r, "role", "") or "") == "user"
    ]
    recent_user = [m for m in recent_user if m][-2:]

    decision = await route_turn_intent(user_message, recent_user_messages=recent_user)
    log.info(
        "demo.turn_route",
        agent_id=str(agent_id),
        route=decision.route,
        reason=decision.reason,
    )

    model = str(config.get("model") or "gpt-4o-mini")
    creativity = float(config.get("creativity") or 0.0)
    fallback_message = str(config.get("fallback_message") or "")
    agent_type = config.get("agent_type")
    system_prompt = resolve_agent_type_prompt(agent_type, config.get("system_prompt") or "")
    for block in (
        resolve_tone_instruction(str(config.get("tone") or "")),
        resolve_brand_instructions(config.get("tone_description")),
        resolve_language_instruction(config.get("language")),
    ):
        if block:
            system_prompt = f"{system_prompt}\n\n{block}".strip()

    chunks: list[dict[str, Any]] = []
    rag_billing: dict[str, Any] = {}
    retrieval_count = 0
    retrieval_preview: list[dict[str, Any]] = []
    tools_invoked: list[str] = []
    tools_bound_count = 0
    stream_products: list[dict[str, Any]] = []
    done_payload: dict[str, Any] = {}
    streamed_answer_parts: list[str] = []

    history = slice_history_for_current_turn(
        history_rows,
        current_user_content=user_message,
        max_window_messages=history_limit,
    )

    if decision.route == "rag":
        min_sim = float(config.get("min_retrieval_similarity") or 0.52)
        chunks, rag_billing, _kb_reason = await _load_demo_rag_chunks(
            agent_id=agent_id,
            user_message=user_message,
            maybe_retrieve_chunks=maybe_retrieve_chunks,
            rag_prompt_chunk_count=rag_prompt_chunk_count,
            min_similarity=min_sim,
        )
        retrieval_count = len(chunks)
        retrieval_preview = [
            {
                "knowledge_source_id": c.get("knowledge_source_id"),
                "similarity": c.get("similarity"),
                "snippet": str(c.get("content") or "")[:240],
            }
            for c in chunks[:5]
        ]
        log_retrieval_trace(
            conversation_id=conversation_id,
            agent_id=agent_id,
            user_message=user_message,
            expanded_query=build_retrieval_expanded_query(user_message),
            min_similarity=min_sim,
            chunks=chunks,
            prompt_chunks=chunks[:rag_prompt_chunk_count],
            kb_retrieval_skipped=False,
            rag_fallback_mode=str(rag_billing.get("rag_fallback_mode") or "threshold"),
            retrieved_count=int(rag_billing.get("retrieved_count") or len(chunks)),
            passed_threshold_count=int(rag_billing.get("passed_threshold_count") or 0),
        )

    grounded_user = user_message
    context_block = ""
    if decision.route == "direct":
        grounded_user = build_chitchat_user_prompt(user_message)
    elif decision.route == "rag":
        if chunks:
            context_block = build_context_block(chunks, user_message=user_message)
            system_prompt = f"{system_prompt}\n\n{build_demo_kb_system_appendix()}".strip()
            grounded_user = build_demo_kb_user_prompt(context_block, user_message)
        else:
            grounded_user = build_chitchat_user_prompt(user_message)

    stream_fallback = fallback_message
    if decision.route == "rag" and chunks:
        stream_fallback = ""

    lc_messages = build_turn_messages(
        system_content=system_prompt,
        history_without_current_user=history,
        grounded_user_content=grounded_user,
    )

    esc_ctx = EscalationTurnContext(
        user_id=user_id,
        agent_id=agent_id,
        conversation_id=conversation_id,
        user_message=user_message,
        visitor_email=None,
        visitor_name=None,
        esc_cfg={},
    )

    if decision.route == "products":
        from app.domains.demo.demo_tools_loader import load_demo_tools_fast

        async with __import__(
            "app.db.session", fromlist=["get_session_factory"]
        ).get_session_factory()() as db:
            tool_list, _timings, _connected = await load_demo_tools_fast(
                db,
                agent_id=agent_id,
                customer_message=user_message,
            )
        tools_bound_count = len(tool_list)
        async for ev in stream_chat_graph(
            messages=lc_messages,
            model=model,
            temperature=creativity,
            fallback_message=fallback_message,
            escalation_enabled=False,
            bound_tools=tool_list,
            turn_context=esc_ctx,
        ):
            if ev.get("type") == "token" and first_token_ms is None:
                first_token_ms = (time.perf_counter() - t_turn) * 1000.0
            if ev.get("type") == "token":
                token_text = str(ev.get("text") or "")
                if token_text:
                    streamed_answer_parts.append(token_text)
                yield format_sse("token", {"text": token_text})
            elif ev.get("type") == "status":
                yield format_sse("status", {"text": str(ev.get("text") or "")})
            elif ev.get("type") == "preamble":
                yield format_sse("preamble", {"text": str(ev.get("text") or "")})
            elif ev.get("type") == "products":
                cards = ev.get("products") or []
                if isinstance(cards, list):
                    stream_products = [c for c in cards if isinstance(c, dict)]
                yield format_sse("products", {"products": stream_products})
            elif ev.get("type") == "done":
                done_payload = {
                    "response": ev.get("response"),
                    "fallback_used": ev.get("fallback_used"),
                    "usage_input_tokens": ev.get("usage_input_tokens"),
                    "usage_output_tokens": ev.get("usage_output_tokens"),
                    "tools_invoked": ev.get("tools_invoked"),
                }
                tools_invoked = list(ev.get("tools_invoked") or [])
                cards = ev.get("product_cards") or []
                if isinstance(cards, list) and cards:
                    stream_products = [c for c in cards if isinstance(c, dict)]
    else:
        async for frame in stream_llm_sse(
            lc_messages,
            model=model,
            temperature=creativity,
            fallback_message=stream_fallback,
        ):
            if frame.startswith("event: token") and first_token_ms is None:
                first_token_ms = (time.perf_counter() - t_turn) * 1000.0
            elif frame.startswith("event: done"):
                for line in frame.split("\n"):
                    if line.startswith("data: "):
                        try:
                            done_payload = json.loads(line[6:])
                        except json.JSONDecodeError:
                            done_payload = {}
                        break
                continue
            yield frame

    answer = str(done_payload.get("response") or "").strip()
    if not answer:
        answer = "".join(streamed_answer_parts).strip()
    if not answer and decision.route == "rag" and chunks:
        answer = _demo_kb_excerpt_fallback(chunks)
    if not answer:
        answer = fallback_message.strip() or visitor_empty_reply_fallback()
    if stream_products:
        answer = shorten_answer_for_product_cards(answer)

    usage_in = int(done_payload.get("usage_input_tokens") or 0)
    usage_out = int(done_payload.get("usage_output_tokens") or 0)
    turn_fallback_used = response_used_fallback(
        answer,
        fallback_message=fallback_message,
        explicit=bool(done_payload.get("fallback_used")),
    )

    assistant_id = await finalize_turn_persist(
        user_id=user_id,
        agent_id=agent_id,
        conversation_id=conversation_id,
        user_message=user_message,
        model=model,
        answer=answer,
        usage_in=usage_in,
        usage_out=usage_out,
        tools_invoked=tools_invoked,
        rag_billing=rag_billing,
        classifier_billing=None,
        products=stream_products or None,
        product_detail=None,
        fallback_used=turn_fallback_used,
        latency_ms=int((time.perf_counter() - t_turn) * 1000.0),
    )
    assistant_message_id = str(assistant_id) if assistant_id else None
    escalation_info = build_escalation_info(
        human_enabled=False,
        esc_cfg={},
        occurred=False,
    ).model_dump(mode="json")

    ready_payload: dict[str, Any] = {
        "conversation_id": str(conversation_id),
        "assistant_message_id": assistant_message_id,
        "response": answer,
        "model": model,
        "fallback_used": turn_fallback_used,
        "contact_capture_required": False,
        "escalation": escalation_info,
        "conversation_status": "open",
        "ai_chat_disabled": False,
    }
    if stream_products:
        ready_payload["products"] = stream_products
    yield format_sse("ready", ready_payload)

    done_sse: dict[str, Any] = {
        "conversation_id": str(conversation_id),
        "assistant_message_id": assistant_message_id,
        "response": answer,
        "model": model,
        "fallback_used": turn_fallback_used,
        "tools_available_count": tools_bound_count,
        "tools_invoked": tools_invoked,
        "retrieval_count": retrieval_count,
        "retrieval_preview": retrieval_preview,
        "escalation": escalation_info,
        "contact_capture_required": False,
        "conversation_status": "open",
        "ai_chat_disabled": False,
        "turn_route": decision.route,
    }
    if stream_products:
        done_sse["products"] = stream_products
    yield format_sse("done", done_sse)


def _demo_kb_excerpt_fallback(chunks: list[dict[str, Any]], *, max_chars: int = 480) -> str:
    """Last resort when the model returns empty but RAG found policy text."""
    for chunk in chunks:
        raw = str(chunk.get("content") or "").strip()
        if not raw:
            continue
        for line in raw.splitlines():
            text = line.strip()
            if len(text) < 40:
                continue
            if text.casefold().startswith("section:"):
                continue
            return text[:max_chars]
    body = str(chunks[0].get("content") or "").strip()
    return body[:max_chars] if body else ""
