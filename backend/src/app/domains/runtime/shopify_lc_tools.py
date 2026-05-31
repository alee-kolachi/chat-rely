"""LangChain StructuredTools for Shopify Admin actions."""

from __future__ import annotations

from typing import Any

from langchain_core.tools import StructuredTool
from pydantic import BaseModel, Field

from app.domains.integrations.shopify.tool_runners import (
    _needs_broad_catalog_retry,
    _strip_catalog_search_noise,
    run_customer_context,
    run_inventory_check,
    run_order_lookup,
    run_product_search,
)


def _product_search_max_results_from_config(config: dict[str, Any] | None) -> int:
    """Read maxResults (dashboard) or max_results from agent_actions.config; clamp 1–20."""
    if not config:
        return 5
    raw = config.get("maxResults", config.get("max_results", 5))
    try:
        n = int(raw)
    except (TypeError, ValueError):
        return 5
    return max(1, min(n, 20))


def _make_product_search_input(default_max_results: int) -> type[BaseModel]:
    class ProductSearchInput(BaseModel):
        query: str = Field(
            description=(
                "Shopify Admin product search query (keywords, SKU, tag). "
                "For follow-ups, resolve the product from the thread and pass brand or name keywords only "
                "(e.g. Timberland), not pronouns or phrases like \"the one\". "
                "For broad ‘what do you sell / browse the catalog’ questions, use exactly: published_status:published"
            )
        )
        max_results: int = Field(default=default_max_results, ge=1, le=20)

    return ProductSearchInput


class OrderLookupInput(BaseModel):
    order_name_or_number: str = Field(
        default="",
        description=(
            "Order number as shown to the customer (e.g. 1001, #1001, or a bare numeric message like 8842). "
            "Leave empty only when searching by email alone."
        ),
    )
    customer_email: str | None = Field(default=None, description="Customer email to narrow order search.")


class InventoryInput(BaseModel):
    sku: str | None = Field(default=None, description="Variant SKU if known.")
    product_query: str | None = Field(default=None, description="Product name or keywords if SKU unknown.")


class CustomerContextInput(BaseModel):
    email: str = Field(description="Customer email address.")
    recent_orders: int = Field(default=5, ge=1, le=25, description="How many recent orders to include.")


def build_shopify_langchain_tools(
    shop_domain: str,
    access_token: str,
    enabled_action_keys: set[str],
    *,
    action_configs: dict[str, dict[str, Any]] | None = None,
) -> list[StructuredTool]:
    tools: list[StructuredTool] = []

    if "shopify.product_search" in enabled_action_keys:
        product_search_description = (
            "Search the merchant's Shopify catalog for products, variants, SKUs, and prices. "
            "Use for catalog browsing, product discovery, recommendations, and pricing — "
            "not for stock quantity or whether an item is in stock (use shopify_inventory_check). "
            "When lookup_meta.not_found is true, tell the shopper the item is not in this store's catalog — "
            "do not invent availability or prices."
        )
        if "shopify.order_lookup" not in enabled_action_keys:
            product_search_description += (
                " Do not use for order status, tracking, shipping, or fulfillment questions — "
                "Order Lookup is not enabled for this chat."
            )

        product_cfg = (action_configs or {}).get("shopify.product_search") or {}
        default_max_results = _product_search_max_results_from_config(product_cfg)
        product_search_input = _make_product_search_input(default_max_results)

        async def _product_search(query: str, max_results: int = default_max_results) -> str:
            q = _strip_catalog_search_noise((query or "").strip())
            effective = max(max_results, default_max_results)
            if _needs_broad_catalog_retry(q):
                effective = max(effective, 10)
            effective = min(effective, 20)
            return await run_product_search(
                shop_domain=shop_domain,
                access_token=access_token,
                query=query,
                max_results=effective,
            )

        tools.append(
            StructuredTool.from_function(
                coroutine=_product_search,
                name="shopify_product_search",
                description=product_search_description,
                args_schema=product_search_input,
            )
        )

    if "shopify.order_lookup" in enabled_action_keys:

        async def _order_lookup(order_name_or_number: str = "", customer_email: str | None = None) -> str:
            return await run_order_lookup(
                shop_domain=shop_domain,
                access_token=access_token,
                order_name_or_number=order_name_or_number,
                customer_email=customer_email,
            )

        tools.append(
            StructuredTool.from_function(
                coroutine=_order_lookup,
                name="shopify_order_lookup",
                description=(
                    "Look up order status, fulfillment, and tracking using order number and/or customer email. "
                    "Call when the customer asks about an order or sends only an order number (digits or #digits)."
                ),
                args_schema=OrderLookupInput,
            )
        )

    if "shopify.inventory_check" in enabled_action_keys:

        async def _inventory(sku: str | None = None, product_query: str | None = None) -> str:
            return await run_inventory_check(
                shop_domain=shop_domain,
                access_token=access_token,
                sku=sku,
                product_query=product_query,
            )

        tools.append(
            StructuredTool.from_function(
                coroutine=_inventory,
                name="shopify_inventory_check",
                description=(
                    "Check live stock for product variants: in stock, out of stock, quantity on hand. "
                    "Use when shoppers ask about inventory, stock levels, or how many are left. "
                    "Pass SKU if known; otherwise product name or keywords as product_query. "
                    "Do not use for general catalog browsing (use shopify_product_search)."
                ),
                args_schema=InventoryInput,
            )
        )

    if "shopify.customer_context" in enabled_action_keys:

        async def _customer(email: str, recent_orders: int = 5) -> str:
            return await run_customer_context(
                shop_domain=shop_domain,
                access_token=access_token,
                email=email,
                recent_orders=recent_orders,
            )

        tools.append(
            StructuredTool.from_function(
                coroutine=_customer,
                name="shopify_customer_context",
                description=(
                    "Load customer profile and recent order history by email for personalization and support. "
                    "When lookup_meta.not_found is true, tell the shopper you could not find an account for that "
                    "email in this store. Do not invent order history or lifetime value."
                ),
                args_schema=CustomerContextInput,
            )
        )

    return tools


def tools_by_name(tools: list[StructuredTool]) -> dict[str, StructuredTool]:
    return {t.name: t for t in tools if getattr(t, "name", None)}
