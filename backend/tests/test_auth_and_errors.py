import pytest
from fastapi.testclient import TestClient

from app.core.errors import AuthError


class _DummyVerifier:
    def verify_token(self, token: str) -> dict[str, str]:
        if token == "good-token":
            return {"sub": "00000000-0000-0000-0000-000000000123"}
        raise AuthError("bad token")


def test_missing_bearer_returns_standard_error(client: TestClient) -> None:
    response = client.get("/api/v1/system/me")
    assert response.status_code == 401
    body = response.json()
    assert body["error"]["code"] == "auth.unauthorized"
    assert body["error"]["request_id"] is not None


def test_valid_bearer_returns_user(client: TestClient, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr("app.api.deps.get_token_verifier", lambda: _DummyVerifier())
    response = client.get("/api/v1/system/me", headers={"Authorization": "Bearer good-token"})
    assert response.status_code == 200
    assert response.json() == {"user_id": "00000000-0000-0000-0000-000000000123"}


def test_not_found_uses_standard_error(client: TestClient) -> None:
    response = client.get("/api/v1/does-not-exist")
    assert response.status_code == 404
    body = response.json()
    assert body["error"]["code"] == "http.error"


def test_invalid_bearer_uses_auth_error(client: TestClient, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr("app.api.deps.get_token_verifier", lambda: _DummyVerifier())
    response = client.get("/api/v1/system/me", headers={"Authorization": "Bearer bad-token"})
    assert response.status_code == 401
    body = response.json()
    assert body["error"]["code"] == "auth.unauthorized"

