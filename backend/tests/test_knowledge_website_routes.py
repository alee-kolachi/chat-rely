from typing import Any
from uuid import UUID

import pytest
from fastapi.testclient import TestClient

from app.core.errors import AppError
from app.domains.knowledge.schemas import IndexJobDTO, KnowledgeSourceDTO, WebsiteUsageResponse


class _DummyVerifier:
    def verify_token(self, token: str) -> dict[str, str]:
        if token == "good-token":
            return {"sub": "00000000-0000-0000-0000-000000000123"}
        raise AppError(code="auth.unauthorized", message="bad token", status_code=401)


def _auth_header() -> dict[str, str]:
    return {"Authorization": "Bearer good-token"}


def _patch_auth(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr("app.api.deps.get_token_verifier", lambda: _DummyVerifier())


def test_website_crawl_route(client: TestClient, monkeypatch: pytest.MonkeyPatch) -> None:
    _patch_auth(monkeypatch)
    sid = UUID("00000000-0000-0000-0000-000000000001")
    jid = UUID("00000000-0000-0000-0000-000000000002")
    aid = UUID("00000000-0000-0000-0000-000000000888")

    async def _create(*_a: Any, **_k: Any) -> tuple[KnowledgeSourceDTO, IndexJobDTO]:
        src = KnowledgeSourceDTO.model_validate(
            {
                "id": sid,
                "agent_id": aid,
                "user_id": UUID("00000000-0000-0000-0000-000000000123"),
                "type": "website",
                "title": "example.com",
                "status": "indexing",
                "source_url": "https://example.com/",
                "storage_bucket": None,
                "storage_path": None,
                "metadata": {"origin": "dashboard_website", "website_mode": "crawl"},
                "error_message": None,
                "last_indexed_at": None,
                "created_at": "2026-01-01T00:00:00Z",
                "updated_at": "2026-01-01T00:00:00Z",
            }
        )
        job = IndexJobDTO.model_validate(
            {
                "id": jid,
                "knowledge_source_id": sid,
                "agent_id": aid,
                "user_id": UUID("00000000-0000-0000-0000-000000000123"),
                "status": "queued",
                "attempt": 1,
                "triggered_by": "api",
                "error_message": None,
                "started_at": None,
                "finished_at": None,
                "phase": "queued",
                "pages_total": 0,
                "pages_processed": 0,
                "chunks_total": 0,
                "chunks_embedded": 0,
                "progress_pct": 0,
                "metrics": {},
                "created_at": "2026-01-01T00:00:00Z",
                "updated_at": "2026-01-01T00:00:00Z",
            }
        )
        return src, job

    monkeypatch.setattr("app.api.routes.knowledge_website.create_and_enqueue_dashboard_website", _create)

    res = client.post(
        "/api/v1/knowledge/website/crawl",
        headers=_auth_header(),
        json={
            "agent_id": str(aid),
            "protocol": "https://",
            "url_input": "example.com",
            "include_rules": [{"operator": "ends_with", "pattern": ".pdf"}],
            "exclude_rules": [],
        },
    )
    assert res.status_code == 200
    body = res.json()
    assert body["source"]["id"] == str(sid)
    assert body["job"]["status"] == "queued"


def test_website_crawl_route_duplicate_skips_job(client: TestClient, monkeypatch: pytest.MonkeyPatch) -> None:
    _patch_auth(monkeypatch)
    sid = UUID("00000000-0000-0000-0000-000000000001")
    aid = UUID("00000000-0000-0000-0000-000000000888")

    async def _create(*_a: Any, **_k: Any) -> tuple[KnowledgeSourceDTO, IndexJobDTO | None]:
        src = KnowledgeSourceDTO.model_validate(
            {
                "id": sid,
                "agent_id": aid,
                "user_id": UUID("00000000-0000-0000-0000-000000000123"),
                "type": "website",
                "title": "example.com",
                "status": "skipped_duplicate",
                "source_url": "https://example.com/",
                "storage_bucket": None,
                "storage_path": None,
                "metadata": {"origin": "dashboard_website", "duplicate_reason": "same_root_url"},
                "error_message": None,
                "last_indexed_at": None,
                "created_at": "2026-01-01T00:00:00Z",
                "updated_at": "2026-01-01T00:00:00Z",
            }
        )
        return src, None

    monkeypatch.setattr("app.api.routes.knowledge_website.create_and_enqueue_dashboard_website", _create)

    res = client.post(
        "/api/v1/knowledge/website/crawl",
        headers=_auth_header(),
        json={"agent_id": str(aid), "protocol": "https://", "url_input": "example.com", "include_rules": [], "exclude_rules": []},
    )
    assert res.status_code == 200
    body = res.json()
    assert body["source"]["status"] == "skipped_duplicate"
    assert body["job"] is None


def test_website_source_pages_route(client: TestClient, monkeypatch: pytest.MonkeyPatch) -> None:
    _patch_auth(monkeypatch)
    sid = UUID("00000000-0000-0000-0000-000000000099")

    async def _pages(*_a: Any, **_k: Any) -> tuple[list[dict[str, object]], int]:
        return (
            [
                {
                    "id": UUID("00000000-0000-0000-0000-000000000111"),
                    "url": "https://example.com/a",
                    "status": "parsed",
                    "depth": 0,
                    "last_indexed_at": None,
                    "http_status": 200,
                }
            ],
            3,
        )

    monkeypatch.setattr("app.api.routes.knowledge_website.list_website_source_pages", _pages)

    res = client.get(f"/api/v1/knowledge/website/sources/{sid}/pages?offset=0&limit=10", headers=_auth_header())
    assert res.status_code == 200
    body = res.json()
    assert body["total"] == 3
    assert len(body["pages"]) == 1
    assert body["pages"][0]["url"] == "https://example.com/a"


def test_website_source_delete_route(client: TestClient, monkeypatch: pytest.MonkeyPatch) -> None:
    _patch_auth(monkeypatch)
    sid = UUID("00000000-0000-0000-0000-000000000099")
    called: dict[str, bool] = {}

    async def _del(*_a: Any, **_k: Any) -> None:
        called["ok"] = True

    monkeypatch.setattr("app.api.routes.knowledge_website.delete_website_source", _del)

    res = client.delete(f"/api/v1/knowledge/website/sources/{sid}", headers=_auth_header())
    assert res.status_code == 204
    assert res.content == b""
    assert called.get("ok") is True


def test_website_source_retrain_route(client: TestClient, monkeypatch: pytest.MonkeyPatch) -> None:
    _patch_auth(monkeypatch)
    sid = UUID("00000000-0000-0000-0000-000000000099")
    jid = UUID("00000000-0000-0000-0000-000000000100")
    aid = UUID("00000000-0000-0000-0000-000000000888")

    async def _retrain(*_a: Any, **_k: Any) -> tuple[KnowledgeSourceDTO, IndexJobDTO]:
        src = KnowledgeSourceDTO.model_validate(
            {
                "id": sid,
                "agent_id": aid,
                "user_id": UUID("00000000-0000-0000-0000-000000000123"),
                "type": "website",
                "title": "example.com",
                "status": "indexing",
                "source_url": "https://example.com/",
                "storage_bucket": None,
                "storage_path": None,
                "metadata": {"origin": "dashboard_website", "website_mode": "crawl"},
                "error_message": None,
                "last_indexed_at": None,
                "created_at": "2026-01-01T00:00:00Z",
                "updated_at": "2026-01-01T00:00:00Z",
            }
        )
        job = IndexJobDTO.model_validate(
            {
                "id": jid,
                "knowledge_source_id": sid,
                "agent_id": aid,
                "user_id": UUID("00000000-0000-0000-0000-000000000123"),
                "status": "queued",
                "attempt": 1,
                "triggered_by": "api",
                "error_message": None,
                "started_at": None,
                "finished_at": None,
                "phase": "queued",
                "pages_total": 0,
                "pages_processed": 0,
                "chunks_total": 0,
                "chunks_embedded": 0,
                "progress_pct": 0,
                "metrics": {},
                "created_at": "2026-01-01T00:00:00Z",
                "updated_at": "2026-01-01T00:00:00Z",
            }
        )
        return src, job

    monkeypatch.setattr("app.api.routes.knowledge_website.enqueue_index_website_source_queued", _retrain)
    res = client.post(f"/api/v1/knowledge/website/sources/{sid}/retrain", headers=_auth_header())
    assert res.status_code == 200
    body = res.json()
    assert body["source"]["id"] == str(sid)
    assert body["job"]["id"] == str(jid)


def test_website_usage_route(client: TestClient, monkeypatch: pytest.MonkeyPatch) -> None:
    _patch_auth(monkeypatch)
    aid = UUID("00000000-0000-0000-0000-000000000888")

    async def _usage(*_a: Any, **_k: Any) -> WebsiteUsageResponse:
        return WebsiteUsageResponse(
            plan_slug="free",
            plan_name="Free",
            included_storage_bytes=409_600,
            used_storage_bytes=500_000,
            total_links=12,
            show_upgrade=True,
            website_crawl_budget_bytes=512_000,
            website_crawl_last_job_bytes=182_000,
        )

    monkeypatch.setattr("app.api.routes.knowledge_website.get_agent_website_usage", _usage)

    res = client.get(f"/api/v1/knowledge/website/usage?agent_id={aid}", headers=_auth_header())
    assert res.status_code == 200
    data = res.json()
    assert data["plan_slug"] == "free"
    assert data["show_upgrade"] is True
    assert data["total_links"] == 12
    assert data["website_crawl_budget_bytes"] == 512_000
    assert data["website_crawl_last_job_bytes"] == 182_000


def test_url_filter_helpers() -> None:
    from app.domains.knowledge.service import _url_passes_filters

    inc = [{"operator": "ends_with", "pattern": ".pdf"}]
    assert _url_passes_filters("https://x.com/a.pdf", inc, []) is True
    assert _url_passes_filters("https://x.com/a.html", inc, []) is False

    exc = [{"operator": "contains", "pattern": "/admin"}]
    assert _url_passes_filters("https://x.com/blog", [], exc) is True
    assert _url_passes_filters("https://x.com/admin/login", [], exc) is False

    # Case-insensitive path contains (path segment uses ``And`` not ``and``).
    exc2 = [{"operator": "contains", "pattern": "and"}]
    assert _url_passes_filters("https://x.com/InternationalAndDomesticTariffs", [], exc2) is False

    exc3 = [{"operator": "wildcard", "pattern": "*Foo*"}]
    assert _url_passes_filters("https://x.com/barfoo/baz", [], exc3) is False


def test_website_crawl_budget_bytes_from_plan_features() -> None:
    from app.domains.knowledge.service import _website_crawl_budget_bytes

    assert _website_crawl_budget_bytes("free", {}) == 500 * 1024
    assert _website_crawl_budget_bytes("pro", {}) == 10240 * 1024
    assert _website_crawl_budget_bytes("free", {"max_website_crawl_kb": 100}) == 100 * 1024


def test_job_crawl_limit_exceeded_flag() -> None:
    from app.domains.knowledge.service import _job_crawl_limit_exceeded

    m = {"crawl_stopped_reason": "budget"}
    assert _job_crawl_limit_exceeded("succeeded", m, 2000, 33) is True
    assert _job_crawl_limit_exceeded("succeeded", m, 33, 33) is False
    assert _job_crawl_limit_exceeded("running", m, 2000, 10) is False
    assert _job_crawl_limit_exceeded("succeeded", {"crawl_stopped_reason": "complete"}, 2000, 33) is False


def test_job_crawl_limit_exceeded_uses_storage_guardrail() -> None:
    from app.domains.knowledge.service import _job_crawl_limit_exceeded

    m = {"crawl_stopped_reason": "budget", "indexed_source_bytes": 40_000}
    assert _job_crawl_limit_exceeded("succeeded", m, 2000, 300, storage_cap_bytes=500_000) is False


def test_url_duplicate_key_normalizes() -> None:
    from app.domains.knowledge.service import _url_duplicate_key

    assert _url_duplicate_key("HTTPS://Example.COM/Foo/") == "https://example.com/foo"


def test_sitemap_seed_urls_site_root_adds_default_sitemap() -> None:
    from app.domains.knowledge.service import _sitemap_seed_urls

    assert _sitemap_seed_urls("https://shop.example/") == [
        "https://shop.example/",
        "https://shop.example/sitemap.xml",
    ]


def test_sitemap_seed_urls_explicit_sitemap_only_one_seed() -> None:
    from app.domains.knowledge.service import _sitemap_seed_urls

    assert _sitemap_seed_urls("https://shop.example/sitemap.xml") == ["https://shop.example/sitemap.xml"]


def test_sitemap_seed_urls_non_root_path_no_extra() -> None:
    from app.domains.knowledge.service import _sitemap_seed_urls

    assert _sitemap_seed_urls("https://shop.example/blog/") == ["https://shop.example/blog/"]


@pytest.mark.asyncio
async def test_embed_texts_batches_large_chunk_list(monkeypatch: pytest.MonkeyPatch) -> None:
    """OpenAI rejects >~300k tokens per embeddings call; ensure we split into multiple requests."""
    from app.domains import knowledge

    svc = knowledge.service
    batch_input_lens: list[int] = []

    class _Settings:
        openai_api_key = "test-key"
        openai_embedding_model = "text-embedding-3-small"

    class _FakeResponse:
        def __init__(self, n: int) -> None:
            self.status_code = 200
            self._n = n

        def json(self) -> dict:
            return {"data": [{"embedding": [0.0] * svc.EMBEDDING_DIMENSION} for _ in range(self._n)]}

    class _FakeClient:
        async def __aenter__(self) -> "_FakeClient":
            return self

        async def __aexit__(self, *_a: object) -> None:
            return None

        async def post(self, *_a: object, json: dict | None = None, **_k: object) -> _FakeResponse:
            assert json is not None
            inp = json["input"]
            batch_input_lens.append(len(inp))
            return _FakeResponse(len(inp))

    monkeypatch.setattr(svc, "get_settings", lambda: _Settings())
    monkeypatch.setattr(svc.httpx, "AsyncClient", lambda *a, **k: _FakeClient())

    chunk = "word " * 200  # ~1000 chars → several hundred estimated tokens each
    chunks = [f"{chunk}{i}" for i in range(900)]
    out = await svc._embed_texts(chunks)
    assert len(out) == len(chunks)
    assert len(batch_input_lens) > 1
    assert all(n <= svc._EMBED_BATCH_MAX_INPUTS for n in batch_input_lens)
