"""Apply Stripe subscription state to public.subscriptions (user workspace)."""

from __future__ import annotations

import json
from datetime import UTC, datetime, timedelta
from typing import Any
from uuid import UUID

import stripe
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import AppError
from app.core.settings import get_settings
from app.domains.billing.price_map import slug_for_price_id
from app.domains.billing.stripe_client import configure_stripe


def _month_period(now: datetime) -> tuple[datetime, datetime]:
    start = now.astimezone(UTC).replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    next_month_seed = start.replace(day=28) + timedelta(days=4)
    end = next_month_seed.replace(day=1) - timedelta(microseconds=1)
    return start, end


def stripe_subscription_status_to_db(stripe_status: str | None) -> str:
    s = (stripe_status or "").strip().lower()
    mapping = {
        "active": "active",
        "trialing": "trialing",
        "past_due": "past_due",
        "canceled": "canceled",
        "unpaid": "unpaid",
        "incomplete": "incomplete",
        "incomplete_expired": "incomplete",
        "paused": "active",
    }
    return mapping.get(s, "active")


def _price_id_from_subscription_item(item: dict[str, Any] | Any) -> str | None:
    if item is None:
        return None
    price = getattr(item, "price", None) if not isinstance(item, dict) else item.get("price")
    if price is None:
        return None
    pid = getattr(price, "id", None)
    if pid:
        return str(pid)
    if isinstance(price, dict):
        return str(price.get("id") or "")
    return None


async def resolve_plan_id_for_stripe_subscription(db: AsyncSession, stripe_sub: Any) -> UUID | None:
    """Map first subscription item price to local plan id."""
    items_obj = getattr(stripe_sub, "items", None)
    if items_obj is None and isinstance(stripe_sub, dict):
        items_obj = stripe_sub.get("items")
    data = getattr(items_obj, "data", None) if items_obj is not None else None
    if data is None and isinstance(items_obj, dict):
        data = items_obj.get("data") or []
    if not data:
        return None
    first = data[0]
    pid = _price_id_from_subscription_item(first)
    if not pid:
        return None
    slug = slug_for_price_id(get_settings(), pid)
    if not slug:
        return None
    res = await db.execute(
        text("select id from public.plans where slug = :slug and is_active = true limit 1"),
        {"slug": slug},
    )
    row = res.mappings().first()
    return UUID(str(row["id"])) if row else None


async def free_plan_id(db: AsyncSession) -> UUID:
    res = await db.execute(
        text("select id from public.plans where slug = 'free' and is_active = true limit 1"),
    )
    row = res.mappings().first()
    if not row:
        raise AppError(code="plan.not_found", message="No active free plan in database", status_code=500)
    return UUID(str(row["id"]))


async def upsert_user_subscription_from_stripe(
    db: AsyncSession,
    *,
    user_id: UUID,
    stripe_customer_id: str,
    stripe_subscription_id: str,
    plan_id: UUID,
    status: str,
    current_period_start: datetime,
    current_period_end: datetime,
    cancel_at_period_end: bool,
) -> None:
    db_status = stripe_subscription_status_to_db(status)
    await db.execute(
        text(
            """
            update public.subscriptions s
            set
              provider_customer_id = :cust,
              provider_subscription_id = :sub,
              plan_id = cast(:plan as uuid),
              status = cast(:st as subscription_status),
              current_period_start = :cps,
              current_period_end = :cpe,
              cancel_at_period_end = :cape,
              updated_at = now()
            from (
              select id from public.subscriptions
              where user_id = cast(:uid as uuid)
              order by created_at desc
              limit 1
            ) pick
            where s.id = pick.id
            """
        ),
        {
            "cust": stripe_customer_id,
            "sub": stripe_subscription_id,
            "plan": str(plan_id),
            "st": db_status,
            "cps": current_period_start,
            "cpe": current_period_end,
            "cape": cancel_at_period_end,
            "uid": str(user_id),
        },
    )


async def move_user_to_free_after_stripe_subscription_deleted(
    db: AsyncSession,
    *,
    user_id: UUID,
    deleted_stripe_subscription_id: str,
) -> None:
    fid = await free_plan_id(db)
    ps, pe = _month_period(datetime.now(tz=UTC))
    meta = {"previous_stripe_subscription_id": deleted_stripe_subscription_id}

    await db.execute(
        text(
            """
            update public.subscriptions s
            set
              plan_id = cast(:fid as uuid),
              status = 'active'::subscription_status,
              provider_subscription_id = null,
              cancel_at_period_end = false,
              current_period_start = :ps,
              current_period_end = :pe,
              metadata = coalesce(s.metadata, '{}'::jsonb) || cast(:meta as jsonb),
              updated_at = now()
            where s.user_id = cast(:uid as uuid)
              and s.provider_subscription_id = :sid
            """
        ),
        {
            "fid": str(fid),
            "ps": ps,
            "pe": pe,
            "meta": json.dumps(meta),
            "uid": str(user_id),
            "sid": deleted_stripe_subscription_id,
        },
    )


async def fetch_stripe_subscription(subscription_id: str) -> Any:
    configure_stripe()
    return stripe.Subscription.retrieve(subscription_id, expand=["items.data.price"])
