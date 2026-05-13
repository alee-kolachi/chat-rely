"""
Fast deterministic routing hints for runtime chat (before RAG / expensive retrieval).

Used to skip KB retrieval for clear commerce/catalog flows when Shopify tools are available,
and to force tool invocation before the model can invent inventory answers.

When regex misses, `resolve_commerce_intent` still treats the turn as commerce if **this
conversation already persisted Shopify tool calls** (any natural-language follow-up).
Otherwise it uses the Shopify route classifier output (if any) or one structured LLM call.
"""

from __future__ import annotations

import re
from typing import Any

import structlog

from app.domains.runtime.shopify_tool_router import (
    ShopifyToolRoute,
    classify_shopify_tool_route,
)

log = structlog.get_logger("runtime.intent")

# Follow-ups about what the assistant already said — not a fresh catalog/order lookup.
_PRIOR_REPLY_CLARIFICATION = re.compile(
    r"(?i)("
    r"\byou\s+(said|gave|told|mentioned|quoted)\b|"
    r"\btwo\s+prices\b|\bgave\s+me\s+two\b|"
    r"\bwhich\s+(one|price|amount)\s+(is\s+)?(correct|right|accurate)\b|"
    r"\bclarif(y|ication)\b|"
    r"\b(confused|unsure)\s+about\b|"
    r"\b(previous|earlier)\s+(answer|response|reply|message)\b"
    r")"
)

# Store operations: catalog, pricing, inventory-ish questions, orders/fulfillment.
# Avoid bare currency tokens (`PKR`, `$`) — they fire on clarification messages like “PKR 600 vs 60,000”.
_COMMERCE_SHOPIFY = re.compile(
    r"(?i)"
    r"\b("
    r"do\s+you\s+(have|carry|sell|stock|offer|still\s+have)|"
    r"(in|out)\s+of\s+stock|"
    r"back\s+in\s+stock|"
    r"\bavailable\b|\bavailability\b|"
    r"how\s+much\b|\bprice\b|\bcost\b|"
    r"(?:\b(pkr|usd)\b.{0,90}\b(prices?|pricing|cost|for|product|item)s?\b|\b(price|cost)\b.{0,90}\b(pkr|usd)\b)|"
    r"[\$€£]\s*\d+|\d+(?:[.,]\d+)?\s*(?:usd|pkr|dollars?)\b|"
    r"\bsku\b|\bvariant\b|"
    r"\b(size|sizes|color|colour)s?\b|"
    r"add\s+to\s+cart|\bbuy\b|\bpurchase\b|\border(ing)?\b|"
    r"\bcatalog\b|\bcollection\b|"
    r"\b(track(ing)?|shipment|delivered|delivery|shipping)\b|"
    r"order\s*(#|number|no\.?)|"
    r"where\s+is\s+my|when\s+will\s+(it|my|the)|"
    r"\bpremium\s+shoes\b|\bskateboard\b"
    r")\b"
)

# Below `SHOPIFY_TOOL_ROUTE_MIN_CONFIDENCE` (0.65): still treat as commerce for KB-skip when True.
_COMMERCE_FROM_LLM_MIN_CONFIDENCE = 0.55


def is_commerce_shopify_intent(message: str) -> bool:
    """True when the shopper message likely needs live Shopify store data."""
    s = (message or "").strip()
    if len(s) > 8000:
        s = s[:8000]
    if _PRIOR_REPLY_CLARIFICATION.search(s):
        return False
    return bool(_COMMERCE_SHOPIFY.search(s))


def conversation_recent_used_shopify_tools(
    history_without_current_user: list[Any],
    *,
    max_messages: int = 48,
) -> bool:
    """True if this thread already invoked Shopify LangChain tools (persisted assistant/tool rows).

    Used so arbitrary follow-ups (“sure”, “try once more”, “same thing”) stay on the commerce path
    without maintaining phrase lists.
    """
    window = history_without_current_user[-max(1, max_messages) :]
    for m in reversed(window):
        role = getattr(m, "role", None) or ""
        if role == "tool":
            tn = str(getattr(m, "tool_name", None) or "").strip().lower()
            if tn.startswith("shopify"):
                return True
            continue
        if role != "assistant":
            continue
        payload = getattr(m, "tool_call_payload", None) or {}
        if not isinstance(payload, dict):
            continue
        for tc in payload.get("tool_calls") or []:
            if not isinstance(tc, dict):
                continue
            name = str(tc.get("name") or "").strip().lower()
            if name.startswith("shopify"):
                return True
    return False


async def resolve_commerce_intent(
    user_message: str,
    *,
    tool_list: list[Any],
    shopify_route_decision: ShopifyToolRoute | None,
    llm_fallback_enabled: bool,
    recent_thread_used_shopify_tools: bool = False,
) -> tuple[bool, str, float | None, tuple[int, int] | None]:
    """
    Combine regex with LLM-backed routing.

    Returns ``(commerce_intent, source, confidence_or_none, llm_usage_or_none)`` where ``source`` is one of:
    ``regex``, ``thread_shopify_context``, ``router``, ``router_negative``, ``llm_fallback``,
    ``llm_fallback_negative``, ``none``.

    ``llm_usage_or_none`` is ``(input_tokens, output_tokens)`` only when this function invoked
    the Shopify router LLM itself (``llm_fallback*`` / ``none`` after a failed parse path);
    router usage from setup is billed separately.
    """
    msg = (user_message or "").strip()
    if not msg:
        return False, "none", None, None

    if is_commerce_shopify_intent(msg):
        return True, "regex", None, None

    if not tool_list:
        return False, "none", None, None

    if recent_thread_used_shopify_tools:
        log.info("runtime.commerce_intent_resolved", source="thread_shopify_context")
        return True, "thread_shopify_context", None, None

    if not llm_fallback_enabled:
        return False, "none", None, None

    # Reuse Shopify router output when present (already paid for in _load_shopify_tools_and_optional_route).
    if shopify_route_decision is not None:
        conf = float(shopify_route_decision.confidence or 0.0)
        if shopify_route_decision.requires_live_shopify_data and conf >= _COMMERCE_FROM_LLM_MIN_CONFIDENCE:
            log.info("runtime.commerce_intent_resolved", source="router", confidence=conf)
            return True, "router", conf, None
        log.info(
            "runtime.commerce_intent_resolved",
            source="router_negative",
            confidence=conf,
            requires_live=shopify_route_decision.requires_live_shopify_data,
        )
        return False, "router_negative", conf, None

    # Router disabled or returned nothing — one cheap structured classification call.
    route, in_t, out_t = await classify_shopify_tool_route(msg, tool_list)
    if route is None:
        log.warning("runtime.commerce_intent_resolved", source="llm_fallback_failed")
        usage = (in_t, out_t) if (in_t or out_t) else None
        return False, "none", None, usage

    conf = float(route.confidence or 0.0)
    usage = (in_t, out_t) if (in_t or out_t) else None
    if route.requires_live_shopify_data and conf >= _COMMERCE_FROM_LLM_MIN_CONFIDENCE:
        log.info("runtime.commerce_intent_resolved", source="llm_fallback", confidence=conf)
        return True, "llm_fallback", conf, usage

    log.info(
        "runtime.commerce_intent_resolved",
        source="llm_fallback_negative",
        confidence=conf,
        requires_live=route.requires_live_shopify_data,
    )
    return False, "llm_fallback_negative", conf, usage
