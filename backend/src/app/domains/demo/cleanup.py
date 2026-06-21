"""Expire and delete demo outreach agents after TTL."""

from __future__ import annotations

import structlog
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

log = structlog.get_logger("demo.cleanup")


async def expire_due_demos(db: AsyncSession) -> int:
    rows = (
        await db.execute(
            text(
                """
                select d.agent_id
                from public.demo_outreach d
                join public.agents a on a.id = d.agent_id
                where a.is_demo = true
                  and d.expires_at is not null
                  and d.expires_at < now()
                  and d.status in ('ready', 'needs_review', 'failed')
                """
            )
        )
    ).mappings().all()
    deleted = 0
    for row in rows:
        agent_id = str(row["agent_id"])
        await db.execute(
            text("delete from public.agents where id = cast(:agent_id as uuid) and is_demo = true"),
            {"agent_id": agent_id},
        )
        deleted += 1
    if deleted:
        await db.commit()
        log.info("demo.expired_deleted", count=deleted)
    return deleted
