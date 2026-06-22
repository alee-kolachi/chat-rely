"""Per-turn intent: whether the latest message needs live store data or tools."""

from __future__ import annotations

from app.agent.product_cards import (
    is_catalog_analytics_turn,
    is_catalog_browse_question,
    is_product_show_request,
    is_specific_product_availability_question,
    _ASSISTANT_CAPABILITY_HINTS,
    _PRICE_LOOKUP_HINTS,
)
from app.domains.integrations.shopify.tool_runners import _product_keywords_from_query

_ORDER_HINTS = (
    "order",
    "track",
    "tracking",
    "shipment",
    "shipping status",
    "fulfillment",
    "delivered",
    "delivery",
)

_POLICY_HINTS = (
    "return",
    "refund",
    "policy",
    "warranty",
    "exchange",
    "cancel",
)

_THREAD_REFERENCE_HINTS = (
    "that one",
    "that product",
    "those",
    "the one",
    "same one",
    "more like",
    "another one",
    "other one",
    "instead",
    "cheaper one",
    "expensive one",
)


def _normalized_message(user_message: str) -> str:
    return (user_message or "").strip().lower()


def message_references_thread_catalog(user_message: str) -> bool:
    """True when the latest message likely continues a prior catalog topic."""
    msg = _normalized_message(user_message)
    if not msg:
        return False
    if any(hint in msg for hint in _THREAD_REFERENCE_HINTS):
        return True
    words = msg.split()
    if len(words) <= 4 and any(w in {"it", "that", "those", "them", "one"} for w in words):
        return True
    return False


def turn_wants_store_data(user_message: str) -> bool:
    """True when this turn may need Shopify, knowledge, or other store-backed tools."""
    msg = _normalized_message(user_message)
    if not msg:
        return False
    if any(hint in msg for hint in _ASSISTANT_CAPABILITY_HINTS):
        return False
    if is_catalog_browse_question(msg):
        return True
    if is_specific_product_availability_question(msg):
        return True
    if is_catalog_analytics_turn(msg):
        return True
    if is_product_show_request(msg):
        return True
    if any(hint in msg for hint in _PRICE_LOOKUP_HINTS):
        return True
    if any(hint in msg for hint in _ORDER_HINTS):
        return True
    if any(hint in msg for hint in _POLICY_HINTS):
        return True
    if _product_keywords_from_query(msg):
        return True
    stripped = msg.lstrip("#").strip()
    if stripped.isdigit() and len(stripped) >= 3:
        return True
    return False
