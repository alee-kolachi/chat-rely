"""Helpers for product carousel turns."""

from __future__ import annotations

_CATALOG_BROWSE_HINTS = (
    "what do you sell",
    "what products",
    "what do you carry",
    "what do you offer",
    "what do you stock",
    "your catalog",
    "your products",
    "what kind of products",
)


_ASSISTANT_CAPABILITY_HINTS = (
    "what do you do",
    "what can you do",
    "what are you",
    "who are you",
    "are you a bot",
    "are you an ai",
    "are you a robot",
    "are you human",
    "are you real",
)

_PRICE_LOOKUP_HINTS = (
    "price",
    "cost",
    "how much",
    "how much is",
    "what does",
    "worth",
    "pricing",
)

_CATALOG_ANALYTICS_HINTS = (
    "cheapest",
    "lowest",
    "lowest-priced",
    "lowest priced",
    "highest",
    "most expensive",
    "priciest",
    "average",
    "mean",
    "median",
    "price range",
    "under $",
    "over $",
    "less than $",
    "more than $",
    "compare",
    "how many products",
    "how many items",
)

_CATALOG_SHOW_HINTS = (
    "show me",
    "show us",
    "let me see",
    "can i see",
    "can you show",
)

_RECOMMEND_HINTS = (
    "recommend",
    "suggestion",
    "suggestions",
    "what would you suggest",
)

_NON_CATALOG_QUESTION_HINTS = (
    "return",
    "refund",
    "exchange",
    "shipping",
    "delivery",
    "privacy",
    "terms",
    "warranty",
    "policy",
)

_ORDER_TOOL_QUESTION_HINTS = (
    "order #",
    "order number",
    "track my order",
    "order status",
    "where is my order",
    "tracking number",
    "shipment status",
)


def turn_is_order_tool_question(user_message: str) -> bool:
    msg = (user_message or "").strip().lower()
    if not msg:
        return False
    return any(h in msg for h in _ORDER_TOOL_QUESTION_HINTS)


def turn_is_kb_question(user_message: str) -> bool:
    """Policy, shipping, returns, privacy — answered from indexed knowledge (RAG), not catalog tools."""
    msg = (user_message or "").strip().lower()
    if not msg or turn_is_order_tool_question(msg):
        return False
    return any(h in msg for h in _NON_CATALOG_QUESTION_HINTS)


def is_catalog_browse_question(user_message: str) -> bool:
    """True when the visitor wants a general store catalog overview."""
    msg = (user_message or "").strip().lower()
    if not msg:
        return False
    if any(hint in msg for hint in _CATALOG_BROWSE_HINTS):
        return True
    return False


def is_specific_product_availability_question(user_message: str) -> bool:
    """True for \"do you sell/have X\" — not a whole-catalog browse."""
    msg = (user_message or "").strip().lower()
    if not msg or is_catalog_browse_question(msg):
        return False
    return any(
        hint in msg
        for hint in (
            "do you sell",
            "do you have",
            "do you carry",
            "do you stock",
            "do you offer",
            "sell ",
            "have ",
            "carry ",
        )
    )


def is_catalog_analytics_turn(user_message: str) -> bool:
    """True when the visitor wants computed catalog stats, not a carousel."""
    msg = (user_message or "").strip().lower()
    if not msg:
        return False
    return any(hint in msg for hint in _CATALOG_ANALYTICS_HINTS)


def is_product_show_request(user_message: str) -> bool:
    """True when the visitor asks to see or browse specific catalog items."""
    msg = (user_message or "").strip().lower()
    if not msg:
        return False
    if any(hint in msg for hint in _CATALOG_SHOW_HINTS):
        return True
    if any(hint in msg for hint in _RECOMMEND_HINTS):
        from app.domains.integrations.shopify.tool_runners import _product_keywords_from_query

        return bool(_product_keywords_from_query(msg))
    return False


def turn_needs_catalog_tools(
    user_message: str,
    *,
    thread_had_shopify_tools: bool = False,
) -> bool:
    """True when Shopify catalog tools should run this turn."""
    if turn_is_kb_question(user_message):
        return False
    if thread_had_shopify_tools:
        return True
    msg = (user_message or "").strip()
    if not msg:
        return False
    if is_catalog_browse_question(msg):
        return True
    return is_specific_product_availability_question(msg)


def turn_needs_shopify_graph(
    user_message: str,
    *,
    thread_had_shopify_tools: bool = False,
    thread_had_order_lookup: bool = False,
    has_order_lookup_tool: bool = False,
) -> bool:
    """True when the LangGraph tool loop should run (catalog browse or order lookup)."""
    if turn_is_kb_question(user_message):
        return False
    if turn_needs_catalog_tools(
        user_message,
        thread_had_shopify_tools=thread_had_shopify_tools,
    ):
        return True
    if has_order_lookup_tool and (
        thread_had_order_lookup or turn_is_order_tool_question(user_message)
    ):
        return True
    return False


def is_product_browse_turn(user_message: str) -> bool:
    """True when the UI should show a product carousel (catalog browse, not a price lookup)."""
    msg = (user_message or "").strip().lower()
    if not msg:
        return False
    if any(hint in msg for hint in _ASSISTANT_CAPABILITY_HINTS):
        return False
    if any(hint in msg for hint in _PRICE_LOOKUP_HINTS):
        return False
    if is_catalog_analytics_turn(msg):
        return False
    return (
        is_catalog_browse_question(msg)
        or is_specific_product_availability_question(msg)
        or is_product_show_request(msg)
    )


def brief_product_search_intro(user_message: str, *, count: int) -> str:
    """One-line intro streamed with product cards (no extra model round)."""
    if count <= 0:
        return ""
    msg = (user_message or "").lower()
    if "boot" in msg:
        return "Here are some items from our catalog, including boots where available:"
    if "what" in msg and any(
        hint in msg for hint in ("sell", "products", "carry", "stock", "offer", "have")
    ):
        return "We offer a variety of products in our store. Here are some highlights:"
    return "Here are some items from our catalog:"


def _looks_like_product_list_line(line: str) -> bool:
    s = (line or "").strip()
    if not s:
        return False
    if s.startswith("**") or s.startswith("- ") or s.startswith("![") or s.startswith("|"):
        return True
    if " - Price:" in s or "Price:" in s:
        return True
    if len(s) >= 2 and s[0].isdigit() and s[1] in ".)":
        return True
    if "$" in s and ("http://" in s or "https://" in s or "**" in s):
        if "**" in s:
            return True
        if "[" in s and "](" in s:
            return False
        return True
    return False


def shorten_answer_for_product_cards(answer: str) -> str:
    """When the UI shows product cards, keep a short intro; drop markdown product dumps."""
    trimmed = (answer or "").strip()
    if not trimmed:
        return ""

    lines = [line.strip() for line in trimmed.splitlines() if line.strip()]
    if not lines:
        return ""

    intro_lines: list[str] = []
    for line in lines:
        if _looks_like_product_list_line(line):
            break
        intro_lines.append(line)

    intro = " ".join(intro_lines).strip()
    if intro and not _looks_like_product_list_line(intro) and len(intro) <= 160:
        return intro

    first = lines[0]
    if not _looks_like_product_list_line(first) and len(first) <= 100:
        return first

    return ""
