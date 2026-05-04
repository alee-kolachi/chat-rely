"""
LLM-based routing: decide whether the customer's message needs live Shopify Admin data
before the main reply. Used to gate tool_choice='required' on round 0 — no regex heuristics.
"""

from __future__ import annotations

from typing import Any

import structlog
from langchain_core.messages import HumanMessage, SystemMessage
from pydantic import BaseModel, Field

from app.domains.runtime.chat_graph import make_chat_model

log = structlog.get_logger("runtime.shopify_router")

# Cheap model for a tiny structured classification step (same API key as runtime).
SHOPIFY_ROUTER_MODEL = "gpt-4o-mini"

# Require tool invocation on round 0 only when the router is this confident or higher.
SHOPIFY_TOOL_ROUTE_MIN_CONFIDENCE = 0.65


class ShopifyToolRoute(BaseModel):
    """Structured output from the routing LLM."""

    requires_live_shopify_data: bool = Field(
        description=(
            "True if an accurate answer needs live Shopify Admin data for THIS merchant "
            "(orders/fulfillment, catalog/inventory, customer purchase history tied to this store)."
        )
    )
    confidence: float = Field(
        ge=0.0,
        le=1.0,
        description="Confidence that requires_live_shopify_data is correct (0 = unsure, 1 = obvious).",
    )


_ROUTER_SYSTEM = """You classify **one** customer message for a support assistant.

The assistant may have Shopify Admin tools available this session (names and roles listed below).

Your task:
1. Decide whether responding correctly requires **live data from this merchant's Shopify store**
   (orders, fulfillment/tracking, inventory/stock, searchable catalog/pricing for items sold here,
   customer-specific purchases linked to this shop).

Set requires_live_shopify_data=true only when at least one listed tool would reasonably be needed.

Set requires_live_shopify_data=false for greetings/small talk, generic FAQs solvable from marketing copy alone,
questions clearly about other companies, or when you cannot tell if Shopify tools apply — use low confidence.

confidence rules:
- High (e.g. ≥0.75): clear operational store query (order lookup, tracking, stock check, product catalog question).
- Medium (~0.45–0.65): plausible store ops question but ambiguous wording.
- Low (<0.45): unclear, chitchat, or clearly not needing live Admin data.

Return only the structured fields."""


def tool_catalog_lines(tools: list[Any]) -> str:
    lines: list[str] = []
    for t in tools:
        name = str(getattr(t, "name", "") or "").strip()
        if not name:
            continue
        desc = str(getattr(t, "description", "") or "").strip()
        lines.append(f"- `{name}` — {desc}" if desc else f"- `{name}`")
    return "\n".join(lines) if lines else "(none)"


def tool_choice_required_from_route(route: ShopifyToolRoute | None, *, min_confidence: float) -> bool:
    if route is None:
        return False
    return route.requires_live_shopify_data and route.confidence >= min_confidence


async def classify_shopify_tool_route(user_message: str, tools: list[Any]) -> ShopifyToolRoute | None:
    """
    Ask a small LLM whether this turn needs Shopify tools; returns None on failure (caller treats as no force).
    """
    msg = (user_message or "").strip()
    if not msg or not tools:
        return None

    catalog = tool_catalog_lines(tools)
    human = (
        f"Available tools for this chat session:\n{catalog}\n\n"
        f"Customer message:\n{msg}"
    )

    try:
        llm = make_chat_model(SHOPIFY_ROUTER_MODEL).with_structured_output(ShopifyToolRoute)
        decision = await llm.ainvoke(
            [SystemMessage(content=_ROUTER_SYSTEM), HumanMessage(content=human)]
        )
        if not isinstance(decision, ShopifyToolRoute):
            return None
        log.info(
            "shopify_router.decision",
            requires_live_shopify_data=decision.requires_live_shopify_data,
            confidence=decision.confidence,
        )
        return decision
    except Exception as exc:
        log.warning("shopify_router.failed", error=str(exc)[:400])
        return None
