"""Stripe Checkout for plan subscriptions."""

from __future__ import annotations

from uuid import UUID

import stripe
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import AppError
from app.core.settings import get_settings
from app.domains.billing.customers import ensure_stripe_customer_for_user, fetch_auth_user_email
from app.domains.billing.price_map import monthly_price_id_for_slug, paid_checkout_slugs
from app.domains.billing.stripe_client import configure_stripe


async def create_subscription_checkout_session(
    db: AsyncSession,
    *,
    user_id: UUID,
    plan_slug: str,
    interval: str = "month",
) -> str:
    if interval.lower() != "month":
        raise AppError(
            code="billing.interval_not_supported",
            message="Only monthly checkout is configured",
            status_code=400,
        )
    slug = plan_slug.strip().lower()
    settings = get_settings()
    if slug not in paid_checkout_slugs(settings):
        raise AppError(
            code="billing.invalid_plan",
            message="Unknown plan or no Stripe price configured for this plan",
            status_code=400,
        )

    price_id = monthly_price_id_for_slug(settings, slug)
    if not price_id:
        raise AppError(code="billing.price_not_configured", message="Stripe price not configured", status_code=503)

    if not price_id.startswith("price_"):
        raise AppError(
            code="billing.invalid_price_id",
            message="Stripe monthly env vars must be recurring Price IDs (price_...), not Product IDs (prod_...).",
            status_code=503,
        )

    configure_stripe()
    email = await fetch_auth_user_email(db, user_id)
    customer_id = await ensure_stripe_customer_for_user(db, user_id=user_id, email=email)
    if not customer_id:
        raise AppError(
            code="stripe.not_configured",
            message="Stripe is not configured (missing STRIPE_SECRET_KEY)",
            status_code=503,
        )

    res = await db.execute(
        text("select id from public.plans where slug = :slug and is_active = true limit 1"),
        {"slug": slug},
    )
    prow = res.mappings().first()
    if not prow:
        raise AppError(code="plan.not_found", message="Plan not found", status_code=404)

    base = settings.billing_app_base_url.rstrip("/")
    success_url = f"{base}/account/plan?checkout=success"
    cancel_url = f"{base}/account/plan?checkout=cancel"

    try:
        session = stripe.checkout.Session.create(
            mode="subscription",
            customer=customer_id,
            line_items=[{"price": price_id, "quantity": 1}],
            success_url=success_url,
            cancel_url=cancel_url,
            client_reference_id=str(user_id),
            metadata={
                "user_id": str(user_id),
                "plan_slug": slug,
            },
            subscription_data={
                "metadata": {
                    "user_id": str(user_id),
                    "plan_slug": slug,
                }
            },
        )
    except stripe.StripeError as exc:
        raise AppError(
            code="stripe.checkout_failed",
            message="Could not start Checkout session",
            status_code=502,
            details={"stripe": str(exc)[:400]},
        ) from exc

    url = session.url
    if not url:
        raise AppError(code="stripe.checkout_failed", message="Checkout session missing URL", status_code=502)
    return str(url)


async def change_subscription_plan(
    db: AsyncSession,
    *,
    user_id: UUID,
    new_plan_slug: str,
    proration_behavior: str = "create_prorations",
) -> None:
    """
    Immediate plan change on the existing Stripe subscription (proration default: charge/credit prorations).
    DB is updated when Stripe sends customer.subscription.updated.
    """
    slug = new_plan_slug.strip().lower()
    settings = get_settings()
    new_price = monthly_price_id_for_slug(settings, slug)
    if not new_price or slug not in paid_checkout_slugs(settings):
        raise AppError(
            code="billing.invalid_plan",
            message="Unknown plan or no Stripe price configured",
            status_code=400,
        )
    if not new_price.startswith("price_"):
        raise AppError(code="billing.invalid_price_id", message="Price id must start with price_", status_code=503)

    sub_res = await db.execute(
        text(
            """
            select provider_subscription_id
            from public.subscriptions
            where user_id = cast(:uid as uuid)
            order by created_at desc
            limit 1
            """
        ),
        {"uid": str(user_id)},
    )
    sub_row = sub_res.mappings().first()
    stripe_sub_id = str(sub_row["provider_subscription_id"]).strip() if sub_row else ""
    if not stripe_sub_id:
        raise AppError(
            code="billing.no_stripe_subscription",
            message="No active Stripe subscription to change; use Checkout to subscribe first",
            status_code=400,
        )

    configure_stripe()
    try:
        sub = stripe.Subscription.retrieve(stripe_sub_id, expand=["items.data.price"])
        items_data = sub["items"]["data"]
        if not items_data:
            raise AppError(
                code="billing.subscription_items_missing",
                message="Subscription has no items",
                status_code=502,
            )
        item_id = items_data[0]["id"]
        stripe.Subscription.modify(
            stripe_sub_id,
            items=[{"id": item_id, "price": new_price}],
            proration_behavior=proration_behavior,
            metadata={"user_id": str(user_id), "plan_slug": slug},
        )
    except stripe.StripeError as exc:
        raise AppError(
            code="stripe.subscription_modify_failed",
            message="Could not update subscription in Stripe",
            status_code=502,
            details={"stripe": str(exc)[:400]},
        ) from exc


async def create_billing_portal_session(db: AsyncSession, *, user_id: UUID) -> str:
    """
    Stripe Customer Portal — payment methods, invoices, cancellation (configurable in Stripe Dashboard).
    """
    configure_stripe()
    settings = get_settings()
    if not (settings.stripe_secret_key or "").strip():
        raise AppError(code="stripe.not_configured", message="Stripe is not configured", status_code=503)

    email = await fetch_auth_user_email(db, user_id)
    customer_id = await ensure_stripe_customer_for_user(db, user_id=user_id, email=email)
    if not customer_id:
        raise AppError(
            code="stripe.customer_missing",
            message="Could not resolve Stripe customer for this account",
            status_code=503,
        )

    base = settings.billing_app_base_url.rstrip("/")
    return_url = f"{base}/account/billing?portal=return"

    try:
        session = stripe.billing_portal.Session.create(
            customer=customer_id,
            return_url=return_url,
        )
    except stripe.StripeError as exc:
        raise AppError(
            code="stripe.portal_failed",
            message="Could not open billing portal",
            status_code=502,
            details={"stripe": str(exc)[:400]},
        ) from exc

    url = getattr(session, "url", None)
    if not url:
        raise AppError(code="stripe.portal_failed", message="Billing portal session missing URL", status_code=502)
    return str(url)
