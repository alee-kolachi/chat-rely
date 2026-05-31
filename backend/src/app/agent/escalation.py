"""Human escalation helpers for the chat agent."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Literal
from uuid import UUID


from sqlalchemy.ext.asyncio import AsyncSession

from sqlalchemy import text

from app.core.errors import AppError
from app.domains.actions.human_availability import seller_is_available_for_live_chat
from app.domains.conversations.service import OPERATOR_ENGAGED_META_KEY, get_conversation
from app.domains.runtime.schemas import RuntimeEscalationInfo
from app.domains.tickets.service import (
    record_escalation,
    sync_ticket_visitor_contact,
    update_visitor_contact_metadata,
)

VISITOR_EMAIL_META_KEY = "visitor_email"
VISITOR_NAME_META_KEY = "visitor_name"
ESCALATION_PENDING_CONTACT_META_KEY = "escalation_pending_contact"


def normalize_conversation_status(status: Any) -> str:
    raw = str(status or "open").strip().lower()
    if "." in raw:
        raw = raw.rsplit(".", 1)[-1]
    return raw.strip("'\"")


async def conversation_is_awaiting_human_team(
    db: AsyncSession,
    *,
    user_id: UUID,
    conversation_id: UUID,
) -> bool:
    """True when the thread is escalated, has a ticket, or an operator took over."""
    result = await db.execute(
        text(
            """
            select c.status::text as status, c.metadata
            from public.conversations c
            where c.id = :conversation_id and c.user_id = :user_id
            """
        ),
        {"conversation_id": str(conversation_id), "user_id": str(user_id)},
    )
    row = result.mappings().first()
    if row is None:
        return False
    if normalize_conversation_status(row["status"]) == "escalated":
        return True
    meta = row["metadata"] if isinstance(row["metadata"], dict) else {}
    if bool(meta.get(OPERATOR_ENGAGED_META_KEY)):
        return True
    ticket = await db.execute(
        text(
            """
            select 1
            from public.tickets t
            where t.conversation_id = :conversation_id
              and t.user_id = :user_id
            limit 1
            """
        ),
        {"conversation_id": str(conversation_id), "user_id": str(user_id)},
    )
    return ticket.first() is not None


def handoff_reply_for_status(
    *,
    conversation_status: str,
    esc_cfg: dict[str, Any],
) -> str:
    if normalize_conversation_status(conversation_status) == "escalated":
        return handoff_reply_awaiting_team()
    return handoff_reply_open(
        seller_live=seller_is_available_for_live_chat(esc_cfg),
        estimated_minutes=int(esc_cfg.get("estimated_response_minutes", 15)),
    )


def handoff_reply_open(*, seller_live: bool, estimated_minutes: int) -> str:
    if seller_live:
        n = max(1, int(estimated_minutes))
        return (
            f"I’ve connected you with our team. Someone should reply within about {n} minutes. "
            "If you think of anything else, you can add it here."
        )
    return (
        "I’ve passed this to our team. We’re not available for live chat at the moment, "
        "but you’ll get an email follow-up as soon as someone can help."
    )


def handoff_reply_already_escalated() -> str:
    return handoff_reply_awaiting_team()


def handoff_reply_awaiting_team() -> str:
    return (
        "This chat is with our support team now. "
        "The AI cannot reply here anymore. Start a new chat if you need assistant help."
    )


def handoff_ask_contact() -> str:
    return (
        "Before I connect you with our team, please share your name and email "
        "so we can follow up."
    )


def looks_like_email(value: str) -> bool:
    email = (value or "").strip()
    at = email.find("@")
    if at <= 0 or at >= len(email) - 1:
        return False
    return "." in email[at + 1 :]


def resolve_visitor_contact(
    meta: dict[str, Any],
    *,
    visitor_name: str | None = None,
    visitor_email: str | None = None,
) -> tuple[str | None, str | None]:
    name = (meta.get(VISITOR_NAME_META_KEY) or visitor_name or "").strip() or None
    email = (meta.get(VISITOR_EMAIL_META_KEY) or visitor_email or "").strip() or None
    return name, email


def visitor_contact_complete(name: str | None, email: str | None) -> bool:
    return bool((name or "").strip()) and looks_like_email(email or "")


def visitor_empty_reply_fallback() -> str:
    return (
        "I'm not sure about that right now. "
        "Try asking in another way, or contact our support team if you need more help."
    )


def visitor_non_substantive_reply() -> str:
    return "I didn't catch a question. What can I help you with?"


@dataclass(frozen=True)
class EscalationTurnContext:
    user_id: UUID
    agent_id: UUID
    conversation_id: UUID
    user_message: str
    visitor_email: str | None
    visitor_name: str | None
    esc_cfg: dict[str, Any]


@dataclass(frozen=True)
class EscalationAttemptResult:
    occurred: bool
    contact_capture_required: bool
    reply: str
    conversation_status: str


async def persist_visitor_contact(
    db: AsyncSession,
    *,
    ctx: EscalationTurnContext,
) -> None:
    name = (ctx.visitor_name or "").strip() or None
    email = (ctx.visitor_email or "").strip() or None
    if not name and not email:
        return
    await update_visitor_contact_metadata(
        db,
        user_id=ctx.user_id,
        conversation_id=ctx.conversation_id,
        visitor_name=name,
        visitor_email=email,
    )
    if name or email:
        await sync_ticket_visitor_contact(
            db,
            user_id=ctx.user_id,
            conversation_id=ctx.conversation_id,
            customer_name=name,
            customer_email=email,
        )


async def _set_escalation_pending_contact(
    db: AsyncSession,
    *,
    user_id: UUID,
    conversation_id: UUID,
    pending: bool,
) -> None:
    await db.execute(
        text(
            """
            update public.conversations
            set metadata = case
                  when :pending then coalesce(metadata, '{}'::jsonb)
                    || jsonb_build_object(:pending_key, true)
                  else coalesce(metadata, '{}'::jsonb) - :pending_key
                end,
                updated_at = now()
            where id = :conversation_id and user_id = :user_id
            """
        ),
        {
            "conversation_id": str(conversation_id),
            "user_id": str(user_id),
            "pending": pending,
            "pending_key": ESCALATION_PENDING_CONTACT_META_KEY,
        },
    )
    await db.commit()


async def handle_escalation_with_contact(
    db: AsyncSession,
    *,
    ctx: EscalationTurnContext,
) -> EscalationAttemptResult:
    """Escalate when contact is complete; otherwise ask for name and email first."""
    conv = await get_conversation(db, ctx.user_id, ctx.conversation_id)
    status = normalize_conversation_status(conv.status)
    if status in ("escalated", "resolved", "idle_closed"):
        return EscalationAttemptResult(
            occurred=False,
            contact_capture_required=False,
            reply=handoff_reply_for_status(conversation_status=status, esc_cfg=ctx.esc_cfg),
            conversation_status=status,
        )

    await persist_visitor_contact(db, ctx=ctx)
    conv = await get_conversation(db, ctx.user_id, ctx.conversation_id)
    meta = dict(conv.metadata or {})
    name, email = resolve_visitor_contact(
        meta,
        visitor_name=ctx.visitor_name,
        visitor_email=ctx.visitor_email,
    )

    if visitor_contact_complete(name, email):
        await _set_escalation_pending_contact(
            db,
            user_id=ctx.user_id,
            conversation_id=ctx.conversation_id,
            pending=False,
        )
        occurred = await perform_escalation(db, ctx=ctx)
        next_status = "escalated" if occurred else normalize_conversation_status(conv.status)
        return EscalationAttemptResult(
            occurred=occurred,
            contact_capture_required=False,
            reply=handoff_reply_for_status(conversation_status=next_status, esc_cfg=ctx.esc_cfg),
            conversation_status=next_status,
        )

    await _set_escalation_pending_contact(
        db,
        user_id=ctx.user_id,
        conversation_id=ctx.conversation_id,
        pending=True,
    )
    return EscalationAttemptResult(
        occurred=False,
        contact_capture_required=True,
        reply=handoff_ask_contact(),
        conversation_status=normalize_conversation_status(conv.status),
    )


async def submit_visitor_contact_for_escalation(
    db: AsyncSession,
    *,
    user_id: UUID,
    agent_id: UUID,
    conversation_id: UUID,
    visitor_name: str,
    visitor_email: str,
    esc_cfg: dict[str, Any],
) -> EscalationAttemptResult:
    name = (visitor_name or "").strip()
    email = (visitor_email or "").strip()
    if not name:
        raise AppError(
            code="visitor_contact.name_required",
            message="Name is required",
            status_code=400,
        )
    if not looks_like_email(email):
        raise AppError(
            code="visitor_contact.email_invalid",
            message="Enter a valid email address",
            status_code=400,
        )

    conv = await get_conversation(db, user_id, conversation_id)
    if conv.agent_id != agent_id:
        raise AppError(code="conversation.not_found", message="Conversation not found", status_code=404)

    ctx = EscalationTurnContext(
        user_id=user_id,
        agent_id=agent_id,
        conversation_id=conversation_id,
        user_message="",
        visitor_name=name,
        visitor_email=email,
        esc_cfg=esc_cfg,
    )
    meta = dict(conv.metadata or {})
    pending = bool(meta.get(ESCALATION_PENDING_CONTACT_META_KEY))
    already_escalated = normalize_conversation_status(conv.status) == "escalated"

    await persist_visitor_contact(db, ctx=ctx)

    if already_escalated:
        return EscalationAttemptResult(
            occurred=False,
            contact_capture_required=False,
            reply=handoff_reply_awaiting_team(),
            conversation_status="escalated",
        )

    if not pending:
        return EscalationAttemptResult(
            occurred=False,
            contact_capture_required=False,
            reply=handoff_reply_for_status(conversation_status=conv.status, esc_cfg=esc_cfg),
            conversation_status=normalize_conversation_status(conv.status),
        )

    return await handle_escalation_with_contact(db, ctx=ctx)


async def perform_escalation(
    db: AsyncSession,
    *,
    ctx: EscalationTurnContext,
) -> bool:
    """Record ticket + escalated status when the thread is still eligible."""
    conv = await get_conversation(db, ctx.user_id, ctx.conversation_id)
    if conv.status in ("escalated", "resolved", "idle_closed"):
        return False
    meta = dict(conv.metadata or {})
    name, email = resolve_visitor_contact(
        meta,
        visitor_name=ctx.visitor_name,
        visitor_email=ctx.visitor_email,
    )
    if not visitor_contact_complete(name, email):
        return False
    await record_escalation(
        db,
        user_id=ctx.user_id,
        agent_id=ctx.agent_id,
        conversation_id=ctx.conversation_id,
        user_message=ctx.user_message,
        customer_email=email,
        customer_name=name,
    )
    return True


def build_escalation_info(
    *,
    human_enabled: bool,
    esc_cfg: dict[str, Any],
    occurred: bool,
    contact_capture_required: bool = False,
) -> RuntimeEscalationInfo:
    seller_live = seller_is_available_for_live_chat(esc_cfg) if human_enabled else False
    est_min = int(esc_cfg.get("estimated_response_minutes", 15)) if human_enabled else 15
    channel_hint: Literal["live", "email"] | None = (
        ("live" if seller_live else "email") if human_enabled else None
    )
    return RuntimeEscalationInfo(
        human_escalation_action_enabled=human_enabled,
        occurred=occurred,
        contact_capture_required=contact_capture_required,
        seller_live=seller_live if human_enabled else False,
        estimated_minutes=est_min if human_enabled and seller_live else None,
        channel_hint=channel_hint,
    )


def escalation_tool_system_appendix() -> str:
    return (
        "You have one action: `escalate_to_human`. Call it when the visitor asks for a person or "
        "human support, or when you cannot resolve their issue and they need your team. "
        "Do not tell them they are connected to a human unless you have called this tool. "
        "After calling it, the visitor will be asked for their name and email before the handoff completes."
    )
