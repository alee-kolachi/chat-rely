"""Demo product cards from catalog snapshot (no Shopify OAuth)."""

from __future__ import annotations

from typing import Any

from app.agent.product_cards import is_product_browse_turn, is_specific_product_availability_question


def _price_label(product: dict[str, Any]) -> str | None:
    raw = product.get("min_price") or product.get("max_price")
    if not raw:
        return None
    currency = str(product.get("currency") or "USD").upper()
    if currency == "USD":
        return f"${raw}"
    return f"{raw} {currency}"


def product_dict_to_card(product: dict[str, Any]) -> dict[str, str] | None:
    handle = str(product.get("handle") or "").strip()
    title = str(product.get("title") or "").strip()
    url = str(product.get("url") or "").strip()
    if not handle or not title or not url:
        return None
    card: dict[str, str] = {"handle": handle, "title": title, "url": url}
    image = product.get("image_url")
    if isinstance(image, str) and image.strip():
        card["image_url"] = image.strip()
    price = _price_label(product)
    if price:
        card["price"] = price
    return card


def product_dict_to_detail(product: dict[str, Any]) -> dict[str, Any] | None:
    card = product_dict_to_card(product)
    if card is None:
        return None
    image = card.get("image_url")
    detail: dict[str, Any] = {**card, "image_urls": [image] if image else []}
    return detail


def _tokenize(text: str) -> set[str]:
    return {t.casefold() for t in text.split() if len(t) >= 3}


def _score_product(product: dict[str, Any], query_tokens: set[str]) -> int:
    if not query_tokens:
        return 0
    hay = " ".join(
        [
            str(product.get("title") or ""),
            str(product.get("handle") or ""),
            " ".join(str(t) for t in (product.get("tags") or [])),
            str(product.get("product_type") or ""),
        ]
    ).casefold()
    return sum(1 for t in query_tokens if t in hay)


def search_demo_products(
    products: list[dict[str, Any]],
    query: str,
    *,
    max_results: int = 5,
) -> list[dict[str, str]]:
    q = (query or "").strip()
    tokens = _tokenize(q)
    scored: list[tuple[int, dict[str, Any]]] = []
    for product in products:
        score = _score_product(product, tokens)
        if score > 0 or not tokens:
            scored.append((score, product))
    scored.sort(key=lambda x: (-x[0], str(x[1].get("title") or "")))
    if not tokens:
        scored = [(0, p) for p in products[:max_results]]
    cards: list[dict[str, str]] = []
    for _, product in scored[:max_results]:
        card = product_dict_to_card(product)
        if card:
            cards.append(card)
    return cards


def find_demo_product_by_handle(products: list[dict[str, Any]], handle: str) -> dict[str, Any] | None:
    h = handle.strip().casefold()
    for product in products:
        if str(product.get("handle") or "").casefold() == h:
            return product
    return None


def demo_cards_for_turn(
    products: list[dict[str, Any]],
    user_message: str,
    *,
    max_results: int = 5,
) -> list[dict[str, str]]:
    msg = (user_message or "").strip()
    if not products or not msg:
        return []
    if is_specific_product_availability_question(msg) or is_product_browse_turn(msg):
        return search_demo_products(products, msg, max_results=max_results)
    cards = search_demo_products(products, msg, max_results=3)
    return cards if cards else []
