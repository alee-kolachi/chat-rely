import json
import math
import re
from collections import deque
from urllib.parse import urljoin, urlparse
from uuid import UUID

import httpx
from bs4 import BeautifulSoup
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import AppError
from app.core.settings import get_settings
from app.domains.knowledge.schemas import (
    IndexJobDTO,
    KnowledgeSourceCreateRequest,
    KnowledgeSourceDTO,
)

EMBEDDING_DIMENSION = 1536
MAX_ONBOARDING_PAGES = 5


def _normalize_text(value: str) -> str:
    return re.sub(r"\s+", " ", value).strip()


def _chunk_text(text_value: str, chunk_size: int = 1200, overlap: int = 200) -> list[str]:
    if not text_value:
        return []
    chunks: list[str] = []
    start = 0
    while start < len(text_value):
        end = min(start + chunk_size, len(text_value))
        chunk = text_value[start:end].strip()
        if chunk:
            chunks.append(chunk)
        if end >= len(text_value):
            break
        start = max(0, end - overlap)
    return chunks


def _token_estimate(chunk: str) -> int:
    return max(1, math.ceil(len(chunk.split()) * 1.3))


def _extract_links(base_url: str, html: str) -> list[str]:
    base = urlparse(base_url)
    soup = BeautifulSoup(html, "html.parser")
    links: list[str] = []
    for anchor in soup.find_all("a", href=True):
        href = str(anchor["href"]).strip()
        if not href or href.startswith("#") or href.startswith("mailto:") or href.startswith("tel:"):
            continue
        absolute = urljoin(base_url, href)
        parsed = urlparse(absolute)
        if parsed.scheme not in {"http", "https"}:
            continue
        if parsed.netloc != base.netloc:
            continue
        normalized = f"{parsed.scheme}://{parsed.netloc}{parsed.path or '/'}"
        links.append(normalized)
    return links


def _extract_page_text(html: str) -> str:
    soup = BeautifulSoup(html, "html.parser")
    for element in soup(["script", "style", "noscript"]):
        element.decompose()
    return _normalize_text(soup.get_text(" "))


async def _embed_texts(chunks: list[str]) -> list[list[float]]:
    settings = get_settings()
    if not settings.openai_api_key:
        raise AppError(
            code="knowledge.embedding_not_configured",
            message="OPENAI_API_KEY is required for indexing embeddings",
            status_code=500,
        )

    async with httpx.AsyncClient(timeout=60) as client:
        response = await client.post(
            "https://api.openai.com/v1/embeddings",
            headers={"Authorization": f"Bearer {settings.openai_api_key}"},
            json={"model": settings.openai_embedding_model, "input": chunks},
        )
        if response.status_code >= 400:
            raise AppError(
                code="knowledge.embedding_failed",
                message="Embedding API request failed",
                status_code=502,
                details={"status_code": response.status_code, "body": response.text[:500]},
            )

    payload = response.json()
    vectors = [item["embedding"] for item in payload.get("data", [])]
    if len(vectors) != len(chunks):
        raise AppError(code="knowledge.embedding_failed", message="Embedding response length mismatch", status_code=502)
    return vectors


def _vector_literal(values: list[float]) -> str:
    return "[" + ",".join(f"{x:.10f}" for x in values) + "]"


def _validate_source_payload(payload: KnowledgeSourceCreateRequest) -> None:
    if payload.type == "website" and not payload.source_url:
        raise AppError(code="validation.invalid_input", message="source_url is required for website type", status_code=422)
    if payload.type == "file" and (not payload.storage_bucket or not payload.storage_path):
        raise AppError(
            code="validation.invalid_input",
            message="storage_bucket and storage_path are required for file type",
            status_code=422,
        )


async def create_source(db: AsyncSession, user_id: UUID, payload: KnowledgeSourceCreateRequest) -> KnowledgeSourceDTO:
    _validate_source_payload(payload)

    result = await db.execute(
        text(
            """
            insert into public.knowledge_sources (
              agent_id, user_id, type, title, source_url, storage_bucket, storage_path, metadata
            ) values (
              :agent_id, :user_id, :type, :title, :source_url, :storage_bucket, :storage_path, CAST(:metadata AS jsonb)
            )
            returning
              id, agent_id, user_id, type, title, status, source_url, storage_bucket, storage_path,
              metadata, error_message, last_indexed_at, created_at, updated_at
            """
        ),
        {
            "agent_id": str(payload.agent_id),
            "user_id": str(user_id),
            "type": payload.type,
            "title": payload.title,
            "source_url": payload.source_url,
            "storage_bucket": payload.storage_bucket,
            "storage_path": payload.storage_path,
            "metadata": json.dumps(payload.metadata or {}),
        },
    )
    await db.commit()
    return KnowledgeSourceDTO.model_validate(result.mappings().one())


async def list_sources(db: AsyncSession, user_id: UUID, agent_id: UUID | None = None) -> list[KnowledgeSourceDTO]:
    sql = """
        select
          id, agent_id, user_id, type, title, status, source_url, storage_bucket, storage_path,
          metadata, error_message, last_indexed_at, created_at, updated_at
        from public.knowledge_sources
        where user_id = :user_id
    """
    params: dict[str, object] = {"user_id": str(user_id)}
    if agent_id:
        sql += " and agent_id = :agent_id"
        params["agent_id"] = str(agent_id)
    sql += " order by created_at desc"
    result = await db.execute(text(sql), params)
    return [KnowledgeSourceDTO.model_validate(row) for row in result.mappings().all()]


async def _create_job(db: AsyncSession, source: KnowledgeSourceDTO, user_id: UUID) -> IndexJobDTO:
    result = await db.execute(
        text(
            """
            insert into public.indexing_jobs (
              knowledge_source_id, agent_id, user_id, status, triggered_by, phase, progress_pct
            ) values (
              :knowledge_source_id, :agent_id, :user_id, 'queued', 'api', 'queued', 0
            )
            returning
              id, knowledge_source_id, agent_id, user_id, status, attempt, triggered_by, error_message,
              started_at, finished_at, phase, pages_total, pages_processed, chunks_total, chunks_embedded, progress_pct, metrics, created_at, updated_at
            """
        ),
        {
            "knowledge_source_id": str(source.id),
            "agent_id": str(source.agent_id),
            "user_id": str(user_id),
        },
    )
    return IndexJobDTO.model_validate(result.mappings().one())


async def _set_job_running(db: AsyncSession, job_id: UUID) -> None:
    await db.execute(
        text(
            """
            update public.indexing_jobs
            set status = 'running', phase = 'crawling', started_at = now(), error_message = null, progress_pct = 5
            where id = :job_id
            """
        ),
        {"job_id": str(job_id)},
    )


async def _load_source(db: AsyncSession, source_id: UUID, user_id: UUID) -> KnowledgeSourceDTO:
    result = await db.execute(
        text(
            """
            select
              id, agent_id, user_id, type, title, status, source_url, storage_bucket, storage_path,
              metadata, error_message, last_indexed_at, created_at, updated_at
            from public.knowledge_sources
            where id = :source_id and user_id = :user_id
            """
        ),
        {"source_id": str(source_id), "user_id": str(user_id)},
    )
    row = result.mappings().first()
    if row is None:
        raise AppError(code="knowledge.source_not_found", message="Knowledge source not found", status_code=404)
    return KnowledgeSourceDTO.model_validate(row)


async def enqueue_index_website_source(
    db: AsyncSession, source_id: UUID, user_id: UUID
) -> tuple[KnowledgeSourceDTO, IndexJobDTO]:
    source = await _load_source(db, source_id, user_id)
    if source.type != "website":
        raise AppError(code="validation.invalid_input", message="Only website sources are indexable in this step", status_code=422)
    if not source.source_url:
        raise AppError(code="validation.invalid_input", message="Website source URL is missing", status_code=422)

    job = await _create_job(db, source, user_id)
    await _set_job_running(db, job.id)
    await db.execute(
        text(
            """
            update public.knowledge_sources
            set status = 'indexing', error_message = null
            where id = :source_id
            """
        ),
        {"source_id": str(source.id)},
    )
    await db.commit()
    return source, job


async def _create_crawl_run(db: AsyncSession, source: KnowledgeSourceDTO, user_id: UUID) -> UUID:
    result = await db.execute(
        text(
            """
            insert into public.knowledge_crawl_runs (knowledge_source_id, agent_id, user_id, status, started_at, settings)
            values (:source_id, :agent_id, :user_id, 'running', now(), cast(:settings as jsonb))
            returning id
            """
        ),
        {
            "source_id": str(source.id),
            "agent_id": str(source.agent_id),
            "user_id": str(user_id),
            "settings": json.dumps({"max_pages": MAX_ONBOARDING_PAGES}),
        },
    )
    return UUID(str(result.mappings().one()["id"]))


async def _crawl_pages(seed_url: str) -> tuple[list[dict[str, object]], int]:
    parsed_seed = urlparse(seed_url)
    seed_normalized = f"{parsed_seed.scheme}://{parsed_seed.netloc}{parsed_seed.path or '/'}"
    queue: deque[tuple[str, int]] = deque([(seed_normalized, 0)])
    seen: set[str] = set()
    pages: list[dict[str, object]] = []
    links_discovered = 0

    async with httpx.AsyncClient(timeout=20, follow_redirects=True) as client:
        while queue and len(pages) < MAX_ONBOARDING_PAGES:
            url, depth = queue.popleft()
            if url in seen:
                continue
            seen.add(url)
            try:
                response = await client.get(url)
                status_code = int(response.status_code)
                response.raise_for_status()
                html = response.text
                page_text = _extract_page_text(html)
                links = _extract_links(url, html)
                links_discovered += len(links)
                for link in links:
                    if link not in seen and len(pages) + len(queue) < MAX_ONBOARDING_PAGES * 4:
                        queue.append((link, depth + 1))
                pages.append({"url": url, "depth": depth, "http_status": status_code, "text": page_text})
            except Exception:
                pages.append({"url": url, "depth": depth, "http_status": None, "text": ""})
    return pages[:MAX_ONBOARDING_PAGES], links_discovered


async def process_indexing_job(db: AsyncSession, job_id: UUID, user_id: UUID) -> None:
    result = await db.execute(
        text(
            """
            select
              j.id as job_id,
              s.id, s.agent_id, s.user_id, s.type, s.title, s.status, s.source_url, s.storage_bucket, s.storage_path,
              s.metadata, s.error_message, s.last_indexed_at, s.created_at, s.updated_at
            from public.indexing_jobs j
            join public.knowledge_sources s on s.id = j.knowledge_source_id
            where j.id = :job_id and j.user_id = :user_id
            """
        ),
        {"job_id": str(job_id), "user_id": str(user_id)},
    )
    row = result.mappings().first()
    if row is None:
        raise AppError(code="knowledge.job_not_found", message="Indexing job not found", status_code=404)
    source = KnowledgeSourceDTO.model_validate(row)
    if source.type != "website" or not source.source_url:
        raise AppError(code="validation.invalid_input", message="Only website sources are supported", status_code=422)

    await _set_job_running(db, job_id)
    crawl_run_id = await _create_crawl_run(db, source, user_id)
    await db.commit()

    try:
        pages, links_discovered = await _crawl_pages(source.source_url)
        usable_pages = [p for p in pages if str(p["text"]).strip()]
        if not usable_pages:
            raise AppError(code="knowledge.scrape_empty", message="Website returned no readable text", status_code=422)

        await db.execute(
            text(
                """
                update public.indexing_jobs
                set pages_total = :pages_total, pages_processed = :pages_processed, progress_pct = 25
                where id = :job_id
                """
            ),
            {"job_id": str(job_id), "pages_total": len(pages), "pages_processed": len(usable_pages)},
        )

        for page in pages:
            await db.execute(
                text(
                    """
                    insert into public.knowledge_source_pages (
                      knowledge_source_id, crawl_run_id, user_id, url, depth, status, http_status, last_crawled_at
                    ) values (
                      :source_id, :crawl_run_id, :user_id, :url, :depth, :status, :http_status, now()
                    )
                    on conflict (knowledge_source_id, url)
                    do update set
                      crawl_run_id = excluded.crawl_run_id,
                      depth = excluded.depth,
                      status = excluded.status,
                      http_status = excluded.http_status,
                      last_crawled_at = now()
                    """
                ),
                {
                    "source_id": str(source.id),
                    "crawl_run_id": str(crawl_run_id),
                    "user_id": str(user_id),
                    "url": str(page["url"]),
                    "depth": int(page["depth"]),
                    "status": "parsed" if str(page["text"]).strip() else "failed",
                    "http_status": page["http_status"],
                },
            )

        text_content = "\n\n".join(str(page["text"]) for page in usable_pages)
        chunks = _chunk_text(text_content)
        if not chunks:
            raise AppError(code="knowledge.chunking_empty", message="No chunks were produced from website text", status_code=422)

        await db.execute(
            text(
                """
                update public.indexing_jobs
                set phase = 'chunking', chunks_total = :chunks_total, progress_pct = 45
                where id = :job_id
                """
            ),
            {"job_id": str(job_id), "chunks_total": len(chunks)},
        )

        embeddings = await _embed_texts(chunks)
        await db.execute(
            text(
                """
                update public.indexing_jobs
                set phase = 'embedding', chunks_embedded = :chunks_embedded, progress_pct = 75
                where id = :job_id
                """
            ),
            {"job_id": str(job_id), "chunks_embedded": len(embeddings)},
        )
        await db.execute(
            text("delete from public.knowledge_chunks where knowledge_source_id = :source_id"),
            {"source_id": str(source.id)},
        )

        for idx, (chunk, embedding) in enumerate(zip(chunks, embeddings, strict=True)):
            if len(embedding) != EMBEDDING_DIMENSION:
                raise AppError(
                    code="knowledge.embedding_dimension_mismatch",
                    message="Embedding dimension does not match vector column",
                    status_code=500,
                    details={"expected": EMBEDDING_DIMENSION, "actual": len(embedding)},
                )
            await db.execute(
                text(
                    """
                    insert into public.knowledge_chunks (
                      agent_id, user_id, knowledge_source_id, chunk_index, content, embedding, token_count, metadata
                    ) values (
                      :agent_id, :user_id, :knowledge_source_id, :chunk_index, :content, CAST(:embedding AS vector), :token_count, CAST(:metadata AS jsonb)
                    )
                    """
                ),
                {
                    "agent_id": str(source.agent_id),
                    "user_id": str(user_id),
                    "knowledge_source_id": str(source.id),
                    "chunk_index": idx,
                    "content": chunk,
                    "embedding": _vector_literal(embedding),
                    "token_count": _token_estimate(chunk),
                    "metadata": json.dumps({"source_url": source.source_url, "chunk_index": idx}),
                },
            )

        await db.execute(
            text(
                """
                update public.knowledge_sources
                set status = 'ready', last_indexed_at = now(), error_message = null
                where id = :source_id
                """
            ),
            {"source_id": str(source.id)},
        )
        await db.execute(
            text(
                """
                update public.indexing_jobs
                set status = 'succeeded', phase = 'complete', progress_pct = 100, finished_at = now(),
                    metrics = jsonb_build_object('chunk_count', CAST(:chunk_count AS integer))
                where id = :job_id
                """
            ),
            {"job_id": str(job_id), "chunk_count": len(chunks)},
        )
        await db.execute(
            text(
                """
                update public.knowledge_crawl_runs
                set status = 'succeeded',
                    pages_discovered = :pages_discovered,
                    pages_crawled = :pages_crawled,
                    pages_failed = :pages_failed,
                    links_discovered = :links_discovered,
                    finished_at = now()
                where id = :crawl_run_id
                """
            ),
            {
                "crawl_run_id": str(crawl_run_id),
                "pages_discovered": len(pages),
                "pages_crawled": len(usable_pages),
                "pages_failed": len(pages) - len(usable_pages),
                "links_discovered": links_discovered,
            },
        )
        await db.commit()
    except Exception as exc:
        message = exc.message if isinstance(exc, AppError) else str(exc)
        await db.rollback()
        await db.execute(
            text(
                """
                update public.knowledge_sources
                set status = 'failed', error_message = :error_message
                where id = :source_id
                """
            ),
            {"source_id": str(source.id), "error_message": message[:1000]},
        )
        await db.execute(
            text(
                """
                update public.indexing_jobs
                set status = 'failed', phase = 'failed', finished_at = now(), error_message = :error_message
                where id = :job_id
                """
            ),
            {"job_id": str(job_id), "error_message": message[:1000]},
        )
        await db.execute(
            text(
                """
                update public.knowledge_crawl_runs
                set status = 'failed', error_message = :error_message, finished_at = now()
                where id = :crawl_run_id
                """
            ),
            {"crawl_run_id": str(crawl_run_id), "error_message": message[:1000]},
        )
        await db.commit()
        if isinstance(exc, AppError):
            raise
        raise AppError(code="knowledge.indexing_failed", message="Indexing job failed", status_code=500) from exc


async def index_website_source(
    db: AsyncSession, source_id: UUID, user_id: UUID
) -> tuple[KnowledgeSourceDTO, IndexJobDTO]:
    # Backward-compatible route behavior: queue now, worker executes later.
    return await enqueue_index_website_source(db, source_id, user_id)


async def get_jobs(db: AsyncSession, source_id: UUID, user_id: UUID) -> list[IndexJobDTO]:
    result = await db.execute(
        text(
            """
            select
              id, knowledge_source_id, agent_id, user_id, status, attempt, triggered_by, error_message,
              started_at, finished_at, phase, pages_total, pages_processed, chunks_total, chunks_embedded, progress_pct, metrics, created_at, updated_at
            from public.indexing_jobs
            where knowledge_source_id = :source_id and user_id = :user_id
            order by created_at desc
            """
        ),
        {"source_id": str(source_id), "user_id": str(user_id)},
    )
    return [IndexJobDTO.model_validate(row) for row in result.mappings().all()]


async def get_latest_job(db: AsyncSession, source_id: UUID, user_id: UUID) -> IndexJobDTO | None:
    result = await db.execute(
        text(
            """
            select
              id, knowledge_source_id, agent_id, user_id, status, attempt, triggered_by, error_message,
              started_at, finished_at, phase, pages_total, pages_processed, chunks_total, chunks_embedded, progress_pct, metrics, created_at, updated_at
            from public.indexing_jobs
            where knowledge_source_id = :source_id and user_id = :user_id
            order by created_at desc
            limit 1
            """
        ),
        {"source_id": str(source_id), "user_id": str(user_id)},
    )
    row = result.mappings().first()
    return IndexJobDTO.model_validate(row) if row else None

