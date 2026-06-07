"""LangGraph chat agent tests (Shopify tools + human escalation)."""

from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock, patch
from uuid import uuid4

import pytest
from langchain_core.messages import AIMessage, HumanMessage, SystemMessage, ToolMessage
from langchain_core.tools import StructuredTool

from app.agent.graph import (
    MAX_TOOL_ROUNDS,
    _call_model_node,
    _route_after_model,
    _route_after_shopify_tools,
    append_escalation_tool_prompt,
    build_chat_graph,
)
from app.agent.knowledge_tools import SEARCH_KNOWLEDGE_BASE_TOOL_NAME, build_search_knowledge_base_tool
from app.agent.tools import ESCALATE_TO_HUMAN_TOOL_NAME, build_escalate_to_human_tool


def test_escalate_tool_name() -> None:
    tool = build_escalate_to_human_tool()
    assert tool.name == ESCALATE_TO_HUMAN_TOOL_NAME


def _shopify_tool(name: str) -> StructuredTool:
    async def _run(**kwargs: object) -> str:
        return "{}"

    return StructuredTool.from_function(
        coroutine=_run,
        name=name,
        description="test",
    )


def test_route_to_escalation_when_requested() -> None:
    ai = AIMessage(
        content="",
        tool_calls=[
            {
                "id": "tc1",
                "name": ESCALATE_TO_HUMAN_TOOL_NAME,
                "args": {"reason": "Visitor asked for a human"},
            }
        ],
    )
    state = {
        "messages": [SystemMessage(content="sys"), HumanMessage(content="hi"), ai],
        "escalation_enabled": True,
        "shopify_tool_names": set(),
    }
    assert _route_after_model(state) == "escalation"


def test_route_to_tools_when_knowledge_search_bound() -> None:
    ai = AIMessage(
        content="",
        tool_calls=[
            {
                "id": "tc_kb",
                "name": SEARCH_KNOWLEDGE_BASE_TOOL_NAME,
                "args": {"query": "girls frocks"},
            }
        ],
    )
    kb_tool = build_search_knowledge_base_tool(agent_id=uuid4(), min_similarity=0.2)
    state = {
        "messages": [ai],
        "escalation_enabled": False,
        "bound_tools": [kb_tool],
        "shopify_tool_names": set(),
    }
    assert _route_after_model(state) == "shopify_tools"


def test_route_to_shopify_tools_when_bound() -> None:
    ai = AIMessage(
        content="",
        tool_calls=[
            {
                "id": "tc2",
                "name": "shopify_product_search",
                "args": {"query": "hoodie"},
            }
        ],
    )
    shop_tool = _shopify_tool("shopify_product_search")
    state = {
        "messages": [ai],
        "escalation_enabled": False,
        "bound_tools": [shop_tool],
        "shopify_tool_names": {"shopify_product_search"},
    }
    assert _route_after_model(state) == "shopify_tools"


def test_route_end_when_no_tools_enabled() -> None:
    ai = AIMessage(
        content="",
        tool_calls=[
            {
                "id": "tc1",
                "name": ESCALATE_TO_HUMAN_TOOL_NAME,
                "args": {"reason": "x"},
            }
        ],
    )
    state = {"messages": [ai], "escalation_enabled": False, "shopify_tool_names": set()}
    # Unbound tool calls still route to the tools node so every call gets a ToolMessage reply.
    assert _route_after_model(state) == "shopify_tools"


def test_route_after_shopify_tools_loops_until_max_rounds() -> None:
    assert _route_after_shopify_tools({"model_round": 1}) == "call_model"
    assert _route_after_shopify_tools({"model_round": MAX_TOOL_ROUNDS}) == "__end__"
    assert (
        _route_after_shopify_tools(
            {
                "model_round": MAX_TOOL_ROUNDS,
                "messages": [
                    ToolMessage(content='{"products":[]}', tool_call_id="tc1", name="shopify_product_search")
                ],
            }
        )
        == "call_model"
    )


def test_append_escalation_tool_prompt_only_when_enabled() -> None:
    base = "You are helpful."
    disabled = append_escalation_tool_prompt(base, tools_enabled=False)
    assert "escalate_to_human" not in disabled
    assert "no live handoff" in disabled.lower()
    extended = append_escalation_tool_prompt(base, tools_enabled=True)
    assert "escalate_to_human" in extended


def test_handoff_reply_copy_is_visitor_clear() -> None:
    from app.agent.escalation import (
        handoff_reply_already_escalated,
        handoff_reply_awaiting_team,
        visitor_empty_reply_fallback,
    )

    already = handoff_reply_already_escalated()
    awaiting = handoff_reply_awaiting_team()
    empty = visitor_empty_reply_fallback()

    assert already == awaiting
    assert "support team" in awaiting.lower()
    assert "new chat" in awaiting.lower()
    assert "importing" not in awaiting.lower()
    assert "importing" not in empty.lower()
    assert "rephrasing" in empty.lower() or "visit" in empty.lower()


def test_visitor_contact_gate_before_escalation() -> None:
    from app.agent.escalation import handoff_ask_contact, looks_like_email, visitor_contact_complete

    assert "name and email" in handoff_ask_contact().lower()
    assert not visitor_contact_complete(None, "a@b.com")
    assert visitor_contact_complete("Alex", "alex@example.com")
    assert looks_like_email("alex@example.com")
    assert not looks_like_email("not-an-email")


@pytest.mark.asyncio
async def test_set_escalation_pending_contact_uses_literal_jsonb_key() -> None:
    from unittest.mock import AsyncMock, MagicMock
    from uuid import uuid4

    from app.agent.escalation import ESCALATION_PENDING_CONTACT_META_KEY, _set_escalation_pending_contact

    db = MagicMock()
    db.execute = AsyncMock()
    db.commit = AsyncMock()
    await _set_escalation_pending_contact(
        db,
        user_id=uuid4(),
        conversation_id=uuid4(),
        pending=True,
    )
    sql = str(db.execute.call_args[0][0])
    assert ":pending_key" not in sql
    assert f"'{ESCALATION_PENDING_CONTACT_META_KEY}'" in sql


@pytest.mark.asyncio
async def test_call_model_emits_preamble_before_tool_calls() -> None:
    from app.agent.graph import _call_model_node

    state = {
        "messages": [HumanMessage(content="Do you sell boots?")],
        "model": "gpt-4o-mini",
        "temperature": 0.0,
        "fallback_message": "Sorry, I am not fully sure.",
        "model_round": 0,
        "bound_tools": [MagicMock(name="shopify_product_search")],
        "usage_input_tokens": 0,
        "usage_output_tokens": 0,
    }

    mock_llm = MagicMock()

    async def _fake_astream(_messages):  # noqa: ANN001
        yield AIMessage(
            content="Let me check our store for boots.",
            tool_calls=[{"id": "tc1", "name": "shopify_product_search", "args": {"query": "boots"}}],
        )

    mock_llm.astream = _fake_astream
    mock_llm.bind_tools = MagicMock(return_value=mock_llm)

    writer = MagicMock()
    with patch("app.agent.graph.make_chat_model", return_value=mock_llm):
        result = await _call_model_node(state, writer)

    writer.assert_called_with(
        {"type": "preamble", "text": "Let me check our store for boots."}
    )
    assert result["model_round"] == 1
    assert result["messages"][0].tool_calls


@pytest.mark.asyncio
async def test_call_model_synthesizes_from_tool_results_at_max_rounds() -> None:
    tool_ai = AIMessage(
        content="",
        tool_calls=[{"id": "tc1", "name": "shopify_product_search", "args": {"query": "hoodie"}}],
    )
    tool_result = ToolMessage(
        content='{"products":[{"title":"Blue Hoodie","price":"29.99"}]}',
        tool_call_id="tc1",
        name="shopify_product_search",
    )
    state = {
        "messages": [HumanMessage(content="Do you have hoodies?"), tool_ai, tool_result],
        "model": "gpt-4o-mini",
        "temperature": 0.0,
        "fallback_message": "Sorry, I am not fully sure.",
        "model_round": MAX_TOOL_ROUNDS,
        "usage_input_tokens": 10,
        "usage_output_tokens": 5,
    }

    mock_llm = MagicMock()

    async def _fake_astream(_messages):  # noqa: ANN001
        yield AIMessage(content="Yes — we have the Blue Hoodie for $29.99.")

    mock_llm.astream = _fake_astream
    mock_llm.bind_tools = MagicMock(return_value=mock_llm)

    writer = MagicMock()
    with patch("app.agent.graph.make_chat_model", return_value=mock_llm):
        result = await _call_model_node(state, writer)

    assert result["final_response"] == "Yes — we have the Blue Hoodie for $29.99."
    assert result["fallback_used"] is False
    assert result["model_round"] == MAX_TOOL_ROUNDS + 1
    mock_llm.bind_tools.assert_not_called()
    writer.assert_called_with({"type": "token", "text": "Yes — we have the Blue Hoodie for $29.99."})


@pytest.mark.asyncio
async def test_call_model_at_max_rounds_without_tool_results_uses_fallback() -> None:
    state = {
        "messages": [HumanMessage(content="Hi")],
        "model": "gpt-4o-mini",
        "temperature": 0.0,
        "fallback_message": "Sorry, I am not fully sure.",
        "model_round": MAX_TOOL_ROUNDS,
        "usage_input_tokens": 1,
        "usage_output_tokens": 2,
    }
    writer = MagicMock()

    with patch("app.agent.graph.make_chat_model") as mock_make:
        result = await _call_model_node(state, writer)

    mock_make.assert_not_called()
    assert result["final_response"] == "Sorry, I am not fully sure."
    assert result["fallback_used"] is True
    writer.assert_called_with({"type": "token", "text": "Sorry, I am not fully sure."})


@pytest.mark.asyncio
async def test_stream_chat_graph_emits_done() -> None:
    from app.agent.escalation import EscalationTurnContext
    from app.agent.graph import stream_chat_graph

    user_id = uuid4()
    agent_id = uuid4()
    conversation_id = uuid4()

    async def _fake_astream(_initial, stream_mode=None):  # noqa: ANN001
        assert stream_mode == ["custom", "updates"]
        yield "custom", {"type": "token", "text": "Hello"}
        yield "updates", {
            "call_model": {
                "messages": [AIMessage(content="Hello")],
                "final_response": "Hello",
                "fallback_used": False,
                "usage_input_tokens": 1,
                "usage_output_tokens": 2,
                "tools_invoked": [],
                "escalation_occurred": False,
            }
        }

    mock_graph = MagicMock()
    mock_graph.astream = _fake_astream

    ctx = EscalationTurnContext(
        user_id=user_id,
        agent_id=agent_id,
        conversation_id=conversation_id,
        user_message="Hi",
        visitor_email=None,
        visitor_name=None,
        esc_cfg={},
    )
    messages = [SystemMessage(content="sys"), HumanMessage(content="Hi")]

    with patch("app.agent.graph.get_compiled_chat_graph", return_value=mock_graph):
        events = [
            e
            async for e in stream_chat_graph(
                messages=messages,
                model="gpt-4o-mini",
                temperature=0.0,
                fallback_message="fallback",
                escalation_enabled=False,
                bound_tools=[],
                turn_context=ctx,
            )
        ]

    assert events[0] == {"type": "token", "text": "Hello"}
    assert events[-1]["type"] == "done"
    assert events[-1]["response"] == "Hello"


def test_build_chat_graph_compiles() -> None:
    graph = build_chat_graph()
    assert graph is not None


def test_select_chunks_lexical_grounded_when_threshold_too_high() -> None:
    from app.domains.runtime.service import _rerank_chunks_for_query, _select_chunks_for_prompt

    merged = [
        {
            "id": "a",
            "content": "MEN-SALE – Breakout | https://breakout.com.pk/collections/men-sale",
            "similarity": 0.36,
        },
        {
            "id": "b",
            "content": (
                "Section: Everything New For Boys & Girls > Girls Collection > Fancy frocks\n\n"
                "Dressing up little girls in a fancy frock is a fun thing. "
                "Floral, fancy, glittery frocks and more."
            ),
            "similarity": 0.35,
        },
    ]
    chunks, mode, _, passed = _select_chunks_for_prompt(
        merged,
        user_message="do you sell frocks?",
        min_similarity=0.72,
    )
    assert passed == 0
    assert mode == "lexical_grounded_below_threshold"
    assert len(chunks) == 1
    assert chunks[0]["id"] == "b"

    ranked = _rerank_chunks_for_query(merged, "do you sell frocks?")
    assert ranked[0]["id"] == "b"


def test_extract_chunk_excerpt_finds_section_not_page_header() -> None:
    from app.domains.runtime.service import _build_context_block, _extract_query_terms

    chunk = {
        "content": (
            "Everything New For Boys & Girls – Breakout | https://example.com/blog\n\n"
            "### A well-curated wardrobe is all about versatility and timeless style.\n\n"
            + ("Intro filler paragraph. " * 80)
            + "\n\n## Girls Collection\n\n"
            "### Fancy frocks\n\n"
            "Dressing up little girls in a fancy frock is a fun thing. "
            "Designs such as floral, fancy, glittery, animated, pearl embellished, and embroidered."
        ),
    }
    excerpt = _build_context_block([chunk], user_message="what type of frocks?")
    assert "floral" in excerpt
    assert "versatility and timeless style" not in excerpt


def test_select_chunks_no_match_without_query_terms_in_candidates() -> None:
    from app.domains.runtime.service import _select_chunks_for_prompt

    merged = [
        {"id": "a", "content": "unrelated men sale collection", "similarity": 0.33},
    ]
    chunks, mode, _, _ = _select_chunks_for_prompt(
        merged,
        user_message="do you sell frocks?",
        min_similarity=0.72,
    )
    assert chunks == []
    assert mode == "no_match"


def test_shopify_connected_no_tools_block_forbids_invented_catalog() -> None:
    from app.domains.runtime.service import _SHOPIFY_CONNECTED_NO_TOOLS_BLOCK

    block = _SHOPIFY_CONNECTED_NO_TOOLS_BLOCK.lower()
    assert "no tools enabled" in block
    assert "do not invent" in block
    assert "live store" in block


def test_agent_system_prompt_without_order_lookup_forbids_product_search_for_orders() -> None:
    from app.domains.runtime.prompts.system import build_agent_system_prompt_for_tools

    prompt = build_agent_system_prompt_for_tools(
        "",
        has_knowledge_tool=False,
        has_shopify_tools=True,
        has_order_lookup_tool=False,
    ).lower()
    assert "order lookup is not enabled" in prompt
    assert "shopify_order_lookup" not in prompt


def test_agent_system_prompt_with_order_lookup_mentions_order_tool() -> None:
    from app.domains.runtime.prompts.system import build_agent_system_prompt_for_tools

    prompt = build_agent_system_prompt_for_tools(
        "",
        has_knowledge_tool=False,
        has_shopify_tools=True,
        has_order_lookup_tool=True,
    )
    assert "shopify_order_lookup" in prompt


def test_product_search_tool_description_excludes_orders_when_order_lookup_disabled() -> None:
    from app.domains.runtime.shopify_lc_tools import build_shopify_langchain_tools

    tools = build_shopify_langchain_tools(
        "test.myshopify.com",
        "token",
        {"shopify.product_search"},
    )
    assert len(tools) == 1
    desc = (tools[0].description or "").lower()
    assert "do not use for order" in desc
    assert "order lookup is not enabled" in desc
    assert "lookup_meta.not_found" in desc


def test_agent_system_prompt_covers_tool_selection_and_product_search_query() -> None:
    from app.domains.runtime.prompts.system import build_agent_system_prompt_for_tools

    prompt = build_agent_system_prompt_for_tools(
        "",
        has_knowledge_tool=True,
        has_shopify_tools=True,
        has_order_lookup_tool=True,
    )
    lower = prompt.lower()
    assert "you choose the tool" in lower
    assert "published_status:published" in lower
    assert "lookup_meta.not_found" in lower


def test_resolve_agent_type_prompt_ignores_stored_text_for_presets() -> None:
    from app.domains.runtime.prompts.system import resolve_agent_type_prompt

    custom = "Always reply in pirate slang."
    brand = resolve_agent_type_prompt("brand_support", custom)
    general = resolve_agent_type_prompt("general", custom)
    support = resolve_agent_type_prompt("customer_support", custom)
    assert custom not in brand
    assert custom not in general
    assert custom not in support
    assert "support assistant" in brand.lower()
    assert "helpful ai assistant" in general.lower()
    assert "customer support specialist" in support.lower()


def test_resolve_agent_type_prompt_custom_uses_stored_text_only() -> None:
    from app.domains.runtime.prompts.system import resolve_agent_type_prompt

    custom = "Reply in one word only."
    assert resolve_agent_type_prompt("custom", custom) == custom
    assert resolve_agent_type_prompt("custom", "") == ""


def test_agent_system_prompt_without_order_lookup_warns_on_order_questions() -> None:
    from app.domains.runtime.prompts.system import build_agent_system_prompt_for_tools

    prompt = build_agent_system_prompt_for_tools(
        "",
        has_knowledge_tool=False,
        has_shopify_tools=True,
        has_order_lookup_tool=False,
    ).lower()
    assert "order lookup is not enabled" in prompt
    assert "do not use product search for order status" in prompt
    assert "not for order tracking" in prompt
    assert "shopify_order_lookup" not in prompt


def test_agent_system_prompt_multi_intent_calls_all_tools() -> None:
    from app.domains.runtime.prompts.system import build_agent_system_prompt_for_tools

    prompt = build_agent_system_prompt_for_tools(
        "",
        has_knowledge_tool=False,
        has_shopify_tools=True,
        has_order_lookup_tool=True,
    ).lower()
    assert "multiple topics" in prompt
    assert "same" in prompt and "turn" in prompt


def test_catalog_only_user_prompt_blocks_order_lookup() -> None:
    from app.domains.runtime.prompts.user import build_catalog_only_shopify_user_prompt

    prompt = build_catalog_only_shopify_user_prompt("Do you sell belts?").lower()
    assert "shopify_product_search" in prompt
    assert "do **not** call `shopify_order_lookup`" in prompt
    assert "do you sell belts?" in prompt


def test_multi_intent_user_prompt_keeps_product_search_when_order_lookup_disabled() -> None:
    from app.domains.runtime.prompts.user import build_multi_intent_shopify_user_prompt

    prompt = build_multi_intent_shopify_user_prompt(
        "Where is order #1001 and do you sell boots?",
        has_order_lookup_tool=False,
        has_product_search_tool=True,
    ).lower()
    assert "more than one topic" in prompt
    assert "shopify_product_search" in prompt
    assert "order lookup is **not** enabled" in prompt
    assert "do not call `shopify_product_search` for order status" in prompt


def test_agent_system_prompt_mentions_broad_catalog_query() -> None:
    from app.domains.runtime.prompts.system import build_agent_system_prompt_for_tools

    prompt = build_agent_system_prompt_for_tools(
        "",
        has_knowledge_tool=False,
        has_shopify_tools=True,
        has_order_lookup_tool=True,
    ).lower()
    assert "published_status:published" in prompt
    assert "product cards" in prompt


def test_shopify_turn_user_prompt_includes_order_follow_up_when_thread_had_lookup() -> None:
    from app.domains.runtime.prompts.user import build_shopify_turn_user_prompt

    prompt = build_shopify_turn_user_prompt(
        "What city is it shipping to?",
        thread_has_prior_turns=True,
        thread_had_order_lookup=True,
    )
    assert "already looked up an order" in prompt
    assert "do not ask for the order number again" in prompt
    assert "What city is it shipping to?" in prompt


@pytest.mark.asyncio
async def test_shopify_tools_node_dedupes_same_tool_same_args_in_one_batch() -> None:
    from app.agent.graph import _shopify_tools_node

    call_count = 0

    async def _run(**kwargs: object) -> str:
        nonlocal call_count
        call_count += 1
        return '{"products":[]}'

    tool = StructuredTool.from_function(
        coroutine=_run,
        name="shopify_product_search",
        description="test",
    )
    ai = AIMessage(
        content="",
        tool_calls=[
            {"id": "tc1", "name": "shopify_product_search", "args": {"query": "#1001"}},
            {"id": "tc2", "name": "shopify_product_search", "args": {"query": "#1001"}},
        ],
    )
    state = {
        "messages": [ai],
        "bound_tools": [tool],
        "shopify_tool_names": {"shopify_product_search"},
        "model_round": 1,
        "tools_invoked": [],
        "tool_result_cache": {},
        "turn_context": {},
    }

    result = await _shopify_tools_node(state, MagicMock())

    assert call_count == 1
    assert result["tools_invoked"] == ["shopify_product_search"]
    assert len(result["messages"]) == 2
    assert result["messages"][0].content == result["messages"][1].content


@pytest.mark.asyncio
async def test_shopify_tools_node_reuses_cache_across_rounds() -> None:
    from app.agent.graph import _shopify_tools_node

    call_count = 0

    async def _run(**kwargs: object) -> str:
        nonlocal call_count
        call_count += 1
        return '{"products":[{"title":"Boot"}]}'

    tool = StructuredTool.from_function(
        coroutine=_run,
        name="shopify_product_search",
        description="test",
    )
    args = {"query": "order 1001"}
    first_ai = AIMessage(
        content="",
        tool_calls=[{"id": "tc1", "name": "shopify_product_search", "args": args}],
    )
    base_state = {
        "bound_tools": [tool],
        "shopify_tool_names": {"shopify_product_search"},
        "model_round": 1,
        "turn_context": {},
    }

    first = await _shopify_tools_node(
        {**base_state, "messages": [first_ai], "tools_invoked": [], "tool_result_cache": {}},
        MagicMock(),
    )
    second_ai = AIMessage(
        content="",
        tool_calls=[{"id": "tc2", "name": "shopify_product_search", "args": args}],
    )
    second = await _shopify_tools_node(
        {
            **base_state,
            "messages": [second_ai],
            "tools_invoked": list(first["tools_invoked"]),
            "tool_result_cache": dict(first["tool_result_cache"]),
            "model_round": 2,
        },
        MagicMock(),
    )

    assert call_count == 1
    assert first["tools_invoked"] == ["shopify_product_search"]
    assert second["tools_invoked"] == ["shopify_product_search"]
    assert second["messages"][0].content == '{"products":[{"title":"Boot"}]}'


def test_count_consecutive_unresolved_assistant_turns() -> None:
    from app.domains.runtime.service import count_consecutive_unresolved_assistant_turns

    fallback = "Sorry, I am not fully sure."
    history = [
        {"role": "user", "content": "q1"},
        {"role": "assistant", "content": "Here is the answer you needed."},
        {"role": "user", "content": "q2"},
        {"role": "assistant", "content": fallback},
        {"role": "user", "content": "q3"},
        {"role": "assistant", "content": fallback},
    ]
    assert count_consecutive_unresolved_assistant_turns(history, fallback_message=fallback) == 2

    resolved_tail = history + [
        {"role": "user", "content": "q4"},
        {"role": "assistant", "content": "Here is the answer you needed."},
    ]
    assert count_consecutive_unresolved_assistant_turns(resolved_tail, fallback_message=fallback) == 0


def test_unresolved_escalation_appendix_is_actionable() -> None:
    from app.agent.escalation import unresolved_escalation_system_appendix

    text = unresolved_escalation_system_appendix()
    assert "escalate_to_human" in text
    assert "UNRESOLVED STREAK" in text


def test_response_used_fallback_detects_configured_copy() -> None:
    from app.domains.runtime.service import response_used_fallback

    custom = "Please email support@example.com for help."
    assert response_used_fallback(custom, fallback_message=custom, explicit=False) is True
    assert response_used_fallback("Here is your answer.", fallback_message=custom, explicit=False) is False
    assert response_used_fallback("", fallback_message=custom, explicit=True) is True


def test_count_unresolved_uses_message_metadata() -> None:
    from app.domains.runtime.service import count_consecutive_unresolved_assistant_turns

    history = [
        {"role": "assistant", "content": "Looks resolved.", "metadata": {}},
        {"role": "assistant", "content": "Different wording.", "metadata": {"fallback_used": True}},
    ]
    assert (
        count_consecutive_unresolved_assistant_turns(history, fallback_message="unused fallback")
        == 1
    )
