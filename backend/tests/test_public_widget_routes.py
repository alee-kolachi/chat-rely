import json
from typing import Any
from uuid import UUID, uuid4

import pytest
from fastapi.testclient import TestClient

import app.api.routes.public_widget as public_widget_routes
from app.core.errors import AppError
from app.domains.public_widget.schemas import PublicWidgetAgentContext, PublicWidgetConfigResponse
from app.domains.public_widget.service import (
    attachments_ui_enabled_for_plan_slug,
    hide_powered_by_chatrely_for_plan_slug,
)


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

    async def _plan_hobby(_db: Any, _uid: UUID) -> str:
        return "hobby"

    monkeypatch.setattr(public_widget_routes, "resolve_agent_for_widget_key", _resolve)
    monkeypatch.setattr("app.domains.public_widget.service.fetch_active_plan_slug", _plan_hobby)
    r = client.get("/api/v1/public/widget/config", headers={"X-ChatRely-Agent-Key": "test-key"})
    assert r.status_code == 200
    body = r.json()
    assert body["name"] == "Store Bot"
    assert body["brand_color"] == "#3B82F6"
    assert body["widget_position"] == "bottom_left"
    assert body["agent_id"] == str(aid)
    assert isinstance(body.get("attachments_ui_enabled"), bool)
    assert body.get("hide_powered_by_chatrely") is False
    assert body.get("message_feedback_enabled") is False


def test_public_widget_config_hides_powered_by_on_pro(client: TestClient, monkeypatch: pytest.MonkeyPatch) -> None:
    aid = uuid4()
    uid = uuid4()
    ctx = PublicWidgetAgentContext(
        agent_id=aid,
        user_id=uid,
        name="Pro Bot",
        behavior_settings={},
    )

    async def _resolve(_db: Any, _key: str) -> PublicWidgetAgentContext:
        return ctx

    async def _plan_pro(_db: Any, _uid: UUID) -> str:
        return "pro"

    monkeypatch.setattr(public_widget_routes, "resolve_agent_for_widget_key", _resolve)
    monkeypatch.setattr("app.domains.public_widget.service.fetch_active_plan_slug", _plan_pro)
    r = client.get("/api/v1/public/widget/config", headers={"X-ChatRely-Agent-Key": "test-key"})
    assert r.status_code == 200
    assert r.json().get("hide_powered_by_chatrely") is True
    assert r.json().get("message_feedback_enabled") is True


def test_attachments_ui_enabled_for_plan_slug() -> None:
    assert attachments_ui_enabled_for_plan_slug("free") is False
    assert attachments_ui_enabled_for_plan_slug("FREE") is False
    assert attachments_ui_enabled_for_plan_slug("hobby") is True
    assert attachments_ui_enabled_for_plan_slug("standard") is True
    assert attachments_ui_enabled_for_plan_slug("pro") is True
    assert attachments_ui_enabled_for_plan_slug(None) is False
    assert attachments_ui_enabled_for_plan_slug("") is False


def test_hide_powered_by_chatrely_for_plan_slug() -> None:
    assert hide_powered_by_chatrely_for_plan_slug("pro") is True
    assert hide_powered_by_chatrely_for_plan_slug("PRO") is True
    assert hide_powered_by_chatrely_for_plan_slug("scale") is True
    assert hide_powered_by_chatrely_for_plan_slug("free") is False
    assert hide_powered_by_chatrely_for_plan_slug("hobby") is False
    assert hide_powered_by_chatrely_for_plan_slug("standard") is False
    assert hide_powered_by_chatrely_for_plan_slug(None) is False


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


def test_public_widget_message_feedback_forbidden_on_hobby(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
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

    async def _plan_hobby(_db: Any, _uid: UUID) -> str:
        return "hobby"

    monkeypatch.setattr(public_widget_routes, "resolve_agent_for_widget_key", _resolve)
    monkeypatch.setattr("app.domains.public_widget.service.fetch_active_plan_slug", _plan_hobby)
    r = client.post(
        "/api/v1/public/widget/message-feedback",
        headers={"X-ChatRely-Agent-Key": "k"},
        json={"message_id": str(uuid4()), "visitor_id": "visitor-1", "value": -1},
    )
    assert r.status_code == 403
    assert r.json()["error"]["code"] == "plan.message_feedback_not_available"


def test_public_widget_config_response_model() -> None:
    cfg = PublicWidgetConfigResponse(
        agent_id=uuid4(),
        name="N",
        brand_color=None,
        widget_position="bottom_right",
    )
    assert cfg.widget_position == "bottom_right"
    assert cfg.attachments_ui_enabled is False
    assert cfg.hide_powered_by_chatrely is False
    assert cfg.message_feedback_enabled is False
