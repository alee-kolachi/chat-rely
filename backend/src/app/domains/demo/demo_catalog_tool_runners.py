"""Demo catalog tool runners (same JSON shape as Shopify tool_runners)."""

from __future__ import annotations

from typing import Any

import structlog

from app.domains.demo.demo_product_cards import (
    find_demo_product_by_handle,
    merge_demo_product_detail_enrichment,
    product_dict_to_card,
    product_dict_to_detail,
    search_demo_products,
)
from app.domains.demo.demo_product_detail_presenter import polish_demo_product_detail_with_llm
from app.domains.demo.storefront_ingest import fetch_storefront_product_enrichment
from app.domains.demo.demo_catalog_overview import (
    is_demo_broad_catalog_query,
    sample_broad_catalog_cards,
    summarize_demo_catalog,
)
from app.domains.integrations.shopify.admin_client import compact_json

log = structlog.get_logger("demo.catalog_tools")


def run_demo_product_search(
    products: list[dict[str, Any]],
    *,
    query: str,
    max_results: int = 5,
    relevance_query: str | None = None,
) -> str:
    q = (query or "").strip()
    n = max(1, min(int(max_results), 20))
    if not products:
        return compact_json(
            {
                "lookup_meta": {
                    "query": q,
                    "result_count": 0,
                    "not_found": True,
                    "message": "This demo catalog is not loaded yet.",
                }
            }
        )

    shopify_q = q
    is_broad = is_demo_broad_catalog_query(q, relevance_query=relevance_query)
    summary = None
    if is_broad or not q:
        shopify_q = "published_status:published"
        summary = summarize_demo_catalog(products)
        ui_cards = sample_broad_catalog_cards(products, limit=n)
    else:
        shopify_q = q
        ui_cards = search_demo_products(products, q, max_results=n, min_score=1)
        if relevance_query and ui_cards:
            from app.domains.integrations.shopify.tool_runners import _filter_cards_for_customer_relevance

            ui_cards = _filter_cards_for_customer_relevance(
                ui_cards,
                shopify_query=shopify_q,
                relevance_query=relevance_query,
            )

    lookup_meta: dict[str, object] = {
        "query": q,
        "shopify_query": shopify_q,
        "result_count": len(ui_cards),
        "not_found": len(ui_cards) <= 0,
    }
    if is_broad and products:
        summary = summary or summarize_demo_catalog(products)
        lookup_meta["is_broad_catalog"] = True
        lookup_meta["catalog_product_count"] = summary["product_count"]
        lookup_meta["catalog_categories"] = summary["categories"]
        lookup_meta["catalog_overview"] = summary["overview"]
    if not ui_cards:
        lookup_meta["message"] = (
            "No matching product for this search in the public store catalog. "
            "Do not claim it is available."
        )

    payload: dict[str, object] = {
        "data": {"products": {"edges": []}},
        "lookup_meta": lookup_meta,
    }
    if ui_cards:
        payload["ui_cards"] = ui_cards
    return compact_json(payload)


def run_demo_product_details(products: list[dict[str, Any]], *, handle: str) -> str:
    safe_handle = (handle or "").strip()
    if not safe_handle:
        return compact_json({"error": "empty_handle"})
    product = find_demo_product_by_handle(products, safe_handle)
    if product is None:
        return compact_json(
            {
                "lookup_meta": {
                    "handle": safe_handle,
                    "not_found": True,
                    "message": "Product not found in this store catalog.",
                }
            }
        )
    ui_detail = product_dict_to_detail(product)
    return compact_json({"ui_detail": ui_detail, "lookup_meta": {"handle": safe_handle, "not_found": False}})


async def run_demo_product_details_async(
    products: list[dict[str, Any]],
    *,
    handle: str,
    store_url: str | None,
) -> str:
    safe_handle = (handle or "").strip()
    if not safe_handle:
        return compact_json({"error": "empty_handle"})
    product = find_demo_product_by_handle(products, safe_handle)
    if product is None:
        return compact_json(
            {
                "lookup_meta": {
                    "handle": safe_handle,
                    "not_found": True,
                    "message": "Product not found in this store catalog.",
                }
            }
        )
    ui_detail = product_dict_to_detail(product)
    if ui_detail is None:
        return compact_json(
            {
                "lookup_meta": {
                    "handle": safe_handle,
                    "not_found": True,
                    "message": "Product not found in this store catalog.",
                }
            }
        )
    if store_url:
        enrichment = await fetch_storefront_product_enrichment(store_url, safe_handle)
        ui_detail = merge_demo_product_detail_enrichment(ui_detail, enrichment)
    ui_detail = await polish_demo_product_detail_with_llm(ui_detail)
    return compact_json({"ui_detail": ui_detail, "lookup_meta": {"handle": safe_handle, "not_found": False}})


def run_demo_similar_products(
    products: list[dict[str, Any]],
    *,
    handle: str,
    title: str | None,
    max_results: int = 5,
) -> str:
    seed = find_demo_product_by_handle(products, handle)
    query = (title or (seed or {}).get("title") or handle or "").strip()
    return run_demo_product_search(
        products,
        query=query,
        max_results=max_results,
        relevance_query=query,
    )
