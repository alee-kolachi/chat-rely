from datetime import UTC, datetime, timedelta
from uuid import UUID

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import AppError
from app.domains.bootstrap.schemas import (
    BootstrapResponse,
    MeContextResponse,
    PlanDTO,
    ProfileDTO,
    SubscriptionDTO,
    UsageSnapshotDTO,
)


def _month_period(now: datetime) -> tuple[datetime, datetime]:
    start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    next_month_seed = start.replace(day=28) + timedelta(days=4)
    end = next_month_seed.replace(day=1) - timedelta(microseconds=1)
    return start, end


async def _fetch_profile(db: AsyncSession, user_id: UUID) -> ProfileDTO | None:
    result = await db.execute(
        text(
            """
            select id, full_name, avatar_url, timezone, email_notifications_enabled, created_at, updated_at
            from public.profiles
            where id = :user_id
            """
        ),
        {"user_id": str(user_id)},
    )
    row = result.mappings().first()
    return ProfileDTO.model_validate(row) if row else None


async def _ensure_profile(db: AsyncSession, user_id: UUID) -> ProfileDTO:
    profile = await _fetch_profile(db, user_id)
    if profile:
        return profile

    result = await db.execute(
        text(
            """
            insert into public.profiles (id)
            values (:user_id)
            returning id, full_name, avatar_url, timezone, email_notifications_enabled, created_at, updated_at
            """
        ),
        {"user_id": str(user_id)},
    )
    return ProfileDTO.model_validate(result.mappings().one())


async def _fetch_active_subscription_and_plan(
    db: AsyncSession, user_id: UUID
) -> tuple[SubscriptionDTO, PlanDTO] | None:
    result = await db.execute(
        text(
            """
            select
              s.id as subscription_id,
              s.user_id,
              s.plan_id,
              s.status,
              s.current_period_start,
              s.current_period_end,
              s.cancel_at_period_end,
              p.id as plan_id_ref,
              p.slug,
              p.name,
              p.included_conversations,
              p.max_agents,
              p.overage_conversation_cents,
              p.features
            from public.subscriptions s
            join public.plans p on p.id = s.plan_id
            where s.user_id = :user_id
              and s.status in ('trialing', 'active', 'past_due')
            order by s.current_period_end desc
            limit 1
            """
        ),
        {"user_id": str(user_id)},
    )
    row = result.mappings().first()
    if not row:
        return None

    subscription = SubscriptionDTO.model_validate(
        {
            "id": row["subscription_id"],
            "user_id": row["user_id"],
            "plan_id": row["plan_id"],
            "status": row["status"],
            "current_period_start": row["current_period_start"],
            "current_period_end": row["current_period_end"],
            "cancel_at_period_end": row["cancel_at_period_end"],
        }
    )
    plan = PlanDTO.model_validate(
        {
            "id": row["plan_id_ref"],
            "slug": row["slug"],
            "name": row["name"],
            "included_conversations": row["included_conversations"],
            "max_agents": row["max_agents"],
            "overage_conversation_cents": row["overage_conversation_cents"],
            "features": row["features"] or {},
        }
    )
    return subscription, plan


async def _ensure_default_subscription(db: AsyncSession, user_id: UUID) -> tuple[SubscriptionDTO, PlanDTO]:
    existing = await _fetch_active_subscription_and_plan(db, user_id)
    if existing:
        return existing

    starter_result = await db.execute(
        text(
            """
            select id
            from public.plans
            where slug = 'starter' and is_active = true
            limit 1
            """
        )
    )
    starter_row = starter_result.mappings().first()
    if starter_row is None:
        raise AppError(code="plan.not_found", message="Default starter plan is missing", status_code=500)

    period_start, period_end = _month_period(datetime.now(tz=UTC))
    await db.execute(
        text(
            """
            insert into public.subscriptions (
              user_id, plan_id, status, current_period_start, current_period_end, cancel_at_period_end
            ) values (
              :user_id, :plan_id, 'active', :period_start, :period_end, false
            )
            """
        ),
        {
            "user_id": str(user_id),
            "plan_id": str(starter_row["id"]),
            "period_start": period_start,
            "period_end": period_end,
        },
    )
    refreshed = await _fetch_active_subscription_and_plan(db, user_id)
    if refreshed is None:
        raise AppError(code="subscription.bootstrap_failed", message="Failed to create default subscription", status_code=500)
    return refreshed


async def bootstrap_me(db: AsyncSession, user_id: UUID) -> BootstrapResponse:
    profile = await _ensure_profile(db, user_id)
    subscription, plan = await _ensure_default_subscription(db, user_id)
    await db.commit()
    return BootstrapResponse(profile=profile, subscription=subscription, plan=plan)


async def fetch_me_context(db: AsyncSession, user_id: UUID) -> MeContextResponse:
    profile = await _ensure_profile(db, user_id)
    subscription, plan = await _ensure_default_subscription(db, user_id)

    usage_result = await db.execute(
        text(
            """
            select
              period_start,
              period_end,
              included_conversations,
              billable_conversations,
              overage_conversations,
              estimated_overage_cents,
              throttle_tier
            from public.usage_period_snapshots
            where user_id = :user_id
            order by period_end desc
            limit 1
            """
        ),
        {"user_id": str(user_id)},
    )
    usage_row = usage_result.mappings().first()
    await db.commit()

    usage_snapshot = UsageSnapshotDTO.model_validate(usage_row) if usage_row else None
    return MeContextResponse(profile=profile, subscription=subscription, plan=plan, usage_snapshot=usage_snapshot)

