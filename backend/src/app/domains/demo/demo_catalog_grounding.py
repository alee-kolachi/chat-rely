"""Ground demo chat in the public catalog snapshot (same role as Shopify search + RAG)."""

from __future__ import annotations

import string
from typing import Any

from app.domains.demo.schemas import DemoProductSnapshot
from app.domains.demo.storefront_ingest import product_to_index_text

_QUERY_STOP_WORDS = frozenset(
    {
        "what",
        "is",
        "the",
        "price",
        "of",
        "for",
        "a",
        "an",
        "how",
        "much",
        "does",
        "cost",
        "tell",
        "me",
        "about",
        "do",
        "you",
        "sell",
        "have",
        "carry",
        "stock",
        "offer",
        "this",
        "that",
        "any",
        "are",
        "your",
        "can",
        "get",
        "find",
        "show",
        "want",
        "need",
        "looking",
        "please",
        "would",
        "could",
        "whats",
        "it's",
        "its",
    }
)

_TOKEN_ALIASES: dict[str, str] = {
    "tshirt": "t-shirt",
    "tshirts": "t-shirts",
    "tee": "t-shirt",
    "tees": "t-shirts",
    "wallets": "wallet",
    "fragrances": "fragrance",
    "perfume": "fragrance",
    "perfumes": "fragrance",
    "cologne": "fragrance",
    "colognes": "fragrance",
    "scent": "fragrance",
    "scents": "fragrance",
}


def _normalize_query_token(part: str) -> str:
    return part.strip(string.punctuation).casefold()


def demo_query_tokens(query: str) -> list[str]:
    base = [
        t
        for t in {_normalize_query_token(part) for part in (query or "").split()}
        if len(t) >= 3 and t not in _QUERY_STOP_WORDS
    ]
    expanded: list[str] = []
    seen: set[str] = set()
    for token in base:
        for candidate in (token, _TOKEN_ALIASES.get(token, "")):
            if candidate and candidate not in seen:
                seen.add(candidate)
                expanded.append(candidate)
        if token.endswith("s") and len(token) > 4:
            singular = token[:-1]
            if singular not in seen:
                seen.add(singular)
                expanded.append(singular)
    return expanded


def _token_in_hay(token: str, hay: str) -> bool:
    if token in hay:
        return True
    compact_token = token.replace("-", "")
    compact_hay = hay.replace("-", "")
    return bool(compact_token) and compact_token in compact_hay


def _product_search_text(product: dict[str, Any]) -> str:
    return " ".join(
        [
            str(product.get("title") or ""),
            str(product.get("handle") or "").replace("-", " "),
            " ".join(str(t) for t in (product.get("tags") or [])),
            str(product.get("product_type") or ""),
            str(product.get("vendor") or ""),
        ]
    ).casefold()


def rank_demo_products(
    products: list[dict[str, Any]],
    query: str,
) -> list[tuple[int, dict[str, Any]]]:
    tokens = demo_query_tokens(query)
    if not tokens:
        return [(0, p) for p in products[:5]]

    ranked: list[tuple[int, dict[str, Any]]] = []
    query_cf = (query or "").casefold()
    for product in products:
        hay = _product_search_text(product)
        title_cf = str(product.get("title") or "").casefold()
        score = sum(1 for token in tokens if _token_in_hay(token, hay))
        if score > 0 and all(_token_in_hay(token, title_cf) for token in tokens):
            score += 2
        if len(tokens) >= 2:
            phrase = " ".join(tokens)
            if phrase in title_cf or phrase in hay:
                score += 3
            compact_phrase = phrase.replace("-", "")
            compact_hay = hay.replace("-", "")
            if compact_phrase in compact_hay:
                score += 2
        if score > 0:
            ranked.append((score, product))

    ranked.sort(
        key=lambda row: (-row[0], str(row[1].get("title") or "")),
    )
    return ranked


def demo_products_as_chunks(
    ranked: list[tuple[int, dict[str, Any]]],
    *,
    limit: int = 5,
) -> list[dict[str, Any]]:
    chunks: list[dict[str, Any]] = []
    for score, product in ranked[:limit]:
        snapshot = DemoProductSnapshot.model_validate(product)
        chunks.append(
            {
                "id": str(product.get("handle") or ""),
                "knowledge_source_id": "",
                "content": product_to_index_text(snapshot),
                "similarity": min(1.0, 0.55 + score * 0.1),
                "metadata": {"source": "demo_catalog"},
            }
        )
    return chunks


def _policy_keys_for_query(query: str) -> list[str]:
    q = (query or "").casefold()
    keys: list[str] = []
    if any(h in q for h in ("return", "refund", "exchange")):
        keys.extend(["refund", "policy_page"])
    if any(h in q for h in ("ship", "deliver", "shipping", "delivery")):
        keys.append("shipping")
    if "privacy" in q:
        keys.append("privacy")
    if any(h in q for h in ("terms", "warranty")):
        keys.append("terms")
    if not keys:
        keys = ["refund", "shipping", "privacy", "terms", "policy_page"]
    return keys


def policy_grounding_chunks(
    policies: dict[str, str],
    query: str,
    *,
    limit: int = 2,
) -> list[dict[str, Any]]:
    q = (query or "").casefold()
    hints = ("return", "refund", "shipping", "exchange", "policy", "delivery", "warranty")
    if not policies or not any(h in q for h in hints):
        return []

    preferred_keys = _policy_keys_for_query(query)
    ordered_keys: list[str] = []
    for key in preferred_keys:
        if key in policies and key not in ordered_keys:
            ordered_keys.append(key)
    for key in policies:
        if key not in ordered_keys:
            ordered_keys.append(key)

    chunks: list[dict[str, Any]] = []
    for key in ordered_keys:
        body = str(policies.get(key) or "").strip()
        if not body:
            continue
        label = key.replace("_", " ").strip().title()
        chunks.append(
            {
                "id": f"policy-{key}",
                "knowledge_source_id": "",
                "content": f"Policy ({label}):\n{body}",
                "similarity": 0.98,
                "metadata": {"source": "demo_policy"},
            }
        )
        if len(chunks) >= limit:
            break
    return chunks


def build_demo_grounding_chunks(
    products: list[dict[str, Any]],
    policies: dict[str, str],
    query: str,
    *,
    limit: int = 5,
) -> list[dict[str, Any]]:
    ranked = rank_demo_products(products, query)
    chunks = demo_products_as_chunks(ranked, limit=limit)
    if chunks:
        return chunks
    return policy_grounding_chunks(policies, query, limit=min(2, limit))
