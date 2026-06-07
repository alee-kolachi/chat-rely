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


def escalation_handoff_api_fields(esc_cfg: dict[str, Any]) -> dict[str, Any]:
    """Structured handoff for visitor-contact and thread sync APIs."""
    seller_live = seller_is_available_for_live_chat(esc_cfg)
    estimated_minutes = int(esc_cfg.get("estimated_response_minutes", 15)) if seller_live else None
    channel_hint: str | None = "live" if seller_live else "email"
    return {
        "seller_live": seller_live,
        "estimated_minutes": estimated_minutes,
        "channel_hint": channel_hint,
    }


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
            f"I've passed this to our support team. Someone should reply within about {n} minutes. "
            "Feel free to add any extra details here while you wait."
        )
    return (
        "I've passed this to our support team. We're not available for live chat right now, "
        "but you'll receive an email follow-up as soon as someone can help."
    )


def handoff_reply_already_escalated() -> str:
    return handoff_reply_awaiting_team()


def handoff_reply_awaiting_team() -> str:
    return (
        "Thanks, we've added that to your request. "
        "Our support team will follow up with you directly."
    )


def visitor_follow_up_ack() -> str:
    return handoff_reply_awaiting_team()


def build_escalated_widget_banner(
    *,
    seller_live: bool,
    estimated_minutes: int | None = None,
    channel_hint: str | None = None,
) -> str:
    """Copy shown in the widget after escalation (not the generic AI-disabled line)."""
    if seller_live:
        n = max(1, int(estimated_minutes or 15))
        return (
            f"Our team is on it. Someone should reply within about {n} minutes. "
            "You can add more details here while you wait."
        )
    if channel_hint == "email":
        return (
            "We're not available for live chat right now. "
            "Our team will reach out by email. "
            "Start a new chat if you need the AI again."
        )
    return (
        "We're not available for live chat right now. "
        "Our team will reach out as soon as they're back. "
        "Start a new chat if you need the AI again."
    )


def handoff_ask_contact() -> str:
    return (
        "Before I connect you with our team, please share your name and email "
        "so we can follow up."
    )


def handoff_ask_name() -> str:
    return "Thanks. What's your name so our team can follow up?"


def handoff_ask_email() -> str:
    return "Thanks. What's your email so our team can follow up?"


def parse_contact_fields_from_message(
    message: str,
    *,
    existing_name: str | None,
    existing_email: str | None,
) -> tuple[str | None, str | None]:
    """Parse name and/or email from a visitor chat line (supports multi-line messages)."""
    name = (existing_name or "").strip() or None
    email = (existing_email or "").strip() or None
    text = (message or "").strip()
    if not text:
        return name, email

    lines = [ln.strip() for ln in text.splitlines() if ln.strip()]
    if len(lines) >= 2:
        for ln in lines:
            if looks_like_email(ln):
                email = ln
            elif not name:
                name = ln
        return name, email

    if looks_like_email(text):
        return name, text
    if not name:
        return text, email
    return name, email


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
        "I don't have enough information to answer that right now. "
        "Try rephrasing your question, or visit our site for more details."
    )


def visitor_non_substantive_reply() -> str:
    return "I didn't catch a question there — what can I help you with?"


def visitor_meta_deflection_reply() -> str:
    return "I can only help with questions about this brand."


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
    # Key is literal: bound params as jsonb_build_object keys make asyncpg raise
    # AmbiguousParameterError (could not determine data type of parameter).
    pending_key = ESCALATION_PENDING_CONTACT_META_KEY
    await db.execute(
        text(
            f"""
            update public.conversations
            set metadata = case
                  when :pending then coalesce(metadata, '{{}}'::jsonb)
                    || jsonb_build_object('{pending_key}', true)
                  else coalesce(metadata, '{{}}'::jsonb) - '{pending_key}'
                end,
                updated_at = now()
            where id = cast(:conversation_id as uuid) and user_id = cast(:user_id as uuid)
            """
        ),
        {
            "conversation_id": str(conversation_id),
            "user_id": str(user_id),
            "pending": pending,
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


def _invalid_email_reply() -> str:
    return "Please enter a valid email address so our team can follow up."


async def handle_pending_contact_stream_message(
    db: AsyncSession,
    *,
    ctx: EscalationTurnContext,
    message: str,
) -> EscalationAttemptResult:
    """Apply a stream message while escalation_pending_contact is set (name then email)."""
    conv = await get_conversation(db, ctx.user_id, ctx.conversation_id)
    meta = dict(conv.metadata or {})
    if not meta.get(ESCALATION_PENDING_CONTACT_META_KEY):
        return EscalationAttemptResult(
            occurred=False,
            contact_capture_required=False,
            reply=handoff_reply_for_status(
                conversation_status=normalize_conversation_status(conv.status),
                esc_cfg=ctx.esc_cfg,
            ),
            conversation_status=normalize_conversation_status(conv.status),
        )

    name, email = resolve_visitor_contact(
        meta,
        visitor_name=ctx.visitor_name,
        visitor_email=ctx.visitor_email,
    )
    name, email = parse_contact_fields_from_message(
        message,
        existing_name=name,
        existing_email=email,
    )
    if email and not looks_like_email(email):
        return EscalationAttemptResult(
            occurred=False,
            contact_capture_required=True,
            reply=_invalid_email_reply(),
            conversation_status=normalize_conversation_status(conv.status),
        )

    enriched = EscalationTurnContext(
        user_id=ctx.user_id,
        agent_id=ctx.agent_id,
        conversation_id=ctx.conversation_id,
        user_message=ctx.user_message,
        visitor_name=name,
        visitor_email=email,
        esc_cfg=ctx.esc_cfg,
    )
    await persist_visitor_contact(db, ctx=enriched)
    conv = await get_conversation(db, ctx.user_id, ctx.conversation_id)
    meta = dict(conv.metadata or {})
    name, email = resolve_visitor_contact(
        meta,
        visitor_name=enriched.visitor_name,
        visitor_email=enriched.visitor_email,
    )
    status = normalize_conversation_status(conv.status)

    if visitor_contact_complete(name, email):
        await _set_escalation_pending_contact(
            db,
            user_id=ctx.user_id,
            conversation_id=ctx.conversation_id,
            pending=False,
        )
        occurred = await perform_escalation(db, ctx=enriched)
        next_status = "escalated" if occurred else status
        return EscalationAttemptResult(
            occurred=occurred,
            contact_capture_required=False,
            reply=handoff_reply_for_status(conversation_status=next_status, esc_cfg=ctx.esc_cfg),
            conversation_status=next_status,
        )

    if (name or "").strip() and not looks_like_email(email or ""):
        return EscalationAttemptResult(
            occurred=False,
            contact_capture_required=True,
            reply=handoff_ask_email(),
            conversation_status=status,
        )
    if looks_like_email(email or "") and not (name or "").strip():
        return EscalationAttemptResult(
            occurred=False,
            contact_capture_required=True,
            reply=handoff_ask_name(),
            conversation_status=status,
        )

    return EscalationAttemptResult(
        occurred=False,
        contact_capture_required=True,
        reply=handoff_ask_contact(),
        conversation_status=status,
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
    from app.domains.public_widget.thread import store_escalation_handoff_metadata

    seller_live = seller_is_available_for_live_chat(ctx.esc_cfg)
    est = int(ctx.esc_cfg.get("estimated_response_minutes", 15)) if seller_live else None
    channel = "live" if seller_live else "email"
    await store_escalation_handoff_metadata(
        db,
        user_id=ctx.user_id,
        conversation_id=ctx.conversation_id,
        seller_live=seller_live,
        estimated_minutes=est,
        channel_hint=channel,
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
        "HUMAN ESCALATION\n"
        "You have one escalation action: `escalate_to_human`. "
        "Call it when the visitor explicitly asks for a person, human, agent, or representative, "
        "when they say yes/sure/please after you offered human help, "
        "when you have been unable to resolve their issue after a genuine attempt, "
        "or when the situation clearly requires human judgment (e.g. complex disputes, legal concerns). "
        "For human-support requests, never call product search or other Shopify catalog tools. "
        "Do not tell the visitor they are connected to a human until you have called this tool and it has returned. "
        "Do not only describe external contact methods when this tool is available — call it. "
        "Do not offer escalation preemptively for questions you can answer. "
        "After calling it, the visitor will be prompted for their name and email before the handoff completes."
    )


def human_support_without_escalation_appendix() -> str:
    return (
        "HUMAN SUPPORT (no live handoff in chat)\n"
        "Live human handoff is not available in this chat. "
        "When the visitor asks for a person, human, or representative — or says yes after you offered human help — "
        "do not call product search or catalog tools. "
        "Briefly explain that you cannot connect them here and point to official contact options from the knowledge base if you have them."
    )


def unresolved_escalation_system_appendix() -> str:
    return (
        "UNRESOLVED STREAK\n"
        "Recent replies in this thread could not fully resolve the customer's question. "
        "On this turn, briefly acknowledge the gap, offer to connect them with a human team member, "
        "and call `escalate_to_human` if they accept or if you still cannot answer from tools or the index."
    )
