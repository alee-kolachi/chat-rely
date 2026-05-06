"""Stripe webhook verification and dispatch."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta
from typing import Any
from uuid import UUID

import stripe
import structlog
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.settings import get_settings
from app.domains.billing.stripe_client import configure_stripe
from app.domains.billing.subscription_sync import (
    fetch_stripe_subscription,
    move_user_to_free_after_stripe_subscription_deleted,
    resolve_plan_id_for_stripe_subscription,
    upsert_user_subscription_from_stripe,
)

log = structlog.get_logger(__name__)


async def claim_stripe_event(db: AsyncSession, *, stripe_event_id: str, event_type: str) -> bool:
    """Return True if this worker should process the event (first claim)."""
    res = await db.execute(
        text(
            """
            insert into public.stripe_webhook_events (stripe_event_id, event_type)
            values (:eid, :etype)
            on conflict (stripe_event_id) do nothing
            returning id
            """
        ),
        {"eid": stripe_event_id, "etype": event_type},
    )
    return res.fetchone() is not None


def verify_stripe_payload(*, payload: bytes, sig_header: str | None) -> stripe.Event:
    settings = get_settings()
    secret = (settings.stripe_webhook_secret or "").strip()
    if not secret:
        raise ValueError("STRIPE_WEBHOOK_SECRET is not configured")
    if not sig_header:
        raise ValueError("Missing Stripe-Signature header")
    configure_stripe()
    return stripe.Webhook.construct_event(payload=payload, sig_header=sig_header, secret=secret)


def _stripe_obj_to_dict(obj: Any) -> dict[str, Any]:
    if isinstance(obj, dict):
        return obj
    fn = getattr(obj, "to_dict", None)
    if callable(fn):
        return fn()
    return {}


def _uuid_from_meta(meta: dict[str, Any] | None, key: str) -> UUID | None:
    if not meta:
        return None
    raw = meta.get(key)
    if not raw:
        return None
    try:
        return UUID(str(raw))
    except ValueError:
        return None


def _coerce_unix_ts(value: Any) -> int | None:
    if value is None:
        return None
    try:
        return int(value)
    except (TypeError, ValueError):
        return None


def _extract_subscription_period_bounds(stripe_sub: dict[str, Any]) -> tuple[datetime, datetime]:
    """Return billing period bounds from either subscription or subscription item payload."""
    start = _coerce_unix_ts(stripe_sub.get("current_period_start"))
    end = _coerce_unix_ts(stripe_sub.get("current_period_end"))

    if start is None or end is None:
        items = stripe_sub.get("items") or {}
        data = items.get("data") if isinstance(items, dict) else None
        first = data[0] if isinstance(data, list) and data else {}
        if isinstance(first, dict):
            start = start or _coerce_unix_ts(first.get("current_period_start"))
            end = end or _coerce_unix_ts(first.get("current_period_end"))

    if start is None:
        start = int(datetime.now(tz=UTC).timestamp())
    if end is None:
        end = int((datetime.fromtimestamp(start, tz=UTC) + timedelta(days=31)).timestamp())
    if end <= start:
        end = int((datetime.fromtimestamp(start, tz=UTC) + timedelta(days=1)).timestamp())

    return datetime.fromtimestamp(start, tz=UTC), datetime.fromtimestamp(end, tz=UTC)


async def _handle_checkout_session_completed(db: AsyncSession, data: dict[str, Any]) -> None:
    mode = data.get("mode")
    if mode != "subscription":
        return
    sub_id = data.get("subscription")
    cust_id = data.get("customer")
    if not sub_id or not cust_id:
        log.warning("stripe.checkout.missing_sub_or_customer", session_id=data.get("id"))
        return

    meta = data.get("metadata") or {}
    user_id = _uuid_from_meta(meta, "user_id")
    if user_id is None and data.get("client_reference_id"):
        try:
            user_id = UUID(str(data["client_reference_id"]))
        except ValueError:
            user_id = None
    if user_id is None:
        log.warning("stripe.checkout.missing_user", session_id=data.get("id"))
        return

    stripe_sub = await fetch_stripe_subscription(str(sub_id))
    plan_id = await resolve_plan_id_for_stripe_subscription(db, stripe_sub)
    if plan_id is None:
        slug = (meta.get("plan_slug") or "").strip().lower()
        if slug:
            r = await db.execute(
                text("select id from public.plans where slug = :slug and is_active = true limit 1"),
                {"slug": slug},
            )
            row = r.mappings().first()
            if row:
                plan_id = UUID(str(row["id"]))
    if plan_id is None:
        log.error("stripe.checkout.plan_unresolved", user_id=str(user_id), subscription_id=sub_id)
        return

    stripe_sub_dict = _stripe_obj_to_dict(stripe_sub)
    cps, cpe = _extract_subscription_period_bounds(stripe_sub_dict)
    status = str(stripe_sub_dict.get("status") or "active")
    cape = bool(stripe_sub_dict.get("cancel_at_period_end"))

    await upsert_user_subscription_from_stripe(
        db,
        user_id=user_id,
        stripe_customer_id=str(cust_id),
        stripe_subscription_id=str(sub_id),
        plan_id=plan_id,
        status=status,
        current_period_start=cps,
        current_period_end=cpe,
        cancel_at_period_end=cape,
    )


async def _handle_subscription_updated(db: AsyncSession, obj: dict[str, Any]) -> None:
    sub_id = str(obj.get("id") or "")
    cust_id = str(obj.get("customer") or "")
    meta = obj.get("metadata") or {}
    user_id = _uuid_from_meta(meta, "user_id")
    if user_id is None:
        r = await db.execute(
            text(
                """
                select user_id from public.subscriptions
                where provider_subscription_id = :sid
                limit 1
                """
            ),
            {"sid": sub_id},
        )
        row = r.mappings().first()
        if row:
            user_id = UUID(str(row["user_id"]))
    if user_id is None:
        log.warning("stripe.subscription.updated_missing_user", subscription_id=sub_id)
        return

    stripe_sub = await fetch_stripe_subscription(sub_id)
    plan_id = await resolve_plan_id_for_stripe_subscription(db, stripe_sub)
    if plan_id is None:
        slug = (meta.get("plan_slug") or "").strip().lower()
        if slug:
            r = await db.execute(
                text("select id from public.plans where slug = :slug and is_active = true limit 1"),
                {"slug": slug},
            )
            row = r.mappings().first()
            if row:
                plan_id = UUID(str(row["id"]))
    if plan_id is None:
        log.warning("stripe.subscription.updated_plan_unresolved", subscription_id=sub_id)
        return

    stripe_sub_dict = _stripe_obj_to_dict(stripe_sub)
    cps, cpe = _extract_subscription_period_bounds(stripe_sub_dict)
    status = str(stripe_sub_dict.get("status") or "active")
    cape = bool(stripe_sub_dict.get("cancel_at_period_end"))

    await upsert_user_subscription_from_stripe(
        db,
        user_id=user_id,
        stripe_customer_id=cust_id,
        stripe_subscription_id=sub_id,
        plan_id=plan_id,
        status=status,
        current_period_start=cps,
        current_period_end=cpe,
        cancel_at_period_end=cape,
    )


async def _handle_subscription_deleted(db: AsyncSession, obj: dict[str, Any]) -> None:
    sub_id = str(obj.get("id") or "")
    meta = obj.get("metadata") or {}
    user_id = _uuid_from_meta(meta, "user_id")
    if user_id is None:
        r = await db.execute(
            text(
                """
                select user_id from public.subscriptions
                where provider_subscription_id = :sid
                limit 1
                """
            ),
            {"sid": sub_id},
        )
        row = r.mappings().first()
        if row:
            user_id = UUID(str(row["user_id"]))
    if user_id is None:
        log.warning("stripe.subscription.deleted_missing_user", subscription_id=sub_id)
        return

    await move_user_to_free_after_stripe_subscription_deleted(
        db, user_id=user_id, deleted_stripe_subscription_id=sub_id
    )


async def _handle_invoice_paid(db: AsyncSession, obj: dict[str, Any]) -> None:
    sub_id = obj.get("subscription")
    if not sub_id:
        return
    stripe_sub = await fetch_stripe_subscription(str(sub_id))
    await _handle_subscription_updated(db, _stripe_obj_to_dict(stripe_sub))


async def process_stripe_event(db: AsyncSession, event: stripe.Event) -> None:
    etype = str(event.type)
    data_object = event.data.object

    if etype == "checkout.session.completed":
        await _handle_checkout_session_completed(db, _stripe_obj_to_dict(data_object))
        return

    payload = _stripe_obj_to_dict(data_object)

    if etype == "customer.subscription.updated":
        await _handle_subscription_updated(db, payload)
        return
    if etype == "customer.subscription.deleted":
        await _handle_subscription_deleted(db, payload)
        return
    if etype == "invoice.paid":
        await _handle_invoice_paid(db, payload)
        return
