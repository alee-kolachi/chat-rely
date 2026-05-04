from __future__ import annotations

import json
from uuid import UUID

import structlog
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import AppError
from app.core.settings import get_settings
from app.domains.conversation_outcomes.schemas import (
    ConversationOutcomeDTO,
    ConversationOutcomeLLMResult,
    ConversationOutcomePayload,
    OutcomeEndReason,
    TrainingTopicItem,
    TurnSignals,
    slugify_topic_label,
)
from app.domains.conversations.schemas import MessageDTO
from app.domains.conversations.service import get_conversation, list_messages

log = structlog.get_logger("conversation_outcomes")


def _format_transcript(messages: list[MessageDTO]) -> str:
    lines: list[str] = []
    for m in messages:
        if m.role == "user":
            lines.append(f"User: {m.content.strip()}")
        elif m.role == "assistant":
            text_content = m.content.strip()
            if text_content:
                lines.append(f"Assistant: {text_content}")
    return "\n".join(lines)


def _collect_turn_signal_blobs(messages: list[MessageDTO]) -> list[dict[str, object]]:
    out: list[dict[str, object]] = []
    for m in messages:
        if m.role != "assistant":
            continue
        meta = m.metadata or {}
        ts = meta.get("turn_signals")
        if isinstance(ts, dict):
            out.append(ts)
    return out


async def _invoke_closure_llm(transcript: str, conversation_status: str) -> ConversationOutcomeLLMResult:
    from langchain_core.messages import HumanMessage, SystemMessage
    from langchain_openai import ChatOpenAI

    settings = get_settings()
    if not settings.openai_api_key:
        raise AppError(
            code="runtime.llm_not_configured",
            message="OPENAI_API_KEY is required for conversation outcomes",
            status_code=500,
        )
    model_name = settings.openai_chat_model or "gpt-4o-mini"
    llm = ChatOpenAI(
        model=model_name,
        temperature=0,
        api_key=settings.openai_api_key,
        timeout=90,
        max_retries=2,
    )
    structured = llm.with_structured_output(ConversationOutcomeLLMResult)
    sys = SystemMessage(
        content=(
            "You analyze a completed customer support chat. "
            "Decide if the shopper's issue was adequately addressed by the AI assistant before the thread ended. "
            "resolved_by_agent=true means the assistant gave a sufficient answer or path forward for that session, "
            "even if the user stopped replying without thanks (window_closed / user_abandoned). "
            "If the user left frustrated without a real fix, resolved_by_agent=false. "
            "escalated_to_human applies when handoff to humans was the correct outcome. "
            "training_topics: short phrases for KB gaps (empty if none). "
            f"Conversation status field from system: {conversation_status}."
        )
    )
    human = HumanMessage(
        content=(
            "Transcript:\n\n"
            f"{transcript}\n\n"
            "Return structured outcome fields only."
        )
    )
    result = await structured.ainvoke([sys, human])
    if not isinstance(result, ConversationOutcomeLLMResult):
        raise RuntimeError("structured output type mismatch")
    return result


async def compute_turn_signals(last_user_message: str, assistant_reply: str) -> TurnSignals | None:
    """Small side-call after each AI reply; stored on assistant message metadata."""
    from langchain_core.messages import HumanMessage, SystemMessage
    from langchain_openai import ChatOpenAI

    settings = get_settings()
    if not settings.openai_api_key:
        return None
    llm = ChatOpenAI(
        model=settings.openai_chat_model or "gpt-4o-mini",
        temperature=0,
        api_key=settings.openai_api_key,
        timeout=30,
        max_retries=1,
    )
    structured = llm.with_structured_output(TurnSignals)
    sys = SystemMessage(
        content=(
            "Given one user message and the assistant reply, classify briefly. "
            "knowledge_gap=true if the assistant lacked grounded facts/policy."
        )
    )
    human = HumanMessage(
        content=f"User: {last_user_message.strip()}\n\nAssistant: {assistant_reply.strip()}"
    )
    try:
        out = await structured.ainvoke([sys, human])
        return out if isinstance(out, TurnSignals) else None
    except Exception as exc:
        log.warning("turn_signals.failed", error=str(exc))
        return None


def _fallback_payload(conversation_status: str) -> ConversationOutcomePayload:
    reason: OutcomeEndReason = "escalated_to_human" if conversation_status == "escalated" else "other"
    return ConversationOutcomePayload(
        resolved_by_agent=False,
        resolution_confidence=0.0,
        end_reason=reason,
        evidence="Outcome analysis unavailable (LLM not configured or failed).",
        training_topics=[],
        needs_follow_up_training=False,
    )


async def analyze_and_persist_outcome(
    db: AsyncSession,
    *,
    user_id: UUID,
    conversation_id: UUID,
) -> ConversationOutcomeDTO | None:
    conv = await get_conversation(db, user_id, conversation_id)
    if conv.status == "open":
        return None

    messages = await list_messages(db, user_id, conversation_id)
    transcript = _format_transcript(messages)
    if not transcript.strip():
        payload = ConversationOutcomePayload(
            resolved_by_agent=False,
            resolution_confidence=0.0,
            end_reason="other",
            evidence="No transcript.",
            training_topics=[],
            needs_follow_up_training=False,
        )
        return await _upsert_outcome_row(
            db,
            user_id=user_id,
            conversation_id=conversation_id,
            agent_id=conv.agent_id,
            model="",
            payload=payload,
        )

    turn_hints = _collect_turn_signal_blobs(messages)
    hint_block = ""
    if turn_hints:
        hint_block = "\nPer-turn model hints (may be noisy):\n" + json.dumps(turn_hints[:24])

    settings = get_settings()
    payload: ConversationOutcomePayload
    model_used = settings.openai_chat_model or "gpt-4o-mini"

    try:
        llm_result = await _invoke_closure_llm(
            transcript + hint_block,
            conversation_status=conv.status,
        )
        topics: list[TrainingTopicItem] = []
        seen: set[str] = set()
        for raw in llm_result.training_topics:
            label = (raw or "").strip()
            if len(label) < 2:
                continue
            slug = slugify_topic_label(label)
            if slug in seen:
                continue
            seen.add(slug)
            topics.append(TrainingTopicItem(slug=slug, label=label[:200]))

        payload = ConversationOutcomePayload(
            resolved_by_agent=llm_result.resolved_by_agent,
            resolution_confidence=llm_result.resolution_confidence,
            end_reason=llm_result.end_reason,
            evidence=(llm_result.evidence or "")[:4000],
            training_topics=topics,
            needs_follow_up_training=llm_result.needs_follow_up_training or bool(topics),
        )
    except Exception as exc:
        log.warning("closure_llm.failed", conversation_id=str(conversation_id), error=str(exc))
        payload = _fallback_payload(conv.status)
        model_used = ""

    return await _upsert_outcome_row(
        db,
        user_id=user_id,
        conversation_id=conversation_id,
        agent_id=conv.agent_id,
        model=model_used,
        payload=payload,
    )


async def _upsert_outcome_row(
    db: AsyncSession,
    *,
    user_id: UUID,
    conversation_id: UUID,
    agent_id: UUID,
    model: str,
    payload: ConversationOutcomePayload,
) -> ConversationOutcomeDTO:
    payload_json = json.dumps(payload.model_dump(mode="json"))
    result = await db.execute(
        text(
            """
            insert into public.conversation_outcomes (
              conversation_id, agent_id, user_id, computed_at, model, payload
            ) values (
              :conversation_id, :agent_id, :user_id, now(), :model, cast(:payload as jsonb)
            )
            on conflict (conversation_id) do update
              set computed_at = now(),
                  model = excluded.model,
                  payload = excluded.payload,
                  updated_at = now()
            returning
              id, conversation_id, agent_id, user_id, computed_at, model, payload, created_at, updated_at
            """
        ),
        {
            "conversation_id": str(conversation_id),
            "agent_id": str(agent_id),
            "user_id": str(user_id),
            "model": model,
            "payload": payload_json,
        },
    )
    row = result.mappings().one()
    await db.commit()
    raw_payload = row["payload"]
    if isinstance(raw_payload, str):
        raw_payload = json.loads(raw_payload)
    return ConversationOutcomeDTO(
        id=row["id"],
        conversation_id=row["conversation_id"],
        agent_id=row["agent_id"],
        user_id=row["user_id"],
        computed_at=row["computed_at"],
        model=row["model"],
        payload=ConversationOutcomePayload.model_validate(raw_payload),
        created_at=row["created_at"],
        updated_at=row["updated_at"],
    )


async def close_idle_conversations_global(db: AsyncSession) -> int:
    """Runs DB idle closer (30-minute inactivity → idle_closed)."""
    result = await db.execute(text("select public.close_idle_conversations() as n"))
    row = result.mappings().one()
    n = int(row["n"])
    await db.commit()
    return n


async def process_pending_outcome_jobs(
    db: AsyncSession,
    *,
    limit: int = 15,
) -> int:
    """Analyze terminal conversations missing outcomes (any owner)."""
    result = await db.execute(
        text(
            """
            select c.id as conversation_id, c.user_id
            from public.conversations c
            left join public.conversation_outcomes o on o.conversation_id = c.id
            where c.status in ('idle_closed', 'resolved', 'escalated')
              and o.id is null
            order by c.updated_at asc
            limit :limit
            """
        ),
        {"limit": limit},
    )
    rows = result.mappings().all()
    processed = 0
    for row in rows:
        cid = UUID(str(row["conversation_id"]))
        uid = UUID(str(row["user_id"]))
        try:
            await analyze_and_persist_outcome(db, user_id=uid, conversation_id=cid)
            processed += 1
        except Exception as exc:
            log.warning("outcome.job_failed", conversation_id=str(cid), error=str(exc))
    return processed


async def tick_idle_and_outcomes(db: AsyncSession) -> tuple[int, int]:
    """Close idle threads then backfill outcomes. Returns (idle_closed_count, outcomes_processed)."""
    idle_n = await close_idle_conversations_global(db)
    outcome_n = await process_pending_outcome_jobs(db)
    return idle_n, outcome_n
