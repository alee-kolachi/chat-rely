"""Shopify connection positive/negative in-process cache invalidation."""

from uuid import uuid4

from app.domains.integrations.shopify import service as shopify_service


def test_invalidate_clears_negative_cache() -> None:
    agent_id = uuid4()
    shopify_service.mark_shopify_disconnected_cached(agent_id)
    assert shopify_service.is_shopify_disconnected_cached(agent_id)

    shopify_service.invalidate_shopify_connection_cache(agent_id)

    assert not shopify_service.is_shopify_disconnected_cached(agent_id)
    assert shopify_service.get_cached_shopify_connection(agent_id) is None


def test_prime_connection_cache_clears_negative_cache() -> None:
    agent_id = uuid4()
    shopify_service.mark_shopify_disconnected_cached(agent_id)
    assert shopify_service.is_shopify_disconnected_cached(agent_id)

    shopify_service._prime_shopify_connection_cache(
        agent_id,
        shop_domain="demo.myshopify.com",
        access_token="shpat_test",
        token_response={"expires_in": 3600, "refresh_token": "shprt_test"},
    )

    assert not shopify_service.is_shopify_disconnected_cached(agent_id)
    cached = shopify_service.get_cached_shopify_connection(agent_id)
    assert cached == ("demo.myshopify.com", "shpat_test")


def test_disconnect_flow_marks_negative_after_invalidate(monkeypatch) -> None:
    agent_id = uuid4()
    shopify_service._prime_shopify_connection_cache(
        agent_id,
        shop_domain="demo.myshopify.com",
        access_token="shpat_test",
        token_response={"expires_in": 3600},
    )
    assert shopify_service.get_cached_shopify_connection(agent_id) is not None

    shopify_service.invalidate_shopify_connection_cache(agent_id)
    shopify_service.mark_shopify_disconnected_cached(agent_id)

    assert shopify_service.get_cached_shopify_connection(agent_id) is None
    assert shopify_service.is_shopify_disconnected_cached(agent_id)
