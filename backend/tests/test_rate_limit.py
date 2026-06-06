import pytest
from fastapi.testclient import TestClient

from app.core.errors import RateLimitError
from app.core.rate_limit import get_limiter
from app.core.settings import get_settings
from app.domains.agents.rate_limit import (
    enforce_visitor_message_rate_limit,
    parse_agent_rate_limit,
)
from app.main import create_app


@pytest.fixture(autouse=True)
async def _clear_rate_limiter() -> None:
    await get_limiter().clear_all()
    yield
    await get_limiter().clear_all()


@pytest.fixture
def rate_limited_client(monkeypatch: pytest.MonkeyPatch) -> TestClient:
    monkeypatch.setenv("RATE_LIMIT_ENABLED", "true")
    monkeypatch.setenv("RATE_LIMIT_DEFAULT_PER_MINUTE", "2")
    get_settings.cache_clear()

    async def _noop_warmup(_self: object) -> None:
        return None

    async def _noop_db() -> None:
        return None

    monkeypatch.setattr("app.core.security.TokenVerifier.warmup", _noop_warmup)
    monkeypatch.setattr("app.main.check_db_ready", _noop_db)
    monkeypatch.setattr("app.main.warm_all_runtime_caches", _noop_db)
    app = create_app()
    with TestClient(app) as client:
        yield client
    get_settings.cache_clear()


@pytest.mark.asyncio
async def test_parse_agent_rate_limit_defaults() -> None:
    policy = parse_agent_rate_limit({})
    assert policy.max_messages == 20
    assert policy.window_seconds == 60
    assert "try again" in policy.limit_message.lower()


@pytest.mark.asyncio
async def test_parse_agent_rate_limit_custom() -> None:
    policy = parse_agent_rate_limit(
        {
            "rate_limit": {
                "max_messages": 3,
                "window_seconds": 10,
                "limit_message": "Slow down please.",
            }
        }
    )
    assert policy.max_messages == 3
    assert policy.window_seconds == 10
    assert policy.limit_message == "Slow down please."


@pytest.mark.asyncio
async def test_visitor_message_rate_limit_enforced() -> None:
    from uuid import uuid4

    agent_id = uuid4()
    behavior = {
        "rate_limit": {
            "max_messages": 2,
            "window_seconds": 60,
            "limit_message": "Custom limit hit.",
        }
    }
    await enforce_visitor_message_rate_limit(
        behavior_settings=behavior,
        visitor_id="visitor-a",
        agent_id=agent_id,
    )
    await enforce_visitor_message_rate_limit(
        behavior_settings=behavior,
        visitor_id="visitor-a",
        agent_id=agent_id,
    )
    with pytest.raises(RateLimitError) as exc_info:
        await enforce_visitor_message_rate_limit(
            behavior_settings=behavior,
            visitor_id="visitor-a",
            agent_id=agent_id,
        )
    assert exc_info.value.code == "rate_limit.exceeded"
    assert exc_info.value.message == "Custom limit hit."


def test_http_rate_limit_returns_429(rate_limited_client: TestClient) -> None:
    path = "/api/v1/system/version"
    for _ in range(2):
        res = rate_limited_client.get(path)
        assert res.status_code == 200
    blocked = rate_limited_client.get(path)
    assert blocked.status_code == 429
    body = blocked.json()
    assert body["error"]["code"] == "rate_limit.exceeded"
    assert blocked.headers.get("Retry-After")


def _auth_header() -> dict[str, str]:
    return {"Authorization": "Bearer good-token"}


class _DummyVerifier:
    def verify_token(self, token: str) -> dict[str, str]:
        if token == "good-token":
            return {"sub": "00000000-0000-0000-0000-000000000123"}
        from app.core.errors import AppError

        raise AppError("auth.unauthorized", "bad token", status_code=401)


def test_dashboard_chat_stream_enforces_agent_rate_limit(
    client: TestClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    from collections.abc import AsyncIterator
    from uuid import uuid4

    monkeypatch.setattr("app.api.deps.get_token_verifier", lambda: _DummyVerifier())

    agent_id = uuid4()
    behavior = {
        "rate_limit": {
            "max_messages": 1,
            "window_seconds": 60,
            "limit_message": "Merchant limit hit.",
        }
    }

    async def _fetch_behavior(*_: object, **__: object) -> dict[str, str]:
        return behavior

    async def _empty_stream(*_: object, **__: object) -> AsyncIterator[str]:
        if False:
            yield ""

    monkeypatch.setattr("app.api.routes.chat.fetch_agent_behavior_settings", _fetch_behavior)
    monkeypatch.setattr("app.api.routes.chat.stream_chat", _empty_stream)

    payload = {
        "agent_id": str(agent_id),
        "message": "hello",
        "visitor_id": "visitor-rate-test",
    }
    first = client.post("/api/chat/stream", headers=_auth_header(), json=payload)
    assert first.status_code == 200

    blocked = client.post("/api/chat/stream", headers=_auth_header(), json=payload)
    assert blocked.status_code == 429
    body = blocked.json()
    assert body["error"]["code"] == "rate_limit.exceeded"
    assert body["error"]["message"] == "Merchant limit hit."
    assert blocked.headers.get("Retry-After")


def test_public_chat_stream_enforces_agent_rate_limit(
    client: TestClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    from collections.abc import AsyncIterator
    from uuid import UUID, uuid4

    from app.domains.public_widget.schemas import PublicWidgetAgentContext

    agent_id = uuid4()
    user_id = UUID("00000000-0000-0000-0000-000000000123")
    behavior = {
        "rate_limit": {
            "max_messages": 1,
            "window_seconds": 60,
            "limit_message": "Widget limit hit.",
        }
    }
    ctx = PublicWidgetAgentContext(
        agent_id=agent_id,
        user_id=user_id,
        name="Bot",
        behavior_settings=behavior,
    )

    async def _resolve_agent(*_: object, **__: object) -> PublicWidgetAgentContext:
        return ctx

    async def _empty_stream(*_: object, **__: object) -> AsyncIterator[str]:
        if False:
            yield ""

    monkeypatch.setattr("app.api.routes.chat_public.resolve_agent_for_widget_key", _resolve_agent)
    monkeypatch.setattr("app.api.routes.chat_public.stream_chat", _empty_stream)

    headers = {"X-ChatRely-Agent-Key": "test-key"}
    payload = {
        "message": "hello",
        "visitor_id": "widget-visitor-rate",
    }
    first = client.post("/api/chat/public/stream", headers=headers, json=payload)
    assert first.status_code == 200

    blocked = client.post("/api/chat/public/stream", headers=headers, json=payload)
    assert blocked.status_code == 429
    body = blocked.json()
    assert body["error"]["code"] == "rate_limit.exceeded"
    assert body["error"]["message"] == "Widget limit hit."
