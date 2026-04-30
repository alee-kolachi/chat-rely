"""
LangGraph runtime for chat: one graph invocation per user message.

- **Memory**: Prior turns come from Postgres (`messages`); the graph adds the
  current grounded user turn and the model reply. Swap to a LangGraph
  Postgres checkpointer later if you want durable graph state in addition to
  app tables.
- **Actions / tools**: Add nodes and conditional edges from `respond` to tool
  executors, then back to `respond`, using `ToolNode` or custom async nodes.
"""

from __future__ import annotations

from typing import Annotated, Any, TypedDict

from langchain_core.messages import AIMessage, BaseMessage, HumanMessage, SystemMessage, ToolMessage
from langchain_openai import ChatOpenAI
from langgraph.graph import END, START, StateGraph
from langgraph.graph.message import add_messages

from app.core.errors import AppError
from app.core.settings import get_settings
from app.domains.conversations.schemas import MessageDTO

MAX_HISTORY_DB_MESSAGES = 48


class RuntimeChatState(TypedDict, total=False):
    """LangGraph state for one chat completion (extensible for tools)."""

    messages: Annotated[list[BaseMessage], add_messages]
    model: str
    fallback_message: str
    fallback_used: bool


def _make_chat_model(model: str) -> ChatOpenAI:
    settings = get_settings()
    if not settings.openai_api_key:
        raise AppError(
            code="runtime.llm_not_configured",
            message="OPENAI_API_KEY is required for runtime chat",
            status_code=500,
        )
    return ChatOpenAI(
        model=model,
        temperature=0,
        api_key=settings.openai_api_key,
        timeout=60,
        max_retries=2,
    )


def _text_from_model_message(msg: BaseMessage) -> str:
    raw = getattr(msg, "content", None)
    if isinstance(raw, str):
        return raw.strip()
    if isinstance(raw, list):
        parts: list[str] = []
        for block in raw:
            if isinstance(block, str):
                parts.append(block)
            elif isinstance(block, dict) and block.get("type") == "text":
                parts.append(str(block.get("text", "")))
        return "".join(parts).strip()
    return ""


def db_messages_to_chat_messages(messages: list[MessageDTO]) -> list[BaseMessage]:
    """Map persisted rows to LangChain messages (skips `system`: prompt is rebuilt each turn)."""
    out: list[BaseMessage] = []
    for m in messages:
        if m.role == "user":
            out.append(HumanMessage(content=m.content))
        elif m.role == "assistant":
            out.append(AIMessage(content=m.content))
        elif m.role == "system":
            continue
        elif m.role == "tool":
            out.append(
                ToolMessage(
                    content=m.content,
                    tool_call_id=m.tool_call_id or m.tool_name or "tool",
                )
            )
    return out


def build_turn_messages(
    *,
    system_content: str,
    history_without_current_user: list[MessageDTO],
    grounded_user_content: str,
) -> list[BaseMessage]:
    """System + prior turns (plain text) + current user message (possibly RAG-grounded)."""
    messages: list[BaseMessage] = [SystemMessage(content=system_content)]
    messages.extend(db_messages_to_chat_messages(history_without_current_user))
    messages.append(HumanMessage(content=grounded_user_content))
    return messages


async def _respond_node(state: RuntimeChatState) -> dict[str, Any]:
    llm = _make_chat_model(state["model"])
    try:
        response = await llm.ainvoke(state["messages"])
    except Exception as exc:
        raise AppError(
            code="runtime.llm_failed",
            message="LLM request failed",
            status_code=502,
            details={"error": str(exc)[:500]},
        ) from exc

    if not isinstance(response, AIMessage):
        response = AIMessage(content=_text_from_model_message(response))

    text = _text_from_model_message(response)
    fallback_message = state.get("fallback_message") or ""
    if not text:
        return {
            "messages": [AIMessage(content=fallback_message)],
            "fallback_used": True,
        }
    return {"messages": [response], "fallback_used": False}


def build_runtime_chat_graph() -> Any:
    graph = StateGraph(RuntimeChatState)
    graph.add_node("respond", _respond_node)
    graph.add_edge(START, "respond")
    graph.add_edge("respond", END)
    return graph.compile()


_compiled_graph: Any | None = None


def _get_compiled_graph() -> Any:
    global _compiled_graph
    if _compiled_graph is None:
        _compiled_graph = build_runtime_chat_graph()
    return _compiled_graph


async def invoke_runtime_chat_graph(
    *,
    messages: list[BaseMessage],
    model: str,
    fallback_message: str,
    thread_id: str | None = None,
) -> tuple[str, bool]:
    """
    Run the chat graph once. `thread_id` is reserved for a future checkpointer
    (e.g. PostgresSaver); conversation memory is loaded from the DB by the caller.
    """
    graph = _get_compiled_graph()
    config: dict[str, Any] = {}
    if thread_id:
        config["configurable"] = {"thread_id": thread_id}

    initial: RuntimeChatState = {
        "messages": messages,
        "model": model,
        "fallback_message": fallback_message,
        "fallback_used": False,
    }
    out = await graph.ainvoke(initial, config=config if config else None)
    final_messages = out.get("messages") or []
    if not final_messages:
        return fallback_message, True
    last = final_messages[-1]
    text = _text_from_model_message(last)
    fallback_used = bool(out.get("fallback_used"))
    if not text:
        return fallback_message, True
    return text, fallback_used


def slice_history_for_current_turn(
    db_messages: list[MessageDTO],
    *,
    current_user_content: str,
) -> list[MessageDTO]:
    """Drop the trailing user row if it matches this turn (already appended to DB)."""
    window = db_messages[-MAX_HISTORY_DB_MESSAGES:]
    if (
        window
        and window[-1].role == "user"
        and window[-1].content.strip() == current_user_content.strip()
    ):
        return window[:-1]
    return window


def build_retrieval_query_for_embedding(
    history_without_current_user: list[MessageDTO],
    current_user_message: str,
    *,
    max_tail_messages: int = 8,
    max_message_chars: int = 700,
    max_total_chars: int = 3200,
) -> str:
    """
    Embed recent dialogue plus the latest question so short follow-ups
    ("What's the warranty?", "Does it ship to EU?") stay aligned with
    entities and products from prior turns.
    """
    cur_only = (current_user_message or "").strip()
    if not history_without_current_user:
        return cur_only
    tail = history_without_current_user[-max_tail_messages:]
    lines: list[str] = []
    for m in tail:
        if m.role == "user":
            text = (m.content or "").strip()
            if text:
                snippet = text if len(text) <= max_message_chars else text[: max_message_chars - 1] + "…"
                lines.append(f"User: {snippet}")
        elif m.role == "assistant":
            text = (m.content or "").strip()
            if text:
                snippet = text if len(text) <= max_message_chars else text[: max_message_chars - 1] + "…"
                lines.append(f"Assistant: {snippet}")
    if cur_only:
        lines.append(f"User: {cur_only}")
    joined = "\n".join(lines).strip()
    if len(joined) <= max_total_chars:
        return joined or cur_only
    return joined[-max_total_chars:]
