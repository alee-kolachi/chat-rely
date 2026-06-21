"""SSE helpers; chat turns stream via ``app.agent.graph``."""

from __future__ import annotations

import json
from collections.abc import AsyncIterator
from typing import Any

from langchain_core.messages import BaseMessage

from app.agent.llm import make_chat_model, make_groq_chat_model
from app.agent.messages import text_delta_from_stream_chunk, usage_tokens_from_model_message
from app.core.openai_keys import astream_with_key_fallback
from app.domains.runtime.service import response_used_fallback


def format_sse(event: str, data: dict[str, Any]) -> str:
    return f"event: {event}\ndata: {json.dumps(data, default=str)}\n\n"


async def stream_llm_sse(
    messages: list[BaseMessage],
    *,
    model: str,
    temperature: float,
    fallback_message: str,
) -> AsyncIterator[str]:
    parts: list[str] = []
    usage_in = 0
    usage_out = 0

    async for chunk in astream_with_key_fallback(
        lambda api_key: make_chat_model(model, temperature=temperature, api_key=api_key),
        messages,
        build_groq_llm=lambda: make_groq_chat_model(temperature=temperature),
    ):
        delta = text_delta_from_stream_chunk(chunk)
        if delta:
            parts.append(delta)
            yield format_sse("token", {"text": delta})
        in_t, out_t = usage_tokens_from_model_message(chunk)
        if in_t or out_t:
            usage_in += in_t
            usage_out += out_t

    final = "".join(parts).strip()
    explicit_fallback = False
    if not final and fallback_message:
        final = fallback_message.strip()
        explicit_fallback = True
        yield format_sse("token", {"text": final})
    fallback_used = response_used_fallback(
        final,
        fallback_message=fallback_message,
        explicit=explicit_fallback,
    )

    yield format_sse(
        "done",
        {
            "response": final,
            "fallback_used": fallback_used,
            "usage_input_tokens": usage_in,
            "usage_output_tokens": usage_out,
        },
    )
