"""Map plan slugs to Stripe Price IDs from settings."""

from __future__ import annotations

from app.core.settings import Settings, get_settings


def monthly_price_id_for_slug(settings: Settings, plan_slug: str) -> str | None:
    slug = plan_slug.strip().lower()
    if slug == "starter":
        return _nz(settings.stripe_price_starter_monthly)
    if slug == "growth":
        return _nz(settings.stripe_price_growth_monthly)
    if slug == "pro":
        return _nz(settings.stripe_price_pro_monthly)
    if slug == "scale":
        return _nz(settings.stripe_price_scale_monthly)
    return None


def slug_for_price_id(settings: Settings, price_id: str) -> str | None:
    pid = (price_id or "").strip()
    if not pid:
        return None
    if _nz(settings.stripe_price_starter_monthly) == pid:
        return "starter"
    if _nz(settings.stripe_price_growth_monthly) == pid:
        return "growth"
    if _nz(settings.stripe_price_pro_monthly) == pid:
        return "pro"
    if _nz(settings.stripe_price_scale_monthly) == pid:
        return "scale"
    return None


def paid_checkout_slugs(settings: Settings | None = None) -> tuple[str, ...]:
    s = settings or get_settings()
    out: list[str] = []
    for slug in ("starter", "growth", "pro", "scale"):
        if monthly_price_id_for_slug(s, slug):
            out.append(slug)
    return tuple(out)


def _nz(v: str | None) -> str | None:
    x = (v or "").strip()
    return x or None
