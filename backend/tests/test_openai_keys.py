"""OpenAI API key fallback helpers."""

import pytest

from app.core.openai_keys import (
    is_openai_http_key_fallback,
    is_openai_key_fallback_error,
    openai_api_keys,
)
from app.core.settings import get_settings


class _StatusError(Exception):
    def __init__(self, status_code: int, message: str = "") -> None:
        super().__init__(message or f"status {status_code}")
        self.status_code = status_code


def test_openai_api_keys_primary_then_fallback(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("OPENAI_API_KEY", "sk-primary")
    monkeypatch.setenv("OPENAI_API_KEY_FALLBACK", "sk-fallback")
    get_settings.cache_clear()
    assert openai_api_keys() == ["sk-primary", "sk-fallback"]
    get_settings.cache_clear()


def test_openai_api_keys_dedupes_identical_keys(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("OPENAI_API_KEY", "sk-same")
    monkeypatch.setenv("OPENAI_API_KEY_FALLBACK", "sk-same")
    get_settings.cache_clear()
    assert openai_api_keys() == ["sk-same"]
    get_settings.cache_clear()


def test_is_openai_key_fallback_error_quota() -> None:
    assert is_openai_key_fallback_error(_StatusError(429, "rate limit exceeded"))
    assert is_openai_key_fallback_error(Exception("You exceeded your current quota"))


def test_is_openai_key_fallback_error_non_retryable() -> None:
    assert not is_openai_key_fallback_error(_StatusError(500, "server error"))
    assert not is_openai_key_fallback_error(Exception("context length exceeded"))


def test_is_openai_http_key_fallback() -> None:
    assert is_openai_http_key_fallback(402, "")
    assert is_openai_http_key_fallback(400, '{"error":{"code":"insufficient_quota"}}')
    assert not is_openai_http_key_fallback(400, "maximum request size exceeded")
