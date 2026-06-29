"""Routing-layer tests for /api/v1/admin/demo."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient

from app.domains.admin.schemas import (
    AdminConversationListItem,
    AdminConversationListResponse,
    AdminDemoDetail,
    AdminDemoListItem,
    AdminDemoListResponse,
)
from tests._admin_test_helpers import admin_auth, admin_client, non_admin_auth


__all__ = ["admin_client"]


def _make_demo_item(slug: str = "acme-store") -> AdminDemoListItem:
    return AdminDemoListItem(
        slug=slug,
        display_name="Acme Store",
        store_url="https://acme.com",
        store_host="acme.com",
        status="ready",
        product_count=42,
        lifetime_message_count=15,
        conversation_count=3,
        visitor_count=2,
        demo_url=f"https://chatrely.com/demo/{slug}",
        ready_at=datetime(2026, 6, 1, tzinfo=timezone.utc),
        expires_at=None,
        created_at=datetime(2026, 5, 28, tzinfo=timezone.utc),
        last_conversation_at=datetime(2026, 6, 20, tzinfo=timezone.utc),
    )


def test_list_demos_passes_filters(
    admin_client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    captured: dict[str, Any] = {}

    async def fake_list(_db: Any, **kwargs: Any) -> AdminDemoListResponse:
        captured.update(kwargs)
        return AdminDemoListResponse(
            items=[_make_demo_item()],
            total=1,
            page=1,
            page_size=50,
        )

    monkeypatch.setattr("app.api.routes.admin.demo.list_admin_demos", fake_list)

    response = admin_client.get(
        "/api/v1/admin/demo",
        params={"q": "acme", "status": "ready"},
        headers=admin_auth(),
    )
    assert response.status_code == 200
    body = response.json()
    assert body["total"] == 1
    assert body["items"][0]["slug"] == "acme-store"
    assert captured["q"] == "acme"
    assert captured["status"] == "ready"


def test_get_demo_detail_returns_shape(
    admin_client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    async def fake_detail(_db: Any, slug: str) -> AdminDemoDetail:
        assert slug == "acme-store"
        base = _make_demo_item(slug)
        return AdminDemoDetail(
            **base.model_dump(),
            logo_url="https://cdn.example/logo.png",
            brand_color="#112233",
            suggested_prompts=["Shipping policy?"],
        )

    monkeypatch.setattr("app.api.routes.admin.demo.get_admin_demo_detail", fake_detail)

    response = admin_client.get("/api/v1/admin/demo/acme-store", headers=admin_auth())
    assert response.status_code == 200
    body = response.json()
    assert body["store_host"] == "acme.com"
    assert body["suggested_prompts"] == ["Shipping policy?"]


def test_list_demo_conversations_resolves_slug(
    admin_client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    captured: dict[str, Any] = {}

    async def fake_list(_db: Any, slug: str, **kwargs: Any) -> AdminConversationListResponse:
        captured["slug"] = slug
        captured.update(kwargs)
        return AdminConversationListResponse(
            items=[
                AdminConversationListItem(
                    id=uuid4(),
                    started_at=datetime(2026, 6, 20, tzinfo=timezone.utc),
                    last_activity_at=datetime(2026, 6, 20, tzinfo=timezone.utc),
                    status="open",
                    channel="demo",
                    visitor_id="visitor-abc",
                    agent_id=uuid4(),
                    agent_name="Acme Demo",
                    user_id=uuid4(),
                    user_email="demo-outreach@chatrely.internal",
                    customer_message_count=2,
                    assistant_message_count=2,
                    tool_call_count=0,
                    total_input_tokens=50,
                    total_output_tokens=40,
                    fallback_used=False,
                    latest_message_preview="hello",
                )
            ],
            total=1,
            page=1,
            page_size=50,
        )

    monkeypatch.setattr(
        "app.api.routes.admin.demo.list_admin_demo_conversations", fake_list
    )

    response = admin_client.get(
        "/api/v1/admin/demo/acme-store/conversations",
        params={"visitor_id": "visitor-abc"},
        headers=admin_auth(),
    )
    assert response.status_code == 200
    assert response.json()["items"][0]["channel"] == "demo"
    assert captured["slug"] == "acme-store"
    assert captured["visitor_id"] == "visitor-abc"


def test_list_demos_non_admin_returns_404(admin_client: TestClient) -> None:
    response = admin_client.get("/api/v1/admin/demo", headers=non_admin_auth())
    assert response.status_code == 404
