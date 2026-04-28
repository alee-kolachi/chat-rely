import json
import math
import re
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


def _normalize_text(value: str) -> str:
    value = re.sub(r"\s+", " ", value).strip()
    return value


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


async def _scrape_url(url: str) -> str:
    async with httpx.AsyncClient(timeout=30, follow_redirects=True) as client:
        response = await client.get(url)
        response.raise_for_status()
    soup = BeautifulSoup(response.text, "html.parser")
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
              knowledge_source_id, agent_id, user_id, status, triggered_by
            ) values (
              :knowledge_source_id, :agent_id, :user_id, 'queued', 'api'
            )
            returning
              id, knowledge_source_id, agent_id, user_id, status, attempt, triggered_by, error_message,
              started_at, finished_at, metrics, created_at, updated_at
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
            set status = 'running', started_at = now(), error_message = null
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


async def index_website_source(
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

    try:
        text_content = await _scrape_url(source.source_url)
        if not text_content:
            raise AppError(code="knowledge.scrape_empty", message="Website returned no readable text", status_code=422)

        chunks = _chunk_text(text_content)
        if not chunks:
            raise AppError(code="knowledge.chunking_empty", message="No chunks were produced from website text", status_code=422)

        embeddings = await _embed_texts(chunks)
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
                set status = 'succeeded', finished_at = now(),
                    metrics = jsonb_build_object('chunk_count', CAST(:chunk_count AS integer))
                where id = :job_id
                """
            ),
            {"job_id": str(job.id), "chunk_count": len(chunks)},
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
                set status = 'failed', finished_at = now(), error_message = :error_message
                where id = :job_id
                """
            ),
            {"job_id": str(job.id), "error_message": message[:1000]},
        )
        await db.commit()
        if isinstance(exc, AppError):
            raise
        raise AppError(code="knowledge.indexing_failed", message="Indexing job failed", status_code=500) from exc

    refreshed_source = await _load_source(db, source.id, user_id)
    latest_job = await get_latest_job(db, source.id, user_id)
    if latest_job is None:
        raise AppError(code="knowledge.job_not_found", message="Indexing job missing after completion", status_code=500)
    return refreshed_source, latest_job


async def get_jobs(db: AsyncSession, source_id: UUID, user_id: UUID) -> list[IndexJobDTO]:
    result = await db.execute(
        text(
            """
            select
              id, knowledge_source_id, agent_id, user_id, status, attempt, triggered_by, error_message,
              started_at, finished_at, metrics, created_at, updated_at
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
              started_at, finished_at, metrics, created_at, updated_at
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

