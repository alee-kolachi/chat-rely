from datetime import UTC, datetime
from uuid import uuid4

import pytest

from app.domains.conversations.schemas import MessageDTO
from app.domains.runtime.runtime_intent import (
    conversation_recent_used_shopify_tools,
    is_commerce_shopify_intent,
    resolve_commerce_intent,
)
from app.domains.runtime.shopify_tool_router import ShopifyToolRoute


def _row(**kwargs: object) -> MessageDTO:
    base = {
        "id": str(uuid4()),
        "conversation_id": str(uuid4()),
        "agent_id": str(uuid4()),
        "user_id": "00000000-0000-0000-0000-000000000123",
        "role": "user",
        "content": "",
        "tool_name": None,
        "tool_call_id": None,
        "tool_call_payload": {},
        "tool_result_payload": {},
        "model": "gpt-4o-mini",
        "input_tokens": 0,
        "output_tokens": 0,
        "latency_ms": None,
        "metadata": {},
        "created_at": datetime.now(tz=UTC).isoformat(),
    }
    base.update(kwargs)
    return MessageDTO.model_validate(base)


def test_commerce_intent_product_question() -> None:
    assert is_commerce_shopify_intent("Do you have skateboard in blue water design?") is True


def test_commerce_intent_policy_question() -> None:
    assert is_commerce_shopify_intent("What is your return policy for shoes?") is False


def test_commerce_intent_order_tracking() -> None:
    assert is_commerce_shopify_intent("Where is my order #1042?") is True


def test_commerce_intent_not_prior_reply_price_clarification() -> None:
    """Bare amounts + PKR should not imply a fresh catalog lookup."""
    assert (
        is_commerce_shopify_intent(
            "Is it PKR 600 or 60,000 you gave me two prices?"
        )
        is False
    )


def test_commerce_intent_price_in_pkr_still_commerce() -> None:
    assert is_commerce_shopify_intent("What is the price in PKR for the snowboard?") is True


def test_conversation_recent_used_shopify_tools_from_tool_row() -> None:
    t = _row(role="tool", tool_name="shopify_product_search", content="{}")
    assert conversation_recent_used_shopify_tools([t]) is True


def test_conversation_recent_used_shopify_tools_from_assistant_payload() -> None:
    a = _row(
        role="assistant",
        content="",
        tool_call_payload={
            "tool_calls": [{"name": "shopify_product_search", "id": "call_1", "args": {}}]
        },
    )
    assert conversation_recent_used_shopify_tools([a]) is True


@pytest.mark.asyncio
async def test_resolve_commerce_any_followup_after_shopify_thread() -> None:
    """No phrase list: arbitrary user text stays commerce if the thread already ran Shopify tools."""
    intent, source, conf = await resolve_commerce_intent(
        "Yeah try that once more using different words",
        tool_list=[object()],
        shopify_route_decision=None,
        llm_fallback_enabled=True,
        recent_thread_used_shopify_tools=True,
    )
    assert intent is True
    assert source == "thread_shopify_context"
    assert conf is None


@pytest.mark.asyncio
async def test_resolve_commerce_regex_short_circuits() -> None:
    intent, source, conf = await resolve_commerce_intent(
        "Do you have blue widgets?",
        tool_list=[object()],
        shopify_route_decision=None,
        llm_fallback_enabled=True,
    )
    assert intent is True
    assert source == "regex"
    assert conf is None


@pytest.mark.asyncio
async def test_resolve_commerce_llm_fallback_when_regex_misses(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    async def _fake_classify(_msg: str, _tools: object) -> ShopifyToolRoute:
        return ShopifyToolRoute(requires_live_shopify_data=True, confidence=0.9)

    monkeypatch.setattr(
        "app.domains.runtime.runtime_intent.classify_shopify_tool_route",
        _fake_classify,
    )

    intent, source, conf = await resolve_commerce_intent(
        "Show me something unique about your warehouse inventory for widgets",
        tool_list=[object()],
        shopify_route_decision=None,
        llm_fallback_enabled=True,
    )
    assert intent is True
    assert source == "llm_fallback"
    assert conf == 0.9


@pytest.mark.asyncio
async def test_resolve_commerce_reuses_router_without_extra_llm() -> None:
    route = ShopifyToolRoute(requires_live_shopify_data=True, confidence=0.72)
    intent, source, conf = await resolve_commerce_intent(
        "xyzzy frobnitz plugh metaphor about assortment preferences without stock nouns",
        tool_list=[object()],
        shopify_route_decision=route,
        llm_fallback_enabled=True,
    )
    assert intent is True
    assert source == "router"
    assert conf == 0.72
