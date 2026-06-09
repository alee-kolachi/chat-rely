"""CORS preflight for dashboard API when the browser calls the API directly."""

from fastapi.testclient import TestClient

from app.core.settings import get_settings
from app.main import create_app


def test_dashboard_cors_preflight_uses_allowed_origins_from_settings(monkeypatch) -> None:
    monkeypatch.setenv("APP_ENV", "production")
    monkeypatch.setenv("ALLOWED_ORIGINS", "https://chat-rely.vercel.app")
    get_settings.cache_clear()

    client = TestClient(create_app())
    response = client.options(
        "/api/v1/agents",
        headers={
            "Origin": "https://chat-rely.vercel.app",
            "Access-Control-Request-Method": "GET",
            "Access-Control-Request-Headers": "authorization",
        },
    )

    assert response.status_code == 200
    assert response.headers.get("access-control-allow-origin") == "https://chat-rely.vercel.app"

    get_settings.cache_clear()


def test_dashboard_cors_preflight_default_production_origin(monkeypatch) -> None:
    monkeypatch.setenv("APP_ENV", "production")
    monkeypatch.delenv("ALLOWED_ORIGINS", raising=False)
    get_settings.cache_clear()

    client = TestClient(create_app())
    response = client.options(
        "/api/v1/notifications",
        headers={
            "Origin": "https://chat-rely.vercel.app",
            "Access-Control-Request-Method": "GET",
        },
    )

    assert response.status_code == 200
    assert response.headers.get("access-control-allow-origin") == "https://chat-rely.vercel.app"

    get_settings.cache_clear()


def test_dashboard_cors_preflight_allows_custom_domain_by_default(monkeypatch) -> None:
    monkeypatch.setenv("APP_ENV", "production")
    monkeypatch.delenv("ALLOWED_ORIGINS", raising=False)
    get_settings.cache_clear()

    client = TestClient(create_app())
    response = client.options(
        "/api/v1/notifications",
        headers={
            "Origin": "https://chatrely.com",
            "Access-Control-Request-Method": "GET",
        },
    )

    assert response.status_code == 200
    assert response.headers.get("access-control-allow-origin") == "https://chatrely.com"

    get_settings.cache_clear()
