"""
Runtime chat: RAG retrieval here, **LangGraph** (`chat_graph`) for each model turn.

Conversation memory is loaded from Postgres; extend the graph with tool nodes
for agentic actions (Shopify, policies) per `supabase/RULES.md`.
"""

import asyncio
import json
import re
import time
from collections import OrderedDict
from collections.abc import AsyncIterator
from datetime import UTC, datetime
from typing import Any, Literal
from uuid import UUID

import structlog
from langchain_core.messages import AIMessage, SystemMessage, ToolMessage
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import AppError
from app.core.settings import get_settings
from app.db.session import get_session_factory
from app.domains.actions.human_availability import seller_is_available_for_live_chat
from app.domains.actions.service import (
    get_human_escalation_for_runtime,
    list_enabled_shopify_actions_for_runtime,
)
from app.domains.billing.usage_gate import assert_plan_usage_allows_assistant_reply
from app.domains.conversation_outcomes.schemas import TurnSignalsDTO
from app.domains.conversation_outcomes.service import compute_turn_signals
from app.domains.conversations.schemas import ConversationMessageCreateRequest
from app.domains.conversations.service import (
    OPERATOR_ENGAGED_META_KEY,
    append_message,
    get_conversation,
    list_messages,
    merge_client_context_metadata,
)
from app.domains.integrations.shopify.service import load_shopify_connection_for_agent
from app.domains.knowledge.service import _embed_texts
from app.domains.runtime.chat_graph import (
    MAX_TOOL_ROUNDS,
    build_retrieval_query_for_embedding,
    build_turn_messages,
    invoke_runtime_chat_graph,
    make_chat_model,
    slice_history_for_current_turn,
    stream_runtime_chat_graph,
    text_delta_from_stream_chunk,
    text_from_model_message,
)
from app.domains.runtime.prompts import (
    build_grounded_user_prompt,
    build_system_prompt,
    resolve_agent_type_prompt,
)
from app.domains.runtime.schemas import (
    RuntimeChatRequest,
    RuntimeChatResponse,
    RuntimeEscalationInfo,
)
from app.domains.runtime.runtime_intent import (
    conversation_recent_used_shopify_tools,
    is_commerce_shopify_intent,
    resolve_commerce_intent,
)
from app.domains.runtime.shopify_lc_tools import build_shopify_langchain_tools, tools_by_name
from app.domains.runtime.shopify_tool_router import (
    SHOPIFY_TOOL_ROUTE_MIN_CONFIDENCE,
    classify_shopify_tool_route,
    tool_choice_required_from_route,
)
from app.domains.tickets.service import record_escalation, update_visitor_email_metadata

log = structlog.get_logger("runtime.service")

# After threshold passes, keep at most this many merged candidates; the model sees top N only.
RAG_MERGED_CHUNK_CAP = 20
RAG_PROMPT_CHUNK_COUNT = 4
RAG_PROMPT_EXCERPT_MAX_CHARS = 700
RAG_PROMPT_CONTEXT_MAX_CHARS = 2400
RAG_EMBED_CACHE_TTL_SECONDS = 900
RAG_EMBED_CACHE_MAX_ITEMS = 512

# Appended to system message when Shopify tools are bound. Overrides RAG-only “use fallback” behavior.
_SHOPIFY_TOOLS_RUNTIME_BLOCK = (
    "\n\n--- Shopify tools (enabled for this chat) ---\n"
    "You MUST call the relevant Shopify Admin tools when the shopper asks about **this store’s** catalog, "
    "products, SKUs, prices, stock, orders, shipping/tracking, or customer-specific store records.\n"
    "- **Products / catalog / “do you sell…” / availability**: call `shopify_product_search` with the customer’s "
    "question text as `query` (include product name or keywords).\n"
    "- **Order status / tracking / shipment**: call `shopify_order_lookup`. "
    "Pass `order_name_or_number` if they gave an order # or name; pass `customer_email` if they gave email. "
    "If neither exists yet, ask briefly for order number or email—then call the tool.\n"
    "- **Inventory / stock quantity**: call `shopify_inventory_check`.\n"
    "- **Customer history / past purchases**: call `shopify_customer_context` when you have their email.\n"
    "**Inventory safety:** Never state that a product is unavailable, out of stock, or not carried until "
    "you have results from the applicable Shopify tool (`shopify_product_search`, `shopify_inventory_check`, …). "
    "If you have not called the tool yet, reply briefly (e.g. “Let me check our catalog…”) and call the tool — "
    "do not deny inventory based on guesses or on knowledge-base excerpts alone.\n"
    "Knowledge base excerpts (if present) are **supplementary** marketing/site context; they do **not** replace "
    "live Shopify data for accurate SKU/order/inventory answers.\n"
    "Do **not** reply with the canned fallback (“not fully sure…” / escalate-only) for store-specific questions "
    "until you have **called the applicable tool(s)** at least once (unless the tool returned an error).\n"
)
_TOOL_RAG_SUPPLEMENT_FOR_TOOLS = (
    "\n\n---\n"
    "Reminder: Shopify tools are enabled. If this question is about products or orders **in the connected store**, "
    "the assistant must invoke the appropriate tool(s) before treating the answer as unknown or using only the "
    "fallback message above."
)

_embed_cache: OrderedDict[str, tuple[float, list[float]]] = OrderedDict()
_embed_cache_lock = asyncio.Lock()


async def _embed_text_with_cache(text: str) -> list[float]:
    key = (text or "").strip()
    if not key:
        return []
    now = time.time()
    async with _embed_cache_lock:
        cached = _embed_cache.get(key)
        if cached and (now - cached[0]) < RAG_EMBED_CACHE_TTL_SECONDS:
            _embed_cache.move_to_end(key)
            return cached[1]
    embedding = (await _embed_texts([key]))[0]
    async with _embed_cache_lock:
        _embed_cache[key] = (now, embedding)
        _embed_cache.move_to_end(key)
        while len(_embed_cache) > RAG_EMBED_CACHE_MAX_ITEMS:
            _embed_cache.popitem(last=False)
    return embedding


def _serialize_tool_calls_for_db(msg: AIMessage) -> list[dict[str, Any]]:
    tcs = getattr(msg, "tool_calls", None) or []
    out: list[dict[str, Any]] = []
    for tc in tcs:
        if isinstance(tc, dict):
            out.append(tc)
        else:
            name = getattr(tc, "name", None)
            args = getattr(tc, "args", None)
            tid = getattr(tc, "id", None)
            out.append(
                {
                    "name": name,
                    "args": dict(args) if isinstance(args, dict) else {},
                    "id": tid,
                    "type": "tool_call",
                }
            )
    return out


def _tool_call_parts(tc: Any) -> tuple[str, dict[str, Any], str]:
    if isinstance(tc, dict):
        return (
            str(tc.get("name") or ""),
            dict(tc.get("args") or {}),
            str(tc.get("id") or tc.get("name") or "tool"),
        )
    return (
        str(getattr(tc, "name", "") or ""),
        dict(getattr(tc, "args", {}) or {}),
        str(getattr(tc, "id", None) or getattr(tc, "name", None) or "tool"),
    )


def _aggregated_to_ai_message(accumulated: Any) -> AIMessage:
    """Convert a streamed AIMessageChunk aggregate into an AIMessage for persistence and routing."""
    tcs = getattr(accumulated, "tool_calls", None) or []
    body = text_from_model_message(accumulated)
    return AIMessage(content=body, tool_calls=list(tcs) if tcs else [])


async def _invoke_runtime_tool_with_timeout(
    tool: Any | None,
    args: dict[str, Any],
    *,
    tool_name: str,
    conversation_id: UUID,
    round_idx: int,
    timeout_s: float,
) -> str:
    """Bounded wait for Shopify tool execution so a hung Admin API cannot stall the chat indefinitely."""
    if tool is None:
        return json.dumps({"error": f"Unknown tool: {tool_name}"})
    t0 = time.perf_counter()
    try:
        out = await asyncio.wait_for(tool.ainvoke(args), timeout=timeout_s)
    except TimeoutError:
        elapsed_ms = int((time.perf_counter() - t0) * 1000)
        log.warning(
            "runtime.shopify_tool_timeout",
            conversation_id=str(conversation_id),
            tool=tool_name,
            round_idx=round_idx,
            timeout_s=timeout_s,
            elapsed_ms=elapsed_ms,
        )
        return json.dumps(
            {
                "error": "timeout",
                "message": (
                    "The store connection timed out before live data could be loaded. "
                    "Tell the customer to try again shortly."
                ),
            }
        )
    if not isinstance(out, str):
        out = str(out)
    return out


async def _retrieve_chunks_with_new_session(
    agent_id: UUID,
    *,
    user_message: str,
    expanded_query: str,
    min_similarity: float,
    match_count: int,
    skip: bool = False,
    meta_timing: dict[str, float] | None = None,
) -> list[dict[str, Any]]:
    """Runs RAG on a dedicated DB session so it can overlap with Shopify setup (separate session)."""
    if skip:
        return []
    sf = get_session_factory()
    async with sf() as s:
        return await _retrieve_merged_chunks_for_message(
            s,
            agent_id,
            user_message=user_message,
            expanded_query=expanded_query,
            min_similarity=min_similarity,
            match_count=match_count,
            meta_timing=meta_timing,
        )


async def _load_shopify_tools_and_optional_route(
    *,
    user_id: UUID,
    agent_id: UUID,
    user_message: str,
    route_classifier_enabled: bool,
    skip_route_classifier: bool = False,
    conversation_id: UUID | None = None,
) -> tuple[list[Any], Any | None, bool, dict[str, float]]:
    """
    Loads Shopify tools (and optional route classifier) on a dedicated session so it can overlap
    with retrieval without concurrent use of the request-scoped AsyncSession.

    When ``skip_route_classifier`` is True (e.g. regex already classified commerce intent), the
    Shopify router LLM is not invoked — saves latency vs a redundant completion.
    """
    timings: dict[str, float] = {}
    sf = get_session_factory()
    async with sf() as s:
        t0 = time.perf_counter()
        enabled_shopify = await list_enabled_shopify_actions_for_runtime(
            s, user_id=user_id, agent_id=agent_id
        )
        timings["list_actions_ms"] = (time.perf_counter() - t0) * 1000.0

        t1 = time.perf_counter()
        conn_pair = await load_shopify_connection_for_agent(s, user_id=user_id, agent_id=agent_id)
        timings["load_connection_ms"] = (time.perf_counter() - t1) * 1000.0

        t2 = time.perf_counter()
        tool_list: list[Any] = []
        if conn_pair and enabled_shopify:
            keys = {e[0] for e in enabled_shopify}
            tool_list = build_shopify_langchain_tools(conn_pair[0], conn_pair[1], keys)
        timings["build_tools_ms"] = (time.perf_counter() - t2) * 1000.0

        shopify_route_decision = None
        force_tools_round0 = False
        if tool_list and route_classifier_enabled and not skip_route_classifier:
            t3 = time.perf_counter()
            shopify_route_decision = await classify_shopify_tool_route(user_message, tool_list)
            force_tools_round0 = tool_choice_required_from_route(
                shopify_route_decision, min_confidence=SHOPIFY_TOOL_ROUTE_MIN_CONFIDENCE
            )
            timings["router_llm_ms"] = (time.perf_counter() - t3) * 1000.0
        else:
            timings["router_llm_ms"] = 0.0
            if tool_list and route_classifier_enabled and skip_route_classifier:
                log.info(
                    "runtime.shopify_router_skipped",
                    reason="regex_commerce",
                    conversation_id=str(conversation_id) if conversation_id else None,
                )

        log.info(
            "runtime.shopify_setup_breakdown",
            conversation_id=str(conversation_id) if conversation_id else None,
            **{k: round(v, 2) for k, v in timings.items()},
        )
        return tool_list, shopify_route_decision, force_tools_round0, timings


def _extract_usage_tokens(msg: Any) -> tuple[int, int]:
    """Best-effort token usage extraction from LangChain AI messages/chunks."""
    usage = getattr(msg, "usage_metadata", None)
    if isinstance(usage, dict):
        return (
            int(usage.get("input_tokens") or 0),
            int(usage.get("output_tokens") or 0),
        )

    response_meta = getattr(msg, "response_metadata", None)
    if isinstance(response_meta, dict):
        token_usage = response_meta.get("token_usage")
        if isinstance(token_usage, dict):
            return (
                int(token_usage.get("prompt_tokens") or 0),
                int(token_usage.get("completion_tokens") or 0),
            )
    return (0, 0)


async def _invoke_chat_with_tools(
    db: AsyncSession,
    *,
    user_id: UUID,
    conversation_id: UUID,
    lc_messages: list[Any],
    model: str,
    tools: list[Any],
    fallback_message: str,
    temperature: float = 0.0,
    force_first_round_tool_choice: bool = False,
    meta_out: dict[str, Any] | None = None,
) -> tuple[str, bool, list[str]]:
    """Multi-round tool loop: round 0 emits tool_calls (structured args); after tools run, a second model
    pass turns JSON results into natural language. OpenAI-style tool calling cannot merge those into one HTTP
    completion without dropping tool args or the final reply — a dedicated commerce pipeline would skip round 0."""
    tool_timeout_s = float(get_settings().shopify_tool_timeout_seconds)
    by_name = tools_by_name(tools)
    bound_names = sorted(by_name.keys())
    log.info(
        "runtime.shopify_tools_bound",
        conversation_id=str(conversation_id),
        count=len(tools),
        tool_names=bound_names,
        force_first_round_tool_choice=force_first_round_tool_choice,
    )
    msgs: list[Any] = list(lc_messages)
    fallback_used = False
    invoked: list[str] = []
    for round_idx in range(MAX_TOOL_ROUNDS):
        tool_choice: str | None = (
            "required" if (round_idx == 0 and force_first_round_tool_choice) else None
        )
        if tool_choice == "required":
            log.info(
                "runtime.tool_choice_required_round0",
                conversation_id=str(conversation_id),
            )
        llm = make_chat_model(model, temperature=temperature).bind_tools(tools, tool_choice=tool_choice)
        ai_msg = await llm.ainvoke(msgs)
        in_tokens, out_tokens = _extract_usage_tokens(ai_msg)
        tcs = getattr(ai_msg, "tool_calls", None) or []
        if not tcs:
            answer = text_from_model_message(ai_msg)
            if round_idx == 0 and not invoked:
                log.info(
                    "runtime.model_completed_without_tool_calls",
                    conversation_id=str(conversation_id),
                    had_nonempty_answer=bool((answer or "").strip()),
                )
            if not (answer or "").strip():
                log.info(
                    "runtime.empty_model_answer_fallback",
                    conversation_id=str(conversation_id),
                    tools_invoked_so_far=invoked,
                )
                return fallback_message, True, invoked
            if meta_out is not None:
                meta_out["usage_input_tokens"] = int(meta_out.get("usage_input_tokens") or 0) + in_tokens
                meta_out["usage_output_tokens"] = int(meta_out.get("usage_output_tokens") or 0) + out_tokens
            return answer, fallback_used, invoked
        await append_message(
            db,
            user_id=user_id,
            conversation_id=conversation_id,
            payload=ConversationMessageCreateRequest(
                role="assistant",
                content="",
                model=model,
                input_tokens=in_tokens,
                output_tokens=out_tokens,
                tool_call_payload={"tool_calls": _serialize_tool_calls_for_db(ai_msg)},
            ),
        )
        if meta_out is not None:
            meta_out["usage_input_tokens"] = int(meta_out.get("usage_input_tokens") or 0) + in_tokens
            meta_out["usage_output_tokens"] = int(meta_out.get("usage_output_tokens") or 0) + out_tokens
        msgs.append(ai_msg)
        for tc in tcs:
            name, args, t_id = _tool_call_parts(tc)
            invoked.append(name)
            tool = by_name.get(name)
            t_tool0 = time.perf_counter()
            try:
                out = await _invoke_runtime_tool_with_timeout(
                    tool,
                    args,
                    tool_name=name,
                    conversation_id=conversation_id,
                    round_idx=round_idx,
                    timeout_s=tool_timeout_s,
                )
            except AppError as exc:
                err: dict[str, Any] = {"error": exc.message, "code": exc.code}
                if exc.details:
                    err["details"] = exc.details
                out = json.dumps(err, default=str)[:120000]
                log.warning(
                    "runtime.tool_app_error",
                    conversation_id=str(conversation_id),
                    tool=name,
                    round_idx=round_idx,
                    code=exc.code,
                )
            except Exception as exc:
                out = json.dumps({"error": str(exc)[:500]})
            tool_ms = int((time.perf_counter() - t_tool0) * 1000)
            log.info(
                "runtime.tool_executed",
                conversation_id=str(conversation_id),
                tool=name,
                round_idx=round_idx,
                tool_ms=tool_ms,
            )
            if not (isinstance(out, str) and out.strip()):
                out = json.dumps({"error": "empty_tool_result"})
            body = out[:120000]
            await append_message(
                db,
                user_id=user_id,
                conversation_id=conversation_id,
                payload=ConversationMessageCreateRequest(
                    role="tool",
                    content=body,
                    tool_name=name,
                    tool_call_id=t_id,
                    model=model,
                ),
            )
            msgs.append(ToolMessage(content=body, tool_call_id=t_id))
    log.warning(
        "runtime.tool_rounds_exhausted",
        conversation_id=str(conversation_id),
        max_rounds=MAX_TOOL_ROUNDS,
        tools_invoked=invoked,
    )
    return fallback_message, True, invoked


async def _yield_text_chunks_for_ui(text: str, *, chunk_size: int = 48) -> AsyncIterator[str]:
    """Fallback chunking when streaming isn’t available for a turn."""
    t = text or ""
    if not t:
        return
    for i in range(0, len(t), chunk_size):
        yield t[i : i + chunk_size]


async def _invoke_chat_with_tools_token_stream(
    db: AsyncSession,
    *,
    user_id: UUID,
    conversation_id: UUID,
    lc_messages: list[Any],
    model: str,
    tools: list[Any],
    fallback_message: str,
    temperature: float = 0.0,
    force_first_round_tool_choice: bool = False,
    meta_out: dict[str, Any] | None = None,
) -> AsyncIterator[str]:
    """
    One streaming LLM call per tool round (`astream` + chunk aggregation). Tokens are yielded as the
    model generates them; tool selection and execution match `_invoke_chat_with_tools`.
    """
    tool_timeout_s = float(get_settings().shopify_tool_timeout_seconds)
    stream_wall_t0 = time.perf_counter()
    by_name = tools_by_name(tools)
    msgs: list[Any] = list(lc_messages)
    invoked: list[str] = []
    for round_idx in range(MAX_TOOL_ROUNDS):
        tool_choice: str | None = (
            "required" if (round_idx == 0 and force_first_round_tool_choice) else None
        )
        llm = make_chat_model(model, temperature=temperature).bind_tools(tools, tool_choice=tool_choice)
        accumulated: Any | None = None
        try:
            async for chunk in llm.astream(msgs):
                accumulated = chunk if accumulated is None else accumulated + chunk
                delta = text_delta_from_stream_chunk(chunk)
                if delta:
                    if meta_out is not None and meta_out.get("first_token_ms") is None:
                        meta_out["first_token_ms"] = (time.perf_counter() - stream_wall_t0) * 1000.0
                    yield delta
        except Exception as exc:
            raise AppError(
                code="runtime.llm_failed",
                message="LLM request failed",
                status_code=502,
                details={"error": str(exc)[:500]},
            ) from exc

        if accumulated is None:
            log.warning(
                "runtime.tool_stream_empty",
                conversation_id=str(conversation_id),
                round_idx=round_idx,
            )
            if meta_out is not None:
                meta_out["tools_invoked"] = list(invoked)
                meta_out["fallback_used"] = True
            async for p in _yield_text_chunks_for_ui(fallback_message):
                yield p
            return

        ai_msg = _aggregated_to_ai_message(accumulated)
        in_tokens, out_tokens = _extract_usage_tokens(accumulated)
        tcs = getattr(ai_msg, "tool_calls", None) or []
        if not tcs:
            answer = text_from_model_message(ai_msg)
            if round_idx == 0 and not invoked:
                log.info(
                    "runtime.model_completed_without_tool_calls",
                    conversation_id=str(conversation_id),
                    had_nonempty_answer=bool((answer or "").strip()),
                )
            if not (answer or "").strip():
                log.info(
                    "runtime.empty_model_answer_fallback",
                    conversation_id=str(conversation_id),
                    tools_invoked_so_far=invoked,
                )
                if meta_out is not None:
                    meta_out["tools_invoked"] = list(invoked)
                    meta_out["fallback_used"] = True
                async for p in _yield_text_chunks_for_ui(fallback_message):
                    yield p
                return
            if meta_out is not None:
                meta_out["tools_invoked"] = list(invoked)
                meta_out["fallback_used"] = False
                meta_out["usage_input_tokens"] = int(meta_out.get("usage_input_tokens") or 0) + in_tokens
                meta_out["usage_output_tokens"] = int(meta_out.get("usage_output_tokens") or 0) + out_tokens
            return
        await append_message(
            db,
            user_id=user_id,
            conversation_id=conversation_id,
            payload=ConversationMessageCreateRequest(
                role="assistant",
                content="",
                model=model,
                input_tokens=in_tokens,
                output_tokens=out_tokens,
                tool_call_payload={"tool_calls": _serialize_tool_calls_for_db(ai_msg)},
            ),
        )
        if meta_out is not None:
            meta_out["usage_input_tokens"] = int(meta_out.get("usage_input_tokens") or 0) + in_tokens
            meta_out["usage_output_tokens"] = int(meta_out.get("usage_output_tokens") or 0) + out_tokens
        msgs.append(ai_msg)
        for tc in tcs:
            name, args, t_id = _tool_call_parts(tc)
            invoked.append(name)
            tool = by_name.get(name)
            t_tool0 = time.perf_counter()
            try:
                out = await _invoke_runtime_tool_with_timeout(
                    tool,
                    args,
                    tool_name=name,
                    conversation_id=conversation_id,
                    round_idx=round_idx,
                    timeout_s=tool_timeout_s,
                )
            except AppError as exc:
                err: dict[str, Any] = {"error": exc.message, "code": exc.code}
                if exc.details:
                    err["details"] = exc.details
                out = json.dumps(err, default=str)[:120000]
                log.warning(
                    "runtime.tool_app_error",
                    conversation_id=str(conversation_id),
                    tool=name,
                    round_idx=round_idx,
                    code=exc.code,
                )
            except Exception as exc:
                out = json.dumps({"error": str(exc)[:500]})
            tool_ms = int((time.perf_counter() - t_tool0) * 1000)
            log.info(
                "runtime.tool_executed",
                conversation_id=str(conversation_id),
                tool=name,
                round_idx=round_idx,
                tool_ms=tool_ms,
            )
            if not (isinstance(out, str) and out.strip()):
                out = json.dumps({"error": "empty_tool_result"})
            body = out[:120000]
            await append_message(
                db,
                user_id=user_id,
                conversation_id=conversation_id,
                payload=ConversationMessageCreateRequest(
                    role="tool",
                    content=body,
                    tool_name=name,
                    tool_call_id=t_id,
                    model=model,
                ),
            )
            msgs.append(ToolMessage(content=body, tool_call_id=t_id))
    log.warning(
        "runtime.tool_rounds_exhausted",
        conversation_id=str(conversation_id),
        max_rounds=MAX_TOOL_ROUNDS,
        tools_invoked=invoked,
    )
    if meta_out is not None:
        meta_out["tools_invoked"] = list(invoked)
        meta_out["fallback_used"] = True
        meta_out["total_elapsed_ms"] = (time.perf_counter() - stream_wall_t0) * 1000.0
    async for p in _yield_text_chunks_for_ui(fallback_message):
        yield p


def _resolve_runtime_model(model: str) -> str:
    # Keep backward compatibility with legacy/open-ended model labels.
    normalized = (model or "").strip().lower()
    legacy_aliases = {"gpt-3.5", "gpt-3.5-turbo", "gpt35", "gpt-35"}
    if normalized in legacy_aliases:
        return "gpt-4o-mini"
    return model


def _build_open_chat_system_prompt(system_prompt: str) -> str:
    base = (system_prompt or "").strip()
    guidance = (
        "You are a customer-support chatbot for this brand. No indexed excerpts were retrieved for this question, "
        "so do not invent catalog details, prices, or policies. "
        "Respond helpfully to greetings and small talk; for product or policy questions, keep answers short, "
        "acknowledge you don’t have their knowledge base context for this turn, and suggest what the customer could "
        "ask next or where on the site they might look (without making up URLs). "
        "Use earlier messages in this thread for follow-ups when the user refers to something already discussed."
    )
    return f"{base}\n\n{guidance}".strip() if base else guidance


def _creativity_from_behavior(behavior: dict[str, Any]) -> float:
    raw = behavior.get("creativity", 0.5)
    try:
        v = float(raw)
    except (TypeError, ValueError):
        return 0.5
    return max(0.0, min(1.0, v))


async def _load_agent_runtime_config(db: AsyncSession, user_id: UUID, agent_id: UUID) -> dict[str, Any]:
    result = await db.execute(
        text(
            """
            select
              a.id, a.name, a.model, a.system_prompt, a.behavior_settings,
              rs.min_retrieval_similarity, rs.fallback_message
            from public.agents a
            left join public.agent_reliability_settings rs on rs.agent_id = a.id and rs.user_id = a.user_id
            where a.id = :agent_id and a.user_id = :user_id
            """
        ),
        {"agent_id": str(agent_id), "user_id": str(user_id)},
    )
    row = result.mappings().first()
    if row is None:
        raise AppError(code="agent.not_found", message="Agent not found", status_code=404)
    behavior = row["behavior_settings"] or {}
    if not isinstance(behavior, dict):
        behavior = {}
    tone = behavior.get("tone", "professional")
    creativity = _creativity_from_behavior(behavior if isinstance(behavior, dict) else {})
    raw_agent_type = behavior.get("agent_type")
    agent_type = str(raw_agent_type).strip().lower() if isinstance(raw_agent_type, str) else "brand_support"
    fallback = row["fallback_message"] or (
        f"Hello! I'm {row['name']}. I can use your website knowledge, but I am not fully sure yet. "
        "Please clarify your request."
    )
    return {
        "agent_name": row["name"],
        "model": row["model"] or "gpt-4o-mini",
        "system_prompt": row["system_prompt"] or "",
        "agent_type": agent_type,
        "tone": tone,
        "creativity": creativity,
        "min_retrieval_similarity": float(row["min_retrieval_similarity"] or 0.52),
        "fallback_message": fallback,
    }


async def _resolve_or_create_conversation(
    db: AsyncSession, user_id: UUID, agent_id: UUID, visitor_id: str, conversation_id: UUID | None
) -> UUID:
    if conversation_id:
        result = await db.execute(
            text(
                """
                select id
                from public.conversations
                where id = :conversation_id and user_id = :user_id and agent_id = :agent_id
                """
            ),
            {"conversation_id": str(conversation_id), "user_id": str(user_id), "agent_id": str(agent_id)},
        )
        row = result.mappings().first()
        if row is None:
            raise AppError(code="conversation.not_found", message="Conversation not found", status_code=404)
        return UUID(str(row["id"]))

    result = await db.execute(
        text(
            """
            select id
            from public.conversations
            where user_id = :user_id
              and agent_id = :agent_id
              and visitor_id = :visitor_id
              and status = any(:reusable_statuses)
            order by created_at desc
            limit 1
            """
        ),
        {
            "user_id": str(user_id),
            "agent_id": str(agent_id),
            "visitor_id": visitor_id,
            "reusable_statuses": ["open", "escalated"],
        },
    )
    existing = result.mappings().first()
    if existing:
        return UUID(str(existing["id"]))

    created = await db.execute(
        text(
            """
            insert into public.conversations (agent_id, user_id, visitor_id, channel, status)
            values (:agent_id, :user_id, :visitor_id, 'api', 'open')
            returning id
            """
        ),
        {"agent_id": str(agent_id), "user_id": str(user_id), "visitor_id": visitor_id},
    )
    return UUID(str(created.mappings().one()["id"]))


def _embedding_vector_param(embedding: list[float]) -> str:
    return "[" + ",".join(f"{v:.10f}" for v in embedding) + "]"


async def _match_chunks_with_embedding(
    db: AsyncSession,
    agent_id: UUID,
    embedding: list[float],
    min_similarity: float,
    *,
    match_count: int = 8,
) -> list[dict[str, Any]]:
    result = await db.execute(
        text(
            """
            select id, knowledge_source_id, content, metadata, similarity
            from public.match_knowledge_chunks(
              :agent_id,
              CAST(:embedding AS vector),
              :match_count,
              :min_score
            )
            """
        ),
        {
            "agent_id": str(agent_id),
            "embedding": _embedding_vector_param(embedding),
            "match_count": match_count,
            "min_score": min_similarity,
        },
    )
    return [dict(row) for row in result.mappings().all()]


async def _retrieve_context(
    db: AsyncSession,
    agent_id: UUID,
    query_text: str,
    min_similarity: float,
    *,
    match_count: int = 8,
) -> list[dict[str, Any]]:
    text_q = (query_text or "").strip()
    if not text_q:
        return []
    embeddings = await _embed_texts([text_q])
    return await _match_chunks_with_embedding(
        db, agent_id, embeddings[0], min_similarity, match_count=match_count
    )


async def _retrieve_merged_chunks_for_message(
    db: AsyncSession,
    agent_id: UUID,
    *,
    user_message: str,
    expanded_query: str,
    min_similarity: float,
    match_count: int = 10,
    meta_timing: dict[str, float] | None = None,
) -> list[dict[str, Any]]:
    """
    Embed each distinct query string once, merge vector matches at `min_similarity` only.
    No ANN/lexical fallback below the configured similarity — avoids irrelevant chunks in the prompt.
    """
    msg = (user_message or "").strip()
    if not msg:
        return []
    exp = (expanded_query or "").strip()
    t_embed = time.perf_counter()
    if exp and exp != msg:
        raw_embedding, expanded_embedding = await asyncio.gather(
            _embed_text_with_cache(msg),
            _embed_text_with_cache(exp),
        )
    else:
        raw_embedding = await _embed_text_with_cache(msg)
        expanded_embedding = None
    if meta_timing is not None:
        meta_timing["embed_ms"] = (time.perf_counter() - t_embed) * 1000.0

    async def merged_at(floor: float) -> list[dict[str, Any]]:
        tasks = [
            _match_chunks_with_embedding(db, agent_id, raw_embedding, floor, match_count=match_count)
        ]
        if expanded_embedding is not None:
            tasks.append(
                _match_chunks_with_embedding(db, agent_id, expanded_embedding, floor, match_count=match_count)
            )
        parts = await asyncio.gather(*tasks)
        return _merge_chunks_by_best_similarity(parts)[:RAG_MERGED_CHUNK_CAP]

    t_db = time.perf_counter()
    merged = await merged_at(min_similarity)
    if meta_timing is not None:
        meta_timing["retrieve_db_ms"] = (time.perf_counter() - t_db) * 1000.0

    filtered = [
        r
        for r in merged
        if float(r.get("similarity") or 0.0) >= float(min_similarity)
    ]
    reranked = _rerank_chunks_for_query(filtered, msg)
    return reranked[:RAG_MERGED_CHUNK_CAP]


def _merge_chunks_by_best_similarity(chunks_lists: list[list[dict[str, Any]]]) -> list[dict[str, Any]]:
    """Union several retrieval lists, keeping the strongest similarity per chunk id."""
    by_id: dict[Any, dict[str, Any]] = {}
    for lst in chunks_lists:
        for row in lst:
            cid = row.get("id")
            if cid is None:
                continue
            prev = by_id.get(cid)
            if prev is None or float(row.get("similarity") or 0) > float(prev.get("similarity") or 0):
                by_id[cid] = row
    return sorted(by_id.values(), key=lambda r: float(r.get("similarity") or 0), reverse=True)


def _build_context_block(chunks: list[dict[str, Any]]) -> str:
    lines: list[str] = []
    total = 0
    for idx, chunk in enumerate(chunks):
        text = str(chunk.get("content") or "").strip()
        if not text:
            continue
        excerpt = text[:RAG_PROMPT_EXCERPT_MAX_CHARS]
        if len(text) > RAG_PROMPT_EXCERPT_MAX_CHARS:
            excerpt = excerpt.rstrip() + "..."
        block = f"[Excerpt {idx + 1}]\n{excerpt}"
        if total + len(block) > RAG_PROMPT_CONTEXT_MAX_CHARS:
            break
        lines.append(block)
        total += len(block) + 2
    return "\n\n".join(lines)


def _log_retrieval_trace(
    *,
    conversation_id: UUID,
    agent_id: UUID,
    user_message: str,
    expanded_query: str,
    min_similarity: float,
    chunks: list[dict[str, Any]],
    prompt_chunks: list[dict[str, Any]],
    kb_retrieval_skipped: bool,
    rag_fallback_mode: str,
) -> None:
    preview: list[dict[str, Any]] = []
    for idx, chunk in enumerate(prompt_chunks[:5], start=1):
        metadata = dict(chunk.get("metadata") or {})
        preview.append(
            {
                "rank": idx,
                "chunk_id": str(chunk.get("id") or ""),
                "knowledge_source_id": str(chunk.get("knowledge_source_id") or ""),
                "similarity": round(float(chunk.get("similarity") or 0.0), 4),
                "url": metadata.get("url"),
                "title": metadata.get("title"),
                "snippet": str(chunk.get("content") or "").replace("\n", " ")[:220],
            }
        )
    passed_n = sum(1 for c in chunks if float(c.get("similarity") or 0.0) >= float(min_similarity))
    log.info(
        "runtime.retrieval_trace",
        conversation_id=str(conversation_id),
        agent_id=str(agent_id),
        effective_min_similarity=min_similarity,
        min_similarity=min_similarity,
        passed_threshold_count=passed_n,
        kb_retrieval_skipped=kb_retrieval_skipped,
        rag_fallback_mode=rag_fallback_mode,
        user_query=user_message,
        expanded_query=expanded_query,
        retrieved_count=len(chunks),
        prompt_chunk_count=len(prompt_chunks),
        chunks=preview,
    )


def _langchain_messages_prompt_stats(messages: list[Any]) -> dict[str, Any]:
    """Rough prompt size for observability (actual tokenizer counts come from provider usage)."""
    total_chars = 0
    system_chars = 0
    non_system_n = 0
    for m in messages:
        c = getattr(m, "content", None)
        if isinstance(c, str):
            n = len(c)
        elif isinstance(c, list):
            n = len(json.dumps(c, ensure_ascii=False))
        else:
            n = 0
        total_chars += n
        if isinstance(m, SystemMessage):
            system_chars += n
        else:
            non_system_n += 1
    return {
        "llm_message_count": len(messages),
        "prompt_approx_chars": total_chars,
        "system_prompt_approx_chars": system_chars,
        "non_system_message_count": non_system_n,
    }


def _log_runtime_turn_timing(
    *,
    conversation_id: UUID,
    shopify_load_ms: float,
    intent_ms: float,
    retrieve_wall_ms: float,
    retrieve_timing: dict[str, float],
    commerce_intent: bool,
    commerce_intent_source: str,
    skip_kb_retrieval: bool,
    assistant_latency_ms: int,
    first_token_ms: Any | None = None,
    shopify_setup_breakdown: dict[str, float] | None = None,
    prompt_stats: dict[str, Any] | None = None,
    llm_prompt_tokens_total: int | None = None,
    llm_completion_tokens_total: int | None = None,
    shopify_router_skipped: bool | None = None,
) -> None:
    payload: dict[str, Any] = {
        "conversation_id": str(conversation_id),
        "shopify_load_ms": round(shopify_load_ms, 2),
        "intent_ms": round(intent_ms, 2),
        "retrieve_wall_ms": round(retrieve_wall_ms, 2),
        "embed_ms": round(float(retrieve_timing.get("embed_ms", 0.0)), 2),
        "retrieve_db_ms": round(float(retrieve_timing.get("retrieve_db_ms", 0.0)), 2),
        "commerce_intent": commerce_intent,
        "commerce_intent_source": commerce_intent_source,
        "kb_retrieval_skipped": skip_kb_retrieval,
        "total_turn_ms": assistant_latency_ms,
    }
    if first_token_ms is not None:
        payload["first_token_ms"] = round(float(first_token_ms), 2)
    if shopify_setup_breakdown:
        for k, v in shopify_setup_breakdown.items():
            payload[f"shopify_{k}"] = round(float(v), 2)
    if prompt_stats:
        payload["llm_message_count"] = int(prompt_stats["llm_message_count"])
        payload["prompt_approx_chars"] = int(prompt_stats["prompt_approx_chars"])
        payload["system_prompt_approx_chars"] = int(prompt_stats["system_prompt_approx_chars"])
        payload["non_system_message_count"] = int(prompt_stats["non_system_message_count"])
    if llm_prompt_tokens_total is not None:
        payload["llm_prompt_tokens_total"] = int(llm_prompt_tokens_total)
    if llm_completion_tokens_total is not None:
        payload["llm_completion_tokens_total"] = int(llm_completion_tokens_total)
    if shopify_router_skipped is not None:
        payload["shopify_router_skipped"] = shopify_router_skipped
    log.info("runtime.turn_timing", **payload)
    if assistant_latency_ms >= int(get_settings().runtime_turn_latency_warn_ms):
        log.warning("runtime.turn_slow", **payload)


def _extract_query_terms(query_text: str) -> set[str]:
    return {t for t in re.findall(r"[a-zA-Z0-9]{4,}", (query_text or "").casefold())}


def _rerank_chunks_for_query(chunks: list[dict[str, Any]], query_text: str) -> list[dict[str, Any]]:
    if not chunks:
        return chunks
    query_terms = _extract_query_terms(query_text)
    if not query_terms:
        return sorted(chunks, key=lambda r: float(r.get("similarity") or 0.0), reverse=True)

    def score(row: dict[str, Any]) -> tuple[float, float]:
        sim = float(row.get("similarity") or 0.0)
        lex = float(row.get("lexical_score") or 0.0)
        text = str(row.get("content") or "").casefold()
        coverage = sum(1 for term in query_terms if term in text) / max(1, len(query_terms))
        return (sim + (coverage * 0.20) + (lex * 0.25), sim)

    return sorted(chunks, key=score, reverse=True)


def _looks_like_fallback_response(answer: str, fallback_message: str) -> bool:
    a = (answer or "").strip().casefold()
    f = (fallback_message or "").strip().casefold()
    if not a:
        return True
    if f and a == f:
        return True
    return "not fully sure based on available information" in a


# Phrases visitors use to request a person; must not rely on client `request_human` or RAG fallback.
_HUMAN_INTENT = re.compile(
    r"(?i)\b("
    r"talk\s+to\s+((a|an)\s+)?human|"
    r"speak\s+(to|with)\s+((a|an)\s+)?(human|person|representative|agent|someone)|"
    r"human\s+(representative|agent|support)|"
    r"real\s+person|"
    r"live\s+(agent|person|representative|support)|"
    r"connect\s+me\s+with\s+((a|an)\s+)?(human|person|someone|support|agent)|"
    r"(need|want)\s+to\s+talk\s+to\s+((a|an)\s+)?(human|person|agent|someone)|"
    r"can\s+i\s+speak\s+to\s+((a|an)\s+)?(human|person|agent|someone)|"
    r"get\s+me\s+((a|an)\s+)?(human|person|agent)|"
    r"escalate\s+to\s+((a|an)\s+)?(human|agent|person)"
    r")\b"
)


def _message_requests_human(text: str) -> bool:
    s = (text or "").strip()
    if not s or len(s) > 2000:
        return False
    return _HUMAN_INTENT.search(s) is not None


def _human_handoff_reply_open(*, seller_live: bool, estimated_minutes: int) -> str:
    if seller_live:
        n = max(1, int(estimated_minutes))
        return (
            f"I’ve connected you with our team. Someone should reply within about {n} minutes. "
            "If you think of anything else, you can add it here."
        )
    return (
        "I’ve passed this to our team. We’re not available for live chat at the moment, "
        "but you’ll get an email follow-up as soon as someone can help."
    )


def _human_handoff_reply_already_escalated() -> str:
    return "Our team already has this conversation and will follow up as soon as they can."


async def run_chat(db: AsyncSession, user_id: UUID, payload: RuntimeChatRequest) -> RuntimeChatResponse:
    config = await _load_agent_runtime_config(db, user_id, payload.agent_id)
    model = _resolve_runtime_model(payload.model_override or config["model"])
    creativity = (
        float(payload.creativity_override)
        if payload.creativity_override is not None
        else float(config["creativity"])
    )
    creativity = max(0.0, min(1.0, creativity))
    agent_type = payload.agent_type_override or config["agent_type"]
    custom_prompt = (
        payload.system_prompt_override
        if payload.system_prompt_override is not None
        else config["system_prompt"]
    )
    system_prompt = resolve_agent_type_prompt(agent_type, custom_prompt)
    if config["tone"]:
        system_prompt = f"{system_prompt}\n\nPreferred response tone: {config['tone']}.".strip()
    min_similarity = float(config["min_retrieval_similarity"])
    fallback_message = str(config["fallback_message"])

    conversation_id = await _resolve_or_create_conversation(
        db,
        user_id=user_id,
        agent_id=payload.agent_id,
        visitor_id=payload.visitor_id,
        conversation_id=payload.conversation_id,
    )

    await assert_plan_usage_allows_assistant_reply(db, user_id)
    # TODO(rate-limit-enforcement): respect agents.behavior_settings.rate_limit
    # (max_messages, window_seconds, limit_message) per-agent throttle. UI persists
    # the values today via /agent-settings/rate-limits but enforcement is a follow-up.

    await append_message(
        db,
        user_id=user_id,
        conversation_id=conversation_id,
        payload=ConversationMessageCreateRequest(role="user", content=payload.message, model=model),
    )

    ve = (payload.visitor_email or "").strip()
    if ve:
        await update_visitor_email_metadata(
            db, user_id=user_id, conversation_id=conversation_id, visitor_email=ve
        )

    await merge_client_context_metadata(
        db,
        user_id=user_id,
        conversation_id=conversation_id,
        locale=payload.locale,
        country_code=payload.country_code,
    )

    conv_check = await get_conversation(db, user_id, conversation_id)
    operator_engaged = bool((conv_check.metadata or {}).get(OPERATOR_ENGAGED_META_KEY))
    escalated_thread = conv_check.status == "escalated"
    if operator_engaged or escalated_thread:
        human_on, esc_cfg = await get_human_escalation_for_runtime(
            db, user_id=user_id, agent_id=payload.agent_id
        )
        # Visitor message is already stored; do not append a canned assistant line on every send —
        # humans reply from the dashboard; clients poll or refresh the conversation transcript.
        seller_live = seller_is_available_for_live_chat(esc_cfg) if human_on else False
        est_min = int(esc_cfg.get("estimated_response_minutes", 15)) if human_on else 15
        channel_hint: Literal["live", "email"] | None = (
            ("live" if seller_live else "email") if human_on else None
        )
        escalation_info = RuntimeEscalationInfo(
            human_escalation_action_enabled=human_on,
            occurred=False,
            seller_live=seller_live if human_on else False,
            estimated_minutes=est_min if human_on and seller_live else None,
            channel_hint=channel_hint,
        )
        return RuntimeChatResponse(
            conversation_id=conversation_id,
            assistant_message_id=None,
            response="",
            model=model,
            fallback_used=False,
            retrieval_count=0,
            min_similarity=min_similarity,
            created_at=datetime.now(tz=UTC),
            retrieval_preview=[],
            tools_available_count=0,
            tools_invoked=[],
            shopify_route_requires_live_data=None,
            shopify_route_confidence=None,
            shopify_route_tool_choice_required=None,
            escalation=escalation_info,
            turn_signals=None,
        )

    turn_latency_start = time.perf_counter()
    human_on, esc_cfg = await get_human_escalation_for_runtime(
        db, user_id=user_id, agent_id=payload.agent_id
    )
    visitor_requests_human_nl = _message_requests_human(payload.message)

    history_rows = await list_messages(db, user_id, conversation_id)
    settings_rt = get_settings()
    history = slice_history_for_current_turn(
        history_rows,
        current_user_content=payload.message,
        max_window_messages=settings_rt.runtime_max_history_messages,
    )

    expanded_query = build_retrieval_query_for_embedding(history, payload.message)
    regex_commerce = is_commerce_shopify_intent(payload.message)
    thread_had_shopify = conversation_recent_used_shopify_tools(history)
    skip_shopify_router_llm = bool(
        (regex_commerce or thread_had_shopify)
        and settings_rt.runtime_enable_shopify_route_classifier
        and not settings_rt.runtime_force_shopify_route_classifier_for_accuracy
    )
    t_shopify = time.perf_counter()
    shopify_bundle = await _load_shopify_tools_and_optional_route(
        user_id=user_id,
        agent_id=payload.agent_id,
        user_message=payload.message,
        route_classifier_enabled=settings_rt.runtime_enable_shopify_route_classifier,
        skip_route_classifier=skip_shopify_router_llm,
        conversation_id=conversation_id,
    )
    shopify_load_ms = (time.perf_counter() - t_shopify) * 1000.0

    tool_list, shopify_route_decision, force_tools_round0, shopify_setup_timings = shopify_bundle
    t_intent = time.perf_counter()
    commerce_intent, commerce_intent_source, commerce_conf = await resolve_commerce_intent(
        payload.message,
        tool_list=tool_list,
        shopify_route_decision=shopify_route_decision,
        llm_fallback_enabled=settings_rt.runtime_intent_llm_fallback_enabled,
        recent_thread_used_shopify_tools=thread_had_shopify,
    )
    intent_ms = (time.perf_counter() - t_intent) * 1000.0

    skip_kb_retrieval = bool(tool_list and commerce_intent)
    rag_fallback_mode = "skipped_commerce_intent" if skip_kb_retrieval else "vector_threshold_only"

    retrieve_timing: dict[str, float] = {}
    t_retrieve = time.perf_counter()
    chunks = await _retrieve_chunks_with_new_session(
        payload.agent_id,
        user_message=payload.message,
        expanded_query=expanded_query,
        min_similarity=min_similarity,
        match_count=10,
        skip=skip_kb_retrieval,
        meta_timing=retrieve_timing,
    )
    retrieve_wall_ms = (time.perf_counter() - t_retrieve) * 1000.0

    force_tools_round0 = force_tools_round0 or (bool(tool_list) and commerce_intent)

    prompt_chunks = chunks[:RAG_PROMPT_CHUNK_COUNT]
    _log_retrieval_trace(
        conversation_id=conversation_id,
        agent_id=payload.agent_id,
        user_message=payload.message,
        expanded_query=expanded_query,
        min_similarity=min_similarity,
        chunks=chunks,
        prompt_chunks=prompt_chunks,
        kb_retrieval_skipped=skip_kb_retrieval,
        rag_fallback_mode=rag_fallback_mode,
    )

    has_context = bool(prompt_chunks)
    shopify_tools_enabled = bool(tool_list)
    system_content = _build_open_chat_system_prompt(system_prompt)
    grounded_user = payload.message
    if has_context:
        system_content = build_system_prompt(system_prompt, shopify_tools_enabled=shopify_tools_enabled)
        context_block = _build_context_block(prompt_chunks)
        grounded_user = build_grounded_user_prompt(
            context_block,
            fallback_message,
            payload.message,
            shopify_tools_enabled=shopify_tools_enabled,
        )
        if tool_list:
            grounded_user += _TOOL_RAG_SUPPLEMENT_FOR_TOOLS
    elif tool_list:
        grounded_user = (
            f"{payload.message}\n\n"
            "(Shopify tools are enabled—use them for this store’s products, orders, inventory, "
            "or customer records when the question requires live store data.)"
        )

    lc_messages = build_turn_messages(
        system_content=system_content,
        history_without_current_user=history,
        grounded_user_content=grounded_user,
    )

    if tool_list:
        m0 = lc_messages[0]
        if isinstance(m0, SystemMessage):
            lc_messages = [
                SystemMessage(content=(m0.content or "") + _SHOPIFY_TOOLS_RUNTIME_BLOCK),
                *lc_messages[1:],
            ]

    prompt_stats = _langchain_messages_prompt_stats(lc_messages)

    tools_invoked: list[str] = []
    tools_available_count = len(tool_list)
    tool_meta: dict[str, Any] = {}
    llm_stream_meta: dict[str, Any] = {}
    if tool_list:
        llm_usage_input_tokens = 0
        llm_usage_output_tokens = 0
        answer, fallback_used, tools_invoked = await _invoke_chat_with_tools(
            db,
            user_id=user_id,
            conversation_id=conversation_id,
            lc_messages=lc_messages,
            model=model,
            tools=tool_list,
            fallback_message=fallback_message,
            temperature=creativity,
            force_first_round_tool_choice=force_tools_round0,
            meta_out=tool_meta,
        )
        llm_usage_input_tokens = int(tool_meta.get("usage_input_tokens") or 0)
        llm_usage_output_tokens = int(tool_meta.get("usage_output_tokens") or 0)
    else:
        answer, fallback_used, llm_usage_input_tokens, llm_usage_output_tokens = await invoke_runtime_chat_graph(
            messages=lc_messages,
            model=model,
            fallback_message=fallback_message,
            temperature=creativity,
            thread_id=str(conversation_id),
        )
        if has_context and _looks_like_fallback_response(answer, fallback_message):
            retry_user = (
                f"{grounded_user}\n\n"
                "Important: Retrieved excerpts are available above. "
                "Answer strictly from those excerpts and cite concrete facts present in them. "
                "Only use fallback if there is truly no relevant fact."
            )
            retry_messages = build_turn_messages(
                system_content=system_content,
                history_without_current_user=history,
                grounded_user_content=retry_user,
            )
            retry_answer, retry_fallback_used, retry_in_tokens, retry_out_tokens = (
                await invoke_runtime_chat_graph(
                messages=retry_messages,
                model=model,
                fallback_message=fallback_message,
                temperature=creativity,
                thread_id=str(conversation_id),
                )
            )
            if not _looks_like_fallback_response(retry_answer, fallback_message):
                answer, fallback_used = retry_answer, retry_fallback_used
                llm_usage_input_tokens, llm_usage_output_tokens = retry_in_tokens, retry_out_tokens

    if human_on and visitor_requests_human_nl:
        conv_handoff = await get_conversation(db, user_id, conversation_id)
        st = conv_handoff.status
        if st == "open":
            answer = _human_handoff_reply_open(
                seller_live=seller_is_available_for_live_chat(esc_cfg),
                estimated_minutes=int(esc_cfg.get("estimated_response_minutes", 15)),
            )
        elif st == "escalated":
            answer = _human_handoff_reply_already_escalated()

    assistant_meta: dict[str, Any] = {
        "fallback_used": fallback_used,
        "commerce_intent_heuristic": commerce_intent,
        "commerce_intent_source": commerce_intent_source,
        "commerce_intent_confidence": commerce_conf,
        "kb_retrieval_skipped": skip_kb_retrieval,
        "retrieval_count": len(chunks),
        "prompt_chunk_count": len(prompt_chunks),
        "tools_available_count": tools_available_count,
        "tools_invoked": tools_invoked,
        "shopify_route_requires_live_data": (
            shopify_route_decision.requires_live_shopify_data if shopify_route_decision else None
        ),
        "shopify_route_confidence": (
            shopify_route_decision.confidence if shopify_route_decision else None
        ),
        "shopify_route_tool_choice_required": (
            force_tools_round0 if tools_available_count else None
        ),
    }
    turn_signals_model: TurnSignalsDTO | None = None
    ts_raw = await compute_turn_signals(payload.message, answer)
    if ts_raw:
        assistant_meta["turn_signals"] = ts_raw.model_dump()
        turn_signals_model = TurnSignalsDTO.model_validate(ts_raw.model_dump())

    assistant_latency_ms = int((time.perf_counter() - turn_latency_start) * 1000)
    _log_runtime_turn_timing(
        conversation_id=conversation_id,
        shopify_load_ms=shopify_load_ms,
        intent_ms=intent_ms,
        retrieve_wall_ms=retrieve_wall_ms,
        retrieve_timing=retrieve_timing,
        commerce_intent=commerce_intent,
        commerce_intent_source=commerce_intent_source,
        skip_kb_retrieval=skip_kb_retrieval,
        assistant_latency_ms=assistant_latency_ms,
        first_token_ms=(tool_meta.get("first_token_ms") if tool_list else None),
        shopify_setup_breakdown=shopify_setup_timings,
        prompt_stats=prompt_stats,
        llm_prompt_tokens_total=llm_usage_input_tokens,
        llm_completion_tokens_total=llm_usage_output_tokens,
        shopify_router_skipped=skip_shopify_router_llm,
    )
    assistant_message = await append_message(
        db,
        user_id=user_id,
        conversation_id=conversation_id,
        payload=ConversationMessageCreateRequest(
            role="assistant",
            content=answer,
            model=model,
            input_tokens=llm_usage_input_tokens,
            output_tokens=llm_usage_output_tokens,
            metadata=assistant_meta,
            latency_ms=assistant_latency_ms,
        ),
    )

    preview = [
        {
            "knowledge_source_id": str(chunk["knowledge_source_id"]),
            "similarity": float(chunk["similarity"]),
            "snippet": str(chunk["content"])[:180],
        }
        for chunk in prompt_chunks[:5]
    ]

    conv_state = await get_conversation(db, user_id, conversation_id)
    meta = dict(conv_state.metadata or {})
    visitor_email = (meta.get("visitor_email") or ve or "").strip() or None

    escalation_occurred = False
    if human_on and (payload.request_human or fallback_used or visitor_requests_human_nl):
        if conv_state.status not in ("escalated", "resolved", "idle_closed"):
            await record_escalation(
                db,
                user_id=user_id,
                agent_id=payload.agent_id,
                conversation_id=conversation_id,
                user_message=payload.message,
                customer_email=visitor_email,
            )
            escalation_occurred = True

    seller_live = seller_is_available_for_live_chat(esc_cfg) if human_on else False
    est_min = int(esc_cfg.get("estimated_response_minutes", 15)) if human_on else 15
    channel_hint: Literal["live", "email"] | None = (
        ("live" if seller_live else "email") if human_on else None
    )

    escalation_info = RuntimeEscalationInfo(
        human_escalation_action_enabled=human_on,
        occurred=escalation_occurred,
        seller_live=seller_live if human_on else False,
        estimated_minutes=est_min if human_on and seller_live else None,
        channel_hint=channel_hint,
    )

    return RuntimeChatResponse(
        conversation_id=conversation_id,
        assistant_message_id=assistant_message.id,
        response=answer,
        model=model,
        fallback_used=fallback_used,
        retrieval_count=len(prompt_chunks),
        min_similarity=min_similarity,
        created_at=datetime.now(tz=UTC),
        retrieval_preview=preview,
        tools_available_count=tools_available_count,
        tools_invoked=list(tools_invoked),
        shopify_route_requires_live_data=(
            shopify_route_decision.requires_live_shopify_data if shopify_route_decision else None
        ),
        shopify_route_confidence=(
            shopify_route_decision.confidence if shopify_route_decision else None
        ),
        shopify_route_tool_choice_required=(
            force_tools_round0 if tools_available_count else None
        ),
        escalation=escalation_info,
        turn_signals=turn_signals_model,
    )


async def run_chat_stream(
    db: AsyncSession, user_id: UUID, payload: RuntimeChatRequest
) -> AsyncIterator[dict[str, Any]]:
    """
    NDJSON-friendly stream: `start` (conversation id), zero or more `token`, then `done` with `RuntimeChatResponse`.
    Skips the non-streaming RAG retry path so tokens are not buffered for a second completion.
    """
    config = await _load_agent_runtime_config(db, user_id, payload.agent_id)
    model = _resolve_runtime_model(payload.model_override or config["model"])
    creativity = (
        float(payload.creativity_override)
        if payload.creativity_override is not None
        else float(config["creativity"])
    )
    creativity = max(0.0, min(1.0, creativity))
    agent_type = payload.agent_type_override or config["agent_type"]
    custom_prompt = (
        payload.system_prompt_override
        if payload.system_prompt_override is not None
        else config["system_prompt"]
    )
    system_prompt = resolve_agent_type_prompt(agent_type, custom_prompt)
    if config["tone"]:
        system_prompt = f"{system_prompt}\n\nPreferred response tone: {config['tone']}.".strip()
    min_similarity = float(config["min_retrieval_similarity"])
    fallback_message = str(config["fallback_message"])

    conversation_id = await _resolve_or_create_conversation(
        db,
        user_id=user_id,
        agent_id=payload.agent_id,
        visitor_id=payload.visitor_id,
        conversation_id=payload.conversation_id,
    )

    try:
        await assert_plan_usage_allows_assistant_reply(db, user_id)
        # TODO(rate-limit-enforcement): respect agents.behavior_settings.rate_limit
        # (max_messages, window_seconds, limit_message) per-agent throttle. UI persists
        # the values today via /agent-settings/rate-limits but enforcement is a follow-up.
    except AppError as exc:
        yield {
            "type": "error",
            "code": exc.code,
            "message": exc.message,
            "details": exc.details,
        }
        return

    yield {"type": "start", "conversation_id": str(conversation_id)}

    await append_message(
        db,
        user_id=user_id,
        conversation_id=conversation_id,
        payload=ConversationMessageCreateRequest(role="user", content=payload.message, model=model),
    )

    ve = (payload.visitor_email or "").strip()
    if ve:
        await update_visitor_email_metadata(
            db, user_id=user_id, conversation_id=conversation_id, visitor_email=ve
        )

    await merge_client_context_metadata(
        db,
        user_id=user_id,
        conversation_id=conversation_id,
        locale=payload.locale,
        country_code=payload.country_code,
    )

    conv_check = await get_conversation(db, user_id, conversation_id)
    operator_engaged = bool((conv_check.metadata or {}).get(OPERATOR_ENGAGED_META_KEY))
    escalated_thread = conv_check.status == "escalated"
    if operator_engaged or escalated_thread:
        human_on, esc_cfg = await get_human_escalation_for_runtime(
            db, user_id=user_id, agent_id=payload.agent_id
        )
        seller_live = seller_is_available_for_live_chat(esc_cfg) if human_on else False
        est_min = int(esc_cfg.get("estimated_response_minutes", 15)) if human_on else 15
        channel_hint: Literal["live", "email"] | None = (
            ("live" if seller_live else "email") if human_on else None
        )
        escalation_info = RuntimeEscalationInfo(
            human_escalation_action_enabled=human_on,
            occurred=False,
            seller_live=seller_live if human_on else False,
            estimated_minutes=est_min if human_on and seller_live else None,
            channel_hint=channel_hint,
        )
        early = RuntimeChatResponse(
            conversation_id=conversation_id,
            assistant_message_id=None,
            response="",
            model=model,
            fallback_used=False,
            retrieval_count=0,
            min_similarity=min_similarity,
            created_at=datetime.now(tz=UTC),
            retrieval_preview=[],
            tools_available_count=0,
            tools_invoked=[],
            shopify_route_requires_live_data=None,
            shopify_route_confidence=None,
            shopify_route_tool_choice_required=None,
            escalation=escalation_info,
            turn_signals=None,
        )
        yield {"type": "done", **early.model_dump(mode="json")}
        return

    turn_latency_start = time.perf_counter()
    human_on, esc_cfg = await get_human_escalation_for_runtime(
        db, user_id=user_id, agent_id=payload.agent_id
    )
    visitor_requests_human_nl = _message_requests_human(payload.message)

    history_rows = await list_messages(db, user_id, conversation_id)
    settings_rt = get_settings()
    history = slice_history_for_current_turn(
        history_rows,
        current_user_content=payload.message,
        max_window_messages=settings_rt.runtime_max_history_messages,
    )

    expanded_query = build_retrieval_query_for_embedding(history, payload.message)
    regex_commerce = is_commerce_shopify_intent(payload.message)
    thread_had_shopify = conversation_recent_used_shopify_tools(history)
    skip_shopify_router_llm = bool(
        (regex_commerce or thread_had_shopify)
        and settings_rt.runtime_enable_shopify_route_classifier
        and not settings_rt.runtime_force_shopify_route_classifier_for_accuracy
    )
    t_shopify = time.perf_counter()
    shopify_bundle = await _load_shopify_tools_and_optional_route(
        user_id=user_id,
        agent_id=payload.agent_id,
        user_message=payload.message,
        route_classifier_enabled=settings_rt.runtime_enable_shopify_route_classifier,
        skip_route_classifier=skip_shopify_router_llm,
        conversation_id=conversation_id,
    )
    shopify_load_ms = (time.perf_counter() - t_shopify) * 1000.0

    tool_list, shopify_route_decision, force_tools_round0, shopify_setup_timings = shopify_bundle
    t_intent = time.perf_counter()
    commerce_intent, commerce_intent_source, commerce_conf = await resolve_commerce_intent(
        payload.message,
        tool_list=tool_list,
        shopify_route_decision=shopify_route_decision,
        llm_fallback_enabled=settings_rt.runtime_intent_llm_fallback_enabled,
        recent_thread_used_shopify_tools=thread_had_shopify,
    )
    intent_ms = (time.perf_counter() - t_intent) * 1000.0

    skip_kb_retrieval = bool(tool_list and commerce_intent)
    rag_fallback_mode = "skipped_commerce_intent" if skip_kb_retrieval else "vector_threshold_only"

    retrieve_timing: dict[str, float] = {}
    t_retrieve = time.perf_counter()
    chunks = await _retrieve_chunks_with_new_session(
        payload.agent_id,
        user_message=payload.message,
        expanded_query=expanded_query,
        min_similarity=min_similarity,
        match_count=10,
        skip=skip_kb_retrieval,
        meta_timing=retrieve_timing,
    )
    retrieve_wall_ms = (time.perf_counter() - t_retrieve) * 1000.0

    force_tools_round0 = force_tools_round0 or (bool(tool_list) and commerce_intent)

    prompt_chunks = chunks[:RAG_PROMPT_CHUNK_COUNT]
    _log_retrieval_trace(
        conversation_id=conversation_id,
        agent_id=payload.agent_id,
        user_message=payload.message,
        expanded_query=expanded_query,
        min_similarity=min_similarity,
        chunks=chunks,
        prompt_chunks=prompt_chunks,
        kb_retrieval_skipped=skip_kb_retrieval,
        rag_fallback_mode=rag_fallback_mode,
    )

    has_context = bool(prompt_chunks)
    shopify_tools_enabled = bool(tool_list)
    system_content = _build_open_chat_system_prompt(system_prompt)
    grounded_user = payload.message
    if has_context:
        system_content = build_system_prompt(system_prompt, shopify_tools_enabled=shopify_tools_enabled)
        context_block = _build_context_block(prompt_chunks)
        grounded_user = build_grounded_user_prompt(
            context_block,
            fallback_message,
            payload.message,
            shopify_tools_enabled=shopify_tools_enabled,
        )
        if tool_list:
            grounded_user += _TOOL_RAG_SUPPLEMENT_FOR_TOOLS
    elif tool_list:
        grounded_user = (
            f"{payload.message}\n\n"
            "(Shopify tools are enabled—use them for this store’s products, orders, inventory, "
            "or customer records when the question requires live store data.)"
        )

    lc_messages = build_turn_messages(
        system_content=system_content,
        history_without_current_user=history,
        grounded_user_content=grounded_user,
    )

    if tool_list:
        m0 = lc_messages[0]
        if isinstance(m0, SystemMessage):
            lc_messages = [
                SystemMessage(content=(m0.content or "") + _SHOPIFY_TOOLS_RUNTIME_BLOCK),
                *lc_messages[1:],
            ]

    prompt_stats = _langchain_messages_prompt_stats(lc_messages)

    tools_invoked: list[str] = []
    tools_available_count = len(tool_list)
    answer = ""
    fallback_used = False

    conv_for_handoff = (
        await get_conversation(db, user_id, conversation_id)
        if (human_on and visitor_requests_human_nl)
        else None
    )
    handoff_replaces_reply = bool(
        conv_for_handoff and conv_for_handoff.status in ("open", "escalated")
    )

    llm_stream_meta: dict[str, Any] = {}
    if tool_list:
        parts: list[str] = []
        async for piece in _invoke_chat_with_tools_token_stream(
            db,
            user_id=user_id,
            conversation_id=conversation_id,
            lc_messages=lc_messages,
            model=model,
            tools=tool_list,
            fallback_message=fallback_message,
            temperature=creativity,
            force_first_round_tool_choice=force_tools_round0,
            meta_out=llm_stream_meta,
        ):
            parts.append(piece)
            if not handoff_replaces_reply:
                yield {"type": "token", "text": piece}
        answer = "".join(parts).strip()
        fallback_used = bool(llm_stream_meta.get("fallback_used"))
        tools_invoked = list(llm_stream_meta.get("tools_invoked") or [])
        llm_usage_input_tokens = int(llm_stream_meta.get("usage_input_tokens") or 0)
        llm_usage_output_tokens = int(llm_stream_meta.get("usage_output_tokens") or 0)
    else:
        parts = []
        async for piece in stream_runtime_chat_graph(
            messages=lc_messages,
            model=model,
            fallback_message=fallback_message,
            temperature=creativity,
            meta_out=llm_stream_meta,
        ):
            parts.append(piece)
            if not handoff_replaces_reply:
                yield {"type": "token", "text": piece}
        answer = "".join(parts).strip()
        fallback_used = bool(_looks_like_fallback_response(answer, fallback_message))
        llm_usage_input_tokens = int(llm_stream_meta.get("usage_input_tokens") or 0)
        llm_usage_output_tokens = int(llm_stream_meta.get("usage_output_tokens") or 0)

    if human_on and visitor_requests_human_nl:
        conv_handoff = conv_for_handoff or await get_conversation(db, user_id, conversation_id)
        st = conv_handoff.status
        if st == "open":
            answer = _human_handoff_reply_open(
                seller_live=seller_is_available_for_live_chat(esc_cfg),
                estimated_minutes=int(esc_cfg.get("estimated_response_minutes", 15)),
            )
        elif st == "escalated":
            answer = _human_handoff_reply_already_escalated()
        if handoff_replaces_reply:
            async for piece in _yield_text_chunks_for_ui(answer):
                yield {"type": "token", "text": piece}

    assistant_meta: dict[str, Any] = {
        "fallback_used": fallback_used,
        "commerce_intent_heuristic": commerce_intent,
        "commerce_intent_source": commerce_intent_source,
        "commerce_intent_confidence": commerce_conf,
        "kb_retrieval_skipped": skip_kb_retrieval,
        "retrieval_count": len(chunks),
        "prompt_chunk_count": len(prompt_chunks),
        "tools_available_count": tools_available_count,
        "tools_invoked": tools_invoked,
        "shopify_route_requires_live_data": (
            shopify_route_decision.requires_live_shopify_data if shopify_route_decision else None
        ),
        "shopify_route_confidence": (
            shopify_route_decision.confidence if shopify_route_decision else None
        ),
        "shopify_route_tool_choice_required": (
            force_tools_round0 if tools_available_count else None
        ),
    }
    turn_signals_model: TurnSignalsDTO | None = None
    ts_raw = await compute_turn_signals(payload.message, answer)
    if ts_raw:
        assistant_meta["turn_signals"] = ts_raw.model_dump()
        turn_signals_model = TurnSignalsDTO.model_validate(ts_raw.model_dump())

    assistant_latency_ms = int((time.perf_counter() - turn_latency_start) * 1000)
    _log_runtime_turn_timing(
        conversation_id=conversation_id,
        shopify_load_ms=shopify_load_ms,
        intent_ms=intent_ms,
        retrieve_wall_ms=retrieve_wall_ms,
        retrieve_timing=retrieve_timing,
        commerce_intent=commerce_intent,
        commerce_intent_source=commerce_intent_source,
        skip_kb_retrieval=skip_kb_retrieval,
        assistant_latency_ms=assistant_latency_ms,
        first_token_ms=llm_stream_meta.get("first_token_ms"),
        shopify_setup_breakdown=shopify_setup_timings,
        prompt_stats=prompt_stats,
        llm_prompt_tokens_total=llm_usage_input_tokens,
        llm_completion_tokens_total=llm_usage_output_tokens,
        shopify_router_skipped=skip_shopify_router_llm,
    )
    assistant_message = await append_message(
        db,
        user_id=user_id,
        conversation_id=conversation_id,
        payload=ConversationMessageCreateRequest(
            role="assistant",
            content=answer,
            model=model,
            input_tokens=llm_usage_input_tokens,
            output_tokens=llm_usage_output_tokens,
            metadata=assistant_meta,
            latency_ms=assistant_latency_ms,
        ),
    )

    preview = [
        {
            "knowledge_source_id": str(chunk["knowledge_source_id"]),
            "similarity": float(chunk["similarity"]),
            "snippet": str(chunk["content"])[:180],
        }
        for chunk in prompt_chunks[:5]
    ]

    conv_state = await get_conversation(db, user_id, conversation_id)
    meta = dict(conv_state.metadata or {})
    visitor_email = (meta.get("visitor_email") or ve or "").strip() or None

    escalation_occurred = False
    if human_on and (payload.request_human or fallback_used or visitor_requests_human_nl):
        if conv_state.status not in ("escalated", "resolved", "idle_closed"):
            await record_escalation(
                db,
                user_id=user_id,
                agent_id=payload.agent_id,
                conversation_id=conversation_id,
                user_message=payload.message,
                customer_email=visitor_email,
            )
            escalation_occurred = True

    seller_live = seller_is_available_for_live_chat(esc_cfg) if human_on else False
    est_min = int(esc_cfg.get("estimated_response_minutes", 15)) if human_on else 15
    channel_hint: Literal["live", "email"] | None = (
        ("live" if seller_live else "email") if human_on else None
    )

    escalation_info = RuntimeEscalationInfo(
        human_escalation_action_enabled=human_on,
        occurred=escalation_occurred,
        seller_live=seller_live if human_on else False,
        estimated_minutes=est_min if human_on and seller_live else None,
        channel_hint=channel_hint,
    )

    response = RuntimeChatResponse(
        conversation_id=conversation_id,
        assistant_message_id=assistant_message.id,
        response=answer,
        model=model,
        fallback_used=fallback_used,
        retrieval_count=len(prompt_chunks),
        min_similarity=min_similarity,
        created_at=datetime.now(tz=UTC),
        retrieval_preview=preview,
        tools_available_count=tools_available_count,
        tools_invoked=list(tools_invoked),
        shopify_route_requires_live_data=(
            shopify_route_decision.requires_live_shopify_data if shopify_route_decision else None
        ),
        shopify_route_confidence=(
            shopify_route_decision.confidence if shopify_route_decision else None
        ),
        shopify_route_tool_choice_required=(
            force_tools_round0 if tools_available_count else None
        ),
        escalation=escalation_info,
        turn_signals=turn_signals_model,
    )
    yield {"type": "done", **response.model_dump(mode="json")}

