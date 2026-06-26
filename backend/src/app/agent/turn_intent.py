"""Per-turn intent: whether the latest message needs live store data or tools."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Literal

from app.agent.product_cards import (
    _ASSISTANT_CAPABILITY_HINTS,
    _PRICE_LOOKUP_HINTS,
    is_catalog_analytics_turn,
    is_catalog_browse_question,
    is_product_attribute_question,
    is_product_show_request,
    is_specific_product_availability_question,
    turn_is_kb_question,
)
from app.domains.integrations.shopify.tool_runners import _product_keywords_from_query

TurnRoute = Literal["direct", "rag", "products"]

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
    if is_product_attribute_question(msg):
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


@dataclass(frozen=True)
class TurnRouteDecision:
    route: TurnRoute
    reason: str


def route_turn_intent_sync(
    user_message: str,
    *,
    recent_user_messages: list[str] | None = None,
) -> TurnRouteDecision:
    """Pick one demo chat path: direct reply, knowledge RAG, or catalog tools."""
    msg = (user_message or "").strip()
    if not msg:
        return TurnRouteDecision(route="direct", reason="empty")

    if message_references_thread_catalog(msg):
        return TurnRouteDecision(route="products", reason="thread_catalog_ref")

    recent = [m.strip() for m in (recent_user_messages or []) if (m or "").strip()]
    if not turn_wants_store_data(msg):
        if recent and any(turn_wants_store_data(m) for m in recent):
            words = _normalized_message(msg).split()
            if len(words) <= 6 and any(
                w in {"it", "that", "those", "this", "one", "them"} for w in words
            ):
                return TurnRouteDecision(route="products", reason="thread_follow_up")
        return TurnRouteDecision(route="direct", reason="conversational")

    if turn_is_kb_question(msg):
        return TurnRouteDecision(route="rag", reason="kb_question")

    return TurnRouteDecision(route="products", reason="store_data")


async def route_turn_intent(
    user_message: str,
    *,
    recent_user_messages: list[str] | None = None,
) -> TurnRouteDecision:
    """Async wrapper for demo turn routing (reserved for future LLM routing)."""
    return route_turn_intent_sync(
        user_message,
        recent_user_messages=recent_user_messages,
    )
