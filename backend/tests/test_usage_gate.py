"""Usage gate helpers for plan conversation limits."""

from __future__ import annotations

import json
from unittest.mock import AsyncMock, MagicMock
from uuid import uuid4

import pytest

from app.domains.billing.usage_gate import (
    FREE_PLAN_CONVERSATION_LIMIT_VISITOR_REPLY,
    UsageSnapshotSlice,
    free_plan_conversation_limit_reached,
)
from app.domains.plans.plan_limits import PlanModelPolicy


def test_free_plan_conversation_limit_reached_at_cap() -> None:
    assert free_plan_conversation_limit_reached(
        plan_slug="free",
        conversations_used=30,
        included_conversations=30,
    )


def test_free_plan_conversation_limit_not_reached_below_cap() -> None:
    assert not free_plan_conversation_limit_reached(
        plan_slug="free",
        conversations_used=29,
        included_conversations=30,
    )


def test_free_plan_conversation_limit_paid_plans_never_block() -> None:
    assert not free_plan_conversation_limit_reached(
        plan_slug="hobby",
        conversations_used=500,
        included_conversations=250,
    )


@pytest.mark.asyncio
async def test_stream_chat_blocks_free_plan_at_conversation_limit(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    from app.agent.service import stream_chat
    from app.domains.runtime.schemas import RuntimeChatRequest

    llm_called = False

    async def _fail_llm(*_: object, **__: object) -> object:
        nonlocal llm_called
        llm_called = True
        if False:
            yield ""

    monkeypatch.setattr("app.agent.service.stream_chat_graph", _fail_llm)
    monkeypatch.setattr("app.agent.service.stream_llm_sse", _fail_llm)
    monkeypatch.setattr("app.agent.service._await_prior_turn_persist", AsyncMock())

    conv_id = uuid4()
    agent_id = uuid4()
    user_id = uuid4()
    config = {
        "model": "gpt-4o-mini",
        "creativity": 0.3,
        "agent_type": "support",
        "system_prompt": "",
        "fallback_message": "",
        "min_retrieval_similarity": 0.72,
        "has_indexed_knowledge": False,
        "tone": "",
    }
    conv = {"id": conv_id, "metadata": {}, "is_new": False}

    async def _mock_db_call(coro: object) -> object:
        return await coro(MagicMock())

    async def _mock_bootstrap(
        _db: object,
        *,
        user_id: object,
        payload: RuntimeChatRequest,
        history_limit: int,
    ) -> tuple[dict[str, object], dict[str, object], list[object], bool, dict[str, object]]:
        return config, conv, [], False, {}

    monkeypatch.setattr("app.agent.service._db_call", _mock_db_call)
    monkeypatch.setattr("app.agent.service._bootstrap_stream_turn_db", _mock_bootstrap)
    monkeypatch.setattr(
        "app.agent.service._load_shopify_tools_fast",
        AsyncMock(return_value=([], {}, False)),
    )
    monkeypatch.setattr("app.agent.service.refresh_plan_usage_snapshot_isolated", AsyncMock(return_value=None))
    monkeypatch.setattr(
        "app.agent.service.get_cached_plan_model_policy",
        lambda _uid: PlanModelPolicy(
            plan_slug="free",
            default_chat_model="gpt-4o-mini",
            premium_chat_model="gpt-4o",
            included_premium_turns=0,
            throttle_policy={},
        ),
    )
    monkeypatch.setattr(
        "app.agent.service.resolve_usage_snapshot_for_turn",
        AsyncMock(
            return_value=UsageSnapshotSlice(
                throttle_tier="strong",
                premium_turns_used=0,
                included_premium_turns=0,
                conversations_used=30,
                included_conversations=30,
            )
        ),
    )
    monkeypatch.setattr("app.agent.service._finalize_stream_turn_persist", AsyncMock(return_value=uuid4()))

    payload = RuntimeChatRequest.model_construct(
        agent_id=agent_id,
        message="Where is my order?",
        visitor_id="visitor-1",
        channel="widget",
    )

    frames: list[str] = []
    async for frame in stream_chat(user_id, payload):
        frames.append(frame)

    assert not llm_called
    done_payload = None
    for frame in frames:
        if frame.startswith("event: done"):
            for line in frame.split("\n"):
                if line.startswith("data: "):
                    done_payload = json.loads(line[6:])
                    break
    assert done_payload is not None
    assert done_payload["response"] == FREE_PLAN_CONVERSATION_LIMIT_VISITOR_REPLY
    assert done_payload["plan_conversation_limit_reached"] is True
