import os
from collections.abc import Generator
from pathlib import Path
from uuid import UUID

import pytest
from dotenv import load_dotenv
from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials
from fastapi.testclient import TestClient

from app.api.deps import AuthContext, bearer_scheme, get_current_user
from app.core.errors import AuthError
from app.core.settings import get_settings
from app.main import create_app

_BACKEND_ENV = Path(__file__).resolve().parents[1] / ".env"
_LOCAL_DATABASE_URL = "postgresql+asyncpg://postgres:postgres@127.0.0.1:54322/postgres"
_TEST_USER_ID = "00000000-0000-0000-0000-000000000123"
_TEST_BEARER = "good-token"

# Stub JWKS for route tests (dummy bearer tokens). DATABASE_URL comes from backend/.env when set.
_TEST_SUPABASE_ENV = {
    "SUPABASE_JWKS_URL": "https://example.com/.well-known/jwks.json",
    "SUPABASE_ISSUER": "https://example.com/auth/v1",
    "SUPABASE_AUDIENCE": "authenticated",
}


class _DummyVerifier:
    def verify_token(self, token: str) -> dict[str, str]:
        if token == _TEST_BEARER:
            return {"sub": _TEST_USER_ID}
        raise AuthError("bad token")


async def _test_get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
) -> AuthContext:
    """Route-test auth: verify dummy bearer only; skip auth.users lookup on remote Supabase."""
    if credentials is None:
        raise AuthError("Missing bearer token")
    claims = _DummyVerifier().verify_token(credentials.credentials)
    return AuthContext(user_id=UUID(str(claims["sub"])), claims=claims)


@pytest.fixture(autouse=True)
def _env() -> Generator[None, None, None]:
    load_dotenv(_BACKEND_ENV)
    os.environ.setdefault("DATABASE_URL", _LOCAL_DATABASE_URL)
    for key, value in _TEST_SUPABASE_ENV.items():
        os.environ[key] = value
    get_settings.cache_clear()
    yield
    get_settings.cache_clear()


@pytest.fixture
def client(monkeypatch: pytest.MonkeyPatch) -> Generator[TestClient, None, None]:
    async def _noop_warmup(self: object) -> None:
        return None

    async def _noop_db() -> None:
        return None

    monkeypatch.setattr("app.core.security.TokenVerifier.warmup", _noop_warmup)
    monkeypatch.setattr("app.main.check_db_ready", _noop_db)
    monkeypatch.setattr("app.main.warm_all_runtime_caches", _noop_db)
    app = create_app()
    app.dependency_overrides[get_current_user] = _test_get_current_user
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()
