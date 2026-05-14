"""Runtime usage snapshot refresh; no conversation overage charges (see refresh_usage_period_snapshot)."""

from __future__ import annotations

from datetime import UTC
from uuid import UUID

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession


async def refresh_plan_usage_snapshot(db: AsyncSession, user_id: UUID) -> str | None:
    """
    Refresh the usage snapshot for the user's current subscription period.

    Returns ``throttle_tier`` as text (``normal`` | ``strong``), or ``None`` if there is no active subscription.
    ``strong`` means conversations used exceed the plan's included amount for the period.
    """
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
        return None

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
        return None
    return str(snap.get("throttle_tier") or "") or None
