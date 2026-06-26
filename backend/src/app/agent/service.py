"""Chat turn orchestration: minimal prep, direct LLM streaming, deferred writes."""

from __future__ import annotations

import asyncio
import json
import time
from collections.abc import AsyncIterator
from datetime import UTC, datetime
from typing import Any
from uuid import UUID

import structlog
from sqlalchemy.ext.asyncio import AsyncSession

log = structlog.get_logger("agent.service")

# Deferred message persistence after SSE ``done`` so the stream can close without blocking the client.
_turn_persist_tasks: dict[tuple[str, str], asyncio.Task[None]] = {}


async def _resolve_is_demo_agent(db: AsyncSession, agent_id: UUID) -> bool:
    from app.domains.demo.repository import agent_is_demo

    return await agent_is_demo(db, agent_id)


async def _load_turn_tools(
    *,
    is_demo_agent: bool,
    user_id: UUID,
    agent_id: UUID,
    conversation_id: UUID,
    customer_message: str,
) -> tuple[list[Any], dict[str, float], bool]:
    if is_demo_agent:
        from app.db.session import get_session_factory
        from app.domains.demo.demo_tools_loader import load_demo_tools_fast

        async with get_session_factory()() as db:
            return await load_demo_tools_fast(
                db,
                agent_id=agent_id,
                customer_message=customer_message,
            )
    return await _load_shopify_tools_fast(
        user_id=user_id,
        agent_id=agent_id,
        conversation_id=conversation_id,
        customer_message=customer_message,
    )


async def _empty_turn_tools() -> tuple[list[Any], dict[str, float], bool]:
    return [], {"load_connection_ms": 0.0, "list_actions_ms": 0.0, "build_tools_ms": 0.0, "router_llm_ms": 0.0}, False

from app.agent.escalation import (
    ESCALATION_PENDING_CONTACT_META_KEY,
    EscalationAttemptResult,
    EscalationTurnContext,
    build_escalation_info,
    conversation_is_awaiting_human_team,
    handoff_ask_contact,
    handoff_reply_for_status,
    handle_escalation_with_contact,
    handle_pending_contact_stream_message,
    normalize_conversation_status,
    persist_visitor_contact,
    unresolved_escalation_system_appendix,
    visitor_empty_reply_fallback,
    visitor_non_substantive_reply,
)
from app.agent.product_cards import (
    is_product_browse_turn,
    shorten_answer_for_product_cards,
    turn_is_kb_question,
    turn_needs_catalog_tools,
    turn_needs_shopify_graph,
)
from app.agent.turn_intent import message_references_thread_catalog, turn_wants_store_data
from app.agent.graph import append_escalation_tool_prompt, stream_chat_graph
from app.agent.knowledge_tools import build_search_knowledge_base_tool, SEARCH_KNOWLEDGE_BASE_TOOL_NAME


def _sse_conversation_fields(
    conv_status: str,
    *,
    escalation_occurred: bool = False,
    ai_disabled: bool = False,
) -> dict[str, str | bool]:
    status = (
        "escalated"
        if escalation_occurred or ai_disabled
        else normalize_conversation_status(conv_status)
    )
    return {
        "conversation_status": status,
        "ai_chat_disabled": status == "escalated" or ai_disabled,
    }
from app.agent.messages import build_turn_messages, slice_history_for_current_turn
from app.agent.model_routing import (
    apply_throttle_delay,
    resolve_turn_model_by_plan_usage,
)
from app.agent.shopify_tools import (
    is_shopify_tool_name,
    thread_had_order_lookup_tool,
    thread_had_shopify_tools,
)
from app.agent.streaming import format_sse, stream_llm_sse
from app.agent.tools import ESCALATE_TO_HUMAN_TOOL_NAME
from app.core.errors import AppError
from app.core.settings import get_settings
from app.db.session import get_session_factory
from app.domains.actions.service import get_human_escalation_for_runtime, list_enabled_shopify_actions_for_runtime
from app.domains.billing.cost_events import (
    COST_KIND_LLM_MAIN,
    COST_KIND_LLM_ROUTING,
    COST_KIND_LLM_TURN_SIGNALS,
    COST_KIND_TOOL_SHOPIFY,
    record_cost_event,
)
from app.domains.conversation_outcomes.service import compute_turn_signals
from app.domains.billing.usage_gate import (
    FREE_PLAN_CONVERSATION_LIMIT_VISITOR_REPLY,
    UsageSnapshotSlice,
    fetch_plan_model_policy_cached,
    free_plan_conversation_limit_reached,
    get_cached_plan_model_policy,
    get_cached_usage_snapshot,
    refresh_plan_usage_snapshot_isolated,
    resolve_usage_snapshot_for_turn,
    set_cached_plan_model_policy,
)
from app.domains.plans.plan_limits import plan_model_policy_from_features
from app.domains.conversations.service import (
    OPERATOR_ENGAGED_META_KEY,
    append_message,
    get_conversation,
    list_messages_recent,
    merge_client_context_metadata,
    normalize_conversation_metadata,
    merge_conversation_metadata,
    merge_message_metadata,
)
from app.domains.conversations.schemas import ConversationMessageCreateRequest
from app.domains.runtime.prompts import build_grounded_user_prompt
from app.domains.runtime.prompts.user import (
    build_chitchat_user_prompt,
    build_shopify_turn_user_prompt,
)
from app.domains.runtime.prompts.system import (
    build_agent_system_prompt_for_tools,
    build_system_prompt,
    resolve_agent_type_prompt,
    resolve_brand_instructions,
    resolve_language_instruction,
    resolve_tone_instruction,
)
from app.domains.public_widget.welcome import seed_widget_greeting_messages_if_needed
from app.domains.runtime.schemas import RuntimeChatRequest, message_has_substantive_content, RuntimeEscalationInfo, ProductActionRequest
from app.domains.runtime.service import (
    _build_retrieval_expanded_query,
    _SHOPIFY_CONNECTED_NO_TOOLS_BLOCK,
    _SHOPIFY_NO_EXCERPT_GROUNDING,
    _TOOL_RAG_SUPPLEMENT_FOR_TOOLS,
    _apply_usage_limit_model_downgrade,
    _build_context_block,
    _build_open_chat_system_prompt,
    count_consecutive_unresolved_assistant_turns,
    _load_agent_runtime_config,
    response_used_fallback,
    _load_shopify_tools_fast,
    _log_retrieval_trace,
    _log_runtime_turn_timing,
    RAG_PROMPT_CHUNK_COUNT,
    _record_embedding_rag_events,
    _resolve_or_create_conversation,
    _resolve_runtime_model,
    _retrieve_merged_chunks_for_message,
    _structural_skip_kb_retrieval,
)
from app.domains.integrations.shopify.service import (
    get_cached_shopify_connection,
    load_shopify_connection_for_agent,
)
from app.domains.integrations.shopify.tool_runners import run_product_details, run_similar_products


def _is_db_pool_exhausted(exc: BaseException) -> bool:
    msg = str(exc).lower()
    return "max clients" in msg or "emaxconnsession" in msg


async def _db_call(coro, *, retries: int = 4):
    last: BaseException | None = None
    for attempt in range(retries):
        try:
            async with get_session_factory()() as db:
                return await coro(db)
        except Exception as exc:
            last = exc
            if _is_db_pool_exhausted(exc) and attempt < retries - 1:
                await asyncio.sleep(0.25 * (2**attempt))
                continue
            raise
    if last is not None:
        raise last
    raise RuntimeError("db_call failed without exception")


async def _bootstrap_stream_turn_db(
    db: AsyncSession,
    *,
    user_id: UUID,
    payload: RuntimeChatRequest,
    history_limit: int,
) -> tuple[dict[str, Any], dict[str, Any], list[Any], bool, dict[str, Any]]:
    """One DB session for config, conversation, history, escalation state, and metadata."""
    config = await _load_agent_runtime_config(db, user_id, payload.agent_id)
    conv = await _resolve_or_create_conversation(
        db,
        user_id=user_id,
        agent_id=payload.agent_id,
        visitor_id=payload.visitor_id,
        conversation_id=payload.conversation_id,
        channel=payload.channel,
    )
    conversation_id = conv["id"]
    history_rows: list[Any] = []
    if payload.conversation_id:
        history_rows = await list_messages_recent(
            db,
            user_id,
            payload.conversation_id,
            limit=history_limit,
            skip_conversation_check=True,
        )
    elif (
        history_limit > 0
        and not conv.get("is_new")
    ):
        history_rows = await list_messages_recent(
            db,
            user_id,
            conversation_id,
            limit=history_limit,
            skip_conversation_check=True,
        )
    if not history_rows and (payload.channel or "").strip() in ("widget", "demo"):
        history_rows = await seed_widget_greeting_messages_if_needed(
            db,
            user_id=user_id,
            agent_id=payload.agent_id,
            conversation_id=conversation_id,
            agent_name=config.get("agent_name"),
            behavior_settings=config.get("behavior_settings"),
            history_limit=history_limit,
        )
    awaiting_human_team = await conversation_is_awaiting_human_team(
        db,
        user_id=user_id,
        conversation_id=conversation_id,
    )
    conv_row = await get_conversation(db, user_id, conversation_id)
    conv_meta = normalize_conversation_metadata(conv_row.metadata)
    return config, conv, history_rows, awaiting_human_team, conv_meta


async def _load_human_escalation(
    user_id: UUID,
    agent_id: UUID,
) -> tuple[bool, dict[str, Any]]:
    async with get_session_factory()() as db:
        return await get_human_escalation_for_runtime(db, user_id=user_id, agent_id=agent_id)


async def _prepare_turn_model_selection(
    *,
    user_id: UUID,
    conversation_id: UUID,
    user_message: str,
    history_rows: list[Any],
    is_greeting_or_small_talk: bool = False,
    skip_throttle: bool = False,
) -> tuple[str, dict[str, Any] | None]:
    """Plan policy, optional classifier, and throttle delay (parallel with Shopify/RAG prep)."""
    policy = get_cached_plan_model_policy(user_id)
    if policy is None:
        policy = await _db_call(lambda db: fetch_plan_model_policy_cached(db, user_id))
        if policy is not None:
            set_cached_plan_model_policy(user_id, policy)
    if policy is None:
        policy = plan_model_policy_from_features("free", {}, throttle_policy={})

    usage_snap = get_cached_usage_snapshot(user_id)
    throttle_tier = usage_snap.throttle_tier if usage_snap else None
    conversations_used = usage_snap.conversations_used if usage_snap else 0
    included_conversations = usage_snap.included_conversations if usage_snap else 0

    turn_decision = resolve_turn_model_by_plan_usage(
        policy=policy,
        conversations_used=conversations_used,
        included_conversations=included_conversations,
    )
    model = _resolve_runtime_model(turn_decision.model, preserve_premium=turn_decision.used_premium)
    model = _apply_usage_limit_model_downgrade(
        throttle_tier=throttle_tier,
        model=model,
    )
    if not skip_throttle:
        await apply_throttle_delay(
            throttle_tier=throttle_tier,
            policy=policy,
            conversations_used=conversations_used,
            included_conversations=included_conversations,
        )
    return model, None


async def _maybe_retrieve_chunks(
    *,
    agent_id: UUID,
    user_message: str,
    min_similarity: float,
    budget_seconds: float,
    meta_timing: dict[str, float] | None = None,
) -> tuple[list[dict[str, Any]], dict[str, Any], str]:
    if budget_seconds <= 0:
        return [], {}, "rag_budget_zero"

    timing: dict[str, float] = meta_timing if meta_timing is not None else {}

    expanded_query = _build_retrieval_expanded_query(user_message)

    async def _run(db):
        return await _retrieve_merged_chunks_for_message(
            db,
            agent_id,
            user_message=user_message,
            expanded_query=expanded_query,
            min_similarity=min_similarity,
            meta_timing=timing,
        )

    try:
        chunks, billing = await asyncio.wait_for(
            _db_call(_run),
            timeout=budget_seconds,
        )
        return chunks, billing, "ok"
    except TimeoutError:
        return [], {}, "rag_budget_exceeded"


async def _await_prior_turn_persist(user_id: UUID, conversation_id: UUID) -> None:
    key = (str(user_id), str(conversation_id))
    task = _turn_persist_tasks.get(key)
    if task is not None and not task.done():
        try:
            await task
        except Exception:
            pass


async def _persist_stream_turn(
    *,
    user_id: UUID,
    agent_id: UUID,
    conversation_id: UUID,
    user_message: str,
    model: str,
    answer: str,
    usage_in: int,
    usage_out: int,
    tools_invoked: list[str],
    rag_billing: dict[str, Any],
    classifier_billing: dict[str, Any] | None,
    products: list[dict[str, Any]] | None = None,
    product_detail: dict[str, Any] | None = None,
    fallback_used: bool = False,
    latency_ms: int | None = None,
) -> UUID | None:
    assistant_id: UUID | None = None
    metadata: dict[str, Any] = {}
    if tools_invoked:
        metadata["tools_invoked"] = tools_invoked
    if products:
        metadata["products"] = products
    if product_detail:
        metadata["product_detail"] = product_detail
    if fallback_used:
        metadata["fallback_used"] = True
    async with get_session_factory()() as db:
        user_message_row = await append_message(
            db,
            user_id=user_id,
            conversation_id=conversation_id,
            payload=ConversationMessageCreateRequest(role="user", content=user_message, model=model),
            agent_id=agent_id,
        )
        if rag_billing:
            await _record_embedding_rag_events(
                db,
                conversation_id=conversation_id,
                agent_id=agent_id,
                user_id=user_id,
                turn_user_message_id=user_message_row.id,
                rag_billing=rag_billing,
            )
        if answer.strip() or products or product_detail:
            assistant_message = await append_message(
                db,
                user_id=user_id,
                conversation_id=conversation_id,
                payload=ConversationMessageCreateRequest(
                    role="assistant",
                    content=answer,
                    model=model,
                    input_tokens=usage_in,
                    output_tokens=usage_out,
                    latency_ms=latency_ms,
                    metadata=metadata,
                ),
                agent_id=agent_id,
            )
            assistant_id = assistant_message.id
        if classifier_billing and (
            classifier_billing.get("input_tokens") or classifier_billing.get("output_tokens")
        ):
            await record_cost_event(
                db,
                conversation_id=conversation_id,
                agent_id=agent_id,
                user_id=user_id,
                kind=COST_KIND_LLM_ROUTING,
                turn_user_message_id=user_message_row.id,
                provider_model=str(classifier_billing.get("model") or ""),
                input_tokens=int(classifier_billing.get("input_tokens") or 0),
                output_tokens=int(classifier_billing.get("output_tokens") or 0),
            )
        if usage_in or usage_out:
            await record_cost_event(
                db,
                conversation_id=conversation_id,
                agent_id=agent_id,
                user_id=user_id,
                kind=COST_KIND_LLM_MAIN,
                turn_user_message_id=user_message_row.id,
                provider_model=model,
                input_tokens=usage_in,
                output_tokens=usage_out,
            )
        for tool_name in tools_invoked:
            if tool_name.startswith("shopify_"):
                await record_cost_event(
                    db,
                    conversation_id=conversation_id,
                    agent_id=agent_id,
                    user_id=user_id,
                    kind=COST_KIND_TOOL_SHOPIFY,
                    turn_user_message_id=user_message_row.id,
                    metadata={"tool_name": tool_name},
                )
        if fallback_used:
            await merge_conversation_metadata(
                db,
                user_id=user_id,
                conversation_id=conversation_id,
                patch={"fallback_used": True},
            )
    return assistant_id


def _schedule_stream_turn_persist(
    *,
    user_id: UUID,
    agent_id: UUID,
    conversation_id: UUID,
    user_message: str,
    model: str,
    answer: str,
    usage_in: int,
    usage_out: int,
    tools_invoked: list[str],
    rag_billing: dict[str, Any],
    classifier_billing: dict[str, Any] | None,
    products: list[dict[str, Any]] | None = None,
    product_detail: dict[str, Any] | None = None,
    fallback_used: bool = False,
    latency_ms: int | None = None,
) -> None:
    async def _run() -> None:
        await _await_prior_turn_persist(user_id, conversation_id)
        try:
            await _persist_stream_turn(
                user_id=user_id,
                agent_id=agent_id,
                conversation_id=conversation_id,
                user_message=user_message,
                model=model,
                answer=answer,
                usage_in=usage_in,
                usage_out=usage_out,
                tools_invoked=tools_invoked,
                rag_billing=rag_billing,
                classifier_billing=classifier_billing,
                products=products,
                product_detail=product_detail,
                fallback_used=fallback_used,
                latency_ms=latency_ms,
            )
        except Exception:
            log.exception(
                "chat.persist_turn_failed",
                user_id=str(user_id),
                conversation_id=str(conversation_id),
            )
        finally:
            key = (str(user_id), str(conversation_id))
            if _turn_persist_tasks.get(key) is task:
                _turn_persist_tasks.pop(key, None)

    key = (str(user_id), str(conversation_id))
    task = asyncio.create_task(_run())
    _turn_persist_tasks[key] = task


async def _finalize_stream_turn_persist(
    *,
    user_id: UUID,
    agent_id: UUID,
    conversation_id: UUID,
    user_message: str,
    model: str,
    answer: str,
    usage_in: int,
    usage_out: int,
    tools_invoked: list[str],
    rag_billing: dict[str, Any],
    classifier_billing: dict[str, Any] | None,
    products: list[dict[str, Any]] | None = None,
    product_detail: dict[str, Any] | None = None,
    fallback_used: bool = False,
    latency_ms: int | None = None,
) -> UUID | None:
    """Persist the turn before emitting ``done`` so clients receive ``assistant_message_id``."""
    await _await_prior_turn_persist(user_id, conversation_id)
    try:
        assistant_id = await _persist_stream_turn(
            user_id=user_id,
            agent_id=agent_id,
            conversation_id=conversation_id,
            user_message=user_message,
            model=model,
            answer=answer,
            usage_in=usage_in,
            usage_out=usage_out,
            tools_invoked=tools_invoked,
            rag_billing=rag_billing,
            classifier_billing=classifier_billing,
            products=products,
            product_detail=product_detail,
            fallback_used=fallback_used,
            latency_ms=latency_ms,
        )
        if assistant_id and answer.strip():
            _schedule_attach_turn_signals(
                user_id=user_id,
                agent_id=agent_id,
                conversation_id=conversation_id,
                assistant_message_id=assistant_id,
                user_message=user_message,
                assistant_reply=answer,
            )
        return assistant_id
    except Exception:
        log.exception(
            "chat.persist_turn_failed",
            user_id=str(user_id),
            conversation_id=str(conversation_id),
        )
        return None


async def _resolve_free_plan_limit_reached(
    user_id: UUID,
    *,
    refresh_task: asyncio.Task[UsageSnapshotSlice | None],
) -> bool:
    policy = get_cached_plan_model_policy(user_id)
    if policy is None:
        policy = await _db_call(lambda db: fetch_plan_model_policy_cached(db, user_id))
        if policy is not None:
            set_cached_plan_model_policy(user_id, policy)
    if policy is None:
        policy = plan_model_policy_from_features("free", {}, throttle_policy={})
    if policy.plan_slug != "free":
        return False
    usage_snap = await resolve_usage_snapshot_for_turn(user_id, refresh_task=refresh_task)
    if usage_snap is None:
        return False
    return free_plan_conversation_limit_reached(
        plan_slug=policy.plan_slug,
        conversations_used=usage_snap.conversations_used,
        included_conversations=usage_snap.included_conversations,
    )


async def _stream_free_plan_conversation_limit_turn(
    *,
    user_id: UUID,
    agent_id: UUID,
    conversation_id: UUID,
    user_message: str,
    model: str,
    turn_started_at: float,
    shopify_task: asyncio.Task[Any] | None = None,
) -> AsyncIterator[str]:
    if shopify_task is not None and not shopify_task.done():
        shopify_task.cancel()
    reply = FREE_PLAN_CONVERSATION_LIMIT_VISITOR_REPLY
    yield format_sse("token", {"text": reply})
    assistant_id = await _finalize_stream_turn_persist(
        user_id=user_id,
        agent_id=agent_id,
        conversation_id=conversation_id,
        user_message=user_message,
        model=model,
        answer=reply,
        usage_in=0,
        usage_out=0,
        tools_invoked=[],
        rag_billing={},
        classifier_billing=None,
        latency_ms=int((time.perf_counter() - turn_started_at) * 1000.0),
    )
    yield format_sse(
        "done",
        {
            "conversation_id": str(conversation_id),
            "assistant_message_id": str(assistant_id) if assistant_id else None,
            "response": reply,
            "model": model,
            "fallback_used": False,
            "tools_available_count": 0,
            "tools_invoked": [],
            "retrieval_count": 0,
            "plan_conversation_limit_reached": True,
            "escalation": build_escalation_info(
                human_enabled=False,
                esc_cfg={},
                occurred=False,
            ).model_dump(mode="json"),
        },
    )


async def _patch_assistant_turn_latency(
    *,
    user_id: UUID,
    assistant_message_id: UUID | None,
    latency_ms: int,
) -> None:
    if assistant_message_id is None or latency_ms < 0:
        return
    from app.domains.conversations.service import patch_message_latency_ms

    try:
        async with get_session_factory()() as db:
            await patch_message_latency_ms(
                db,
                user_id=user_id,
                message_id=assistant_message_id,
                latency_ms=latency_ms,
            )
    except Exception:
        log.exception(
            "chat.persist_assistant_latency_failed",
            user_id=str(user_id),
            assistant_message_id=str(assistant_message_id),
        )


def _schedule_attach_turn_signals(
    *,
    user_id: UUID,
    agent_id: UUID,
    conversation_id: UUID,
    assistant_message_id: UUID,
    user_message: str,
    assistant_reply: str,
) -> None:
    async def _run() -> None:
        await _attach_turn_signals(
            user_id=user_id,
            agent_id=agent_id,
            conversation_id=conversation_id,
            assistant_message_id=assistant_message_id,
            user_message=user_message,
            assistant_reply=assistant_reply,
        )

    asyncio.create_task(_run())


async def _attach_turn_signals(
    *,
    user_id: UUID,
    agent_id: UUID,
    conversation_id: UUID,
    assistant_message_id: UUID,
    user_message: str,
    assistant_reply: str,
) -> None:
    try:
        signals, in_t, out_t = await compute_turn_signals(user_message, assistant_reply)
        if signals is None:
            return
        settings = get_settings()
        async with get_session_factory()() as db:
            await merge_message_metadata(
                db,
                user_id=user_id,
                message_id=assistant_message_id,
                patch={"turn_signals": signals.model_dump()},
            )
            if in_t or out_t:
                await record_cost_event(
                    db,
                    conversation_id=conversation_id,
                    agent_id=agent_id,
                    user_id=user_id,
                    kind=COST_KIND_LLM_TURN_SIGNALS,
                    provider_model=settings.openai_chat_model or "gpt-4o-mini",
                    input_tokens=in_t,
                    output_tokens=out_t,
                )
    except Exception:
        log.exception(
            "turn_signals.persist_failed",
            user_id=str(user_id),
            conversation_id=str(conversation_id),
            assistant_message_id=str(assistant_message_id),
        )


def _defer_post_stream_metadata(
    *,
    user_id: UUID,
    conversation_id: UUID,
    locale: str | None,
    country_code: str | None,
    esc_ctx: EscalationTurnContext,
) -> None:
    async def _run() -> None:
        try:
            async with get_session_factory()() as db:
                await merge_client_context_metadata(
                    db,
                    user_id=user_id,
                    conversation_id=conversation_id,
                    locale=locale,
                    country_code=country_code,
                )
                await persist_visitor_contact(db, ctx=esc_ctx)
        except Exception:
            log.exception(
                "chat.post_stream_metadata_failed",
                user_id=str(user_id),
                conversation_id=str(conversation_id),
            )

    asyncio.create_task(_run())


async def _shopify_product_search_enabled(
    *,
    user_id: UUID,
    agent_id: UUID,
) -> tuple[str, str] | None:
    conn = get_cached_shopify_connection(agent_id)
    async with get_session_factory()() as db:
        if conn is None:
            conn = await load_shopify_connection_for_agent(db, user_id=user_id, agent_id=agent_id)
        if not conn:
            return None
        enabled = await list_enabled_shopify_actions_for_runtime(db, user_id=user_id, agent_id=agent_id)
    keys = {item[0] for item in enabled}
    if "shopify.product_search" not in keys:
        return None
    return conn


def _product_action_user_message(action: ProductActionRequest) -> str:
    label = (action.title or action.handle).strip()
    if action.type == "details":
        return f"Show details for {label}"
    return f"Show similar to {label}"


async def _stream_product_action_turn(
    *,
    user_id: UUID,
    agent_id: UUID,
    conversation_id: UUID,
    payload: RuntimeChatRequest,
    model: str,
    human_on: bool,
    esc_cfg: dict[str, Any],
    turn_started_at: float,
) -> AsyncIterator[str]:
    action = payload.product_action
    if action is None:
        return

    escalation_info = build_escalation_info(
        human_enabled=human_on,
        esc_cfg=esc_cfg,
        occurred=False,
    ).model_dump(mode="json")

    async with get_session_factory()() as db:
        is_demo = await _resolve_is_demo_agent(db, agent_id)
        if is_demo:
            from app.domains.demo.demo_lc_tools import (
                demo_product_details_json_async,
                demo_similar_products_json,
            )
            from app.domains.demo.demo_product_catalog import ensure_demo_product_catalog
            from app.domains.demo.repository import fetch_demo_by_agent_id

            demo_row = await fetch_demo_by_agent_id(db, agent_id)
            if demo_row is not None:
                products_loaded, _, _ = await ensure_demo_product_catalog(
                    db,
                    agent_id=agent_id,
                    store_url=demo_row.store_url,
                )
                if products_loaded:
                    user_message = _product_action_user_message(action)
                    products: list[dict[str, Any]] | None = None
                    product_detail: dict[str, Any] | None = None
                    tools_invoked: list[str] = []

                    if action.type == "details":
                        yield format_sse("preamble", {"text": "Let me grab the details on that item."})
                        raw = await demo_product_details_json_async(
                            products_loaded,
                            handle=action.handle,
                            store_url=demo_row.store_url,
                        )
                        tools_invoked = ["shopify_product_search"]
                        try:
                            parsed = json.loads(raw)
                        except json.JSONDecodeError:
                            parsed = {}
                        lookup = parsed.get("lookup_meta") if isinstance(parsed, dict) else {}
                        not_found = bool(isinstance(lookup, dict) and lookup.get("not_found"))
                        detail = parsed.get("ui_detail") if isinstance(parsed, dict) else None
                        if not_found or not isinstance(detail, dict):
                            answer = "I couldn't find that product in this store's catalog."
                        else:
                            product_detail = detail
                            answer = ""
                            yield format_sse("product_detail", {"product": product_detail})
                    else:
                        yield format_sse("preamble", {"text": "Let me find similar items in the catalog."})
                        raw = demo_similar_products_json(
                            products_loaded,
                            handle=action.handle,
                            title=action.title,
                        )
                        tools_invoked = ["shopify_product_search"]
                        try:
                            parsed = json.loads(raw)
                        except json.JSONDecodeError:
                            parsed = {}
                        cards = parsed.get("ui_cards") if isinstance(parsed, dict) else None
                        if isinstance(cards, list) and cards:
                            products = [c for c in cards if isinstance(c, dict)]
                            answer = ""
                            yield format_sse("products", {"products": products})
                        else:
                            answer = "I couldn't find similar products in this store's catalog."

                    if answer:
                        yield format_sse("token", {"text": answer})
                    assistant_id = await _finalize_stream_turn_persist(
                        user_id=user_id,
                        agent_id=agent_id,
                        conversation_id=conversation_id,
                        user_message=user_message,
                        model=model,
                        answer=answer,
                        usage_in=0,
                        usage_out=0,
                        tools_invoked=tools_invoked,
                        rag_billing={},
                        classifier_billing=None,
                        products=products,
                        product_detail=product_detail,
                        latency_ms=int((time.perf_counter() - turn_started_at) * 1000.0),
                    )
                    done_data: dict[str, Any] = {
                        "conversation_id": str(conversation_id),
                        "assistant_message_id": str(assistant_id) if assistant_id else None,
                        "response": answer,
                        "model": model,
                        "fallback_used": False,
                        "tools_available_count": 1,
                        "tools_invoked": tools_invoked,
                        "retrieval_count": 0,
                        "escalation": escalation_info,
                    }
                    if products:
                        done_data["products"] = products
                    if product_detail:
                        done_data["product_detail"] = product_detail
                    yield format_sse("done", done_data)
                    return

    conn = await _shopify_product_search_enabled(user_id=user_id, agent_id=agent_id)

    if conn is None:
        answer = "Product browsing is not available for this store right now."
        yield format_sse("token", {"text": answer})
        assistant_id = await _finalize_stream_turn_persist(
            user_id=user_id,
            agent_id=agent_id,
            conversation_id=conversation_id,
            user_message=_product_action_user_message(action),
            model=model,
            answer=answer,
            usage_in=0,
            usage_out=0,
            tools_invoked=[],
            rag_billing={},
            classifier_billing=None,
            latency_ms=int((time.perf_counter() - turn_started_at) * 1000.0),
        )
        yield format_sse(
            "done",
            {
                "conversation_id": str(conversation_id),
                "assistant_message_id": str(assistant_id) if assistant_id else None,
                "response": answer,
                "model": model,
                "fallback_used": False,
                "tools_available_count": 0,
                "tools_invoked": [],
                "retrieval_count": 0,
                "escalation": escalation_info,
            },
        )
        return

    shop_domain, access_token = conn
    user_message = _product_action_user_message(action)
    products: list[dict[str, Any]] | None = None
    product_detail: dict[str, Any] | None = None
    tools_invoked: list[str] = []

    if action.type == "details":
        yield format_sse("preamble", {"text": "Let me grab the details on that item."})
        raw = await run_product_details(
            shop_domain=shop_domain,
            access_token=access_token,
            handle=action.handle,
        )
        tools_invoked = ["shopify_product_details"]
        try:
            parsed = json.loads(raw)
        except json.JSONDecodeError:
            parsed = {}
        lookup = parsed.get("lookup_meta") if isinstance(parsed, dict) else {}
        not_found = bool(isinstance(lookup, dict) and lookup.get("not_found"))
        detail = parsed.get("ui_detail") if isinstance(parsed, dict) else None
        if not_found or not isinstance(detail, dict):
            answer = "I couldn't find that product in this store's catalog."
        else:
            product_detail = detail
            answer = ""
            yield format_sse("product_detail", {"product": product_detail})
    else:
        yield format_sse("preamble", {"text": "Let me find similar items in the catalog."})
        raw = await run_similar_products(
            shop_domain=shop_domain,
            access_token=access_token,
            handle=action.handle,
            title=action.title,
        )
        tools_invoked = ["shopify_product_search"]
        try:
            parsed = json.loads(raw)
        except json.JSONDecodeError:
            parsed = {}
        cards = parsed.get("ui_cards") if isinstance(parsed, dict) else None
        if isinstance(cards, list) and cards:
            products = [c for c in cards if isinstance(c, dict)]
            answer = ""
            yield format_sse("products", {"products": products})
        else:
            answer = "I couldn't find similar products in this store's catalog."

    if answer:
        yield format_sse("token", {"text": answer})
    assistant_id = await _finalize_stream_turn_persist(
        user_id=user_id,
        agent_id=agent_id,
        conversation_id=conversation_id,
        user_message=user_message,
        model=model,
        answer=answer,
        usage_in=0,
        usage_out=0,
        tools_invoked=tools_invoked,
        rag_billing={},
        classifier_billing=None,
        products=products,
        product_detail=product_detail,
        latency_ms=int((time.perf_counter() - turn_started_at) * 1000.0),
    )
    done_data: dict[str, Any] = {
        "conversation_id": str(conversation_id),
        "assistant_message_id": str(assistant_id) if assistant_id else None,
        "response": answer,
        "model": model,
        "fallback_used": False,
        "tools_available_count": 1,
        "tools_invoked": tools_invoked,
        "retrieval_count": 0,
        "escalation": escalation_info,
    }
    if products:
        done_data["products"] = products
    if product_detail:
        done_data["product_detail"] = product_detail
    yield format_sse("done", done_data)


async def stream_chat(
    user_id: UUID,
    payload: RuntimeChatRequest,
) -> AsyncIterator[str]:
    settings = get_settings()
    history_limit = max(0, int(settings.runtime_max_history_messages))
    rag_budget = float(settings.runtime_rag_prep_budget_seconds)

    t_turn = time.perf_counter()
    first_token_ms: float | None = None

    refresh_task = asyncio.create_task(refresh_plan_usage_snapshot_isolated(user_id))

    config, conv, history_rows, awaiting_human_team, conv_meta = await _db_call(
        lambda db: _bootstrap_stream_turn_db(
            db,
            user_id=user_id,
            payload=payload,
            history_limit=history_limit,
        )
    )

    conversation_id = conv["id"]

    is_demo_agent = await _db_call(
        lambda db: _resolve_is_demo_agent(db, payload.agent_id)
    )

    if payload.locale or payload.country_code:
        await _db_call(
            lambda db: merge_client_context_metadata(
                db,
                user_id=user_id,
                conversation_id=conversation_id,
                locale=payload.locale,
                country_code=payload.country_code,
            )
        )
    shopify_task: asyncio.Task[tuple[list[Any], dict[str, float], bool]] | None = None

    await _await_prior_turn_persist(user_id, conversation_id)

    if not awaiting_human_team:
        awaiting_human_team = await _db_call(
            lambda db: conversation_is_awaiting_human_team(
                db,
                user_id=user_id,
                conversation_id=conversation_id,
            )
        )

    if (
        not is_demo_agent
        and not awaiting_human_team
        and await _resolve_free_plan_limit_reached(
            user_id,
            refresh_task=refresh_task,
        )
    ):
        model = str(config.get("model") or "gpt-4o-mini")
        async for frame in _stream_free_plan_conversation_limit_turn(
            user_id=user_id,
            agent_id=payload.agent_id,
            conversation_id=conversation_id,
            user_message=payload.message,
            model=model,
            turn_started_at=t_turn,
            shopify_task=shopify_task,
        ):
            yield frame
        return

    if awaiting_human_team:
        if shopify_task is not None and not shopify_task.done():
            shopify_task.cancel()
        model = str(config.get("model") or "gpt-4o-mini")
        human_on, esc_cfg = await _load_human_escalation(user_id, payload.agent_id)
        escalation_info_handoff = build_escalation_info(
            human_enabled=human_on,
            esc_cfg=esc_cfg,
            occurred=True,
        )
        async with get_session_factory()() as db:
            await append_message(
                db,
                user_id=user_id,
                conversation_id=conversation_id,
                payload=ConversationMessageCreateRequest(
                    role="user",
                    content=payload.message,
                    model=model,
                ),
                agent_id=payload.agent_id,
            )
            from app.domains.tickets.service import sync_ticket_status_after_message

            await sync_ticket_status_after_message(
                db,
                user_id=user_id,
                conversation_id=conversation_id,
                message_role="user",
            )
        yield format_sse(
            "ready",
            {
                "conversation_id": str(conversation_id),
                "response": "",
                "model": model,
                "fallback_used": False,
                "contact_capture_required": False,
                "escalation": escalation_info_handoff.model_dump(mode="json"),
                **_sse_conversation_fields("escalated", ai_disabled=True),
            },
        )
        yield format_sse(
            "done",
            {
                "conversation_id": str(conversation_id),
                "assistant_message_id": None,
                "response": "",
                "model": model,
                "fallback_used": False,
                "tools_available_count": 0,
                "tools_invoked": [],
                "retrieval_count": 0,
                "escalation": escalation_info_handoff.model_dump(mode="json"),
                **_sse_conversation_fields("escalated", ai_disabled=True),
            },
        )
        return

    if not message_has_substantive_content(payload.message):
        if shopify_task is not None and not shopify_task.done():
            shopify_task.cancel()
        ack = visitor_non_substantive_reply()
        yield format_sse("token", {"text": ack})
        yield format_sse(
            "done",
            {
                "conversation_id": str(conversation_id),
                "assistant_message_id": None,
                "response": ack,
                "model": str(config.get("model") or "gpt-4o-mini"),
                "fallback_used": False,
                "tools_available_count": 0,
                "tools_invoked": [],
                "retrieval_count": 0,
                "escalation": build_escalation_info(
                    human_enabled=False,
                    esc_cfg={},
                    occurred=False,
                ).model_dump(mode="json"),
            },
        )
        return

    if payload.product_action is not None:
        human_on, esc_cfg = await _load_human_escalation(user_id, payload.agent_id)
        model = str(config.get("model") or "gpt-4o-mini")
        async for frame in _stream_product_action_turn(
            user_id=user_id,
            agent_id=payload.agent_id,
            conversation_id=conversation_id,
            payload=payload,
            model=model,
            human_on=human_on,
            esc_cfg=esc_cfg,
            turn_started_at=t_turn,
        ):
            yield frame
        return

    if is_demo_agent:
        from app.domains.demo.demo_chat_turn import stream_demo_routed_turn

        async for frame in stream_demo_routed_turn(
            user_id=user_id,
            agent_id=payload.agent_id,
            conversation_id=conversation_id,
            user_message=payload.message,
            config=config,
            history_rows=history_rows,
            history_limit=history_limit,
            turn_started_at=t_turn,
            maybe_retrieve_chunks=_maybe_retrieve_chunks,
            build_context_block=_build_context_block,
            finalize_turn_persist=_finalize_stream_turn_persist,
            log_retrieval_trace=_log_retrieval_trace,
            build_retrieval_expanded_query=_build_retrieval_expanded_query,
            rag_prompt_chunk_count=RAG_PROMPT_CHUNK_COUNT,
        ):
            yield frame
        return

    shopify_task = asyncio.create_task(
        _load_turn_tools(
            is_demo_agent=False,
            user_id=user_id,
            agent_id=payload.agent_id,
            conversation_id=conversation_id,
            customer_message=payload.message,
        )
    )

    t_prep = time.perf_counter()

    if conv_meta.get(ESCALATION_PENDING_CONTACT_META_KEY):
        human_on, esc_cfg = await _load_human_escalation(user_id, payload.agent_id)
        if human_on:
            if shopify_task is not None:
                if not shopify_task.done():
                    shopify_task.cancel()
                try:
                    await shopify_task
                except asyncio.CancelledError:
                    pass
            model_early = str(config.get("model") or "gpt-4o-mini")
            esc_ctx_pending = EscalationTurnContext(
                user_id=user_id,
                agent_id=payload.agent_id,
                conversation_id=conversation_id,
                user_message=payload.message,
                visitor_email=(payload.visitor_email or "").strip() or None,
                visitor_name=(payload.visitor_name or "").strip() or None,
                esc_cfg=esc_cfg,
            )
            try:
                async with get_session_factory()() as db:
                    pending_attempt = await handle_pending_contact_stream_message(
                        db,
                        ctx=esc_ctx_pending,
                        message=payload.message,
                    )
            except Exception:
                log.exception("chat.pending_contact_failed")
                pending_attempt = EscalationAttemptResult(
                    occurred=False,
                    contact_capture_required=True,
                    reply=handoff_ask_contact(),
                    conversation_status="open",
                )
            handoff = pending_attempt.reply
            if first_token_ms is None:
                first_token_ms = (time.perf_counter() - t_turn) * 1000.0
            yield format_sse("token", {"text": handoff})
            escalation_info_pending = build_escalation_info(
                human_enabled=True,
                esc_cfg=esc_cfg,
                occurred=pending_attempt.occurred,
                contact_capture_required=pending_attempt.contact_capture_required,
            )
            assistant_id = await _finalize_stream_turn_persist(
                user_id=user_id,
                agent_id=payload.agent_id,
                conversation_id=conversation_id,
                user_message=payload.message,
                model=model_early,
                answer=handoff,
                usage_in=0,
                usage_out=0,
                tools_invoked=[ESCALATE_TO_HUMAN_TOOL_NAME],
                rag_billing={},
                classifier_billing=None,
                latency_ms=int((time.perf_counter() - t_turn) * 1000.0),
            )
            yield format_sse(
                "done",
                {
                    "conversation_id": str(conversation_id),
                    "assistant_message_id": str(assistant_id) if assistant_id else None,
                    "response": handoff,
                    "model": model_early,
                    "fallback_used": False,
                    "tools_available_count": 0,
                    "tools_invoked": [ESCALATE_TO_HUMAN_TOOL_NAME],
                    "retrieval_count": 0,
                    "retrieval_preview": [],
                    "escalation": escalation_info_pending.model_dump(mode="json"),
                    "contact_capture_required": pending_attempt.contact_capture_required,
                    **_sse_conversation_fields(
                        pending_attempt.conversation_status,
                        escalation_occurred=pending_attempt.occurred,
                    ),
                },
            )
            return

    wants_human = payload.request_human
    human_on, esc_cfg = await _load_human_escalation(user_id, payload.agent_id)
    if is_demo_agent:
        human_on = False
        esc_cfg = {}
        wants_human = False

    operator_engaged = bool((conv.get("metadata") or {}).get(OPERATOR_ENGAGED_META_KEY))
    has_indexed_kb = bool(config.get("has_indexed_knowledge"))
    thread_had_shopify = thread_had_shopify_tools(history_rows)
    thread_had_order_lookup = thread_had_order_lookup_tool(history_rows)
    wants_store_data = turn_wants_store_data(payload.message)
    structural_skip, structural_kb_reason = _structural_skip_kb_retrieval(
        agent_has_indexed_kb=has_indexed_kb,
        thread_had_shopify_tools=thread_had_shopify,
    )
    skip_rag = structural_skip or operator_engaged or not wants_store_data
    if (
        skip_rag
        and structural_kb_reason == "thread_shopify_tools"
        and turn_is_kb_question(payload.message)
        and has_indexed_kb
    ):
        skip_rag = False
        kb_skip_reason = "store_info_rag"
    elif operator_engaged:
        kb_skip_reason = "operator_engaged"
    elif not wants_store_data:
        kb_skip_reason = "conversational_turn"
    elif structural_skip:
        kb_skip_reason = structural_kb_reason
    else:
        kb_skip_reason = "thread_state"

    retrieval_count = 0
    retrieval_preview: list[dict[str, Any]] = []
    rag_billing: dict[str, Any] = {}
    retrieve_timing: dict[str, float] = {}
    retrieve_wall_ms = 0.0
    chunks: list[dict[str, Any]] = []
    rag_fallback_mode: str | None = None

    rag_task: asyncio.Task[tuple[list[dict[str, Any]], dict[str, Any], str]] | None = None
    if not skip_rag:
        rag_task = asyncio.create_task(
            _maybe_retrieve_chunks(
                agent_id=payload.agent_id,
                user_message=payload.message,
                min_similarity=float(config["min_retrieval_similarity"]),
                budget_seconds=max(rag_budget, 8.0),
                meta_timing=retrieve_timing,
            )
        )

    model_task = asyncio.create_task(
        _prepare_turn_model_selection(
            user_id=user_id,
            conversation_id=conversation_id,
            user_message=payload.message,
            history_rows=history_rows,
            skip_throttle=is_demo_agent,
        )
    )

    parallel_prep: list[Any] = [shopify_task, model_task]
    rag_task_index: int | None = None
    if rag_task is not None:
        rag_task_index = len(parallel_prep)
        parallel_prep.append(rag_task)

    t_parallel_prep = time.perf_counter()
    parallel_results = await asyncio.gather(*parallel_prep)
    tool_list, shopify_setup_timings, shopify_connected = parallel_results[0]
    model, classifier_billing = parallel_results[1]
    t_pre_llm = time.perf_counter()
    prep_ms = (t_prep - t_turn) * 1000.0
    pre_llm_ms = (t_pre_llm - t_turn) * 1000.0

    creativity = max(
        0.0,
        min(
            1.0,
            float(payload.creativity_override)
            if payload.creativity_override is not None
            else float(config["creativity"]),
        ),
    )
    agent_type = payload.agent_type_override or config["agent_type"]
    custom_prompt = (
        payload.system_prompt_override
        if payload.system_prompt_override is not None
        else config["system_prompt"]
    )
    system_prompt = resolve_agent_type_prompt(agent_type, custom_prompt)
    tone_block = resolve_tone_instruction(str(config.get("tone") or ""))
    if tone_block:
        system_prompt = f"{system_prompt}\n\n{tone_block}".strip()
    brand_block = resolve_brand_instructions(config.get("tone_description"))
    if brand_block:
        system_prompt = f"{system_prompt}\n\n{brand_block}".strip()
    lang_block = resolve_language_instruction(config.get("language"))
    if lang_block:
        system_prompt = f"{system_prompt}\n\n{lang_block}".strip()
    shopify_load_ms = float(shopify_setup_timings.get("load_connection_ms", 0.0)) + float(
        shopify_setup_timings.get("list_actions_ms", 0.0)
    ) + float(shopify_setup_timings.get("build_tools_ms", 0.0))
    has_shopify_tools = any(
        is_shopify_tool_name(str(getattr(t, "name", "") or "")) for t in tool_list
    )
    has_order_lookup_tool = any(
        str(getattr(t, "name", "") or "") == "shopify_order_lookup" for t in tool_list
    )
    if rag_task_index is not None:
        chunks, rag_billing, kb_skip_reason = parallel_results[rag_task_index]
        retrieve_wall_ms = (time.perf_counter() - t_parallel_prep) * 1000.0
        retrieval_count = len(chunks)
        retrieval_preview = [
            {
                "knowledge_source_id": c.get("knowledge_source_id"),
                "similarity": c.get("similarity"),
                "snippet": str(c.get("content") or "")[:240],
            }
            for c in chunks[:5]
        ]
        rag_fallback_mode = str(rag_billing.get("rag_fallback_mode") or "threshold")
        _log_retrieval_trace(
            conversation_id=conversation_id,
            agent_id=payload.agent_id,
            user_message=payload.message,
            expanded_query=_build_retrieval_expanded_query(payload.message),
            min_similarity=float(config["min_retrieval_similarity"]),
            chunks=chunks,
            prompt_chunks=chunks[:RAG_PROMPT_CHUNK_COUNT],
            kb_retrieval_skipped=False,
            rag_fallback_mode=str(rag_billing.get("rag_fallback_mode") or "threshold"),
            retrieved_count=int(rag_billing.get("retrieved_count") or len(chunks)),
            passed_threshold_count=int(rag_billing.get("passed_threshold_count") or 0),
        )
    escalation_enabled = human_on

    context_block = ""
    if chunks:
        context_block = _build_context_block(chunks, user_message=payload.message)

    has_knowledge_tool = False
    if has_indexed_kb and has_shopify_tools:
        tool_list = list(tool_list) + [
            build_search_knowledge_base_tool(
                agent_id=payload.agent_id,
                min_similarity=float(config["min_retrieval_similarity"]),
            )
        ]
        has_knowledge_tool = True

    if not wants_store_data:
        conversational_tool_names = {
            "shopify_product_search",
            "shopify_catalog_query",
            SEARCH_KNOWLEDGE_BASE_TOOL_NAME,
        }
        tool_list = [
            t
            for t in tool_list
            if str(getattr(t, "name", "") or "") not in conversational_tool_names
        ]
        has_shopify_tools = any(
            is_shopify_tool_name(str(getattr(t, "name", "") or "")) for t in tool_list
        )
        has_order_lookup_tool = any(
            str(getattr(t, "name", "") or "") == "shopify_order_lookup" for t in tool_list
        )
        has_knowledge_tool = any(
            str(getattr(t, "name", "") or "") == SEARCH_KNOWLEDGE_BASE_TOOL_NAME
            for t in tool_list
        )

    tools_bound_count = len(tool_list) + (1 if human_on else 0)

    if has_shopify_tools:
        system_prompt = build_agent_system_prompt_for_tools(
            system_prompt,
            has_knowledge_tool=has_knowledge_tool,
            has_shopify_tools=True,
            has_kb_excerpts=bool(context_block),
            has_order_lookup_tool=has_order_lookup_tool,
            human_escalation_enabled=escalation_enabled,
        )
    elif has_indexed_kb and context_block:
        system_prompt = build_system_prompt(
            system_prompt,
            shopify_tools_enabled=False,
            human_escalation_enabled=escalation_enabled,
        )
    system_prompt = append_escalation_tool_prompt(
        system_prompt,
        tools_enabled=escalation_enabled,
    )
    fallback_message = str(config["fallback_message"])
    max_unresolved_turns = int(config.get("max_unresolved_turns_before_escalation") or 2)
    if escalation_enabled and max_unresolved_turns >= 1:
        unresolved_streak = count_consecutive_unresolved_assistant_turns(
            history_rows,
            fallback_message=fallback_message,
        )
        if unresolved_streak >= max_unresolved_turns:
            system_prompt = (
                f"{system_prompt}\n\n{unresolved_escalation_system_appendix()}"
            ).strip()

    grounded_user_content = payload.message
    catalog_followup = wants_store_data or message_references_thread_catalog(payload.message)

    if not wants_store_data and (has_shopify_tools or context_block or shopify_connected):
        grounded_user_content = build_chitchat_user_prompt(payload.message)
    elif context_block:
        grounded_user_content = build_grounded_user_prompt(
            context_block,
            fallback_message,
            payload.message,
            shopify_tools_enabled=has_shopify_tools,
            escalation_enabled=escalation_enabled,
            thread_has_prior_turns=bool(history_rows),
            thread_had_order_lookup=thread_had_order_lookup,
            rag_fallback_mode=rag_fallback_mode,
        )
        if has_shopify_tools:
            grounded_user_content = f"{grounded_user_content}{_TOOL_RAG_SUPPLEMENT_FOR_TOOLS}".strip()
    elif has_shopify_tools:
        thread_block = build_shopify_turn_user_prompt(
            payload.message,
            thread_has_prior_turns=bool(history_rows),
            thread_had_order_lookup=thread_had_order_lookup,
            include_catalog_followup=catalog_followup,
        )
        grounded_user_content = f"{_SHOPIFY_NO_EXCERPT_GROUNDING}{thread_block}"

    if not context_block and not has_shopify_tools:
        system_prompt = _build_open_chat_system_prompt(
            system_prompt,
            human_escalation_enabled=escalation_enabled,
        )
    if shopify_connected and not has_shopify_tools:
        system_prompt = f"{system_prompt}{_SHOPIFY_CONNECTED_NO_TOOLS_BLOCK}".strip()

    escalation_info = build_escalation_info(
        human_enabled=human_on,
        esc_cfg=esc_cfg,
        occurred=False,
    )

    esc_ctx = EscalationTurnContext(
        user_id=user_id,
        agent_id=payload.agent_id,
        conversation_id=conversation_id,
        user_message=payload.message,
        visitor_email=(payload.visitor_email or "").strip() or None,
        visitor_name=(payload.visitor_name or "").strip() or None,
        esc_cfg=esc_cfg,
    )
    _defer_post_stream_metadata(
        user_id=user_id,
        conversation_id=conversation_id,
        locale=payload.locale,
        country_code=payload.country_code,
        esc_ctx=esc_ctx,
    )

    done_payload: dict[str, Any] = {}
    stream_products: list[dict[str, Any]] = []
    stream_product_detail: dict[str, Any] | None = None
    streamed_answer_parts: list[str] = []

    contact_capture_required = False

    if escalation_enabled and wants_human:
        try:
            async with get_session_factory()() as db:
                if conv_meta.get(ESCALATION_PENDING_CONTACT_META_KEY):
                    attempt = await handle_pending_contact_stream_message(
                        db,
                        ctx=esc_ctx,
                        message=payload.message,
                    )
                else:
                    attempt = await handle_escalation_with_contact(db, ctx=esc_ctx)
        except Exception:
            log.exception("chat.escalation_short_circuit_failed")
            attempt = EscalationAttemptResult(
                occurred=False,
                contact_capture_required=True,
                reply=handoff_ask_contact(),
                conversation_status="open",
            )
        handoff = attempt.reply
        contact_capture_required = attempt.contact_capture_required
        if first_token_ms is None:
            first_token_ms = (time.perf_counter() - t_turn) * 1000.0
        yield format_sse("token", {"text": handoff})
        done_payload = {
            "response": handoff,
            "fallback_used": False,
            "usage_input_tokens": 0,
            "usage_output_tokens": 0,
            "tools_invoked": [ESCALATE_TO_HUMAN_TOOL_NAME],
            "escalation_occurred": attempt.occurred,
            "contact_capture_required": contact_capture_required,
            "conversation_status": attempt.conversation_status,
        }
    else:
        history = slice_history_for_current_turn(
            history_rows,
            current_user_content=payload.message,
            max_window_messages=history_limit,
        )
        lc_messages = build_turn_messages(
            system_content=system_prompt,
            history_without_current_user=history,
            grounded_user_content=grounded_user_content,
        )

        use_agent_graph = escalation_enabled or (
            has_shopify_tools
            and turn_needs_shopify_graph(
                payload.message,
                thread_had_shopify_tools=thread_had_shopify,
                thread_had_order_lookup=thread_had_order_lookup,
                has_order_lookup_tool=has_order_lookup_tool,
            )
        )

        if use_agent_graph:
            async for ev in stream_chat_graph(
                messages=lc_messages,
                model=model,
                temperature=creativity,
                fallback_message=fallback_message,
                escalation_enabled=escalation_enabled,
                bound_tools=tool_list,
                turn_context=esc_ctx,
            ):
                if ev.get("type") == "token" and first_token_ms is None:
                    first_token_ms = (time.perf_counter() - t_turn) * 1000.0
                if ev.get("type") == "token":
                    token_text = str(ev.get("text") or "")
                    if token_text:
                        streamed_answer_parts.append(token_text)
                    yield format_sse("token", {"text": token_text})
                elif ev.get("type") == "status":
                    yield format_sse("status", {"text": str(ev.get("text") or "")})
                elif ev.get("type") == "preamble":
                    yield format_sse("preamble", {"text": str(ev.get("text") or "")})
                elif ev.get("type") == "products":
                    cards = ev.get("products") or []
                    if isinstance(cards, list):
                        stream_products = [c for c in cards if isinstance(c, dict)]
                    yield format_sse("products", {"products": stream_products})
                elif ev.get("type") == "done":
                    done_payload = {
                        "response": ev.get("response"),
                        "fallback_used": ev.get("fallback_used"),
                        "usage_input_tokens": ev.get("usage_input_tokens"),
                        "usage_output_tokens": ev.get("usage_output_tokens"),
                        "tools_invoked": ev.get("tools_invoked"),
                        "escalation_occurred": ev.get("escalation_occurred"),
                        "contact_capture_required": ev.get("contact_capture_required"),
                        "conversation_status": ev.get("conversation_status"),
                        "product_cards": ev.get("product_cards"),
                    }
                    cards = ev.get("product_cards") or []
                    if (
                        isinstance(cards, list)
                        and cards
                        and wants_store_data
                        and is_product_browse_turn(payload.message)
                    ):
                        stream_products = [c for c in cards if isinstance(c, dict)]
        else:
            async for frame in stream_llm_sse(
                lc_messages,
                model=model,
                temperature=creativity,
                fallback_message=fallback_message,
            ):
                if frame.startswith("event: token") and first_token_ms is None:
                    first_token_ms = (time.perf_counter() - t_turn) * 1000.0
                elif frame.startswith("event: done"):
                    for line in frame.split("\n"):
                        if line.startswith("data: "):
                            try:
                                done_payload = json.loads(line[6:])
                            except json.JSONDecodeError:
                                done_payload = {}
                            break
                    continue
                yield frame

    answer = str(done_payload.get("response") or "").strip()
    if not answer:
        answer = "".join(streamed_answer_parts).strip()
    if not answer:
        still_awaiting = await _db_call(
            lambda db: conversation_is_awaiting_human_team(
                db,
                user_id=user_id,
                conversation_id=conversation_id,
            )
        )
        if still_awaiting:
            answer = ""
        else:
            answer = str(fallback_message or "").strip() or visitor_empty_reply_fallback()
    if stream_products:
        answer = shorten_answer_for_product_cards(answer)
    usage_in = int(done_payload.get("usage_input_tokens") or 0)
    usage_out = int(done_payload.get("usage_output_tokens") or 0)
    tools_invoked = list(done_payload.get("tools_invoked") or [])
    escalation_occurred = bool(done_payload.get("escalation_occurred"))
    contact_capture_required = bool(done_payload.get("contact_capture_required"))
    graph_conv_status = done_payload.get("conversation_status")
    escalation_info = build_escalation_info(
        human_enabled=human_on,
        esc_cfg=esc_cfg,
        occurred=escalation_occurred,
        contact_capture_required=contact_capture_required,
    )

    conv_status_for_sse = (
        str(graph_conv_status)
        if isinstance(graph_conv_status, str) and graph_conv_status.strip()
        else str(conv.get("status") or "open")
    )

    turn_fallback_used = response_used_fallback(
        answer,
        fallback_message=fallback_message,
        explicit=bool(done_payload.get("fallback_used")),
    )

    assistant_id = await _finalize_stream_turn_persist(
        user_id=user_id,
        agent_id=payload.agent_id,
        conversation_id=conversation_id,
        user_message=payload.message,
        model=model,
        answer=answer,
        usage_in=usage_in,
        usage_out=usage_out,
        tools_invoked=tools_invoked,
        rag_billing=rag_billing,
        classifier_billing=classifier_billing,
        products=stream_products or None,
        product_detail=stream_product_detail,
        fallback_used=turn_fallback_used,
        latency_ms=int((time.perf_counter() - t_turn) * 1000.0),
    )
    assistant_message_id = str(assistant_id) if assistant_id else None

    yield format_sse(
        "ready",
        {
            "conversation_id": str(conversation_id),
            "assistant_message_id": assistant_message_id,
            "response": answer,
            "model": model,
            "fallback_used": turn_fallback_used,
            "contact_capture_required": contact_capture_required,
            "escalation": escalation_info.model_dump(mode="json"),
            **_sse_conversation_fields(
                conv_status_for_sse,
                escalation_occurred=escalation_occurred,
            ),
            **({"products": stream_products} if stream_products else {}),
            **({"product_detail": stream_product_detail} if stream_product_detail else {}),
        },
    )

    yield format_sse(
        "done",
        {
            "conversation_id": str(conversation_id),
            "assistant_message_id": assistant_message_id,
            "response": answer,
            "model": model,
            "fallback_used": turn_fallback_used,
            "tools_available_count": tools_bound_count,
            "tools_invoked": tools_invoked,
            "retrieval_count": retrieval_count,
            "retrieval_preview": retrieval_preview,
            "escalation": escalation_info.model_dump(mode="json"),
            "contact_capture_required": contact_capture_required,
            **_sse_conversation_fields(
                conv_status_for_sse,
                escalation_occurred=escalation_occurred,
            ),
            **({"products": stream_products} if stream_products else {}),
            **({"product_detail": stream_product_detail} if stream_product_detail else {}),
        },
    )

    total_ms = int((time.perf_counter() - t_turn) * 1000.0)
    await _patch_assistant_turn_latency(
        user_id=user_id,
        assistant_message_id=assistant_id,
        latency_ms=total_ms,
    )
    _log_runtime_turn_timing(
        conversation_id=conversation_id,
        shopify_load_ms=shopify_load_ms,
        retrieve_wall_ms=retrieve_wall_ms,
        retrieve_timing=retrieve_timing,
        kb_skip_reason=kb_skip_reason,
        thread_had_shopify=thread_had_shopify,
        skip_kb_retrieval=skip_rag or kb_skip_reason != "ok",
        assistant_latency_ms=total_ms,
        first_token_ms=first_token_ms,
        prep_ms=prep_ms,
        pre_llm_ms=pre_llm_ms,
        tools_bound_count=tools_bound_count,
        shopify_setup_breakdown=shopify_setup_timings,
    )


async def run_chat(
    db: AsyncSession,
    user_id: UUID,
    payload: RuntimeChatRequest,
) -> Any:
    from app.domains.runtime.schemas import RuntimeChatResponse

    _ = db
    tokens: list[str] = []
    done_data: dict[str, Any] = {}
    async for frame in stream_chat(user_id, payload):
        if frame.startswith("event: token"):
            for line in frame.split("\n"):
                if line.startswith("data: "):
                    try:
                        data = json.loads(line[6:])
                    except json.JSONDecodeError:
                        continue
                    text = str(data.get("text") or "")
                    if text:
                        tokens.append(text)
        elif frame.startswith("event: done"):
            for line in frame.split("\n"):
                if line.startswith("data: "):
                    try:
                        done_data = json.loads(line[6:])
                    except json.JSONDecodeError:
                        done_data = {}
                    break

    answer = str(done_data.get("response") or "").strip() or "".join(tokens).strip()
    conv_id = done_data.get("conversation_id")
    assistant_id = done_data.get("assistant_message_id")
    if not conv_id:
        raise AppError(
            code="chat.stream_incomplete",
            message="Chat stream ended without a conversation id",
            status_code=500,
        )
    esc_raw = done_data.get("escalation")
    escalation: RuntimeEscalationInfo | None = None
    if isinstance(esc_raw, dict):
        escalation = RuntimeEscalationInfo.model_validate(esc_raw)

    preview_raw = done_data.get("retrieval_preview")
    retrieval_preview: list[dict[str, Any]] = (
        list(preview_raw) if isinstance(preview_raw, list) else []
    )

    return RuntimeChatResponse(
        conversation_id=UUID(str(conv_id)),
        assistant_message_id=UUID(str(assistant_id)) if assistant_id else None,
        response=answer,
        model=str(done_data.get("model") or "gpt-4o-mini"),
        fallback_used=bool(done_data.get("fallback_used")),
        retrieval_count=int(done_data.get("retrieval_count") or 0),
        min_similarity=0.52,
        created_at=datetime.now(tz=UTC),
        retrieval_preview=retrieval_preview,
        tools_available_count=int(done_data.get("tools_available_count") or 0),
        tools_invoked=list(done_data.get("tools_invoked") or []),
        shopify_route_requires_live_data=None,
        shopify_route_confidence=None,
        shopify_route_tool_choice_required=None,
        escalation=escalation,
        turn_signals=None,
    )
