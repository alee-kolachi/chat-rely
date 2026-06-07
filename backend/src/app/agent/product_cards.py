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


def is_product_browse_turn(user_message: str) -> bool:
    """True when the UI should show a product carousel (catalog browse, not a price lookup)."""
    msg = (user_message or "").strip().lower()
    if not msg:
        return True
    if any(hint in msg for hint in _ASSISTANT_CAPABILITY_HINTS):
        return False
    if any(
        hint in msg
        for hint in (
            "price",
            "cost",
            "how much",
            "how much is",
            "what does",
            "worth",
            "pricing",
        )
    ):
        return False
    return True


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
