"""LLM picks relevant products from the full provisioned catalog snapshot."""

from __future__ import annotations

from typing import Any, Literal

import structlog
from langchain_core.messages import HumanMessage, SystemMessage
from pydantic import BaseModel, Field

from app.core.settings import get_settings
from app.domains.demo.demo_catalog_grounding import (
    build_demo_grounding_chunks,
    policy_grounding_chunks,
    rank_demo_products,
)

log = structlog.get_logger("demo.catalog_selector")

_MAX_SELECT = 8
_CATALOG_INDEX_CAP = 2500


class DemoCatalogSelection(BaseModel):
    intent: Literal["product", "policy", "general"] = "product"
    handles: list[str] = Field(default_factory=list, max_length=_MAX_SELECT)


def _format_price(product: dict[str, Any]) -> str:
    raw = product.get("min_price") or product.get("max_price")
    if not raw:
        return ""
    currency = str(product.get("currency") or "USD").upper()
    if currency == "USD":
        return f"${raw}"
    return f"{raw} {currency}"


def build_compact_catalog_index(products: list[dict[str, Any]]) -> str:
    """One line per product: handle | title | price | type (for LLM selection)."""
    lines: list[str] = []
    for product in products[:_CATALOG_INDEX_CAP]:
        handle = str(product.get("handle") or "").strip()
        title = str(product.get("title") or "").strip()
        if not handle or not title:
            continue
        price = _format_price(product)
        ptype = str(product.get("product_type") or "").strip()
        lines.append(f"{handle} | {title} | {price} | {ptype}")
    return "\n".join(lines)


def _products_by_handles(
    products: list[dict[str, Any]], handles: list[str]
) -> list[dict[str, Any]]:
    wanted = {h.strip().casefold() for h in handles if h.strip()}
    if not wanted:
        return []
    out: list[dict[str, Any]] = []
    for product in products:
        handle = str(product.get("handle") or "").strip().casefold()
        if handle in wanted:
            out.append(product)
    return out


def fallback_select_products(
    products: list[dict[str, Any]],
    user_message: str,
    *,
    limit: int = 5,
) -> list[dict[str, Any]]:
    ranked = rank_demo_products(products, user_message)
    return [p for _score, p in ranked[:limit]]


async def select_demo_catalog_products(
    products: list[dict[str, Any]],
    user_message: str,
    *,
    compact_index: str | None = None,
    recent_user_messages: list[str] | None = None,
    limit: int = 5,
) -> tuple[DemoCatalogSelection, list[dict[str, Any]]]:
    msg = (user_message or "").strip()
    if not msg or not products:
        return DemoCatalogSelection(intent="general", handles=[]), []

    from app.domains.demo.demo_search_planner import _looks_like_policy_question

    if _looks_like_policy_question(msg):
        return DemoCatalogSelection(intent="policy", handles=[]), []

    from app.agent.llm import make_groq_chat_model, make_openai_chat_model
    from app.core.openai_keys import ainvoke_with_key_fallback, has_chat_llm_key

    settings = get_settings()
    if not has_chat_llm_key(settings):
        selected = fallback_select_products(products, msg, limit=limit)
        handles = [str(p.get("handle") or "") for p in selected if p.get("handle")]
        return DemoCatalogSelection(intent="product", handles=handles), selected

    catalog_index = compact_index or build_compact_catalog_index(products)
    history = [m.strip() for m in (recent_user_messages or []) if m.strip()][-2:]
    history_block = ""
    if history:
        history_block = "Recent shopper messages:\n" + "\n".join(f"- {line}" for line in history) + "\n\n"

    model_name = settings.openai_chat_model or "gpt-4o-mini"
    sys = SystemMessage(
        content=(
            "You select products from a Shopify store catalog for a support demo bot. "
            "Each catalog line is: handle | title | price | product_type. "
            "Return up to "
            f"{limit} handles that best match the shopper's question. "
            "Use exact handles from the catalog. "
            "For policy-only questions (returns, shipping) set intent=policy and empty handles. "
            "For greetings or chit-chat with no product, intent=general and empty handles."
        )
    )
    human = HumanMessage(
        content=(
            f"{history_block}"
            f"Shopper message:\n{msg}\n\n"
            f"Catalog ({len(products)} products, one per line):\n{catalog_index}\n\n"
            "Return structured selection only."
        )
    )

    try:
        result = await ainvoke_with_key_fallback(
            lambda api_key: make_openai_chat_model(
                model_name,
                api_key=api_key,
                timeout=25,
                max_retries=1,
            ).with_structured_output(DemoCatalogSelection),
            [sys, human],
            settings=settings,
            build_groq_llm=lambda: make_groq_chat_model(
                timeout=25,
                max_retries=1,
                streaming=False,
            ).with_structured_output(DemoCatalogSelection),
        )
        if not isinstance(result, DemoCatalogSelection):
            selected = fallback_select_products(products, msg, limit=limit)
            handles = [str(p.get("handle") or "") for p in selected if p.get("handle")]
            return DemoCatalogSelection(intent="product", handles=handles), selected

        if result.intent != "product" or not result.handles:
            return result, []

        selected = _products_by_handles(products, result.handles)
        if not selected:
            selected = fallback_select_products(products, msg, limit=limit)
        return result, selected[:limit]
    except Exception:
        log.warning("demo.catalog_select_failed", exc_info=True)
        selected = fallback_select_products(products, msg, limit=limit)
        handles = [str(p.get("handle") or "") for p in selected if p.get("handle")]
        return DemoCatalogSelection(intent="product", handles=handles), selected


def merge_demo_grounding_chunks(
    product_chunks: list[dict[str, Any]],
    rag_chunks: list[dict[str, Any]],
    *,
    limit: int,
) -> list[dict[str, Any]]:
    seen: set[str] = set()
    merged: list[dict[str, Any]] = []
    for chunk in product_chunks + rag_chunks:
        key = str(chunk.get("content") or "")[:100]
        if not key or key in seen:
            continue
        seen.add(key)
        merged.append(chunk)
        if len(merged) >= limit:
            break
    return merged


async def fetch_demo_turn_grounding(
    *,
    products: list[dict[str, Any]],
    policies: dict[str, str],
    user_message: str,
    recent_user_messages: list[str] | None = None,
    chunk_limit: int = 5,
    compact_index: str | None = None,
) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    """Select products with LLM from full snapshot, return (chunks, selected products)."""
    selection, selected = await select_demo_catalog_products(
        products,
        user_message,
        compact_index=compact_index,
        recent_user_messages=recent_user_messages,
        limit=chunk_limit,
    )

    if selection.intent == "policy":
        policy_chunks = policy_grounding_chunks(
            policies,
            user_message,
            limit=min(2, chunk_limit),
        )
        if policy_chunks:
            return policy_chunks, []

    if selection.intent == "general" or not selected:
        if selection.intent == "general":
            return [], []
        policy_chunks = policy_grounding_chunks(
            policies,
            user_message,
            limit=min(2, chunk_limit),
        )
        if policy_chunks:
            return policy_chunks, []
        return [], []

    chunks = build_demo_grounding_chunks(
        selected,
        policies,
        user_message,
        limit=chunk_limit,
    )
    log.info(
        "demo.catalog_select",
        intent=selection.intent,
        handles=selection.handles,
        hits=len(selected),
    )
    return chunks, selected
