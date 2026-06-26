"""LangChain tools for demo agents (same names as Shopify catalog tools)."""

from __future__ import annotations

from typing import Any

from langchain_core.tools import StructuredTool
from pydantic import BaseModel, Field

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

_PRODUCT_DETAILS_DESCRIPTION = (
    "Load one product from this store's catalog by handle, including variants, sizes, "
    "colors, options, and description. Use after shopify_product_search when the customer "
    "asks about sizes, colors, materials, or other variant-level details for a named product."
)


class ProductDetailsInput(BaseModel):
    handle: str = Field(
        description="Product handle from shopify_product_search results (URL slug, not the title)."
    )


def build_demo_langchain_tools(
    products: list[dict[str, Any]],
    *,
    customer_message: str | None = None,
    max_results: int = 5,
) -> list[StructuredTool]:
    """Catalog search + product details — mirrors widget tooling without OAuth."""
    product_search_input = _make_product_search_input(max_results)
    description = _PRODUCT_SEARCH_DESCRIPTION + _PRODUCT_SEARCH_NO_ORDER_SUFFIX
    catalog = list(products)

    async def _product_search(query: str, max_results: int = max_results) -> str:
        effective = min(max(1, int(max_results)), 20)
        return run_demo_product_search(
            catalog,
            query=query,
            max_results=effective,
            relevance_query=customer_message,
        )

    async def _product_details(handle: str) -> str:
        return run_demo_product_details(catalog, handle=handle)

    return [
        StructuredTool.from_function(
            coroutine=_product_search,
            name="shopify_product_search",
            description=description,
            args_schema=product_search_input,
        ),
        StructuredTool.from_function(
            coroutine=_product_details,
            name="shopify_product_details",
            description=_PRODUCT_DETAILS_DESCRIPTION,
            args_schema=ProductDetailsInput,
        ),
    ]
