"""OpenAI API key selection and fallback when the primary key fails."""

from __future__ import annotations

from collections.abc import AsyncIterator, Awaitable, Callable
from typing import Any, TypeVar

import structlog

from app.core.settings import Settings, get_settings

log = structlog.get_logger("openai_keys")

# Substrings in OpenAI error bodies/messages that indicate billing or quota issues.
_FALLBACK_ERROR_MARKERS = (
    "insufficient_quota",
    "exceeded your current quota",
    "rate limit",
    "billing",
    "payment",
    "account_deactivated",
    "invalid_api_key",
)

T = TypeVar("T")


def openai_api_keys(settings: Settings | None = None) -> list[str]:
    """Primary key first, then optional fallback; duplicates removed."""
    settings = settings or get_settings()
    keys: list[str] = []
    for raw in (settings.openai_api_key, settings.openai_api_key_fallback):
        key = (raw or "").strip()
        if key and key not in keys:
            keys.append(key)
    return keys


def has_openai_api_key(settings: Settings | None = None) -> bool:
    return bool(openai_api_keys(settings))


def _extract_status_code(exc: BaseException) -> int | None:
    status = getattr(exc, "status_code", None)
    if isinstance(status, int):
        return status
    response = getattr(exc, "response", None)
    if response is not None:
        sc = getattr(response, "status_code", None)
        if isinstance(sc, int):
            return sc
    return None


def is_openai_key_fallback_error(exc: BaseException) -> bool:
    """True when retrying with another API key may succeed."""
    status = _extract_status_code(exc)
    if status in (401, 402, 429):
        return True
    text = str(exc).lower()
    return any(marker in text for marker in _FALLBACK_ERROR_MARKERS)


def is_openai_http_key_fallback(status_code: int, body: str) -> bool:
    """True when an embeddings HTTP response should retry with the fallback key."""
    if status_code in (401, 402, 429):
        return True
    lower = (body or "").lower()
    return any(marker in lower for marker in _FALLBACK_ERROR_MARKERS)


async def ainvoke_with_key_fallback(
    build_llm: Callable[[str], Any],
    messages: list[Any],
    *,
    settings: Settings | None = None,
) -> Any:
    keys = openai_api_keys(settings)
    if not keys:
        raise ValueError("no OpenAI API key configured")
    last_exc: Exception | None = None
    for i, key in enumerate(keys):
        try:
            return await build_llm(key).ainvoke(messages)
        except Exception as exc:
            if i < len(keys) - 1 and is_openai_key_fallback_error(exc):
                log.warning(
                    "openai.api_key_fallback",
                    attempt=i + 1,
                    error=str(exc)[:300],
                )
                last_exc = exc
                continue
            raise
    assert last_exc is not None
    raise last_exc


async def astream_with_key_fallback(
    build_llm: Callable[[str], Any],
    messages: list[Any],
    *,
    settings: Settings | None = None,
) -> AsyncIterator[Any]:
    """Stream chat chunks; retries with the next key only if the stream never started."""
    keys = openai_api_keys(settings)
    if not keys:
        raise ValueError("no OpenAI API key configured")
    last_exc: Exception | None = None
    for i, key in enumerate(keys):
        llm = build_llm(key)
        yielded = False
        try:
            async for chunk in llm.astream(messages):
                yielded = True
                yield chunk
            return
        except Exception as exc:
            if not yielded and i < len(keys) - 1 and is_openai_key_fallback_error(exc):
                log.warning(
                    "openai.api_key_fallback",
                    attempt=i + 1,
                    error=str(exc)[:300],
                )
                last_exc = exc
                continue
            raise
    if last_exc is not None:
        raise last_exc


async def run_with_key_fallback(
    fn: Callable[[str], Awaitable[T]],
    *,
    settings: Settings | None = None,
) -> T:
    keys = openai_api_keys(settings)
    if not keys:
        raise ValueError("no OpenAI API key configured")
    last_exc: Exception | None = None
    for i, key in enumerate(keys):
        try:
            return await fn(key)
        except Exception as exc:
            if i < len(keys) - 1 and is_openai_key_fallback_error(exc):
                log.warning(
                    "openai.api_key_fallback",
                    attempt=i + 1,
                    error=str(exc)[:300],
                )
                last_exc = exc
                continue
            raise
    assert last_exc is not None
    raise last_exc
