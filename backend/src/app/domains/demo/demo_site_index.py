"""Index non-product storefront pages (home, about, policies) for demo RAG."""

from __future__ import annotations

from urllib.parse import urljoin, urlparse

import httpx
import structlog
from bs4 import BeautifulSoup
from sqlalchemy.ext.asyncio import AsyncSession

from uuid import UUID

from app.core.crawl_http import crawl_get
from app.core.settings import get_settings
from app.domains.demo.constants import DEMO_MAX_SITE_PAGES
from app.domains.demo.progress import demo_step
from app.domains.demo.storefront_ingest import (
    _CRAWL_HEADERS,
    _POLICY_PATHS,
    _extract_shopify_policy_text,
    discover_policy_page_urls,
)
from app.domains.knowledge.service import (
    _extract_body_text_for_index,
    create_and_index_text_snippet,
)

log = structlog.get_logger("demo.site_index")

_POLICY_PATH_SEGMENTS = (
    "return",
    "refund",
    "shipping",
    "exchange",
    "privacy",
    "terms",
    "policy",
    "delivery",
    "warranty",
)

_INFO_PATH_HINTS = (
    "about",
    "contact",
    "faq",
)


def _normalize_page_url(base_url: str, href: str) -> str | None:
    raw = (href or "").strip()
    if not raw or raw.startswith(("#", "mailto:", "tel:", "javascript:")):
        return None
    absolute = urljoin(base_url.rstrip("/") + "/", raw)
    parsed = urlparse(absolute)
    if parsed.scheme not in ("http", "https"):
        return None
    base_host = urlparse(base_url).netloc.casefold()
    if parsed.netloc and parsed.netloc.casefold() != base_host:
        return None
    path = parsed.path or "/"
    path_lower = path.casefold()
    if path_lower.startswith(("/products", "/collections", "/cart", "/account", "/checkout", "/search")):
        return None
    if path_lower.endswith((".jpg", ".jpeg", ".png", ".gif", ".webp", ".pdf", ".zip")):
        return None
    return f"{parsed.scheme}://{parsed.netloc}{path.rstrip('/') or '/'}"


def is_demo_essential_page_url(base_url: str, page_url: str) -> bool:
    parsed = urlparse(page_url)
    base_host = urlparse(base_url).netloc.casefold()
    if parsed.netloc and parsed.netloc.casefold() != base_host:
        return False
    path = (parsed.path or "/").casefold()
    if path in ("/", ""):
        return True
    if "/policies/" in path:
        return True
    if any(seg in path for seg in _POLICY_PATH_SEGMENTS):
        return True
    if "/pages/" in path and any(hint in path for hint in _INFO_PATH_HINTS + _POLICY_PATH_SEGMENTS):
        return True
    return False


def collect_essential_page_urls(html: str, base_url: str) -> list[str]:
    """Home + Shopify policy paths + footer links for returns/shipping/about only."""
    found: set[str] = {base_url.rstrip("/") + "/"}
    for _key, path in _POLICY_PATHS:
        found.add(urljoin(base_url.rstrip("/") + "/", path.lstrip("/")))
    for url in discover_policy_page_urls(html, base_url):
        found.add(url)
    if html.strip():
        soup = BeautifulSoup(html, "lxml")
        for anchor in soup.find_all("a", href=True):
            normalized = _normalize_page_url(base_url, str(anchor.get("href") or ""))
            if normalized and is_demo_essential_page_url(base_url, normalized):
                found.add(normalized)
    ordered = sorted(found, key=lambda u: (0 if u.rstrip("/") == base_url.rstrip("/") else 1, u))
    return ordered[:DEMO_MAX_SITE_PAGES]


def _page_title(url: str, html: str) -> str:
    if html.strip():
        soup = BeautifulSoup(html, "lxml")
        title_tag = soup.find("title")
        if title_tag:
            title = title_tag.get_text(" ", strip=True)
            if title:
                return title[:120]
    path = urlparse(url).path.strip("/") or "home"
    return path.replace("-", " ").replace("/", " ").title()[:120]


async def _fetch_page_text(client: httpx.AsyncClient, url: str) -> tuple[str, str]:
    delay = max(0.0, float(get_settings().demo_store_fetch_delay_seconds))
    try:
        resp = await crawl_get(client, url, delay_seconds=delay)
        if resp is None or resp.status_code >= 400:
            return "", ""
        html = resp.text
    except httpx.HTTPError:
        return "", ""
    path = urlparse(url).path.casefold()
    if "/policies/" in path or any(seg in path for seg in _POLICY_PATH_SEGMENTS):
        text = _extract_shopify_policy_text(html)
        if text:
            return text.strip(), html
        text = _extract_body_text_for_index(html)
        return text.strip(), html
    text = _extract_body_text_for_index(html)
    return text.strip(), html


async def index_demo_site_pages(
    db: AsyncSession,
    *,
    user_id: UUID,
    agent_id: UUID,
    base_url: str,
    slug: str,
) -> int:
    """Fetch essential info pages and embed as one snippet (single embedding job)."""
    home_html = ""
    page_urls: list[str] = []
    async with httpx.AsyncClient(timeout=20, follow_redirects=True, headers=_CRAWL_HEADERS) as client:
        try:
            delay = max(0.0, float(get_settings().demo_store_fetch_delay_seconds))
            home_resp = await crawl_get(client, base_url, delay_seconds=delay)
            if home_resp is not None and home_resp.status_code < 400:
                home_html = home_resp.text
                page_urls = collect_essential_page_urls(home_html, base_url)
        except httpx.HTTPError:
            log.warning("demo.site_index_home_failed", store=base_url)
            page_urls = collect_essential_page_urls("", base_url)

        sections: list[str] = []
        for url in page_urls:
            text, html = await _fetch_page_text(client, url)
            if len(text) < 80:
                continue
            title = _page_title(
                url,
                home_html if url.rstrip("/") == base_url.rstrip("/") else html,
            )
            sections.append(f"## {title}\nURL: {url}\n\n{text[:8000]}")

    if not sections:
        demo_step("provision.index_site_done", slug=slug, pages=0)
        return 0

    combined = "\n\n---\n\n".join(sections)
    demo_step("provision.index_site_batch", slug=slug, pages=len(sections))
    await create_and_index_text_snippet(
        db,
        user_id=user_id,
        agent_id=agent_id,
        title="Store info and policies",
        snippet_text=combined[:48000],
    )
    demo_step("provision.index_site_done", slug=slug, pages=len(sections))
    return len(sections)
