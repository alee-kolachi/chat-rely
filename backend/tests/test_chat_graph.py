from datetime import UTC, datetime
from uuid import uuid4

import pytest
from langchain_core.messages import AIMessage, HumanMessage

from app.domains.conversations.schemas import MessageDTO
from app.domains.runtime import chat_graph


def _msg(
    *,
    role: str,
    content: str,
    created: datetime | None = None,
) -> MessageDTO:
    return MessageDTO.model_validate(
        {
            "id": str(uuid4()),
            "conversation_id": str(uuid4()),
            "agent_id": str(uuid4()),
            "user_id": "00000000-0000-0000-0000-000000000123",
            "role": role,
            "content": content,
            "tool_name": None,
            "tool_call_id": None,
            "tool_call_payload": {},
            "tool_result_payload": {},
            "model": "gpt-4o-mini",
            "input_tokens": 0,
            "output_tokens": 0,
            "latency_ms": None,
            "metadata": {},
            "created_at": (created or datetime.now(tz=UTC)).isoformat(),
        }
    )


def test_slice_history_strips_trailing_user_matching_current() -> None:
    rows = [
        _msg(role="user", content="Hi"),
        _msg(role="assistant", content="Hello"),
        _msg(role="user", content="Refund policy?"),
    ]
    out = chat_graph.slice_history_for_current_turn(rows, current_user_content="Refund policy?")
    assert len(out) == 2
    assert out[-1].role == "assistant"


def test_slice_history_keeps_user_when_content_differs() -> None:
    rows = [_msg(role="user", content="A"), _msg(role="user", content="B")]
    out = chat_graph.slice_history_for_current_turn(rows, current_user_content="C")
    assert len(out) == 2


def test_slice_history_respects_max_window() -> None:
    rows = [_msg(role="user", content=f"m{i}") for i in range(20)]
    out = chat_graph.slice_history_for_current_turn(
        rows, current_user_content="new turn", max_window_messages=3
    )
    assert len(out) == 3
    assert out[0].content == "m17"
    assert out[-1].content == "m19"


def test_build_retrieval_query_no_history_returns_current_only() -> None:
    q = chat_graph.build_retrieval_query_for_embedding([], "What's the warranty?")
    assert q == "What's the warranty?"


def test_build_retrieval_query_latest_message_only_by_default() -> None:
    hist = [
        _msg(role="user", content="Tell me about the AeroPress Go"),
        _msg(
            role="assistant",
            content="The AeroPress Go is a travel coffee maker with a mug and filter holder.",
        ),
    ]
    q = chat_graph.build_retrieval_query_for_embedding(hist, "Does it include filters?")
    assert q == "Does it include filters?"
    assert "AeroPress" not in q


def test_build_retrieval_query_includes_prior_turns_when_opt_in() -> None:
    hist = [
        _msg(role="user", content="Tell me about the AeroPress Go"),
        _msg(
            role="assistant",
            content="The AeroPress Go is a travel coffee maker with a mug and filter holder.",
        ),
    ]
    q = chat_graph.build_retrieval_query_for_embedding(
        hist, "Does it include filters?", include_conversation_tail=True
    )
    assert "AeroPress" in q
    assert "filters" in q.lower()


@pytest.mark.asyncio
async def test_invoke_runtime_chat_graph_empty_model_uses_fallback(monkeypatch: pytest.MonkeyPatch) -> None:
    class _FakeLLM:
        async def ainvoke(self, _messages: object) -> AIMessage:
            return AIMessage(content="")

    monkeypatch.setattr(
        chat_graph, "make_chat_model", lambda _model, *, temperature=0.0: _FakeLLM()
    )
    chat_graph._compiled_graph = None

    text, fb, _in_t, _out_t = await chat_graph.invoke_runtime_chat_graph(
        messages=[HumanMessage(content="Hi")],
        model="gpt-4o-mini",
        fallback_message="FALLBACK",
        thread_id=None,
    )
    assert text == "FALLBACK"
    assert fb is True


@pytest.mark.asyncio
async def test_invoke_runtime_chat_graph_returns_model_text(monkeypatch: pytest.MonkeyPatch) -> None:
    class _FakeLLM:
        async def ainvoke(self, _messages: object) -> AIMessage:
            return AIMessage(content="  Grounded reply  ")

    monkeypatch.setattr(
        chat_graph, "make_chat_model", lambda _model, *, temperature=0.0: _FakeLLM()
    )
    chat_graph._compiled_graph = None

    text, fb, _in_t, _out_t = await chat_graph.invoke_runtime_chat_graph(
        messages=[HumanMessage(content="Hi")],
        model="gpt-4o-mini",
        fallback_message="FALLBACK",
        thread_id="thread-1",
    )
    assert text == "Grounded reply"
    assert fb is False
