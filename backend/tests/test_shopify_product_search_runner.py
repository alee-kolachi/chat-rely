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


def test_resolve_shopify_product_search_query_joins_multi_term_phrase() -> None:
    q, broad = tool_runners._resolve_shopify_product_search_query("do you sell organic coffee beans?")
    assert q == "organic coffee beans"
    assert broad is False


def test_filter_cards_for_customer_relevance_drops_weak_multi_word_search_hits() -> None:
    cards = [
        {"title": "Blue Ski Jacket", "handle": "blue-ski-jacket"},
        {"title": "Red Winter Coat", "handle": "red-winter-coat"},
    ]
    filtered = tool_runners._filter_cards_for_customer_relevance(
        cards,
        shopify_query="organic coffee beans",
        relevance_query="do you sell organic coffee beans?",
    )
    assert filtered == []


def test_filter_cards_for_customer_relevance_requires_single_keyword_in_title() -> None:
    cards = [
        {"title": "The Compare at Price Snowboard", "handle": "snowboard"},
        {"title": "Gift Card", "handle": "gift-card"},
    ]
    filtered = tool_runners._filter_cards_for_customer_relevance(
        cards,
        shopify_query="laptops",
        relevance_query="do you sell laptops?",
    )
    assert filtered == []


def test_filter_cards_for_customer_relevance_drops_single_word_hits() -> None:
    cards = [
        {"title": "The Collection Snowboard: Hydrogen", "handle": "hydrogen-board"},
        {"title": "The Collection Snowboard: Oxygen", "handle": "oxygen-board"},
    ]
    filtered = tool_runners._filter_cards_for_customer_relevance(
        cards,
        shopify_query="hydrogen",
        relevance_query="do you sell farm eggs hydrogen?",
    )
    assert filtered == []


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
async def test_product_search_multi_word_query_filters_fuzzy_shopify_hits(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    async def _fake_shopify_graphql(**kwargs):
        return {
            "data": {
                "products": {
                    "edges": [
                        {
                            "node": {
                                "title": "Blue Ski Jacket",
                                "handle": "blue-ski-jacket",
                                "productType": "jacket",
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
        query="organic coffee beans",
        relevance_query="do you sell organic coffee beans?",
    )
    payload = json.loads(out)
    assert payload["lookup_meta"]["not_found"] is True
    assert "ui_cards" not in payload


@pytest.mark.asyncio
async def test_product_search_relevance_filter_marks_not_found_for_weak_hits(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    async def _fake_shopify_graphql(**kwargs):
        return {
            "data": {
                "products": {
                    "edges": [
                        {
                            "node": {
                                "title": "The Collection Snowboard: Hydrogen",
                                "handle": "hydrogen-board",
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
        query="hydrogen",
        relevance_query="do you sell farm eggs hydrogen?",
    )
    payload = json.loads(out)
    assert payload["lookup_meta"]["not_found"] is True
    assert "ui_cards" not in payload


@pytest.mark.asyncio
async def test_product_search_single_keyword_requires_title_match(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    async def _fake_shopify_graphql(**kwargs):
        return {
            "data": {
                "products": {
                    "edges": [
                        {
                            "node": {
                                "title": "The Compare at Price Snowboard",
                                "handle": "snowboard",
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
        query="laptops",
        relevance_query="do you sell laptops?",
    )
    payload = json.loads(out)
    assert payload["lookup_meta"]["not_found"] is True
    assert "ui_cards" not in payload


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
