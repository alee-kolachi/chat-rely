import json
from typing import Any
from uuid import UUID, uuid4

import pytest
from fastapi.testclient import TestClient

import app.api.routes.public_widget as public_widget_routes
from app.core.errors import AppError
from app.domains.public_widget.schemas import PublicWidgetAgentContext, PublicWidgetConfigResponse


def test_public_widget_config_missing_header(client: TestClient) -> None:
    r = client.get("/api/v1/public/widget/config")
    assert r.status_code == 401
    assert r.json()["error"]["code"] == "widget.missing_key"


def test_public_widget_config_ok(client: TestClient, monkeypatch: pytest.MonkeyPatch) -> None:
    aid = uuid4()
    uid = uuid4()
    ctx = PublicWidgetAgentContext(
        agent_id=aid,
        user_id=uid,
        name="Store Bot",
        behavior_settings={"brand_color": "#3B82F6", "widget_position": "bottom_left"},
    )

    async def _resolve(_db: Any, _key: str) -> PublicWidgetAgentContext:
        return ctx

    monkeypatch.setattr(public_widget_routes, "resolve_agent_for_widget_key", _resolve)
    r = client.get("/api/v1/public/widget/config", headers={"X-ChatRely-Agent-Key": "test-key"})
    assert r.status_code == 200
    body = r.json()
    assert body["name"] == "Store Bot"
    assert body["brand_color"] == "#3B82F6"
    assert body["widget_position"] == "bottom_left"
    assert body["agent_id"] == str(aid)


def test_public_widget_stream_mock(client: TestClient, monkeypatch: pytest.MonkeyPatch) -> None:
    aid = uuid4()
    uid = uuid4()
    ctx = PublicWidgetAgentContext(
        agent_id=aid,
        user_id=uid,
        name="Bot",
        behavior_settings={},
    )

    async def _resolve(_db: Any, _key: str) -> PublicWidgetAgentContext:
        return ctx

    async def _stream(_db: Any, _user_id: UUID, _payload: Any):
        yield {"type": "start", "conversation_id": str(uuid4())}
        yield {"type": "token", "text": "Hi"}
        yield {"type": "done", "conversation_id": str(uuid4()), "response": "Hi"}

    monkeypatch.setattr(public_widget_routes, "resolve_agent_for_widget_key", _resolve)
    monkeypatch.setattr(public_widget_routes, "run_chat_stream", _stream)

    r = client.post(
        "/api/v1/public/widget/chat/stream",
        headers={"X-ChatRely-Agent-Key": "k"},
        json={"message": "Hello", "visitor_id": "v1"},
    )
    assert r.status_code == 200
    lines = [ln for ln in r.text.strip().split("\n") if ln.strip()]
    assert len(lines) >= 3
    assert json.loads(lines[0])["type"] == "start"


def test_public_widget_cors_preflight(client: TestClient) -> None:
    r = client.options(
        "/api/v1/public/widget/config",
        headers={
            "Origin": "https://example.myshopify.com",
            "Access-Control-Request-Method": "GET",
            "Access-Control-Request-Headers": "x-chatrely-agent-key",
        },
    )
    assert r.status_code == 204
    assert r.headers.get("access-control-allow-origin") == "https://example.myshopify.com"


def test_public_widget_config_response_model() -> None:
    cfg = PublicWidgetConfigResponse(
        agent_id=uuid4(),
        name="N",
        brand_color=None,
        widget_position="bottom_right",
    )
    assert cfg.widget_position == "bottom_right"
