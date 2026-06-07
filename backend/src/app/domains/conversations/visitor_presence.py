"""Visitor online/offline for escalated widget threads (heartbeat in conversation metadata)."""

from __future__ import annotations

import json
from datetime import UTC, datetime
from typing import Any
from uuid import UUID

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

VISITOR_LAST_SEEN_META_KEY = "visitor_last_seen_at"
VISITOR_ONLINE_THRESHOLD_SECONDS = 90


def _normalize_metadata(metadata: Any) -> dict[str, Any]:
    if isinstance(metadata, dict):
        return dict(metadata)
    if isinstance(metadata, str) and metadata.strip():
        try:
            parsed = json.loads(metadata)
        except json.JSONDecodeError:
            return {}
        return dict(parsed) if isinstance(parsed, dict) else {}
    return {}


def _parse_iso_datetime(value: Any) -> datetime | None:
    if value is None:
        return None
    if isinstance(value, datetime):
        return value if value.tzinfo else value.replace(tzinfo=UTC)
    if isinstance(value, str) and value.strip():
        raw = value.strip().replace("Z", "+00:00")
        try:
            parsed = datetime.fromisoformat(raw)
        except ValueError:
            return None
        return parsed if parsed.tzinfo else parsed.replace(tzinfo=UTC)
    return None


def visitor_last_seen_at(metadata: dict[str, Any] | None) -> datetime | None:
    if not metadata:
        return None
    return _parse_iso_datetime(metadata.get(VISITOR_LAST_SEEN_META_KEY))


def visitor_is_online(metadata: dict[str, Any] | None, *, now: datetime | None = None) -> bool:
    seen = visitor_last_seen_at(metadata)
    if seen is None:
        return False
    ref = now or datetime.now(UTC)
    delta = (ref - seen).total_seconds()
    return 0 <= delta <= VISITOR_ONLINE_THRESHOLD_SECONDS


def conversation_is_active(status: str | None) -> bool:
    raw = (status or "open").strip().lower()
    return raw in ("open", "escalated")


async def touch_visitor_presence(
    db: AsyncSession,
    *,
    user_id: UUID,
    conversation_id: UUID,
    visitor_id: str,
) -> None:
    """Record a widget heartbeat when visitor_id matches the conversation."""
    vid = (visitor_id or "").strip()
    if not vid:
        return
    await db.execute(
        text(
            f"""
            update public.conversations
            set metadata = coalesce(metadata, '{{}}'::jsonb)
                || jsonb_build_object('{VISITOR_LAST_SEEN_META_KEY}', to_jsonb(now())),
                updated_at = now()
            where id = cast(:conversation_id as uuid)
              and user_id = cast(:user_id as uuid)
              and visitor_id = :visitor_id
            """
        ),
        {
            "conversation_id": str(conversation_id),
            "user_id": str(user_id),
            "visitor_id": vid,
        },
    )
    await db.commit()


def presence_fields_from_row(
    *,
    status: str | None,
    metadata: Any,
    now: datetime | None = None,
) -> dict[str, bool]:
    meta = _normalize_metadata(metadata)
    return {
        "conversation_active": conversation_is_active(status),
        "visitor_online": visitor_is_online(meta, now=now),
    }


def visitor_email_from_metadata(metadata: dict[str, Any] | None) -> str | None:
    if not metadata:
        return None
    email = (metadata.get("visitor_email") or "").strip()
    return email or None
