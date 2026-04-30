import fnmatch
import json
import math
import re
import traceback
import xml.etree.ElementTree as ET
from collections import deque
from collections.abc import Awaitable, Callable
from typing import Any
from urllib.parse import urljoin, urlparse
from uuid import UUID

import httpx
import structlog
from bs4 import BeautifulSoup
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession


def _parse_html(html: str) -> BeautifulSoup:
    """
    Prefer lxml over ``html.parser``: many production sites (WordPress, legacy CMS)
    ship broken conditional comments or tags that confuse the stdlib parser into an
    empty or truncated DOM, so link discovery and ``get_text`` silently see nothing.
    """
    return BeautifulSoup(html, "lxml")

from app.core.errors import AppError
from app.core.settings import get_settings
from app.domains.knowledge.schemas import (
    IndexJobDTO,
    KnowledgeSourceCreateRequest,
    KnowledgeSourceDTO,
    WebsiteIndividualRequest,
    WebsiteIngestBase,
    WebsiteMode,
    WebsitePathRule,
    WebsiteSourceListItemDTO,
    WebsiteUsageResponse,
)

EMBEDDING_DIMENSION = 1536
MAX_ONBOARDING_PAGES = 5
# Hard cap on how many distinct page URLs one crawl job may visit (safety rail; byte budget is primary for dashboard).
MAX_CRAWL_PAGES_SAFETY_CEILING = 2000
MAX_DASHBOARD_WEBSITE_PAGES = MAX_CRAWL_PAGES_SAFETY_CEILING
# Per-crawl HTTP body budget from plan features (`max_website_crawl_kb`); defaults when missing.
DEFAULT_WEBSITE_CRAWL_KB_FREE = 500
DEFAULT_WEBSITE_CRAWL_KB_PAID = 10240
# Only this many bytes of each response count toward the crawl budget (and are parsed for text/links).
_CRAWL_BODY_CHARGE_CAP_BYTES = 400_000
DEFAULT_KNOWLEDGE_STORAGE_CAP_BYTES = 100 * 1024 * 1024
# OpenAI embeddings cap is ~300k tokens per request; batch to stay under with headroom.
_EMBED_BATCH_MAX_TOKENS_EST = 250_000
_EMBED_BATCH_MAX_INPUTS = 2048

log = structlog.get_logger("knowledge.service")


def _charge_bytes_and_html_from_response(response: httpx.Response) -> tuple[int, str]:
    """Cap per-URL bytes toward the crawl budget so one huge HTML page cannot end the whole job."""
    raw = response.content or b""
    n = len(raw)
    cap = _CRAWL_BODY_CHARGE_CAP_BYTES
    charged = min(n, cap)
    chunk = raw if n <= cap else raw[:cap]
    enc = response.encoding or "utf-8"
    try:
        html = chunk.decode(enc, errors="replace")
    except (LookupError, UnicodeDecodeError):
        html = chunk.decode("utf-8", errors="replace")
    return charged, html


# Dashboard crawl: show URL count quickly (sitemap), then fetch HTML in small batches with DB commits.
DASHBOARD_CRAWL_CONTENT_BATCH = 8
DASHBOARD_CRAWL_PROGRESS_EVERY = 3

# Many sites return a minimal shell or challenge to non-browser clients; match typical browser fetch.
_WEBSITE_CRAWL_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/122.0.0.0 Safari/537.36 ChatRelyIndexer/1.0"
    ),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
}


def _normalize_text(value: str) -> str:
    return re.sub(r"\s+", " ", value).strip()


def _local_xml_tag(tag: str) -> str:
    return tag.split("}", 1)[-1] if "}" in tag else tag


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


def _approx_embed_request_tokens(chunk: str) -> int:
    """Rough lower bound for OpenAI token accounting (~4 chars/token for English)."""
    return max(1, math.ceil(len(chunk) / 3))


def _normalize_url_string(url: str) -> str:
    parsed = urlparse(url.strip())
    if parsed.scheme not in {"http", "https"} or not parsed.netloc:
        raise AppError(code="validation.invalid_input", message="Invalid URL", status_code=422)
    return f"{parsed.scheme}://{parsed.netloc}{parsed.path or '/'}"


def normalize_dashboard_website_url(protocol: str, url_input: str) -> str:
    raw = url_input.strip()
    if raw.lower().startswith("http://") or raw.lower().startswith("https://"):
        return _normalize_url_string(raw)
    path = raw.lstrip("/")
    combined = f"{protocol}{path}"
    return _normalize_url_string(combined)


def _url_path_for_rules(url: str) -> str:
    parsed = urlparse(url)
    return parsed.path or "/"


def _rule_matches(operator: str, pattern: str, path_value: str) -> bool:
    """Path rules are matched case-insensitively (URLs often differ only by ``And`` vs ``and``)."""
    pv = path_value.casefold()
    pat = pattern.casefold()
    if operator == "starts_with":
        return pv.startswith(pat)
    if operator == "ends_with":
        return pv.endswith(pat)
    if operator == "contains":
        return pat in pv
    if operator == "exact_match":
        return pv == pat
    if operator == "wildcard":
        return fnmatch.fnmatch(pv, pat)
    return False


def _url_passes_filters(url: str, include_rules: list[dict[str, str]], exclude_rules: list[dict[str, str]]) -> bool:
    path_value = _url_path_for_rules(url)
    for ex in exclude_rules:
        op, pat = ex.get("operator", ""), ex.get("pattern", "")
        if pat and _rule_matches(op, pat, path_value):
            return False
    if not include_rules:
        return True
    for inc in include_rules:
        op, pat = inc.get("operator", ""), inc.get("pattern", "")
        if pat and _rule_matches(op, pat, path_value):
            return True
    return False


def _extract_links(base_url: str, html: str) -> list[str]:
    base = urlparse(base_url)
    soup = _parse_html(html)
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


def _head_meta_text_fragments(soup: BeautifulSoup) -> list[str]:
    """
    Visible text from ``get_text`` omits ``<meta content=\"...\">`` and similar —
    only text nodes are included. SPAs (e.g. Next.js) often ship real copy in
    meta description / Open Graph while the body is a loading shell; collect those.
    """
    fragments: list[str] = []
    title = soup.find("title")
    if title:
        t = _normalize_text(title.get_text(" "))
        if t:
            fragments.append(t)
    for meta in soup.find_all("meta"):
        content = meta.get("content")
        if not content or not str(content).strip():
            continue
        name = str(meta.get("name") or "").lower()
        prop = str(meta.get("property") or "").lower()
        if name in ("description", "twitter:title", "twitter:description") or prop in (
            "og:title",
            "og:description",
        ):
            fragments.append(_normalize_text(str(content)))
    return fragments


def _dedupe_preserve_order_snippets(snippets: list[str]) -> list[str]:
    seen: set[str] = set()
    out: list[str] = []
    for s in snippets:
        n = _normalize_text(s)
        if len(n) < 2:
            continue
        key = n.casefold()
        if key in seen:
            continue
        seen.add(key)
        out.append(n)
    return out


def _extract_page_text(html: str) -> str:
    soup = _parse_html(html)
    head_frags = _head_meta_text_fragments(soup)
    for element in soup(["script", "style", "noscript"]):
        element.decompose()
    body_text = _normalize_text(soup.get_text(" "))
    merged = _dedupe_preserve_order_snippets([*head_frags, body_text] if body_text else head_frags)
    return _normalize_text("\n\n".join(merged))


def _extract_social_preview_image(html: str, page_url: str) -> str | None:
    soup = _parse_html(html)
    raw_candidates: list[str] = []
    for tag in soup.find_all("meta"):
        prop = tag.get("property")
        if prop and str(prop).lower() in ("og:image", "og:image:url", "og:image:secure_url"):
            c = tag.get("content")
            if c and str(c).strip():
                raw_candidates.append(str(c).strip())
        name = tag.get("name")
        if name and str(name).lower() in ("twitter:image", "twitter:image:src"):
            c = tag.get("content")
            if c and str(c).strip():
                raw_candidates.append(str(c).strip())
    for tag in soup.find_all("link", href=True):
        rel = tag.get("rel")
        rel_parts = rel if isinstance(rel, list) else ([rel] if rel else [])
        if any(str(r).lower() == "image_src" for r in rel_parts):
            href = tag.get("href")
            if href and str(href).strip():
                raw_candidates.append(str(href).strip())
    for raw in raw_candidates:
        absolute = urljoin(page_url, raw)
        parsed = urlparse(absolute)
        if parsed.scheme in {"http", "https"} and parsed.netloc:
            return absolute
    return None


async def _embed_texts(chunks: list[str]) -> list[list[float]]:
    settings = get_settings()
    if not settings.openai_api_key:
        raise AppError(
            code="knowledge.embedding_not_configured",
            message="OPENAI_API_KEY is required for indexing embeddings",
            status_code=500,
        )

    if not chunks:
        return []

    all_vectors: list[list[float]] = []
    idx = 0
    async with httpx.AsyncClient(timeout=120) as client:
        while idx < len(chunks):
            batch: list[str] = []
            batch_tokens = 0
            while idx < len(chunks) and len(batch) < _EMBED_BATCH_MAX_INPUTS:
                next_tok = _approx_embed_request_tokens(chunks[idx])
                if batch and batch_tokens + next_tok > _EMBED_BATCH_MAX_TOKENS_EST:
                    break
                batch.append(chunks[idx])
                batch_tokens += next_tok
                idx += 1
            if not batch:
                batch = [chunks[idx]]
                idx += 1

            response = await client.post(
                "https://api.openai.com/v1/embeddings",
                headers={"Authorization": f"Bearer {settings.openai_api_key}"},
                json={"model": settings.openai_embedding_model, "input": batch},
            )
            if response.status_code >= 400:
                log.warning(
                    "embedding_batch_failed",
                    status_code=response.status_code,
                    body_preview=response.text[:500],
                    batch_inputs=len(batch),
                )
                raise AppError(
                    code="knowledge.embedding_failed",
                    message="Embedding API request failed",
                    status_code=502,
                    details={"status_code": response.status_code, "body": response.text[:800]},
                )
            payload = response.json()
            vectors = [item["embedding"] for item in payload.get("data", [])]
            if len(vectors) != len(batch):
                raise AppError(code="knowledge.embedding_failed", message="Embedding response length mismatch", status_code=502)
            all_vectors.extend(vectors)

    if len(all_vectors) != len(chunks):
        raise AppError(code="knowledge.embedding_failed", message="Embedding response length mismatch", status_code=502)
    return all_vectors


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

    src_status = (payload.status or "pending").strip() or "pending"
    result = await db.execute(
        text(
            """
            insert into public.knowledge_sources (
              agent_id, user_id, type, title, status, source_url, storage_bucket, storage_path, metadata
            ) values (
              :agent_id, :user_id, :type, :title, CAST(:status AS knowledge_source_status), :source_url, :storage_bucket, :storage_path, CAST(:metadata AS jsonb)
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
            "status": src_status,
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
            set status = 'running', phase = 'crawling', started_at = coalesce(started_at, now()), error_message = null, progress_pct = 5
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
    db: AsyncSession, source_id: UUID, user_id: UUID, *, mark_running: bool = True
) -> tuple[KnowledgeSourceDTO, IndexJobDTO]:
    source = await _load_source(db, source_id, user_id)
    if source.type != "website":
        raise AppError(code="validation.invalid_input", message="Only website sources are indexable in this step", status_code=422)
    if not source.source_url:
        raise AppError(code="validation.invalid_input", message="Website source URL is missing", status_code=422)

    job = await _create_job(db, source, user_id)
    if mark_running:
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


async def enqueue_index_website_source_queued(
    db: AsyncSession, source_id: UUID, user_id: UUID
) -> tuple[KnowledgeSourceDTO, IndexJobDTO]:
    """Leave the job `queued` for `indexing_worker` (dashboard website crawl uses this path)."""
    return await enqueue_index_website_source(db, source_id, user_id, mark_running=False)


def _rules_from_payload(rules: list[WebsitePathRule]) -> list[dict[str, str]]:
    return [{"operator": r.operator, "pattern": r.pattern} for r in rules]


async def create_and_enqueue_dashboard_website(
    db: AsyncSession,
    user_id: UUID,
    payload: WebsiteIngestBase | WebsiteIndividualRequest,
    mode: WebsiteMode,
) -> tuple[KnowledgeSourceDTO, IndexJobDTO | None]:
    if isinstance(payload, WebsiteIndividualRequest):
        source_url = normalize_dashboard_website_url(payload.protocol, payload.url_input)
        title = payload.title or urlparse(source_url).netloc or "Website"
        include_rules: list[WebsitePathRule] = []
        exclude_rules: list[WebsitePathRule] = []
    else:
        source_url = normalize_dashboard_website_url(payload.protocol, payload.url_input)
        title = payload.title or urlparse(source_url).netloc or "Website"
        include_rules = payload.include_rules
        exclude_rules = payload.exclude_rules

    metadata: dict[str, object] = {
        "origin": "dashboard_website",
        "website_mode": mode,
        "include_rules": _rules_from_payload(include_rules),
        "exclude_rules": _rules_from_payload(exclude_rules),
        "max_pages": MAX_DASHBOARD_WEBSITE_PAGES,
    }

    dup = await _find_dashboard_website_duplicate(db, user_id, payload.agent_id, source_url)
    if dup is not None:
        existing_id, dup_reason = dup
        metadata = {
            **metadata,
            "duplicate_of_source_id": str(existing_id),
            "duplicate_reason": dup_reason,
        }
        source = await create_source(
            db,
            user_id,
            KnowledgeSourceCreateRequest(
                agent_id=payload.agent_id,
                type="website",
                title=title,
                source_url=source_url,
                metadata=metadata,
                status="skipped_duplicate",
            ),
        )
        refreshed_source = await _load_source(db, source.id, user_id)
        return refreshed_source, None

    source = await create_source(
        db,
        user_id,
        KnowledgeSourceCreateRequest(
            agent_id=payload.agent_id,
            type="website",
            title=title,
            source_url=source_url,
            metadata=metadata,
        ),
    )
    _, job = await enqueue_index_website_source_queued(db, source.id, user_id)
    refreshed_source = await _load_source(db, source.id, user_id)
    refreshed_job = await get_latest_job(db, source.id, user_id)
    return refreshed_source, refreshed_job or job


async def _create_crawl_run(db: AsyncSession, source: KnowledgeSourceDTO, user_id: UUID, settings: dict[str, object]) -> UUID:
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
            "settings": json.dumps(settings),
        },
    )
    return UUID(str(result.mappings().one()["id"]))


def _ingest_params_from_metadata(metadata: dict[str, object]) -> tuple[WebsiteMode, int, list[dict[str, str]], list[dict[str, str]]]:
    origin = str(metadata.get("origin") or "")
    mode_raw = metadata.get("website_mode")
    if mode_raw in ("crawl", "sitemap", "individual"):
        mode: WebsiteMode = mode_raw  # type: ignore[assignment]
    elif origin == "dashboard_website":
        mode = "crawl"
    else:
        mode = "crawl"
    max_pages = int(metadata.get("max_pages") or (MAX_DASHBOARD_WEBSITE_PAGES if origin == "dashboard_website" else MAX_ONBOARDING_PAGES))
    if origin != "dashboard_website":
        max_pages = min(max_pages, MAX_ONBOARDING_PAGES)
    include = [dict(x) for x in (metadata.get("include_rules") or []) if isinstance(x, dict)]
    exclude = [dict(x) for x in (metadata.get("exclude_rules") or []) if isinstance(x, dict)]
    return mode, max_pages, include, exclude


async def _crawl_pages(
    seed_url: str,
    max_pages: int,
    include_rules: list[dict[str, str]],
    exclude_rules: list[dict[str, str]],
    *,
    crawl_budget_bytes: int,
    progress_hook: Callable[[list[dict[str, object]], int], Awaitable[None]] | None = None,
    progress_every: int = DASHBOARD_CRAWL_PROGRESS_EVERY,
) -> tuple[list[dict[str, object]], int, str | None, int, str]:
    """Crawl HTML pages; stop when cumulative charged body bytes (capped per URL) exceed ``crawl_budget_bytes``."""
    parsed_seed = urlparse(seed_url)
    seed_normalized = f"{parsed_seed.scheme}://{parsed_seed.netloc}{parsed_seed.path or '/'}"
    if not _url_passes_filters(seed_normalized, include_rules, exclude_rules):
        return [], 0, None, 0, "complete"

    queue: deque[tuple[str, int]] = deque([(seed_normalized, 0)])
    seen: set[str] = set()
    pages: list[dict[str, object]] = []
    links_discovered = 0
    preview_image_url: str | None = None
    crawl_http_bytes = 0
    stopped_reason = "complete"

    async with httpx.AsyncClient(timeout=20, follow_redirects=True, headers=_WEBSITE_CRAWL_HEADERS) as client:
        while queue and len(pages) < max_pages:
            if crawl_http_bytes >= crawl_budget_bytes and len(pages) > 0:
                stopped_reason = "budget"
                break
            url, depth = queue.popleft()
            if url in seen:
                continue
            seen.add(url)
            try:
                response = await client.get(url)
                status_code = int(response.status_code)
                response.raise_for_status()
                page_bytes, html = _charge_bytes_and_html_from_response(response)
                crawl_http_bytes += page_bytes
                if preview_image_url is None:
                    preview_image_url = _extract_social_preview_image(html, url)
                page_text = _extract_page_text(html)
                links = _extract_links(url, html)
                links_discovered += len(links)
                allow_more_links = crawl_http_bytes < crawl_budget_bytes
                for link in links:
                    if link in seen:
                        continue
                    if not _url_passes_filters(link, include_rules, exclude_rules):
                        continue
                    if allow_more_links and len(pages) + len(queue) < max_pages * 4:
                        queue.append((link, depth + 1))
                pages.append({"url": url, "depth": depth, "http_status": status_code, "text": page_text})
                if progress_hook and (
                    len(pages) % max(1, progress_every) == 0 or len(pages) >= max_pages
                ):
                    await progress_hook(list(pages), crawl_http_bytes)
                if len(pages) >= max_pages:
                    stopped_reason = "max_pages_safety"
                    break
            except Exception:
                pages.append({"url": url, "depth": depth, "http_status": None, "text": ""})
                if progress_hook and len(pages) % max(1, progress_every) == 0:
                    await progress_hook(list(pages), crawl_http_bytes)
    return pages[:max_pages], links_discovered, preview_image_url, crawl_http_bytes, stopped_reason


def _sitemap_seed_urls(start_url: str) -> list[str]:
    """URLs to treat as sitemap documents. Site-root URLs also try /sitemap.xml (homepage is usually HTML)."""
    try:
        norm = _normalize_url_string(start_url)
    except AppError:
        norm = start_url.strip()
    seeds = [norm]
    parsed = urlparse(norm)
    if parsed.scheme in ("http", "https") and parsed.netloc and (parsed.path or "/") == "/":
        candidate = f"{parsed.scheme}://{parsed.netloc}/sitemap.xml"
        if candidate != norm:
            seeds.append(candidate)
    return seeds


async def _collect_sitemap_urls(
    start_url: str,
    max_urls: int,
    include_rules: list[dict[str, str]],
    exclude_rules: list[dict[str, str]],
) -> list[str]:
    results: list[str] = []
    seen_sitemaps: set[str] = set()
    sitemap_queue: deque[tuple[str, int]] = deque((u, 0) for u in _sitemap_seed_urls(start_url))

    async with httpx.AsyncClient(timeout=25, follow_redirects=True, headers=_WEBSITE_CRAWL_HEADERS) as client:
        while sitemap_queue and len(results) < max_urls:
            sm_url, depth = sitemap_queue.popleft()
            if sm_url in seen_sitemaps or depth > 8:
                continue
            seen_sitemaps.add(sm_url)
            try:
                response = await client.get(sm_url)
                response.raise_for_status()
            except Exception:
                continue
            try:
                root = ET.fromstring(response.content)
            except ET.ParseError:
                continue

            for child in root:
                local = _local_xml_tag(child.tag)
                if local == "url":
                    loc_text: str | None = None
                    for el in child:
                        if _local_xml_tag(el.tag) == "loc" and el.text and el.text.strip():
                            loc_text = el.text.strip()
                            break
                    if not loc_text:
                        continue
                    try:
                        norm = _normalize_url_string(loc_text)
                    except AppError:
                        continue
                    if _url_passes_filters(norm, include_rules, exclude_rules) and norm not in results:
                        results.append(norm)
                elif local == "sitemap":
                    for el in child:
                        if _local_xml_tag(el.tag) == "loc" and el.text and el.text.strip():
                            sitemap_queue.append((el.text.strip(), depth + 1))

    return results[:max_urls]


async def _fetch_pages_for_urls(
    urls: list[str],
    *,
    crawl_budget_bytes: int,
) -> tuple[list[dict[str, object]], int, str | None, int, str]:
    """Fetch each URL; each URL charges at most ``_CRAWL_BODY_CHARGE_CAP_BYTES`` toward the crawl budget."""
    pages: list[dict[str, object]] = []
    links_discovered = 0
    preview_image_url: str | None = None
    crawl_http_bytes = 0
    stopped_reason = "complete"
    async with httpx.AsyncClient(timeout=20, follow_redirects=True, headers=_WEBSITE_CRAWL_HEADERS) as client:
        for url in urls:
            if crawl_http_bytes >= crawl_budget_bytes and len(pages) > 0:
                stopped_reason = "budget"
                break
            try:
                response = await client.get(url)
                status_code = int(response.status_code)
                response.raise_for_status()
                charged, html = _charge_bytes_and_html_from_response(response)
                crawl_http_bytes += charged
                if preview_image_url is None:
                    preview_image_url = _extract_social_preview_image(html, url)
                page_text = _extract_page_text(html)
                pages.append({"url": url, "depth": 0, "http_status": status_code, "text": page_text})
                links_discovered += len(_extract_links(url, html))
            except Exception:
                pages.append({"url": url, "depth": 0, "http_status": None, "text": ""})
    return pages, links_discovered, preview_image_url, crawl_http_bytes, stopped_reason


async def _upsert_knowledge_source_page(
    db: AsyncSession,
    *,
    source_id: UUID,
    crawl_run_id: UUID,
    user_id: UUID,
    page: dict[str, object],
) -> None:
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
            "source_id": str(source_id),
            "crawl_run_id": str(crawl_run_id),
            "user_id": str(user_id),
            "url": str(page["url"]),
            "depth": int(page["depth"]),
            "status": "parsed" if str(page["text"]).strip() else "failed",
            "http_status": page["http_status"],
        },
    )


async def _dashboard_flush_crawl_pages(
    db: AsyncSession,
    *,
    source_id: UUID,
    crawl_run_id: UUID,
    user_id: UUID,
    job_id: UUID,
    pages_snapshot: list[dict[str, object]],
    pages_total_cap: int,
    crawl_http_bytes_so_far: int | None = None,
) -> None:
    """Upsert page rows and bump job progress for UI polling."""
    for page in pages_snapshot:
        await _upsert_knowledge_source_page(
            db, source_id=source_id, crawl_run_id=crawl_run_id, user_id=user_id, page=page
        )
    attempted = len(pages_snapshot)
    pct = 5 + int(min(19, 19 * attempted / max(pages_total_cap, 1)))
    mextra: dict[str, object] = {"crawl_phase": "fetching_html"}
    if crawl_http_bytes_so_far is not None:
        mextra["crawl_http_bytes"] = crawl_http_bytes_so_far
    await db.execute(
        text(
            """
            update public.indexing_jobs
            set pages_total = :pages_total,
                pages_processed = :pages_processed,
                progress_pct = :progress_pct,
                phase = 'crawling',
                metrics = coalesce(metrics, '{}'::jsonb) || cast(:mextra as jsonb)
            where id = :job_id
            """
        ),
        {
            "job_id": str(job_id),
            "pages_total": pages_total_cap,
            "pages_processed": attempted,
            "progress_pct": min(24, pct),
            "mextra": json.dumps(mextra),
        },
    )


async def _dashboard_seed_queued_urls(
    db: AsyncSession,
    *,
    source_id: UUID,
    crawl_run_id: UUID,
    user_id: UUID,
    job_id: UUID,
    urls: list[str],
) -> None:
    """Insert placeholder rows so the dashboard shows link count before HTML is fetched."""
    for u in urls:
        await db.execute(
            text(
                """
                insert into public.knowledge_source_pages (
                  knowledge_source_id, crawl_run_id, user_id, url, depth, status, http_status, last_crawled_at
                ) values (
                  :source_id, :crawl_run_id, :user_id, :url, 0, 'queued', null, now()
                )
                on conflict (knowledge_source_id, url)
                do update set
                  crawl_run_id = excluded.crawl_run_id,
                  depth = excluded.depth,
                  status = 'queued',
                  http_status = null,
                  last_crawled_at = now()
                """
            ),
            {"source_id": str(source_id), "crawl_run_id": str(crawl_run_id), "user_id": str(user_id), "url": u},
        )
    await db.execute(
        text(
            """
            update public.indexing_jobs
            set pages_total = :pages_total, pages_processed = 0, progress_pct = 4, phase = 'crawling',
                metrics = coalesce(metrics, '{}'::jsonb) || cast(:extra as jsonb)
            where id = :job_id
            """
        ),
        {
            "job_id": str(job_id),
            "pages_total": len(urls),
            "extra": json.dumps({"crawl_phase": "urls_discovered", "discovery": "sitemap"}),
        },
    )


async def _exclude_remaining_queued_pages_for_run(
    db: AsyncSession, *, knowledge_source_id: UUID, crawl_run_id: UUID
) -> None:
    """Sitemap seeding inserts many `queued` placeholders; after fetch stops (budget, etc.), drop the rest."""
    await db.execute(
        text(
            """
            update public.knowledge_source_pages
            set status = 'excluded'::public.crawl_page_status
            where knowledge_source_id = :sid
              and crawl_run_id = :rid
              and status = 'queued'::public.crawl_page_status
            """
        ),
        {"sid": str(knowledge_source_id), "rid": str(crawl_run_id)},
    )


async def _dashboard_fetch_planned_urls_in_batches(
    db: AsyncSession,
    *,
    job_id: UUID,
    source: KnowledgeSourceDTO,
    user_id: UUID,
    crawl_run_id: UUID,
    urls: list[str],
    crawl_budget_bytes: int,
) -> tuple[list[dict[str, object]], int, str | None, int, str]:
    """Fetch HTML for URLs discovered via sitemap in small batches; commit after each batch."""
    if not urls:
        return [], 0, None, 0, "complete"
    total_http = 0
    all_pages: list[dict[str, object]] = []
    preview: str | None = None
    stopped = "complete"
    links_discovered = 0
    n = len(urls)
    for start in range(0, n, DASHBOARD_CRAWL_CONTENT_BATCH):
        batch_urls = urls[start : start + DASHBOARD_CRAWL_CONTENT_BATCH]
        budget_left = max(0, crawl_budget_bytes - total_http)
        batch_pages, ld, pv, b_used, st = await _fetch_pages_for_urls(batch_urls, crawl_budget_bytes=budget_left)
        total_http += b_used
        links_discovered += ld
        if preview is None and pv:
            preview = pv
        if st != "complete":
            stopped = st
        for p in batch_pages:
            p.setdefault("depth", 0)
        all_pages.extend(batch_pages)
        await _dashboard_flush_crawl_pages(
            db,
            source_id=source.id,
            crawl_run_id=crawl_run_id,
            user_id=user_id,
            job_id=job_id,
            pages_snapshot=all_pages,
            pages_total_cap=n,
            crawl_http_bytes_so_far=total_http,
        )
        await db.commit()
        if stopped != "complete":
            break
    await _exclude_remaining_queued_pages_for_run(
        db, knowledge_source_id=source.id, crawl_run_id=crawl_run_id
    )
    await db.commit()
    return all_pages, links_discovered, preview, total_http, stopped


def _indexing_failure_row(exc: BaseException) -> tuple[str, dict[str, object]]:
    """Short `error_message` text and structured `metrics.failure` for debugging."""
    if isinstance(exc, AppError):
        short = f"{exc.code}: {exc.message}"[:1000]
        detail: dict[str, object] = {
            "kind": "app_error",
            "code": exc.code,
            "message": exc.message,
            "details": exc.details or {},
        }
    else:
        short = f"{type(exc).__name__}: {exc}"[:1000]
        tb = "".join(traceback.format_exception(exc))
        if len(tb) > 12_000:
            tb = f"{tb[:12_000]}\n... (traceback truncated)"
        detail = {"kind": "unexpected", "exc_type": type(exc).__name__, "message": str(exc), "traceback": tb}
    return short, {"failure": detail}


async def _finalize_indexing_failure(
    db: AsyncSession,
    *,
    job_id: UUID,
    source_id: UUID,
    crawl_run_id: UUID | None,
    exc: BaseException,
) -> None:
    short, metrics_obj = _indexing_failure_row(exc)
    metrics_json = json.dumps(metrics_obj, default=str)
    await db.rollback()
    if crawl_run_id is not None:
        await _exclude_remaining_queued_pages_for_run(
            db, knowledge_source_id=source_id, crawl_run_id=crawl_run_id
        )
    await db.execute(
        text(
            """
            update public.knowledge_sources
            set status = 'failed', error_message = :error_message
            where id = :source_id
            """
        ),
        {"source_id": str(source_id), "error_message": short[:1000]},
    )
    await db.execute(
        text(
            """
            update public.indexing_jobs
            set status = 'failed', phase = 'failed', finished_at = now(), error_message = :error_message,
                metrics = cast(:metrics as jsonb)
            where id = :job_id
            """
        ),
        {"job_id": str(job_id), "error_message": short[:1000], "metrics": metrics_json},
    )
    if crawl_run_id is not None:
        await db.execute(
            text(
                """
                update public.knowledge_crawl_runs
                set status = 'failed', error_message = :error_message, finished_at = now()
                where id = :crawl_run_id
                """
            ),
            {"crawl_run_id": str(crawl_run_id), "error_message": short[:1000]},
        )
    await db.commit()


async def record_worker_indexing_surrogate_failure(
    db: AsyncSession, job_id: UUID, user_id: UUID, exc: BaseException
) -> None:
    """If the worker caught an exception after the job was left `running`, persist a failure row."""
    short, metrics_obj = _indexing_failure_row(exc)
    worker_note = f"(worker) {short}"[:1000]
    metrics_obj["failure"]["worker_caught"] = True
    metrics_json = json.dumps(metrics_obj, default=str)
    await db.execute(
        text(
            """
            update public.indexing_jobs j
            set status = 'failed', phase = 'failed', finished_at = coalesce(j.finished_at, now()),
                error_message = coalesce(j.error_message, :error_message),
                metrics = coalesce(j.metrics, '{}'::jsonb) || cast(:metrics as jsonb)
            where j.id = :job_id and j.user_id = :user_id and j.status = 'running'
            """
        ),
        {"job_id": str(job_id), "user_id": str(user_id), "error_message": worker_note, "metrics": metrics_json},
    )
    await db.execute(
        text(
            """
            update public.knowledge_sources s
            set status = 'failed', error_message = coalesce(s.error_message, :error_message)
            from public.indexing_jobs j
            where s.id = j.knowledge_source_id
              and j.id = :job_id and j.user_id = :user_id
              and j.status = 'failed'
              and s.status = 'indexing'
            """
        ),
        {"job_id": str(job_id), "user_id": str(user_id), "error_message": worker_note},
    )
    await db.execute(
        text(
            """
            update public.knowledge_crawl_runs r
            set status = 'failed', error_message = coalesce(r.error_message, :error_message),
                finished_at = coalesce(r.finished_at, now())
            where r.id = (
              select cr.id
              from public.knowledge_crawl_runs cr
              where cr.knowledge_source_id = (
                select knowledge_source_id from public.indexing_jobs where id = :job_id and user_id = :user_id
              )
                and cr.status = 'running'
              order by cr.started_at desc nulls last
              limit 1
            )
            """
        ),
        {"job_id": str(job_id), "user_id": str(user_id), "error_message": worker_note},
    )
    await db.commit()


async def process_indexing_job(db: AsyncSession, job_id: UUID, user_id: UUID) -> str | None:
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

    md = dict(source.metadata or {})
    mode, max_pages, include_rules, exclude_rules = _ingest_params_from_metadata(md)

    crawl_run_id: UUID | None = None
    preview_image_url: str | None = None

    try:
        await _set_job_running(db, job_id)
        crawl_settings: dict[str, object] = {
            "max_pages": max_pages,
            "website_mode": mode,
            "include_rules": include_rules,
            "exclude_rules": exclude_rules,
        }
        crawl_run_id = await _create_crawl_run(db, source, user_id, crawl_settings)
        await db.commit()

        plan_slug, _, plan_features = await _fetch_active_subscription_plan(db, user_id)
        crawl_budget_bytes = _website_crawl_budget_bytes(plan_slug, plan_features)
        pages_persisted_incrementally = False
        dashboard_planned_url_count: int | None = None

        if mode == "individual":
            pages, links_discovered, preview_image_url, crawl_http_bytes, crawl_stopped_reason = await _fetch_pages_for_urls(
                [source.source_url], crawl_budget_bytes=crawl_budget_bytes
            )
        elif mode == "sitemap":
            sitemap_urls = await _collect_sitemap_urls(source.source_url, max_pages, include_rules, exclude_rules)
            if not sitemap_urls:
                raise AppError(
                    code="knowledge.sitemap_empty",
                    message=(
                        "No page URLs in the sitemap. Point to sitemap.xml (not the homepage), "
                        "or loosen include path rules if they exclude every URL."
                    ),
                    status_code=422,
                )
            pages, links_discovered, preview_image_url, crawl_http_bytes, crawl_stopped_reason = await _fetch_pages_for_urls(
                sitemap_urls, crawl_budget_bytes=crawl_budget_bytes
            )
        else:
            if md.get("origin") == "dashboard_website":
                sitemap_plan = await _collect_sitemap_urls(
                    source.source_url, max_pages, include_rules, exclude_rules
                )
                if len(sitemap_plan) > 0:
                    dashboard_planned_url_count = len(sitemap_plan)
                    await _dashboard_seed_queued_urls(
                        db,
                        source_id=source.id,
                        crawl_run_id=crawl_run_id,
                        user_id=user_id,
                        job_id=job_id,
                        urls=sitemap_plan,
                    )
                    await db.commit()
                    pages, links_discovered, preview_image_url, crawl_http_bytes, crawl_stopped_reason = (
                        await _dashboard_fetch_planned_urls_in_batches(
                            db,
                            job_id=job_id,
                            source=source,
                            user_id=user_id,
                            crawl_run_id=crawl_run_id,
                            urls=sitemap_plan,
                            crawl_budget_bytes=crawl_budget_bytes,
                        )
                    )
                    pages_persisted_incrementally = True
                else:
                    await db.execute(
                        text(
                            """
                            update public.indexing_jobs
                            set pages_total = :cap, pages_processed = 0, progress_pct = 4, phase = 'crawling',
                                metrics = coalesce(metrics, '{}'::jsonb) || cast(:extra as jsonb)
                            where id = :job_id
                            """
                        ),
                        {
                            "job_id": str(job_id),
                            "cap": max_pages,
                            "extra": json.dumps({"crawl_phase": "bfs_fetch", "discovery": "bfs"}),
                        },
                    )
                    await db.commit()

                    async def _bfs_progress(snapshot: list[dict[str, object]]) -> None:
                        await _dashboard_flush_crawl_pages(
                            db,
                            source_id=source.id,
                            crawl_run_id=crawl_run_id,
                            user_id=user_id,
                            job_id=job_id,
                            pages_snapshot=snapshot,
                            pages_total_cap=max_pages,
                        )
                        await db.commit()

                    pages, links_discovered, preview_image_url, crawl_http_bytes, crawl_stopped_reason = await _crawl_pages(
                        source.source_url,
                        max_pages,
                        include_rules,
                        exclude_rules,
                        crawl_budget_bytes=crawl_budget_bytes,
                        progress_hook=_bfs_progress,
                    )
                    await _bfs_progress(pages)
                    pages_persisted_incrementally = True
            else:
                pages, links_discovered, preview_image_url, crawl_http_bytes, crawl_stopped_reason = await _crawl_pages(
                    source.source_url, max_pages, include_rules, exclude_rules, crawl_budget_bytes=crawl_budget_bytes
                )

        usable_pages = [p for p in pages if str(p["text"]).strip()]
        if not usable_pages:
            raise AppError(code="knowledge.scrape_empty", message="Website returned no readable text", status_code=422)

        if pages_persisted_incrementally:
            await db.execute(
                text(
                    """
                    update public.indexing_jobs
                    set progress_pct = 25,
                        metrics = coalesce(metrics, '{}'::jsonb) || cast(:extra as jsonb)
                    where id = :job_id
                    """
                ),
                {
                    "job_id": str(job_id),
                    "extra": json.dumps(
                        {
                            "crawl_http_bytes": crawl_http_bytes,
                            "crawl_stopped_reason": crawl_stopped_reason,
                            "urls_fetched": len(pages),
                        }
                    ),
                },
            )
        else:
            await db.execute(
                text(
                    """
                    update public.indexing_jobs
                    set pages_total = :pages_total, pages_processed = :pages_processed, progress_pct = 25
                    where id = :job_id
                    """
                ),
                {"job_id": str(job_id), "pages_total": len(pages), "pages_processed": len(pages)},
            )

        if not pages_persisted_incrementally:
            for page in pages:
                await _upsert_knowledge_source_page(
                    db,
                    source_id=source.id,
                    crawl_run_id=crawl_run_id,
                    user_id=user_id,
                    page=page,
                )

        # Persist crawled URLs before embedding so failures later (e.g. OpenAI) do not roll back page rows.
        await db.commit()

        text_content = "\n\n".join(str(page["text"]) for page in usable_pages)
        indexed_source_bytes = sum(len(str(p["text"]).encode("utf-8")) for p in usable_pages)
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
        planned_urls = dashboard_planned_url_count if dashboard_planned_url_count is not None else len(pages)
        success_metrics = json.dumps(
            {
                "chunk_count": len(chunks),
                "indexed_source_bytes": indexed_source_bytes,
                "crawl_http_bytes": crawl_http_bytes,
                "crawl_budget_bytes": crawl_budget_bytes,
                "crawl_stopped_reason": crawl_stopped_reason,
                "urls_planned": planned_urls,
                "urls_fetched": len(pages),
            }
        )
        await db.execute(
            text(
                """
                update public.indexing_jobs
                set status = 'succeeded', phase = 'complete', progress_pct = 100, finished_at = now(),
                    pages_total = :pages_total,
                    pages_processed = :pages_processed,
                    metrics = cast(:metrics as jsonb)
                where id = :job_id
                """
            ),
            {
                "job_id": str(job_id),
                "pages_total": planned_urls,
                "pages_processed": len(pages),
                "metrics": success_metrics,
            },
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
        return preview_image_url
    except Exception as exc:
        await _finalize_indexing_failure(
            db,
            job_id=job_id,
            source_id=source.id,
            crawl_run_id=crawl_run_id,
            exc=exc,
        )
        if isinstance(exc, AppError):
            raise
        raise AppError(code="knowledge.indexing_failed", message="Indexing job failed", status_code=500) from exc


async def index_website_source(
    db: AsyncSession, source_id: UUID, user_id: UUID
) -> tuple[KnowledgeSourceDTO, IndexJobDTO]:
    source, job = await enqueue_index_website_source(db, source_id, user_id, mark_running=True)
    await process_indexing_job(db, job.id, user_id)
    refreshed = await get_latest_job(db, source_id, user_id)
    source_out = await _load_source(db, source_id, user_id)
    return source_out, refreshed or job


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


async def list_website_sources_for_agent(
    db: AsyncSession, user_id: UUID, agent_id: UUID
) -> list[WebsiteSourceListItemDTO]:
    agent_check = await db.execute(
        text("select id from public.agents where id = :agent_id and user_id = :user_id"),
        {"agent_id": str(agent_id), "user_id": str(user_id)},
    )
    if agent_check.mappings().first() is None:
        raise AppError(code="agents.not_found", message="Agent not found", status_code=404)

    result = await db.execute(
        text(
            """
            select
              s.id,
              s.agent_id,
              s.title,
              s.source_url,
              s.status::text as status,
              s.last_indexed_at,
              coalesce(cnt.c, 0) as link_count,
              j.status::text as latest_job_status,
              j.phase::text as latest_job_phase,
              j.pages_total as job_pages_total,
              j.pages_processed as job_pages_processed,
              j.progress_pct as job_progress_pct,
              j.metrics as job_metrics,
              (s.metadata->>'website_mode') as website_mode
            from public.knowledge_sources s
            left join lateral (
              select count(*)::int as c
              from public.knowledge_source_pages p
              where p.knowledge_source_id = s.id
                and p.status in (
                  'parsed'::public.crawl_page_status,
                  'failed'::public.crawl_page_status,
                  'fetched'::public.crawl_page_status
                )
            ) cnt on true
            left join lateral (
              select status, phase, pages_total, pages_processed, progress_pct, metrics
              from public.indexing_jobs j2
              where j2.knowledge_source_id = s.id
              order by j2.created_at desc
              limit 1
            ) j on true
            where s.user_id = :user_id
              and s.agent_id = :agent_id
              and s.type = 'website'
            order by s.created_at desc
            """
        ),
        {"user_id": str(user_id), "agent_id": str(agent_id)},
    )
    out: list[WebsiteSourceListItemDTO] = []
    for row in result.mappings().all():
        wm = row.get("website_mode")
        mode = wm if wm in ("crawl", "sitemap", "individual") else None
        lim = _job_crawl_limit_exceeded(
            str(row["latest_job_status"]) if row.get("latest_job_status") else None,
            row.get("job_metrics"),
            row.get("job_pages_total"),
            row.get("job_pages_processed"),
        )
        out.append(
            WebsiteSourceListItemDTO(
                id=row["id"],
                agent_id=row["agent_id"],
                title=str(row["title"]),
                source_url=str(row["source_url"]) if row["source_url"] else None,
                status=str(row["status"]),
                website_mode=mode,  # type: ignore[arg-type]
                link_count=int(row["link_count"] or 0),
                last_indexed_at=row["last_indexed_at"],
                latest_job_status=str(row["latest_job_status"]) if row["latest_job_status"] else None,
                latest_job_phase=str(row["latest_job_phase"]) if row["latest_job_phase"] else None,
                job_pages_total=int(row["job_pages_total"]) if row.get("job_pages_total") is not None else None,
                job_pages_processed=int(row["job_pages_processed"]) if row.get("job_pages_processed") is not None else None,
                job_progress_pct=int(row["job_progress_pct"]) if row.get("job_progress_pct") is not None else None,
                job_crawl_limit_exceeded=lim,
            )
        )
    return out


async def list_website_source_pages(
    db: AsyncSession, user_id: UUID, source_id: UUID, *, offset: int, limit: int
) -> tuple[list[dict[str, object]], int]:
    src = (
        await db.execute(
            text(
                """
                select id
                from public.knowledge_sources
                where id = :source_id and user_id = :user_id and type = 'website'
                """
            ),
            {"source_id": str(source_id), "user_id": str(user_id)},
        )
    ).first()
    if src is None:
        raise AppError(code="knowledge.source_not_found", message="Website source not found", status_code=404)

    total_row = (
        await db.execute(
            text(
                """
                select count(*)::int as c
                from public.knowledge_source_pages p
                where p.knowledge_source_id = :source_id and p.user_id = :user_id
                  and p.status in (
                    'parsed'::public.crawl_page_status,
                    'failed'::public.crawl_page_status,
                    'fetched'::public.crawl_page_status
                  )
                """
            ),
            {"source_id": str(source_id), "user_id": str(user_id)},
        )
    ).mappings().one()
    total = int(total_row["c"] or 0)

    rows = (
        await db.execute(
            text(
                """
                select p.url, p.status::text as status, p.depth, p.last_crawled_at as last_indexed_at, p.http_status
                from public.knowledge_source_pages p
                where p.knowledge_source_id = :source_id and p.user_id = :user_id
                  and p.status in (
                    'parsed'::public.crawl_page_status,
                    'failed'::public.crawl_page_status,
                    'fetched'::public.crawl_page_status
                  )
                order by p.url asc
                limit :limit offset :offset
                """
            ),
            {"source_id": str(source_id), "user_id": str(user_id), "limit": limit, "offset": offset},
        )
    ).mappings().all()
    pages = [dict(r) for r in rows]
    return pages, total


async def delete_website_source(db: AsyncSession, user_id: UUID, source_id: UUID) -> None:
    result = await db.execute(
        text(
            """
            delete from public.knowledge_sources
            where id = :source_id and user_id = :user_id and type = 'website'
            returning id
            """
        ),
        {"source_id": str(source_id), "user_id": str(user_id)},
    )
    if result.first() is None:
        raise AppError(code="knowledge.source_not_found", message="Website source not found", status_code=404)
    await db.commit()


def _included_storage_bytes_from_plan_features(features: dict[str, object]) -> int:
    if not isinstance(features, dict):
        return DEFAULT_KNOWLEDGE_STORAGE_CAP_BYTES
    kb = features.get("max_knowledge_storage_kb")
    if isinstance(kb, (int, float)) and kb > 0:
        return int(kb * 1024)
    mb = features.get("max_file_storage_mb")
    if isinstance(mb, (int, float)) and mb > 0:
        return int(mb * 1024 * 1024)
    return DEFAULT_KNOWLEDGE_STORAGE_CAP_BYTES


def _website_crawl_budget_bytes(plan_slug: str, features: dict[str, Any]) -> int:
    raw = features.get("max_website_crawl_kb")
    try:
        kb = int(raw) if raw is not None else 0
    except (TypeError, ValueError):
        kb = 0
    if kb <= 0:
        kb = DEFAULT_WEBSITE_CRAWL_KB_FREE if plan_slug == "free" else DEFAULT_WEBSITE_CRAWL_KB_PAID
    return kb * 1024


def _coerce_job_metrics(metrics: object) -> dict[str, Any]:
    if metrics is None:
        return {}
    if isinstance(metrics, dict):
        return dict(metrics)
    if isinstance(metrics, str):
        try:
            return dict(json.loads(metrics))
        except json.JSONDecodeError:
            return {}
    return {}


def _job_crawl_limit_exceeded(job_status: str | None, metrics: object, pages_total: object, pages_processed: object) -> bool:
    if (job_status or "").lower() != "succeeded":
        return False
    m = _coerce_job_metrics(metrics)
    if str(m.get("crawl_stopped_reason")) != "budget":
        return False
    try:
        pt = int(pages_total) if pages_total is not None else None
        pp = int(pages_processed) if pages_processed is not None else None
    except (TypeError, ValueError):
        return False
    return pt is not None and pp is not None and pp < pt


def _url_duplicate_key(url: str) -> str:
    """Lowercase URL with trailing slashes removed (for duplicate detection)."""
    return re.sub(r"/+$", "", url.strip().lower())


async def _fetch_active_subscription_plan(
    db: AsyncSession, user_id: UUID
) -> tuple[str, str, dict[str, Any]]:
    plan_row = (
        await db.execute(
            text(
                """
                select p.slug::text as slug, p.name::text as name, p.features
                from public.subscriptions s
                join public.plans p on p.id = s.plan_id
                where s.user_id = :user_id
                  and s.status in ('trialing', 'active', 'past_due')
                order by s.current_period_end desc
                limit 1
                """
            ),
            {"user_id": str(user_id)},
        )
    ).mappings().first()
    if plan_row is None:
        return "free", "Free", {}
    fr = plan_row["features"]
    features: dict[str, Any] = dict(fr) if isinstance(fr, dict) else {}
    return str(plan_row["slug"]), str(plan_row["name"]), features


async def _find_dashboard_website_duplicate(
    db: AsyncSession, user_id: UUID, agent_id: UUID, normalized_url: str
) -> tuple[UUID, str] | None:
    """If this URL is already covered by another website source or indexed page, return (source_id, reason)."""
    key = _url_duplicate_key(normalized_url)
    r_page = (
        await db.execute(
            text(
                """
                select s.id::text as sid
                from public.knowledge_source_pages p
                join public.knowledge_sources s on s.id = p.knowledge_source_id
                where s.user_id = cast(:user_id as uuid)
                  and s.agent_id = cast(:agent_id as uuid)
                  and s.type = 'website'
                  and s.status::text <> 'skipped_duplicate'
                  and regexp_replace(lower(btrim(p.url)), '/+$', '') = :url_key
                limit 1
                """
            ),
            {"user_id": str(user_id), "agent_id": str(agent_id), "url_key": key},
        )
    ).mappings().first()
    if r_page is not None:
        return UUID(str(r_page["sid"])), "page_already_indexed"

    r_root = (
        await db.execute(
            text(
                """
                select id::text as sid
                from public.knowledge_sources
                where user_id = cast(:user_id as uuid)
                  and agent_id = cast(:agent_id as uuid)
                  and type = 'website'
                  and status::text not in ('skipped_duplicate', 'failed')
                  and source_url is not null
                  and regexp_replace(lower(btrim(source_url)), '/+$', '') = :url_key
                limit 1
                """
            ),
            {"user_id": str(user_id), "agent_id": str(agent_id), "url_key": key},
        )
    ).mappings().first()
    if r_root is not None:
        return UUID(str(r_root["sid"])), "same_root_url"
    return None


async def get_agent_website_usage(db: AsyncSession, user_id: UUID, agent_id: UUID) -> WebsiteUsageResponse:
    agent_check = await db.execute(
        text("select id from public.agents where id = :agent_id and user_id = :user_id"),
        {"agent_id": str(agent_id), "user_id": str(user_id)},
    )
    if agent_check.mappings().first() is None:
        raise AppError(code="agents.not_found", message="Agent not found", status_code=404)

    usage_row = (
        await db.execute(
            text(
                """
                select
                  coalesce((
                    select count(*)::bigint
                    from public.knowledge_source_pages p
                    join public.knowledge_sources s on s.id = p.knowledge_source_id
                    where s.agent_id = :agent_id and s.user_id = :user_id and s.type = 'website'
                      and p.status in (
                        'parsed'::public.crawl_page_status,
                        'failed'::public.crawl_page_status,
                        'fetched'::public.crawl_page_status
                      )
                  ), 0) as total_links,
                  coalesce((
                    select sum(octet_length(c.content))::bigint
                    from public.knowledge_chunks c
                    join public.knowledge_sources s on s.id = c.knowledge_source_id
                    where s.agent_id = :agent_id and s.user_id = :user_id and s.type = 'website'
                  ), 0) as used_bytes
                """
            ),
            {"agent_id": str(agent_id), "user_id": str(user_id)},
        )
    ).mappings().one()

    plan_slug, plan_name, features = await _fetch_active_subscription_plan(db, user_id)

    included = _included_storage_bytes_from_plan_features(features)
    used = int(usage_row["used_bytes"] or 0)
    total_links = int(usage_row["total_links"] or 0)
    show_upgrade = plan_slug == "free" or used > included
    crawl_budget = _website_crawl_budget_bytes(plan_slug, features)

    running_crawl_row = (
        await db.execute(
            text(
                """
                select (j.metrics->>'crawl_http_bytes')::bigint as b
                from public.indexing_jobs j
                join public.knowledge_sources s on s.id = j.knowledge_source_id
                where s.agent_id = cast(:agent_id as uuid)
                  and s.user_id = cast(:user_id as uuid)
                  and s.type = 'website'
                  and j.status = 'running'
                order by j.updated_at desc nulls last
                limit 1
                """
            ),
            {"agent_id": str(agent_id), "user_id": str(user_id)},
        )
    ).mappings().first()
    running_crawl_bytes: int | None = None
    if running_crawl_row is not None and running_crawl_row["b"] is not None:
        running_crawl_bytes = int(running_crawl_row["b"])

    last_crawl_row = (
        await db.execute(
            text(
                """
                select (j.metrics->>'crawl_http_bytes')::bigint as b
                from public.indexing_jobs j
                join public.knowledge_sources s on s.id = j.knowledge_source_id
                where s.agent_id = cast(:agent_id as uuid)
                  and s.user_id = cast(:user_id as uuid)
                  and s.type = 'website'
                  and j.status = 'succeeded'
                  and j.metrics ? 'crawl_http_bytes'
                order by j.finished_at desc nulls last, j.updated_at desc
                limit 1
                """
            ),
            {"agent_id": str(agent_id), "user_id": str(user_id)},
        )
    ).mappings().first()
    last_crawl_bytes: int | None = None
    if last_crawl_row is not None and last_crawl_row["b"] is not None:
        last_crawl_bytes = int(last_crawl_row["b"])

    crawl_bytes_for_ui = running_crawl_bytes if running_crawl_bytes is not None else last_crawl_bytes

    await db.commit()

    return WebsiteUsageResponse(
        plan_slug=plan_slug,
        plan_name=plan_name,
        included_storage_bytes=included,
        used_storage_bytes=used,
        total_links=total_links,
        show_upgrade=show_upgrade,
        website_crawl_budget_bytes=crawl_budget,
        website_crawl_last_job_bytes=crawl_bytes_for_ui,
    )
