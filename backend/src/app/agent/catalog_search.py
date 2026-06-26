"""Shared catalog keyword extraction and browse-carousel copy."""

from __future__ import annotations

import string

# Conversational filler that should not constrain product matching.
CATALOG_SEARCH_NOISE = frozenset(
    {
        "a",
        "about",
        "also",
        "an",
        "and",
        "any",
        "anything",
        "are",
        "as",
        "at",
        "be",
        "but",
        "can",
        "carry",
        "catalog",
        "collection",
        "collections",
        "do",
        "else",
        "for",
        "get",
        "give",
        "goods",
        "have",
        "i",
        "in",
        "is",
        "it",
        "item",
        "items",
        "kind",
        "kinds",
        "line",
        "lines",
        "me",
        "merchandise",
        "my",
        "of",
        "offer",
        "on",
        "one",
        "options",
        "or",
        "please",
        "product",
        "products",
        "range",
        "same",
        "sell",
        "show",
        "some",
        "something",
        "sort",
        "sorts",
        "stock",
        "stuff",
        "that",
        "the",
        "these",
        "thing",
        "things",
        "this",
        "those",
        "to",
        "type",
        "types",
        "want",
        "we",
        "well",
        "what",
        "with",
        "you",
        "your",
    }
)

# Audience / department terms map to strings we match in titles, tags, and types.
_AUDIENCE_MATCH_TERMS: dict[str, tuple[str, ...]] = {
    "women": ("women", "womens", "woman", "female", "ladies", "lady", "girls"),
    "men": ("men", "mens", "man", "male", "guys", "guy", "boys"),
    "kids": ("kids", "kid", "children", "child", "baby", "babies", "toddler", "toddlers"),
    "unisex": ("unisex",),
}


def _normalize_token(raw: str) -> str:
    return raw.strip(string.punctuation).casefold()


def catalog_search_tokens(query: str) -> list[str]:
    """Product-meaningful terms from a shopper message (no conversational filler)."""
    seen: set[str] = set()
    tokens: list[str] = []
    for part in (query or "").split():
        token = _normalize_token(part)
        if len(token) < 3 or token in CATALOG_SEARCH_NOISE:
            continue
        if token not in seen:
            seen.add(token)
            tokens.append(token)
        if token.endswith("s") and len(token) > 4:
            singular = token[:-1]
            if singular not in seen:
                seen.add(singular)
                tokens.append(singular)
    return tokens


def catalog_match_terms(token: str) -> tuple[str, ...]:
    """Expand a token to strings that may appear on product records."""
    normalized = _normalize_token(token)
    if not normalized:
        return ()
    for root, aliases in _AUDIENCE_MATCH_TERMS.items():
        if normalized == root or normalized in aliases:
            return aliases
    return (normalized,)


def token_matches_catalog_text(token: str, hay: str) -> bool:
    if not hay:
        return False
    compact_hay = hay.replace("-", "")
    for term in catalog_match_terms(token):
        if term in hay:
            return True
        compact_term = term.replace("-", "")
        if compact_term and compact_term in compact_hay:
            return True
    return False


def score_catalog_token_hits(tokens: list[str], hay: str) -> int:
    if not tokens:
        return 0
    return sum(1 for token in tokens if token_matches_catalog_text(token, hay))


def catalog_browse_carousel_intro(
    *,
    overview: str | None,
    user_message: str,
    count: int,
) -> str:
    """Short grounded line before product cards (avoid dumping the full category list)."""
    from app.agent.product_cards import brief_product_search_intro

    if count <= 0:
        return ""
    text = (overview or "").strip()
    if text:
        lower = text.casefold()
        marker = "here are"
        idx = lower.find(marker)
        if idx > 20:
            lead = text[:idx].strip().rstrip(".,;:")
            if lead:
                return f"{lead}."
        for sep in (". ", "! ", "? "):
            pos = text.find(sep)
            if 10 < pos <= 220:
                return text[: pos + 1]
        if len(text) <= 220:
            return text
        shortened = text[:200].rsplit(" ", 1)[0].strip()
        return f"{shortened}..." if shortened else text[:200]
    return brief_product_search_intro(user_message, count=count)
