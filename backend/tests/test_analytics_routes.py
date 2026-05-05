"""Analytics API."""

from datetime import UTC, datetime
from typing import Any
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient

from app.domains.analytics.schemas import (
    AgentAnalyticsResponse,
    AnalyticsNamedCount,
    AnalyticsQualityMetric,
    AnalyticsSentimentSlice,
    AnalyticsSeriesPoint,
)


def _auth_header() -> dict[str, str]:
    return {"Authorization": "Bearer test"}


class _DummyVerifier:
    def verify_token(self, token: str) -> dict[str, str]:
        return {"sub": "00000000-0000-4000-8000-000000000001"}


def _patch_auth(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr("app.api.deps.get_token_verifier", lambda: _DummyVerifier())


def test_get_agent_analytics(client: TestClient, monkeypatch: pytest.MonkeyPatch) -> None:
    _patch_auth(monkeypatch)
    agent_id = uuid4()
    now = datetime.now(tz=UTC)

    async def _analytics(*_: Any, **__: Any) -> AgentAnalyticsResponse:
        return AgentAnalyticsResponse(
            range_from=now,
            range_to=now,
            conversations_started=5,
            resolved_by_agent_pct=80.0,
            escalations_pct=4.0,
            avg_response_time_ms=1200.5,
            series=[AnalyticsSeriesPoint(bucket_date=now.date(), count=5)],
            top_intents=[
                AnalyticsNamedCount(key="track-order", label="Track order", count=3),
            ],
            sentiment=[
                AnalyticsSentimentSlice(bucket="positive", count=3, pct=60.0),
                AnalyticsSentimentSlice(bucket="neutral", count=1, pct=20.0),
                AnalyticsSentimentSlice(bucket="negative", count=1, pct=20.0),
            ],
            countries=[AnalyticsNamedCount(key="US", label="US", count=4)],
            quality=[
                AnalyticsQualityMetric(
                    key="resolution_confidence",
                    label="Avg resolution confidence",
                    value="72%",
                    hint="test",
                ),
            ],
        )

    monkeypatch.setattr("app.api.routes.agents.build_agent_analytics", _analytics)

    response = client.get(
        f"/api/v1/agents/{agent_id}/analytics?range_key=30d",
        headers=_auth_header(),
    )
    assert response.status_code == 200
    body = response.json()
    assert body["conversations_started"] == 5
    assert body["resolved_by_agent_pct"] == 80.0
    assert body["escalations_pct"] == 4.0
    assert body["avg_response_time_ms"] == 1200.5
    assert body["series"][0]["count"] == 5
    assert body["top_intents"][0]["key"] == "track-order"
    assert body["sentiment"][0]["bucket"] == "positive"
    assert body["countries"][0]["key"] == "US"
    assert body["quality"][0]["key"] == "resolution_confidence"
