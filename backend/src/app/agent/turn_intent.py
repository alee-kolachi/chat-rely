"""LLM turn-intent routing (no phrase lists or regex for visitor intent)."""

from __future__ import annotations

import json
from typing import Any

import structlog
from langchain_core.messages import HumanMessage, SystemMessage
from pydantic import BaseModel, ConfigDict

from app.agent.llm import make_chat_model
from app.agent.messages import usage_tokens_from_model_message
from app.core.settings import Settings, get_settings

log = structlog.get_logger("agent.turn_intent")

_TURN_INTENT_SYSTEM = """You classify the latest customer message for a support chatbot. You do NOT answer the customer.
Return JSON only with these fields:
- is_greeting_or_small_talk (boolean): true for hi/thanks/bye or other messages with no substantive support question.
- requests_human (boolean): true only when they clearly want a live person, human agent, or escalation now.
- bare_order_number (string or null): set only when the entire message is an order number (digits, or # then digits). Otherwise null.
- thread_order_number (string or null): when the message is a follow-up about an order already discussed, the order # from thread context; else null.
- order_thread_follow_up (boolean): true when continuing an order/shipping/tracking topic without a new order #.
- needs_order_lookup (boolean): true when order status, tracking, shipment, or fulfillment needs live order data.
- needs_product_search (boolean): true when catalog, products, pricing, recommendations, or "do you sell/have…" needs live product search.
- needs_inventory_check (boolean): true when stock quantity or in-stock status is asked.
- needs_customer_context (boolean): true when account or purchase history by email is needed.

Rules:
- Catalog/product questions must NOT set needs_order_lookup unless they also ask about an order.
- needs_order_lookup and needs_product_search may both be true when the message asks about multiple topics.
- Prefer false when unsure (bias false for tool flags).
- requests_human is false for normal product or policy questions."""

class TurnIntentResult(BaseModel):
    model_config = ConfigDict(extra="ignore")

    is_greeting_or_small_talk: bool = False
    requests_human: bool = False
    bare_order_number: str | None = None
    thread_order_number: str | None = None
    order_thread_follow_up: bool = False
    needs_order_lookup: bool = False
    needs_product_search: bool = False
    needs_inventory_check: bool = False
    needs_customer_context: bool = False


def build_turn_intent_user_content(
    *,
    user_message: str,
    thread_summary: str,
    thread_had_order_lookup: bool,
) -> str:
    parts = [f"Latest customer message:\n{user_message.strip()}"]
    if thread_summary.strip():
        parts.append(f"Recent thread:\n{thread_summary.strip()}")
    if thread_had_order_lookup:
        parts.append("Note: this thread already used order lookup on a prior turn.")
    return "\n\n".join(parts)


async def run_turn_intent_classifier(
    *,
    user_message: str,
    thread_summary: str = "",
    thread_had_order_lookup: bool = False,
    settings: Settings | None = None,
) -> tuple[TurnIntentResult, dict[str, Any]]:
    """Cheap structured intent call; does not answer the customer."""
    settings = settings or get_settings()
    router_model = settings.runtime_default_chat_model or "gpt-4o-mini"
    llm = make_chat_model(router_model, temperature=0.0).bind(
        response_format={"type": "json_object"},
    )
    user_content = build_turn_intent_user_content(
        user_message=user_message,
        thread_summary=thread_summary,
        thread_had_order_lookup=thread_had_order_lookup,
    )
    billing: dict[str, Any] = {"model": router_model, "input_tokens": 0, "output_tokens": 0}
    try:
        msg = await llm.ainvoke(
            [SystemMessage(content=_TURN_INTENT_SYSTEM), HumanMessage(content=user_content)]
        )
        in_t, out_t = usage_tokens_from_model_message(msg)
        billing["input_tokens"] = in_t
        billing["output_tokens"] = out_t
        raw = msg.content if isinstance(msg.content, str) else str(msg.content or "")
        data = json.loads(raw)
        result = TurnIntentResult.model_validate(data)
    except Exception as exc:
        log.warning("turn_intent.classifier_failed", error=str(exc))
        result = TurnIntentResult()
    return result, billing


def merge_routing_billing(
    primary: dict[str, Any] | None,
    extra: dict[str, Any] | None,
) -> dict[str, Any] | None:
    if not extra:
        return primary
    if not primary:
        return dict(extra)
    merged = dict(primary)
    merged["input_tokens"] = int(merged.get("input_tokens") or 0) + int(
        extra.get("input_tokens") or 0
    )
    merged["output_tokens"] = int(merged.get("output_tokens") or 0) + int(
        extra.get("output_tokens") or 0
    )
    return merged


def shopify_tools_to_exclude(
    intent: TurnIntentResult,
    *,
    has_order_lookup_tool: bool,
    has_product_search_tool: bool,
) -> set[str]:
    """Limit bound tools when intent is clear; empty set = no filtering."""
    exclude: set[str] = set()
    if (
        has_order_lookup_tool
        and has_product_search_tool
        and intent.needs_product_search
        and not intent.needs_order_lookup
        and not intent.bare_order_number
        and not intent.order_thread_follow_up
    ):
        exclude.add("shopify_order_lookup")
    return exclude


def apply_turn_intent_grounding(
    *,
    base_content: str,
    user_message: str,
    intent: TurnIntentResult,
    has_order_lookup_tool: bool,
    has_product_search_tool: bool,
    thread_had_order_lookup: bool,
) -> str:
    """Optional per-turn hint for the main model (templates only, not phrase matching)."""
    from app.domains.runtime.prompts.user import (
        build_catalog_only_shopify_user_prompt,
        build_multi_intent_shopify_user_prompt,
    )

    if intent.bare_order_number and has_order_lookup_tool:
        ref = intent.bare_order_number.strip()
        return (
            f"The customer sent only an order number ({ref}). "
            "Call `shopify_order_lookup` with `order_name_or_number` set to that value "
            "(include a leading # if they used one) before answering about status or tracking.\n\n"
            f"Customer message:\n{user_message}"
        )

    if (
        intent.order_thread_follow_up
        and thread_had_order_lookup
        and has_order_lookup_tool
    ):
        order_ref = (intent.thread_order_number or "").strip()
        ref_line = (
            f"The order number from this thread is `{order_ref}`. "
            if order_ref
            else "Resolve the order number from prior messages in this thread. "
        )
        return (
            f"{ref_line}"
            "This is a follow-up about an order already discussed in this thread. "
            "Do **not** ask the customer to repeat their order number or email. "
            "Answer from prior assistant messages when they contain the detail; "
            "otherwise call `shopify_order_lookup` again with the same `order_name_or_number`.\n\n"
            f"Customer message:\n{user_message}"
        )

    if intent.needs_order_lookup and intent.needs_product_search:
        return build_multi_intent_shopify_user_prompt(
            user_message,
            has_order_lookup_tool=has_order_lookup_tool,
            has_product_search_tool=has_product_search_tool,
        )

    if (
        intent.needs_product_search
        and not intent.needs_order_lookup
        and has_product_search_tool
    ):
        return build_catalog_only_shopify_user_prompt(user_message)

    if intent.needs_order_lookup and not has_order_lookup_tool:
        return (
            "The customer is asking about an order, shipment, or tracking. "
            "Order Lookup is **not** enabled for this chat — do **not** call `shopify_product_search`. "
            "Explain that you cannot check order status live and suggest they contact the store "
            "(the merchant can enable Order Lookup in agent settings).\n\n"
            f"Customer message:\n{user_message}"
        )

    return base_content
