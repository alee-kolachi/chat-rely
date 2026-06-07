"""Public widget thread sync after human escalation."""

from __future__ import annotations

import json
from datetime import datetime
from typing import Any
from uuid import UUID

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.agent.escalation import normalize_conversation_status
from app.core.errors import AppError
from app.domains.conversations.schemas import ConversationMessageCreateRequest
from app.domains.conversations.service import (
    OPERATOR_ENGAGED_META_KEY,
    append_message,
    get_conversation,
    list_messages,
    normalize_conversation_metadata,
)
from app.domains.conversations.visitor_presence import (
    conversation_is_active,
    touch_visitor_presence,
    visitor_is_online,
)
from app.domains.public_widget.schemas import (
    EscalationHandoffFields,
    PublicWidgetThreadMessage,
    PublicWidgetThreadResponse,
)


def _is_renderable_message(row: dict[str, Any]) -> bool:
    role = (row.get("role") or "").strip()
    if role not in ("user", "assistant"):
        return False
    content = (row.get("content") or "").strip()
    if content:
        return True
    meta = row.get("metadata")
    if isinstance(meta, dict):
        if meta.get("product_detail"):
            return True
        products = meta.get("products")
        if isinstance(products, list) and products:
            return True
    return False


async def verify_widget_visitor_conversation(
    db: AsyncSession,
    *,
    user_id: UUID,
    agent_id: UUID,
    conversation_id: UUID,
    visitor_id: str,
) -> None:
    conv = await get_conversation(db, user_id, conversation_id)
    if conv.agent_id != agent_id:
        raise AppError(code="conversation.not_found", message="Conversation not found", status_code=404)
    vid = (visitor_id or "").strip()
    if not vid or conv.visitor_id != vid:
        raise AppError(code="conversation.forbidden", message="Conversation not found", status_code=403)


def _handoff_from_metadata(meta: dict[str, Any]) -> EscalationHandoffFields | None:
    esc = meta.get("escalation_handoff")
    if not isinstance(esc, dict):
        return None
    channel = esc.get("channel_hint")
    est = esc.get("estimated_minutes")
    return EscalationHandoffFields(
        seller_live=bool(esc.get("seller_live")),
        estimated_minutes=est if isinstance(est, int) else None,
        channel_hint=channel if channel in ("live", "email") else None,
    )


def _handoff_banner_from_metadata(meta: dict[str, Any]) -> str | None:
    from app.agent.escalation import build_escalated_widget_banner

    handoff = _handoff_from_metadata(meta)
    if handoff is None:
        return None
    return build_escalated_widget_banner(
        seller_live=handoff.seller_live,
        estimated_minutes=handoff.estimated_minutes,
        channel_hint=handoff.channel_hint,
    )


async def fetch_public_widget_thread(
    db: AsyncSession,
    *,
    user_id: UUID,
    agent_id: UUID,
    conversation_id: UUID,
    visitor_id: str,
    since: datetime | None = None,
) -> PublicWidgetThreadResponse:
    await verify_widget_visitor_conversation(
        db,
        user_id=user_id,
        agent_id=agent_id,
        conversation_id=conversation_id,
        visitor_id=visitor_id,
    )
    await touch_visitor_presence(
        db,
        user_id=user_id,
        conversation_id=conversation_id,
        visitor_id=visitor_id,
    )
    conv = await get_conversation(db, user_id, conversation_id)
    meta = normalize_conversation_metadata(conv.metadata)
    rows = await list_messages(db, user_id, conversation_id)
    out: list[PublicWidgetThreadMessage] = []
    for msg in rows:
        if since is not None and msg.created_at <= since:
            continue
        row = msg.model_dump()
        if not _is_renderable_message(row):
            continue
        out.append(
            PublicWidgetThreadMessage(
                id=msg.id,
                role=msg.role,  # type: ignore[arg-type]
                content=msg.content,
                created_at=msg.created_at,
            )
        )
    status = normalize_conversation_status(conv.status)
    return PublicWidgetThreadResponse(
        conversation_status=status,
        operator_engaged=bool(meta.get(OPERATOR_ENGAGED_META_KEY)),
        conversation_active=conversation_is_active(status),
        visitor_online=visitor_is_online(meta),
        handoff_banner=_handoff_banner_from_metadata(meta),
        handoff=_handoff_from_metadata(meta),
        messages=out,
    )


async def append_public_widget_visitor_message(
    db: AsyncSession,
    *,
    user_id: UUID,
    agent_id: UUID,
    conversation_id: UUID,
    visitor_id: str,
    content: str,
) -> PublicWidgetThreadMessage:
    await verify_widget_visitor_conversation(
        db,
        user_id=user_id,
        agent_id=agent_id,
        conversation_id=conversation_id,
        visitor_id=visitor_id,
    )
    await touch_visitor_presence(
        db,
        user_id=user_id,
        conversation_id=conversation_id,
        visitor_id=visitor_id,
    )
    msg = await append_message(
        db,
        user_id,
        conversation_id,
        ConversationMessageCreateRequest(role="user", content=content.strip()),
        agent_id=agent_id,
    )
    from app.domains.tickets.service import sync_ticket_status_after_message

    await sync_ticket_status_after_message(
        db,
        user_id=user_id,
        conversation_id=conversation_id,
        message_role="user",
    )
    return PublicWidgetThreadMessage(
        id=msg.id,
        role="user",
        content=msg.content,
        created_at=msg.created_at,
    )


async def store_escalation_handoff_metadata(
    db: AsyncSession,
    *,
    user_id: UUID,
    conversation_id: UUID,
    seller_live: bool,
    estimated_minutes: int | None,
    channel_hint: str | None,
) -> None:
    patch = {
        "escalation_handoff": {
            "seller_live": seller_live,
            "estimated_minutes": estimated_minutes,
            "channel_hint": channel_hint,
        }
    }
    await db.execute(
        text(
            """
            update public.conversations
            set metadata = coalesce(metadata, '{}'::jsonb) || cast(:patch as jsonb),
                updated_at = now()
            where id = :conversation_id and user_id = :user_id
            """
        ),
        {
            "conversation_id": str(conversation_id),
            "user_id": str(user_id),
            "patch": json.dumps(patch),
        },
    )
    await db.commit()
