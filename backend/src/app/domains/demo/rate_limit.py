"""Rate limits for public demo chat."""

from __future__ import annotations

from uuid import UUID

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import AppError
from app.domains.demo.constants import DEMO_LIFETIME_MESSAGE_CAP, DEMO_PER_VISITOR_MESSAGE_CAP
from app.domains.demo.repository import fetch_demo_by_agent_id


async def _visitor_message_count(db: AsyncSession, *, agent_id: UUID, visitor_id: str) -> int:
    row = (
        await db.execute(
            text(
                """
                select message_count
                from public.demo_visitor_usage
                where demo_agent_id = cast(:agent_id as uuid) and visitor_id = :visitor_id
                limit 1
                """
            ),
            {"agent_id": str(agent_id), "visitor_id": visitor_id.strip()},
        )
    ).mappings().first()
    return int(row["message_count"] or 0) if row else 0


async def enforce_demo_chat_limits(
    db: AsyncSession,
    *,
    agent_id: UUID,
    visitor_id: str,
) -> None:
    demo = await fetch_demo_by_agent_id(db, agent_id)
    if demo is None:
        raise AppError(code="demo.not_found", message="Demo not found", status_code=404)
    if demo.status != "ready":
        raise AppError(
            code="demo.not_ready",
            message="This demo is still being prepared.",
            status_code=503,
        )
    if demo.lifetime_message_count >= DEMO_LIFETIME_MESSAGE_CAP:
        raise AppError(
            code="demo.limit_reached",
            message="This demo has reached its message limit.",
            status_code=429,
        )

    visitor_count = await _visitor_message_count(db, agent_id=agent_id, visitor_id=visitor_id)
    if visitor_count >= DEMO_PER_VISITOR_MESSAGE_CAP:
        raise AppError(
            code="demo.visitor_limit_reached",
            message="You have reached the message limit for this demo.",
            status_code=429,
        )


async def record_demo_chat_message(
    db: AsyncSession,
    *,
    agent_id: UUID,
    visitor_id: str,
) -> None:
    await db.execute(
        text(
            """
            insert into public.demo_visitor_usage (demo_agent_id, visitor_id, message_count, updated_at)
            values (cast(:agent_id as uuid), :visitor_id, 1, now())
            on conflict (demo_agent_id, visitor_id)
            do update set
              message_count = public.demo_visitor_usage.message_count + 1,
              updated_at = now()
            """
        ),
        {"agent_id": str(agent_id), "visitor_id": visitor_id.strip()},
    )
    await db.execute(
        text(
            """
            update public.demo_outreach
            set lifetime_message_count = lifetime_message_count + 1
            where agent_id = cast(:agent_id as uuid)
            """
        ),
        {"agent_id": str(agent_id)},
    )
    await db.commit()
