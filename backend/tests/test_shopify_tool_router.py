"""Shopify tool routing (LLM classifier), no regex."""

from langchain_core.tools import StructuredTool

from app.domains.runtime.shopify_tool_router import (
    SHOPIFY_TOOL_ROUTE_MIN_CONFIDENCE,
    ShopifyToolRoute,
    tool_catalog_lines,
    tool_choice_required_from_route,
)


def test_tool_choice_required_when_high_confidence_and_needs_tools() -> None:
    r = ShopifyToolRoute(requires_live_shopify_data=True, confidence=0.9)
    assert tool_choice_required_from_route(r, min_confidence=0.7) is True


def test_tool_choice_not_required_when_confidence_below_threshold() -> None:
    r = ShopifyToolRoute(requires_live_shopify_data=True, confidence=0.4)
    assert tool_choice_required_from_route(r, min_confidence=SHOPIFY_TOOL_ROUTE_MIN_CONFIDENCE) is False


def test_tool_choice_not_required_when_flags_false() -> None:
    r = ShopifyToolRoute(requires_live_shopify_data=False, confidence=0.99)
    assert tool_choice_required_from_route(r, min_confidence=0.5) is False


def test_tool_choice_not_required_when_route_none() -> None:
    assert tool_choice_required_from_route(None, min_confidence=0.5) is False


def test_tool_catalog_lines_skips_empty_names() -> None:
    tools = [
        StructuredTool.from_function(
            lambda q: q,
            name="shopify_order_lookup",
            description="Look up orders",
        )
    ]
    s = tool_catalog_lines(tools)
    assert "shopify_order_lookup" in s
    assert "Look up" in s
