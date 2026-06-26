"""Chat model factories (OpenAI primary, Groq last-resort fallback)."""

from __future__ import annotations

from typing import Any

from langchain_groq import ChatGroq
from langchain_openai import ChatOpenAI

from app.core.errors import AppError
from app.core.openai_keys import has_openai_api_key, openai_api_keys
from app.core.settings import Settings, get_settings


def make_chat_model(
    model: str,
    *,
    temperature: float = 0.0,
    api_key: str | None = None,
    **kwargs: Any,
) -> ChatOpenAI:
    settings = get_settings()
    key = (api_key or "").strip()
    if not key:
        keys = openai_api_keys(settings)
        if not keys:
            raise AppError(
                code="runtime.llm_not_configured",
                message="OPENAI_API_KEY is required for runtime chat",
                status_code=500,
            )
        key = keys[0]
    t = max(0.0, min(1.0, float(temperature)))
    params: dict[str, Any] = {
        "model": model,
        "temperature": t,
        "api_key": key,
        "timeout": kwargs.pop("timeout", 15),
        "max_retries": kwargs.pop("max_retries", 0),
        "streaming": kwargs.pop("streaming", True),
    }
    max_tokens = kwargs.pop("max_tokens", 256)
    if max_tokens is not None:
        params["max_tokens"] = max_tokens
    params.update(kwargs)
    return ChatOpenAI(**params)


def make_openai_chat_model(
    model: str,
    *,
    api_key: str | None = None,
    temperature: float = 0.0,
    **kwargs: Any,
) -> ChatOpenAI:
    """Non-streaming OpenAI chat model (analytics, summaries, etc.)."""
    if not has_openai_api_key() and not (api_key or "").strip():
        raise AppError(
            code="runtime.llm_not_configured",
            message="OPENAI_API_KEY is required",
            status_code=500,
        )
    extra = dict(kwargs)
    if "max_tokens" not in extra:
        extra["max_tokens"] = None
    return make_chat_model(
        model,
        temperature=temperature,
        api_key=api_key,
        streaming=False,
        **extra,
    )


def make_groq_chat_model(
    model: str | None = None,
    *,
    settings: Settings | None = None,
    temperature: float = 0.0,
    **kwargs: Any,
) -> ChatGroq:
    settings = settings or get_settings()
    key = (settings.groq_api_key or "").strip()
    if not key:
        raise AppError(
            code="runtime.llm_not_configured",
            message="GROQ_API_KEY is required for Groq fallback chat",
            status_code=500,
        )
    model_name = (model or settings.groq_chat_model or "llama-3.3-70b-versatile").strip()
    t = max(0.0, min(1.0, float(temperature)))
    params: dict[str, Any] = {
        "model": model_name,
        "temperature": t,
        "api_key": key,
        "timeout": kwargs.pop("timeout", 15),
        "max_retries": kwargs.pop("max_retries", 0),
        "streaming": kwargs.pop("streaming", True),
    }
    max_tokens = kwargs.pop("max_tokens", 256)
    if max_tokens is not None:
        params["max_tokens"] = max_tokens
    params.update(kwargs)
    return ChatGroq(**params)
