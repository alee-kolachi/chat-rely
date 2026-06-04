"""Helpers for product carousel turns."""

from __future__ import annotations


def shorten_answer_for_product_cards(answer: str) -> str:
    """When the UI shows product cards, drop list dumps; keep a natural intro line."""
    trimmed = (answer or "").strip()
    if not trimmed:
        return ""

    lines = [line.strip() for line in trimmed.splitlines() if line.strip()]
    first = lines[0] if lines else trimmed

    looks_like_list = (
        len(lines) > 1
        or " - Price:" in first
        or "Price:" in first
        or first.startswith("**")
        or first.startswith("- ")
        or "$" in first
    )

    if looks_like_list or len(first) > 100:
        return ""

    return first
