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
    assert payload["lookup_meta"]["retried_keywords"] is True
    assert payload["lookup_meta"]["result_count"] == 0
    assert len(calls) >= 2


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
