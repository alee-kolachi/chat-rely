"""Tests for demo provision queue and polite crawl helper."""

from __future__ import annotations

import asyncio
from unittest.mock import AsyncMock, MagicMock

import httpx
import pytest

from app.core.crawl_http import crawl_get


@pytest.mark.asyncio
async def test_crawl_get_retries_on_429(monkeypatch: pytest.MonkeyPatch) -> None:
    client = AsyncMock(spec=httpx.AsyncClient)
    too_many = MagicMock(spec=httpx.Response)
    too_many.status_code = 429
    too_many.headers = {"Retry-After": "0"}
    ok = MagicMock(spec=httpx.Response)
    ok.status_code = 200
    client.get = AsyncMock(side_effect=[too_many, ok])

    sleeps: list[float] = []

    async def _sleep(seconds: float) -> None:
        sleeps.append(seconds)

    monkeypatch.setattr(asyncio, "sleep", _sleep)
    response = await crawl_get(client, "https://example.com", delay_seconds=0, max_attempts=3)

    assert response is ok
    assert client.get.await_count == 2


@pytest.mark.asyncio
async def test_crawl_get_returns_none_after_exhausted_retries() -> None:
    client = AsyncMock(spec=httpx.AsyncClient)
    too_many = MagicMock(spec=httpx.Response)
    too_many.status_code = 429
    too_many.headers = {}
    client.get = AsyncMock(return_value=too_many)

    response = await crawl_get(client, "https://example.com", delay_seconds=0, max_attempts=2)
    assert response is None
