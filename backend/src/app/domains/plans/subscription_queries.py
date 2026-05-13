"""Shared read-only subscription ↔ plan lookups (no side effects)."""

from __future__ import annotations

from uuid import UUID

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession


async def fetch_active_plan_slug(db: AsyncSession, user_id: UUID) -> str | None:
    """Latest active subscription's plan slug for the user, if any."""
    row = (
        await db.execute(
            text(
                """
                select p.slug::text as slug
                from public.subscriptions s
                join public.plans p on p.id = s.plan_id
                where s.user_id = cast(:uid as uuid)
                  and s.status in ('trialing', 'active', 'past_due')
                order by s.current_period_end desc
                limit 1
                """
            ),
            {"uid": str(user_id)},
        )
    ).mappings().first()
    if not row or not row.get("slug"):
        return None
    return str(row["slug"])
