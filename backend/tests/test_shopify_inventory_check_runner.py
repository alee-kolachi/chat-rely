import json

import pytest

from app.domains.integrations.shopify import tool_runners


@pytest.mark.asyncio
async def test_inventory_check_reports_not_found_for_sku(monkeypatch: pytest.MonkeyPatch) -> None:
    async def _fake_shopify_graphql(**kwargs):
        assert kwargs["variables"]["q"] == "sku:FAKE-SKU-999"
        return {"data": {"products": {"edges": []}}}

    monkeypatch.setattr(tool_runners, "shopify_graphql", _fake_shopify_graphql)
    out = await tool_runners.run_inventory_check(
        shop_domain="example.myshopify.com",
        access_token="tok",
        sku="FAKE-SKU-999",
    )
    payload = json.loads(out)
    assert payload["lookup_meta"]["result_count"] == 0
    assert payload["lookup_meta"]["not_found"] is True
    assert payload["lookup_meta"]["sku_queried"] == "FAKE-SKU-999"
    assert payload["lookup_meta"]["query"] == "sku:FAKE-SKU-999"
    assert "message" in payload["lookup_meta"]
    assert payload["data"]["products"]["edges"] == []


@pytest.mark.asyncio
async def test_inventory_check_reports_not_found_for_product_query(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    async def _fake_shopify_graphql(**kwargs):
        assert kwargs["variables"]["q"] == "nonexistent widget"
        return {"data": {"products": {"edges": []}}}

    monkeypatch.setattr(tool_runners, "shopify_graphql", _fake_shopify_graphql)
    out = await tool_runners.run_inventory_check(
        shop_domain="example.myshopify.com",
        access_token="tok",
        product_query="nonexistent widget",
    )
    payload = json.loads(out)
    assert payload["lookup_meta"]["result_count"] == 0
    assert payload["lookup_meta"]["not_found"] is True
    assert payload["lookup_meta"]["product_query"] == "nonexistent widget"
    assert payload["lookup_meta"]["query"] == "nonexistent widget"
    assert "message" in payload["lookup_meta"]


@pytest.mark.asyncio
async def test_inventory_check_returns_product_data(monkeypatch: pytest.MonkeyPatch) -> None:
    async def _fake_shopify_graphql(**kwargs):
        return {
            "data": {
                "products": {
                    "edges": [
                        {
                            "node": {
                                "title": "Blue Widget",
                                "variants": {
                                    "edges": [
                                        {
                                            "node": {
                                                "sku": "WIDGET-001",
                                                "inventoryQuantity": 12,
                                            }
                                        }
                                    ]
                                },
                            }
                        }
                    ]
                }
            }
        }

    monkeypatch.setattr(tool_runners, "shopify_graphql", _fake_shopify_graphql)
    out = await tool_runners.run_inventory_check(
        shop_domain="example.myshopify.com",
        access_token="tok",
        sku="WIDGET-001",
    )
    payload = json.loads(out)
    assert payload["lookup_meta"]["result_count"] == 1
    assert payload["lookup_meta"]["not_found"] is False
    assert "message" not in payload["lookup_meta"]
    assert payload["data"]["products"]["edges"][0]["node"]["title"] == "Blue Widget"
