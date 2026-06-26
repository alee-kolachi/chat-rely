"""Dynamic catalog summaries and diverse product samples for broad browse turns."""

from __future__ import annotations

import random
from collections import Counter
from typing import Any

from app.domains.demo.demo_product_cards import product_dict_to_card

_NOISE_TAGS = frozenset(
    {
        "new-arrivals",
        "new arrivals",
        "show_quantity_bar",
        "all",
        "sale",
        "clearance",
    }
)


def _tag_counts(products: list[dict[str, Any]]) -> Counter[str]:
    counts: Counter[str] = Counter()
    for product in products:
        tags = product.get("tags")
        if not isinstance(tags, list):
            continue
        for raw in tags:
            tag = str(raw).strip()
            if len(tag) < 3:
                continue
            key = tag.casefold()
            if key in _NOISE_TAGS:
                continue
            counts[key] += 1
    return counts


def _meaningful_category_tags(products: list[dict[str, Any]]) -> set[str]:
    counts = _tag_counts(products)
    if not counts:
        return set()
    total = len(products)
    if total <= 12:
        return set(counts.keys())
    max_share = max(12, int(total * 0.85))
    return {tag for tag, count in counts.items() if 2 <= count <= max_share}


def _category_label(raw: str) -> str:
    return " ".join(part.capitalize() for part in raw.replace("_", " ").replace("-", " ").split())


def category_key_for_product(
    product: dict[str, Any],
    *,
    meaningful_tags: set[str] | None = None,
) -> str:
    meaningful = meaningful_tags if meaningful_tags is not None else _meaningful_category_tags([product])
    product_type = str(product.get("product_type") or "").strip().casefold()
    if product_type and product_type != "clearance":
        return product_type
    tags = product.get("tags")
    if isinstance(tags, list):
        for raw in tags:
            tag = str(raw).strip().casefold()
            if tag in meaningful:
                return tag
    title = str(product.get("title") or "").casefold()
    for tag in sorted(meaningful, key=len, reverse=True):
        if tag in title:
            return tag
    handle = str(product.get("handle") or "").replace("-", " ")
    for token in handle.split():
        if len(token) >= 4:
            return token.casefold()
    return "other"


def summarize_demo_catalog(products: list[dict[str, Any]]) -> dict[str, Any]:
    """Build a grounded overview from the ingested snapshot (no hardcoded categories)."""
    total = len(products)
    if total <= 0:
        return {"product_count": 0, "categories": [], "overview": ""}

    meaningful = _meaningful_category_tags(products)
    category_counts: Counter[str] = Counter()
    for product in products:
        category_counts[category_key_for_product(product, meaningful_tags=meaningful)] += 1

    if "other" in category_counts and len(category_counts) > 1:
        del category_counts["other"]

    ranked = category_counts.most_common()
    categories = [
        {"name": _category_label(name), "count": count}
        for name, count in ranked[:12]
        if name != "other"
    ]

    if categories:
        names = [row["name"] for row in categories[:4]]
        if len(categories) > 4:
            overview = f"We carry {', '.join(names)}, and more."
        elif len(names) == 1:
            overview = f"We carry {names[0]}."
        else:
            overview = f"We carry {', '.join(names[:-1])} and {names[-1]}."
    else:
        overview = "Here's a sample from our catalog."

    return {
        "product_count": total,
        "categories": categories,
        "overview": overview,
    }


def sample_broad_catalog_cards(
    products: list[dict[str, Any]],
    *,
    limit: int = 5,
) -> list[dict[str, str]]:
    """Random, category-diverse sample for whole-catalog browse (not the first N items)."""
    if not products:
        return []
    n = max(1, min(int(limit), 20))
    meaningful = _meaningful_category_tags(products)
    by_category: dict[str, list[dict[str, Any]]] = {}
    for product in products:
        key = category_key_for_product(product, meaningful_tags=meaningful)
        by_category.setdefault(key, []).append(product)

    rng = random.SystemRandom()
    picked: list[dict[str, Any]] = []
    seen_handles: set[str] = set()

    category_keys = list(by_category.keys())
    rng.shuffle(category_keys)
    for key in category_keys:
        if len(picked) >= n:
            break
        pool = by_category.get(key) or []
        if not pool:
            continue
        product = rng.choice(pool)
        handle = str(product.get("handle") or "").strip()
        if not handle or handle in seen_handles:
            continue
        seen_handles.add(handle)
        picked.append(product)

    if len(picked) < n:
        remaining = [p for p in products if str(p.get("handle") or "").strip() not in seen_handles]
        rng.shuffle(remaining)
        for product in remaining:
            if len(picked) >= n:
                break
            handle = str(product.get("handle") or "").strip()
            if not handle or handle in seen_handles:
                continue
            seen_handles.add(handle)
            picked.append(product)

    cards: list[dict[str, str]] = []
    for product in picked:
        card = product_dict_to_card(product)
        if card:
            cards.append(card)
    return cards


def is_demo_broad_catalog_query(query: str, *, relevance_query: str | None = None) -> bool:
    from app.agent.product_cards import is_catalog_browse_question
    from app.domains.integrations.shopify.tool_runners import (
        _is_broad_catalog_shopify_query,
        _needs_broad_catalog_retry,
    )

    for candidate in (query, relevance_query):
        text = (candidate or "").strip()
        if not text:
            continue
        if _is_broad_catalog_shopify_query(text):
            return True
        if _needs_broad_catalog_retry(text):
            return True
        if is_catalog_browse_question(text):
            return True
    return False
