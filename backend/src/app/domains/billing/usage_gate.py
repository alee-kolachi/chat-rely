"""Runtime enforcement: block assistant replies when billable usage exceeds the plan included amount."""

from __future__ import annotations

from datetime import UTC
from uuid import UUID

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import AppError


async def assert_plan_usage_allows_assistant_reply(db: AsyncSession, user_id: UUID) -> None:
    """Raises AppError 429 when throttle_tier is ``strong`` (billable above included_conversations)."""
    sub = (
        await db.execute(
            text(
                """
                select
                  s.id as subscription_id,
                  s.current_period_start,
                  s.current_period_end
                from public.subscriptions s
                where s.user_id = cast(:uid as uuid)
                  and s.status in ('trialing', 'active', 'past_due')
                order by s.current_period_end desc
                limit 1
                """
            ),
            {"uid": str(user_id)},
        )
    ).mappings().first()
    if not sub:
        return

    ps = sub["current_period_start"].astimezone(UTC).date()
    pe = sub["current_period_end"].astimezone(UTC).date()
    await db.execute(
        text(
            "select public.refresh_usage_period_snapshot(cast(:uid as uuid), cast(:ps as date), cast(:pe as date))"
        ),
        {"uid": str(user_id), "ps": ps, "pe": pe},
    )
    snap = (
        await db.execute(
            text(
                """
                select throttle_tier::text as throttle_tier
                from public.usage_period_snapshots
                where user_id = cast(:uid as uuid)
                  and period_start = :ps
                  and period_end = :pe
                """
            ),
            {"uid": str(user_id), "ps": ps, "pe": pe},
        )
    ).mappings().first()
    if not snap:
        return
    tier = str(snap.get("throttle_tier") or "")
    if tier == "strong":
        raise AppError(
            code="plan.usage_limit_exceeded",
            message="This workspace has exceeded its included billable conversations for this period. "
            "Upgrade your plan or wait for the next billing period.",
            status_code=429,
        )
