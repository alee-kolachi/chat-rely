"""Turn intent routing helpers (no phrase lists)."""

from __future__ import annotations

from app.agent.turn_intent import (
    TurnIntentResult,
    apply_turn_intent_grounding,
    shopify_tools_to_exclude,
)


def test_shopify_tools_to_exclude_catalog_only() -> None:
    intent = TurnIntentResult(needs_product_search=True, needs_order_lookup=False)
    excluded = shopify_tools_to_exclude(
        intent,
        has_order_lookup_tool=True,
        has_product_search_tool=True,
    )
    assert excluded == {"shopify_order_lookup"}


def test_shopify_tools_to_exclude_chitchat() -> None:
    intent = TurnIntentResult(is_greeting_or_small_talk=True)
    excluded = shopify_tools_to_exclude(
        intent,
        has_order_lookup_tool=True,
        has_product_search_tool=True,
    )
    assert "shopify_product_search" in excluded
    assert "shopify_order_lookup" in excluded
    assert "search_knowledge_base" in excluded


def test_shopify_tools_to_exclude_chitchat_bare_order_number() -> None:
    intent = TurnIntentResult(is_greeting_or_small_talk=True, bare_order_number="8842")
    excluded = shopify_tools_to_exclude(
        intent,
        has_order_lookup_tool=True,
        has_product_search_tool=True,
    )
    assert excluded == set()


def test_apply_turn_intent_grounding_chitchat() -> None:
    intent = TurnIntentResult(is_greeting_or_small_talk=True)
    out = apply_turn_intent_grounding(
        base_content="Customer message:\nhi bro",
        user_message="hi bro",
        intent=intent,
        has_order_lookup_tool=True,
        has_product_search_tool=True,
        thread_had_order_lookup=False,
    )
    assert "do not call any tools" in out.lower()
    assert "hi bro" in out


def test_shopify_tools_to_exclude_multi_topic() -> None:
    intent = TurnIntentResult(needs_product_search=True, needs_order_lookup=True)
    excluded = shopify_tools_to_exclude(
        intent,
        has_order_lookup_tool=True,
        has_product_search_tool=True,
    )
    assert excluded == set()


def test_apply_turn_intent_grounding_bare_order_number() -> None:
    intent = TurnIntentResult(bare_order_number="#8842")
    out = apply_turn_intent_grounding(
        base_content="Customer message:\n8842",
        user_message="8842",
        intent=intent,
        has_order_lookup_tool=True,
        has_product_search_tool=True,
        thread_had_order_lookup=False,
    )
    assert "shopify_order_lookup" in out
    assert "8842" in out


def test_apply_turn_intent_grounding_catalog_only() -> None:
    intent = TurnIntentResult(needs_product_search=True, needs_order_lookup=False)
    out = apply_turn_intent_grounding(
        base_content="Customer message:\nDo you sell belts?",
        user_message="Do you sell belts?",
        intent=intent,
        has_order_lookup_tool=True,
        has_product_search_tool=True,
        thread_had_order_lookup=False,
    )
    assert "shopify_product_search" in out
    assert "do **not** call `shopify_order_lookup`" in out.lower()
