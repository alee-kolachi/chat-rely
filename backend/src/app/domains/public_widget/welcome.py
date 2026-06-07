"""First-message copy for the embed widget (custom greeting or agent-name default)."""

from __future__ import annotations

from typing import Any
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.domains.conversations.schemas import ConversationMessageCreateRequest
from app.domains.conversations.service import append_message, list_messages_recent

WIDGET_GREETING_META_KEY = "widget_greeting"


def default_welcome_messages(agent_name: str | None) -> list[str]:
    name = (agent_name or "").strip() or "Support"
    return [
        f"Hey there! I'm {name}, your support assistant. Let's find the best match for you.",
        "Can I get your name and what you're looking for today?",
    ]


def default_welcome_message(agent_name: str | None) -> str:
    return default_welcome_messages(agent_name)[0]


def _stored_greeting_messages(behavior: dict[str, Any]) -> list[str]:
    raw_list = behavior.get("greeting_messages")
    if isinstance(raw_list, list):
        msgs = [str(item).strip() for item in raw_list if isinstance(item, str) and str(item).strip()]
        if msgs:
            return msgs[:2]
    raw = behavior.get("greeting_message")
    if isinstance(raw, str) and raw.strip():
        return [raw.strip()]
    return []


def resolve_welcome_messages(agent_name: str | None, behavior: dict[str, Any] | None) -> list[str]:
    b = behavior if isinstance(behavior, dict) else {}
    stored = _stored_greeting_messages(b)
    if stored:
        return stored
    return default_welcome_messages(agent_name)


def resolve_welcome_message(agent_name: str | None, behavior: dict[str, Any] | None) -> str:
    messages = resolve_welcome_messages(agent_name, behavior)
    return messages[0] if messages else ""


async def seed_widget_greeting_messages_if_needed(
    db: AsyncSession,
    *,
    user_id: UUID,
    agent_id: UUID,
    conversation_id: UUID,
    agent_name: str | None,
    behavior_settings: dict[str, Any] | None,
    history_limit: int,
) -> list[Any]:
    """Persist widget greeting bubbles so the agent sees intake context on the first turn."""
    messages = resolve_welcome_messages(agent_name, behavior_settings)
    if not messages:
        return []
    for text in messages:
        await append_message(
            db,
            user_id=user_id,
            conversation_id=conversation_id,
            payload=ConversationMessageCreateRequest(
                role="assistant",
                content=text,
                metadata={WIDGET_GREETING_META_KEY: True},
            ),
            agent_id=agent_id,
        )
    await db.commit()
    if history_limit <= 0:
        return []
    return await list_messages_recent(
        db,
        user_id,
        conversation_id,
        limit=history_limit,
        skip_conversation_check=True,
    )
