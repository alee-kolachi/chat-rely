import json

import pytest

from app.domains.integrations.shopify import tool_runners


def _product_node(*, title: str, handle: str, amount: str, product_type: str = "Snowboard") -> dict:
    return {
        "title": title,
        "handle": handle,
        "productType": product_type,
        "priceRangeV2": {
            "minVariantPrice": {
                "amount": amount,
                "currencyCode": "USD",
            }
        },
    }


def test_compute_catalog_analysis_stats() -> None:
    nodes = [
        _product_node(title="Ski Wax", handle="ski-wax", amount="9.95", product_type="Accessory"),
        _product_node(title="Hydrogen Board", handle="hydrogen", amount="600.00"),
        _product_node(title="Videographer Board", handle="videographer", amount="885.95"),
    ]
    analysis = tool_runners._compute_catalog_analysis(nodes, question="average price")
    assert analysis["count"] == 3
    assert analysis["currency"] == "USD"
    assert analysis["min_price"] == 9.95
    assert analysis["max_price"] == 885.95
    assert analysis["average_price"] == pytest.approx(498.63, rel=1e-4)
    assert analysis["cheapest"][0]["title"] == "Ski Wax"
    assert analysis["most_expensive"][0]["title"] == "Videographer Board"
    assert analysis["by_product_type"]["Snowboard"] == 2
    assert analysis["by_product_type"]["Accessory"] == 1


def test_compute_catalog_analysis_empty() -> None:
    analysis = tool_runners._compute_catalog_analysis([], question="cheapest item")
    assert analysis["count"] == 0
    assert analysis["cheapest"] == []


@pytest.mark.asyncio
async def test_run_catalog_query_computes_prices(monkeypatch: pytest.MonkeyPatch) -> None:
    async def _fake_shopify_graphql(**kwargs):
        return {
            "data": {
                "products": {
                    "pageInfo": {"hasNextPage": False, "endCursor": None},
                    "edges": [
                        {"node": _product_node(title="Ski Wax", handle="ski-wax", amount="9.95", product_type="Wax")},
                        {"node": _product_node(title="Complete Board", handle="complete", amount="699.95")},
                    ],
                }
            }
        }

    monkeypatch.setattr(tool_runners, "shopify_graphql", _fake_shopify_graphql)
    out = await tool_runners.run_catalog_query(
        shop_domain="example.myshopify.com",
        access_token="tok",
        filter_query="published_status:published",
        question="cheapest item",
    )
    payload = json.loads(out)
    assert "ui_cards" not in payload
    assert "data" not in payload
    analysis = payload["analysis"]
    assert analysis["count"] == 2
    assert analysis["cheapest"][0]["handle"] == "ski-wax"
    assert payload["lookup_meta"]["not_found"] is False


@pytest.mark.asyncio
async def test_run_catalog_query_empty_catalog(monkeypatch: pytest.MonkeyPatch) -> None:
    async def _fake_shopify_graphql(**kwargs):
        return {
            "data": {
                "products": {
                    "pageInfo": {"hasNextPage": False, "endCursor": None},
                    "edges": [],
                }
            }
        }

    monkeypatch.setattr(tool_runners, "shopify_graphql", _fake_shopify_graphql)
    out = await tool_runners.run_catalog_query(
        shop_domain="example.myshopify.com",
        access_token="tok",
        filter_query="boots",
        question="average price of boots",
    )
    payload = json.loads(out)
    assert payload["analysis"]["count"] == 0
    assert payload["lookup_meta"]["not_found"] is True


@pytest.mark.asyncio
async def test_run_catalog_query_broad_filter_normalization(monkeypatch: pytest.MonkeyPatch) -> None:
    calls: list[str] = []

    async def _fake_shopify_graphql(**kwargs):
        q = str((kwargs.get("variables") or {}).get("q") or "")
        calls.append(q)
        return {
            "data": {
                "products": {
                    "pageInfo": {"hasNextPage": False, "endCursor": None},
                    "edges": [
                        {"node": _product_node(title="Board", handle="board", amount="100.00")},
                    ],
                }
            }
        }

    monkeypatch.setattr(tool_runners, "shopify_graphql", _fake_shopify_graphql)
    out = await tool_runners.run_catalog_query(
        shop_domain="example.myshopify.com",
        access_token="tok",
        filter_query="what do you sell",
        question="average price",
    )
    payload = json.loads(out)
    assert calls == ["published_status:published"]
    assert payload["analysis"]["count"] == 1
    assert payload["lookup_meta"]["not_found"] is False
