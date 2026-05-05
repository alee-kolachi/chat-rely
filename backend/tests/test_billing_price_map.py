from app.core.settings import Settings
from app.domains.billing.price_map import monthly_price_id_for_slug, paid_checkout_slugs, slug_for_price_id


def test_monthly_price_id_for_slug() -> None:
    s = Settings(
        database_url="postgresql+asyncpg://x@127.0.0.1:1/x",
        supabase_jwks_url="https://example.com/.well-known/jwks.json",
        supabase_issuer="https://example.com/auth/v1",
        stripe_price_starter_monthly="price_a",
        stripe_price_growth_monthly="price_b",
        stripe_price_pro_monthly="price_c",
        stripe_price_scale_monthly="price_d",
    )
    assert monthly_price_id_for_slug(s, "starter") == "price_a"
    assert monthly_price_id_for_slug(s, "growth") == "price_b"
    assert monthly_price_id_for_slug(s, "pro") == "price_c"
    assert monthly_price_id_for_slug(s, "scale") == "price_d"
    assert monthly_price_id_for_slug(s, "free") is None


def test_slug_for_price_id_roundtrip() -> None:
    s = Settings(
        database_url="postgresql+asyncpg://x@127.0.0.1:1/x",
        supabase_jwks_url="https://example.com/.well-known/jwks.json",
        supabase_issuer="https://example.com/auth/v1",
        stripe_price_starter_monthly="price_a",
        stripe_price_growth_monthly="price_b",
    )
    assert slug_for_price_id(s, "price_a") == "starter"
    assert slug_for_price_id(s, "price_b") == "growth"
    assert slug_for_price_id(s, "price_unknown") is None


def test_paid_checkout_slugs_omits_unconfigured() -> None:
    s = Settings(
        database_url="postgresql+asyncpg://x@127.0.0.1:1/x",
        supabase_jwks_url="https://example.com/.well-known/jwks.json",
        supabase_issuer="https://example.com/auth/v1",
        stripe_price_starter_monthly="price_a",
        stripe_price_growth_monthly="",
        stripe_price_pro_monthly=None,
        stripe_price_scale_monthly=None,
    )
    assert paid_checkout_slugs(s) == ("starter",)
