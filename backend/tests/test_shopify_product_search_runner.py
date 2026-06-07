import json

import pytest

from app.domains.integrations.shopify import tool_runners


def test_strip_catalog_search_noise_removes_emoji_prefix() -> None:
    assert tool_runners._strip_catalog_search_noise("👢 boots") == "boots"
    assert tool_runners._strip_catalog_search_noise("👢boots") == "boots"


def test_strip_catalog_search_noise_preserves_shopify_filters() -> None:
    assert (
        tool_runners._strip_catalog_search_noise("published_status:published")
        == "published_status:published"
    )


def test_resolve_shopify_product_search_query_broad_catalog() -> None:
    q, broad = tool_runners._resolve_shopify_product_search_query("what do you sell")
    assert q == "published_status:published"
    assert broad is True
    q2, broad2 = tool_runners._resolve_shopify_product_search_query("what do you sell then?")
    assert q2 == "published_status:published"
    assert broad2 is True


def test_resolve_shopify_product_search_query_keyword() -> None:
    q, broad = tool_runners._resolve_shopify_product_search_query("snowboard")
    assert q == "snowboard"
    assert broad is False
    q2, _ = tool_runners._resolve_shopify_product_search_query("Do you guys sell snowboard?")
    assert q2 == "snowboard"


def test_needs_broad_catalog_retry_false_when_category_present() -> None:
    assert tool_runners._needs_broad_catalog_retry("Do you sell clothes?") is False
    assert tool_runners._needs_broad_catalog_retry("what do you sell") is True


@pytest.mark.asyncio
async def test_product_search_strips_emoji_before_shopify_query(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    calls: list[str] = []

    async def _fake_shopify_graphql(**kwargs):
        q = str((kwargs.get("variables") or {}).get("q") or "")
        calls.append(q)
        return {"data": {"products": {"edges": [{"node": {"title": "Leather Boot"}}]}}}

    monkeypatch.setattr(tool_runners, "shopify_graphql", _fake_shopify_graphql)
    out = await tool_runners.run_product_search(
        shop_domain="example.myshopify.com",
        access_token="tok",
        query="👢 boots",
    )
    payload = json.loads(out)
    assert calls == ["boots"]
    assert len(payload["data"]["products"]["edges"]) == 1
    assert payload["lookup_meta"]["not_found"] is False


@pytest.mark.asyncio
async def test_product_search_reports_not_found_for_empty_results(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    async def _fake_shopify_graphql(**kwargs):
        return {"data": {"products": {"edges": []}}}

    monkeypatch.setattr(tool_runners, "shopify_graphql", _fake_shopify_graphql)
    out = await tool_runners.run_product_search(
        shop_domain="example.myshopify.com",
        access_token="tok",
        query="iPhone",
    )
    payload = json.loads(out)
    assert payload["lookup_meta"]["result_count"] == 0
    assert payload["lookup_meta"]["not_found"] is True


@pytest.mark.asyncio
async def test_product_search_generic_catalog_question_uses_broad_fallback(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    calls: list[str] = []

    async def _fake_shopify_graphql(**kwargs):
        q = str((kwargs.get("variables") or {}).get("q") or "")
        calls.append(q)
        return {"data": {"products": {"edges": [{"node": {"title": "Any Product"}}]}}}

    monkeypatch.setattr(tool_runners, "shopify_graphql", _fake_shopify_graphql)
    out = await tool_runners.run_product_search(
        shop_domain="example.myshopify.com",
        access_token="tok",
        query="what do you sell",
    )
    payload = json.loads(out)
    assert calls == ["published_status:published"]
    assert payload["lookup_meta"]["not_found"] is False


@pytest.mark.asyncio
async def test_product_search_what_do_you_sell_then_returns_catalog(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    calls: list[str] = []

    async def _fake_shopify_graphql(**kwargs):
        q = str((kwargs.get("variables") or {}).get("q") or "")
        calls.append(q)
        return {
            "data": {
                "products": {
                    "edges": [
                        {"node": {"title": "The Minimal Snowboard", "productType": "snowboard"}},
                        {"node": {"title": "Gift Card", "productType": "Gift Card"}},
                    ]
                }
            }
        }

    monkeypatch.setattr(tool_runners, "shopify_graphql", _fake_shopify_graphql)
    out = await tool_runners.run_product_search(
        shop_domain="example.myshopify.com",
        access_token="tok",
        query="what do you sell then?",
    )
    payload = json.loads(out)
    assert calls == ["published_status:published"]
    assert payload["lookup_meta"]["not_found"] is False
    assert len(payload["data"]["products"]["edges"]) == 2


@pytest.mark.asyncio
async def test_product_search_trusts_model_keyword_query(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    calls: list[str] = []

    async def _fake_shopify_graphql(**kwargs):
        q = str((kwargs.get("variables") or {}).get("q") or "")
        calls.append(q)
        return {
            "data": {
                "products": {
                    "edges": [
                        {
                            "node": {
                                "title": "The Minimal Snowboard",
                                "handle": "the-minimal-snowboard",
                                "productType": "snowboard",
                            }
                        }
                    ]
                }
            }
        }

    monkeypatch.setattr(tool_runners, "shopify_graphql", _fake_shopify_graphql)
    out = await tool_runners.run_product_search(
        shop_domain="example.myshopify.com",
        access_token="tok",
        query="snowboard",
    )
    payload = json.loads(out)
    assert calls == ["snowboard"]
    assert payload["lookup_meta"]["not_found"] is False


def test_product_search_max_results_from_config() -> None:
    from app.domains.runtime.shopify_lc_tools import _product_search_max_results_from_config

    assert _product_search_max_results_from_config(None) == 5
    assert _product_search_max_results_from_config({}) == 5
    assert _product_search_max_results_from_config({"maxResults": 8}) == 8
    assert _product_search_max_results_from_config({"max_results": 3}) == 3
    assert _product_search_max_results_from_config({"maxResults": 99}) == 20
    assert _product_search_max_results_from_config({"maxResults": "bad"}) == 5
