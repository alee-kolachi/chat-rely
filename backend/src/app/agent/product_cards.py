"""Helpers for product carousel turns."""

from __future__ import annotations


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
