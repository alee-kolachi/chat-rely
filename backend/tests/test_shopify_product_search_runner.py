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


@pytest.mark.asyncio
async def test_product_search_strips_emoji_before_shopify_query(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    calls: list[str] = []

    async def _fake_shopify_graphql(**kwargs):
        q = str((kwargs.get("variables") or {}).get("q") or "")
        calls.append(q)
        if q == "boots":
            return {"data": {"products": {"edges": [{"node": {"title": "Leather Boot"}}]}}}
        return {"data": {"products": {"edges": []}}}

    monkeypatch.setattr(tool_runners, "shopify_graphql", _fake_shopify_graphql)
    out = await tool_runners.run_product_search(
        shop_domain="example.myshopify.com",
        access_token="tok",
        query="👢 boots",
    )
    payload = json.loads(out)
    assert calls[0] == "boots"
    assert len(payload["data"]["products"]["edges"]) == 1
    assert payload["lookup_meta"]["not_found"] is False


@pytest.mark.asyncio
async def test_product_search_strips_attached_emoji(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    calls: list[str] = []

    async def _fake_shopify_graphql(**kwargs):
        q = str((kwargs.get("variables") or {}).get("q") or "")
        calls.append(q)
        if q == "boots":
            return {"data": {"products": {"edges": [{"node": {"title": "Leather Boot"}}]}}}
        return {"data": {"products": {"edges": []}}}

    monkeypatch.setattr(tool_runners, "shopify_graphql", _fake_shopify_graphql)
    out = await tool_runners.run_product_search(
        shop_domain="example.myshopify.com",
        access_token="tok",
        query="👢boots",
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
    assert payload["lookup_meta"]["query"] == "iPhone"
    assert "message" in payload["lookup_meta"]
    assert payload["data"]["products"]["edges"] == []


@pytest.mark.asyncio
async def test_product_search_not_found_after_keyword_retries(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    calls: list[str] = []

    async def _fake_shopify_graphql(**kwargs):
        q = str((kwargs.get("variables") or {}).get("q") or "")
        calls.append(q)
        return {"data": {"products": {"edges": []}}}

    monkeypatch.setattr(tool_runners, "shopify_graphql", _fake_shopify_graphql)
    out = await tool_runners.run_product_search(
        shop_domain="example.myshopify.com",
        access_token="tok",
        query="the Timberland one",
    )
    payload = json.loads(out)
    assert payload["lookup_meta"]["not_found"] is True
    assert calls == ["timberland"]
    assert payload["lookup_meta"]["result_count"] == 0


def test_needs_broad_catalog_retry_false_when_category_present() -> None:
    assert tool_runners._needs_broad_catalog_retry("Do you sell clothes?") is False
    assert tool_runners._needs_broad_catalog_retry("what do you sell") is True


def test_catalog_search_queries_prefers_category_keywords() -> None:
    assert tool_runners._catalog_search_queries("Do you sell clothes?") == [
        "clothes",
        "clothing",
    ]
    assert tool_runners._catalog_search_queries("Do you guys sell snowboard?") == ["snowboard"]


@pytest.mark.asyncio
async def test_product_search_do_you_sell_clothes_skips_broad_catalog(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    calls: list[str] = []

    async def _fake_shopify_graphql(**kwargs):
        q = str((kwargs.get("variables") or {}).get("q") or "")
        calls.append(q)
        return {"data": {"products": {"edges": []}}}

    monkeypatch.setattr(tool_runners, "shopify_graphql", _fake_shopify_graphql)
    out = await tool_runners.run_product_search(
        shop_domain="example.myshopify.com",
        access_token="tok",
        query="Do you sell clothes?",
    )
    payload = json.loads(out)
    assert "published_status:published" not in calls
    assert calls[:2] == ["clothes", "clothing"]
    assert payload["lookup_meta"]["not_found"] is True
    assert payload["lookup_meta"]["retried_broad"] is False


@pytest.mark.asyncio
async def test_product_search_vague_follow_up_returns_not_found(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    calls: list[str] = []

    async def _fake_shopify_graphql(**kwargs):
        q = str((kwargs.get("variables") or {}).get("q") or "")
        calls.append(q)
        return {"data": {"products": {"edges": [{"node": {"title": "VANS Shoe"}}]}}}

    monkeypatch.setattr(tool_runners, "shopify_graphql", _fake_shopify_graphql)
    out = await tool_runners.run_product_search(
        shop_domain="example.myshopify.com",
        access_token="tok",
        query="give me some options that you have got",
    )
    payload = json.loads(out)
    assert calls == []
    assert payload["lookup_meta"]["not_found"] is True


@pytest.mark.asyncio
async def test_product_search_filters_irrelevant_catalog_hits(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    async def _fake_shopify_graphql(**kwargs):
        return {
            "data": {
                "products": {
                    "edges": [
                        {
                            "node": {
                                "title": "VANS | AUTHENTIC SHOE",
                                "handle": "vans-shoe",
                                "productType": "Shoes",
                                "tags": ["footwear"],
                                "onlineStoreUrl": None,
                                "featuredImage": None,
                                "priceRangeV2": {
                                    "minVariantPrice": {"amount": "29.00", "currencyCode": "USD"}
                                },
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
        query="Do you sell clothes?",
    )
    payload = json.loads(out)
    assert payload["lookup_meta"]["not_found"] is True
    assert payload["data"]["products"]["edges"] == []


@pytest.mark.asyncio
async def test_product_search_generic_catalog_question_uses_broad_fallback(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    calls: list[str] = []

    async def _fake_shopify_graphql(**kwargs):
        q = str((kwargs.get("variables") or {}).get("q") or "")
        calls.append(q)
        if q == "published_status:published":
            return {"data": {"products": {"edges": [{"node": {"title": "Any Product"}}]}}}
        return {"data": {"products": {"edges": []}}}

    monkeypatch.setattr(tool_runners, "shopify_graphql", _fake_shopify_graphql)
    out = await tool_runners.run_product_search(
        shop_domain="example.myshopify.com",
        access_token="tok",
        query="what do you sell",
    )
    payload = json.loads(out)
    assert "published_status:published" in calls
    assert payload["lookup_meta"]["not_found"] is False


def test_product_search_max_results_from_config() -> None:
    from app.domains.runtime.shopify_lc_tools import _product_search_max_results_from_config

    assert _product_search_max_results_from_config(None) == 5
    assert _product_search_max_results_from_config({}) == 5
    assert _product_search_max_results_from_config({"maxResults": 8}) == 8
    assert _product_search_max_results_from_config({"max_results": 3}) == 3
    assert _product_search_max_results_from_config({"maxResults": 99}) == 20
    assert _product_search_max_results_from_config({"maxResults": "bad"}) == 5


@pytest.mark.asyncio
async def test_product_search_tool_uses_agent_config_max_results(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    from app.domains.runtime.shopify_lc_tools import build_shopify_langchain_tools

    n_seen: list[int] = []

    async def _fake_shopify_graphql(**kwargs):
        n_seen.append(int((kwargs.get("variables") or {}).get("n") or 0))
        return {"data": {"products": {"edges": []}}}

    monkeypatch.setattr(tool_runners, "shopify_graphql", _fake_shopify_graphql)
    tools = build_shopify_langchain_tools(
        "example.myshopify.com",
        "tok",
        {"shopify.product_search"},
        action_configs={"shopify.product_search": {"maxResults": 7}},
    )
    tool = tools[0]
    await tool.coroutine(query="boots")
    assert n_seen[0] == 7


def test_normalize_product_search_ui_cards_builds_storefront_fields() -> None:
    data = {
        "products": {
            "edges": [
                {
                    "node": {
                        "title": "Navy Linen Button-Up",
                        "handle": "navy-linen",
                        "onlineStoreUrl": "https://store.example.com/products/navy-linen",
                        "featuredImage": {"url": "https://cdn.example.com/navy.jpg"},
                        "priceRangeV2": {
                            "minVariantPrice": {"amount": "78.00", "currencyCode": "USD"}
                        },
                    }
                }
            ]
        }
    }
    cards = tool_runners.normalize_product_search_ui_cards(
        data, "example.myshopify.com", max_results=5
    )
    assert len(cards) == 1
    assert cards[0]["handle"] == "navy-linen"
    assert cards[0]["url"] == "https://store.example.com/products/navy-linen"
    assert cards[0]["price"] == "$78.00"
    assert cards[0]["image_url"] == "https://cdn.example.com/navy.jpg"


@pytest.mark.asyncio
async def test_product_search_includes_ui_cards(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    async def _fake_shopify_graphql(**kwargs):
        return {
            "data": {
                "products": {
                    "edges": [
                        {
                            "node": {
                                "title": "Boot",
                                "handle": "boot",
                                "onlineStoreUrl": None,
                                "featuredImage": None,
                                "priceRangeV2": {
                                    "minVariantPrice": {"amount": "10.00", "currencyCode": "USD"}
                                },
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
        query="boot",
    )
    payload = json.loads(out)
    assert payload["ui_cards"][0]["url"] == "https://example.myshopify.com/products/boot"


@pytest.mark.asyncio
async def test_run_product_details_returns_ui_detail(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    async def _fake_shopify_graphql(**kwargs):
        return {
            "data": {
                "productByHandle": {
                    "title": "Boot",
                    "handle": "boot",
                    "onlineStoreUrl": "https://store.example.com/products/boot",
                    "priceRangeV2": {
                        "minVariantPrice": {"amount": "10.00", "currencyCode": "USD"}
                    },
                    "featuredImage": {"url": "https://cdn.example.com/boot.jpg"},
                    "media": {
                        "edges": [
                            {"node": {"image": {"url": "https://cdn.example.com/boot.jpg"}}},
                            {"node": {"image": {"url": "https://cdn.example.com/boot-2.jpg"}}},
                        ]
                    },
                }
            }
        }

    monkeypatch.setattr(tool_runners, "shopify_graphql", _fake_shopify_graphql)
    out = await tool_runners.run_product_details(
        shop_domain="example.myshopify.com",
        access_token="tok",
        handle="boot",
    )
    payload = json.loads(out)
    detail = payload["ui_detail"]
    assert detail["title"] == "Boot"
    assert len(detail["image_urls"]) == 2


@pytest.mark.asyncio
async def test_shopify_tools_node_emits_products_event() -> None:
    from unittest.mock import MagicMock

    from app.agent.graph import _shopify_tools_node
    from langchain_core.messages import AIMessage
    from langchain_core.tools import StructuredTool

    writer = MagicMock()
    body = json.dumps(
        {
            "ui_cards": [
                {
                    "handle": "boot",
                    "title": "Boot",
                    "url": "https://store.example.com/products/boot",
                    "price": "$10.00",
                }
            ]
        }
    )

    async def _run(**kwargs: object) -> str:
        return body

    tool = StructuredTool.from_function(
        coroutine=_run,
        name="shopify_product_search",
        description="test",
    )
    ai = AIMessage(
        content="",
        tool_calls=[{"id": "tc1", "name": "shopify_product_search", "args": {"query": "boot"}}],
    )
    state = {
        "messages": [ai],
        "bound_tools": [tool],
        "shopify_tool_names": {"shopify_product_search"},
        "model_round": 1,
        "tools_invoked": [],
        "tool_result_cache": {},
        "product_cards": [],
        "turn_context": {},
    }

    result = await _shopify_tools_node(state, writer)

    writer.assert_any_call({"type": "products", "products": json.loads(body)["ui_cards"]})
    assert result["product_cards"][0]["handle"] == "boot"
