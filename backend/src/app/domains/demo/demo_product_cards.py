"""Demo product cards from catalog snapshot (no Shopify OAuth)."""

from __future__ import annotations

from typing import Any

from app.agent.product_cards import is_product_browse_turn, is_specific_product_availability_question
from app.domains.demo.demo_catalog_grounding import rank_demo_products


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


def _product_image_urls(product: dict[str, Any], *, card_image: str | None) -> list[str]:
    urls: list[str] = []
    seen: set[str] = set()
    stored = product.get("image_urls")
    if isinstance(stored, list):
        for item in stored:
            if not isinstance(item, str):
                continue
            url = item.strip()
            if url and url not in seen:
                seen.add(url)
                urls.append(url)
    if card_image and card_image not in seen:
        urls.insert(0, card_image)
    return urls


def product_dict_to_detail(product: dict[str, Any]) -> dict[str, Any] | None:
    card = product_dict_to_card(product)
    if card is None:
        return None
    detail: dict[str, Any] = {
        **card,
        "image_urls": _product_image_urls(product, card_image=card.get("image_url")),
    }
    desc = product.get("description_excerpt")
    if isinstance(desc, str) and desc.strip():
        detail["description"] = desc.strip()
    points = product.get("description_points")
    if isinstance(points, list):
        cleaned_points = [str(p).strip() for p in points if str(p).strip()]
        if cleaned_points:
            detail["description_points"] = cleaned_points[:12]
    vendor = product.get("vendor")
    if isinstance(vendor, str) and vendor.strip():
        detail["vendor"] = vendor.strip()
    product_type = product.get("product_type")
    if isinstance(product_type, str) and product_type.strip():
        detail["product_type"] = product_type.strip()
    options_raw = product.get("options")
    if isinstance(options_raw, list):
        options: list[dict[str, object]] = []
        for opt in options_raw:
            if not isinstance(opt, dict):
                continue
            name = str(opt.get("name") or "").strip()
            values = opt.get("values")
            if not name or not isinstance(values, list):
                continue
            cleaned = [str(v).strip() for v in values if str(v).strip()]
            if cleaned:
                options.append({"name": name, "values": cleaned})
        if options:
            detail["options"] = options
    variants_raw = product.get("variants")
    if isinstance(variants_raw, list):
        variants: list[dict[str, str]] = []
        for row in variants_raw[:20]:
            if not isinstance(row, dict):
                continue
            title = str(row.get("title") or "").strip()
            if not title:
                continue
            variant: dict[str, str] = {"title": title}
            price = row.get("price")
            if isinstance(price, str) and price.strip():
                variant["price"] = price.strip()
            sku = row.get("sku")
            if isinstance(sku, str) and sku.strip():
                variant["sku"] = sku.strip()
            variants.append(variant)
        if variants:
            detail["variants"] = variants
            for variant in variants:
                sku = variant.get("sku")
                if sku:
                    detail["sku"] = sku
                    break
    return detail


def merge_demo_product_detail_enrichment(
    detail: dict[str, Any],
    enrichment: dict[str, Any] | None,
) -> dict[str, Any]:
    if not enrichment:
        return detail
    image_urls = enrichment.get("image_urls")
    if isinstance(image_urls, list):
        merged: list[str] = []
        seen: set[str] = set()
        for item in image_urls:
            if not isinstance(item, str):
                continue
            url = item.strip()
            if url and url not in seen:
                seen.add(url)
                merged.append(url)
        if merged:
            detail["image_urls"] = merged
            detail["image_url"] = merged[0]
    points = enrichment.get("description_points")
    if isinstance(points, list):
        cleaned = [str(p).strip() for p in points if str(p).strip()]
        if cleaned:
            detail["description_points"] = cleaned[:12]
            detail.pop("description", None)
    return detail


def _tokenize(text: str) -> set[str]:
    from app.domains.demo.demo_catalog_grounding import demo_query_tokens

    return set(demo_query_tokens(text))


def _score_product(product: dict[str, Any], query_tokens: set[str]) -> int:
    if not query_tokens:
        return 0
    ranked = rank_demo_products([product], " ".join(query_tokens))
    return ranked[0][0] if ranked else 0


def search_demo_products(
    products: list[dict[str, Any]],
    query: str,
    *,
    max_results: int = 5,
    min_score: int = 1,
) -> list[dict[str, str]]:
    ranked = rank_demo_products(products, query)
    cards: list[dict[str, str]] = []
    for score, product in ranked:
        if score < min_score:
            break
        card = product_dict_to_card(product)
        if card:
            cards.append(card)
        if len(cards) >= max_results:
            break
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

    ranked = rank_demo_products(products, msg)
    if not ranked:
        return []

    best_score = ranked[0][0]
    is_browse = is_product_browse_turn(msg) or is_specific_product_availability_question(msg)
    is_price_question = any(
        hint in msg.casefold()
        for hint in ("price", "cost", "how much", "how much is", "what does", "worth", "pricing")
    )

    if is_price_question:
        if best_score < 2:
            return []
        return search_demo_products(products, msg, max_results=1, min_score=2)

    if is_browse:
        return search_demo_products(products, msg, max_results=max_results, min_score=1)

    if best_score < 2:
        return []
    return search_demo_products(products, msg, max_results=min(3, max_results), min_score=2)
