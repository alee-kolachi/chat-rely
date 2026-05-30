import json

import pytest

from app.domains.integrations.shopify import tool_runners


@pytest.mark.asyncio
async def test_customer_context_reports_not_found(monkeypatch: pytest.MonkeyPatch) -> None:
    async def _fake_shopify_graphql(**kwargs):
        assert kwargs["variables"]["q"] == "email:merchant-test@example.com"
        return {"data": {"customers": {"edges": []}}}

    monkeypatch.setattr(tool_runners, "shopify_graphql", _fake_shopify_graphql)
    out = await tool_runners.run_customer_context(
        shop_domain="example.myshopify.com",
        access_token="tok",
        email="merchant-test@example.com",
    )
    payload = json.loads(out)
    assert payload["lookup_meta"]["result_count"] == 0
    assert payload["lookup_meta"]["not_found"] is True
    assert payload["lookup_meta"]["email_queried"] == "merchant-test@example.com"
    assert "message" in payload["lookup_meta"]
    assert payload["data"]["customers"]["edges"] == []


@pytest.mark.asyncio
async def test_customer_context_returns_customer_data(monkeypatch: pytest.MonkeyPatch) -> None:
    async def _fake_shopify_graphql(**kwargs):
        return {
            "data": {
                "customers": {
                    "edges": [{"node": {"email": "shopper@example.com", "numberOfOrders": 3}}]
                }
            }
        }

    monkeypatch.setattr(tool_runners, "shopify_graphql", _fake_shopify_graphql)
    out = await tool_runners.run_customer_context(
        shop_domain="example.myshopify.com",
        access_token="tok",
        email="shopper@example.com",
    )
    payload = json.loads(out)
    assert payload["lookup_meta"]["result_count"] == 1
    assert payload["lookup_meta"]["not_found"] is False
    assert "message" not in payload["lookup_meta"]
