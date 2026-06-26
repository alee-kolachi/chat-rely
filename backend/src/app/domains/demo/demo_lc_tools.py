"""LangChain tools for demo agents (same names as Shopify catalog tools)."""

from __future__ import annotations

from typing import Any

from langchain_core.tools import StructuredTool

from app.domains.demo.demo_catalog_tool_runners import (
    run_demo_product_details,
    run_demo_product_search,
)
from app.domains.runtime.shopify_lc_tools import (
    _PRODUCT_SEARCH_DESCRIPTION,
    _PRODUCT_SEARCH_NO_ORDER_SUFFIX,
    _PRODUCT_SEARCH_QUERY_DESCRIPTION,
    _make_product_search_input,
)


def build_demo_langchain_tools(
    products: list[dict[str, Any]],
    *,
    customer_message: str | None = None,
    max_results: int = 5,
) -> list[StructuredTool]:
    """Product search tool only — mirrors widget catalog tooling without OAuth."""
    product_search_input = _make_product_search_input(max_results)
    description = _PRODUCT_SEARCH_DESCRIPTION + _PRODUCT_SEARCH_NO_ORDER_SUFFIX
    catalog = list(products)

    async def _product_search(query: str, max_results: int = max_results) -> str:
        effective = min(max(max_results, max_results), 20)
        return run_demo_product_search(
            catalog,
            query=query,
            max_results=effective,
            relevance_query=customer_message,
        )

    return [
        StructuredTool.from_function(
            coroutine=_product_search,
            name="shopify_product_search",
            description=description,
            args_schema=product_search_input,
        )
    ]


def demo_product_details_json(products: list[dict[str, Any]], handle: str) -> str:
    return run_demo_product_details(products, handle=handle)


async def demo_product_details_json_async(
    products: list[dict[str, Any]],
    *,
    handle: str,
    store_url: str | None,
) -> str:
    from app.domains.demo.demo_catalog_tool_runners import run_demo_product_details_async

    return await run_demo_product_details_async(products, handle=handle, store_url=store_url)


def demo_similar_products_json(
    products: list[dict[str, Any]],
    *,
    handle: str,
    title: str | None,
) -> str:
    from app.domains.demo.demo_catalog_tool_runners import run_demo_similar_products

    return run_demo_similar_products(products, handle=handle, title=title)
