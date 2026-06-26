"""Polite HTTP GET for storefront crawls (delay + 429/503 retry)."""

from __future__ import annotations

import asyncio

import httpx


def _retry_after_seconds(response: httpx.Response) -> float | None:
    raw = (response.headers.get("Retry-After") or "").strip()
    if not raw:
        return None
    try:
        return max(1.0, float(raw))
    except ValueError:
        return None


async def crawl_get(
    client: httpx.AsyncClient,
    url: str,
    *,
    delay_seconds: float = 0.0,
    max_attempts: int = 4,
) -> httpx.Response | None:
    """GET with optional pacing and retry on rate limits."""
    for attempt in range(max(1, max_attempts)):
        if delay_seconds > 0:
            await asyncio.sleep(delay_seconds)
        try:
            response = await client.get(url)
        except httpx.HTTPError:
            if attempt + 1 >= max_attempts:
                return None
            await asyncio.sleep(min(2**attempt, 10))
            continue
        if response.status_code in (429, 503):
            if attempt + 1 < max_attempts:
                wait = _retry_after_seconds(response) or min(2 ** (attempt + 1), 30)
                await asyncio.sleep(wait)
                continue
            return None
        return response
    return None
