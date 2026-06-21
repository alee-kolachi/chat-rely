"""Fetch and normalize public Shopify storefront catalog (no OAuth)."""

from __future__ import annotations

import html
import json
import re
from typing import Any
from urllib.parse import urljoin, urlparse

import httpx
import structlog
from bs4 import BeautifulSoup

from app.domains.demo.constants import DEMO_MIN_PRODUCT_COUNT, DEMO_SNAPSHOT_PRODUCT_CAP
from app.domains.demo.schemas import DemoProductSnapshot
from app.domains.demo.store_branding import pick_brand_color, pick_store_logo_url
from app.domains.knowledge.service import _extract_page_text, _extract_social_preview_image

log = structlog.get_logger("demo.storefront_ingest")

_CRAWL_HEADERS = {
    "User-Agent": "ChatRelyDemoBot/1.0 (+https://chatrely.com; outreach demo indexing)",
    "Accept": "text/html,application/json,*/*",
}

_POLICY_PATHS: tuple[tuple[str, str], ...] = (
    ("refund", "/policies/refund-policy"),
    ("shipping", "/policies/shipping-policy"),
    ("privacy", "/policies/privacy-policy"),
    ("terms", "/policies/terms-of-service"),
)


def _strip_html(raw: str | None) -> str:
    if not raw:
        return ""
    text = re.sub(r"<[^>]+>", " ", raw or "")
    text = html.unescape(text)
    return re.sub(r"\s+", " ", text).strip()


def _normalize_store_url(store_url: str) -> str:
    raw = store_url.strip()
    if not raw.startswith(("http://", "https://")):
        raw = f"https://{raw}"
    parsed = urlparse(raw)
    if not parsed.netloc:
        raise ValueError("invalid store url")
    return f"{parsed.scheme}://{parsed.netloc}"


def _product_page_url(base: str, handle: str) -> str:
    return urljoin(base.rstrip("/") + "/", f"products/{handle}")


def _parse_tags(raw: Any) -> list[str]:
    if isinstance(raw, list):
        return [str(t).strip() for t in raw if str(t).strip()]
    if isinstance(raw, str):
        return [t.strip() for t in raw.split(",") if t.strip()]
    return []


def _normalize_product(node: dict[str, Any], *, base_url: str) -> DemoProductSnapshot | None:
    handle = str(node.get("handle") or "").strip()
    title = str(node.get("title") or "").strip()
    if not handle or not title:
        return None
    variants_raw = node.get("variants") if isinstance(node.get("variants"), list) else []
    prices: list[float] = []
    variants: list[dict[str, Any]] = []
    for v in variants_raw:
        if not isinstance(v, dict):
            continue
        price_raw = str(v.get("price") or "").strip()
        variants.append(
            {
                "title": str(v.get("title") or "").strip(),
                "price": price_raw or None,
                "sku": str(v.get("sku") or "").strip() or None,
            }
        )
        try:
            if price_raw:
                prices.append(float(price_raw))
        except ValueError:
            pass
    images = node.get("images") if isinstance(node.get("images"), list) else []
    image_url = None
    if images and isinstance(images[0], dict):
        image_url = str(images[0].get("src") or "").strip() or None
    options_raw = node.get("options") if isinstance(node.get("options"), list) else []
    options: list[dict[str, Any]] = []
    for opt in options_raw:
        if not isinstance(opt, dict):
            continue
        name = str(opt.get("name") or "").strip()
        values = opt.get("values") if isinstance(opt.get("values"), list) else []
        options.append({"name": name, "values": [str(x).strip() for x in values if str(x).strip()]})
    min_price = f"{min(prices):.2f}" if prices else None
    max_price = f"{max(prices):.2f}" if prices else None
    body = _strip_html(str(node.get("body_html") or ""))
    excerpt = body[:400] if body else None
    pid = node.get("id")
    shopify_id = int(pid) if isinstance(pid, int) else None
    return DemoProductSnapshot(
        shopify_product_id=shopify_id,
        handle=handle,
        title=title,
        url=_product_page_url(base_url, handle),
        image_url=image_url,
        min_price=min_price,
        max_price=max_price,
        currency="USD",
        vendor=str(node.get("vendor") or "").strip() or None,
        product_type=str(node.get("product_type") or "").strip() or None,
        tags=_parse_tags(node.get("tags")),
        options=options,
        variants=variants,
        description_excerpt=excerpt,
    )


async def _fetch_products_json(client: httpx.AsyncClient, base_url: str) -> list[DemoProductSnapshot]:
    products: list[DemoProductSnapshot] = []
    page = 1
    while page <= 20 and len(products) < DEMO_SNAPSHOT_PRODUCT_CAP:
        url = urljoin(base_url.rstrip("/") + "/", f"products.json?limit=250&page={page}")
        try:
            resp = await client.get(url)
            if resp.status_code == 404:
                break
            resp.raise_for_status()
            payload = resp.json()
        except (httpx.HTTPError, json.JSONDecodeError):
            break
        batch = payload.get("products") if isinstance(payload, dict) else None
        if not isinstance(batch, list) or not batch:
            break
        for node in batch:
            if not isinstance(node, dict):
                continue
            normalized = _normalize_product(node, base_url=base_url)
            if normalized is not None:
                products.append(normalized)
            if len(products) >= DEMO_SNAPSHOT_PRODUCT_CAP:
                break
        if len(batch) < 250:
            break
        page += 1
    return products


async def _fetch_homepage_meta(
    client: httpx.AsyncClient, base_url: str
) -> tuple[str | None, str | None, str | None]:
    try:
        resp = await client.get(base_url)
        resp.raise_for_status()
        html_text = resp.text
    except httpx.HTTPError:
        return None, None, None
    if "password" in html_text.lower() and "storefront_password" in html_text.lower():
        return None, None, None
    soup = BeautifulSoup(html_text, "lxml")
    title_tag = soup.find("title")
    display_name = _strip_html(title_tag.get_text(" ") if title_tag else "") or None
    og_site = soup.find("meta", property="og:site_name")
    if og_site and og_site.get("content"):
        display_name = str(og_site.get("content")).strip() or display_name
    social_preview = _extract_social_preview_image(html_text, base_url)
    logo = pick_store_logo_url(soup=soup, base_url=base_url, social_preview_url=social_preview)
    brand_color = pick_brand_color(soup=soup, html_text=html_text)
    return display_name, logo, brand_color


async def _fetch_policies(client: httpx.AsyncClient, base_url: str) -> dict[str, str]:
    policies: dict[str, str] = {}
    for key, path in _POLICY_PATHS:
        url = urljoin(base_url.rstrip("/") + "/", path.lstrip("/"))
        try:
            resp = await client.get(url)
            if resp.status_code >= 400:
                continue
            text = _extract_page_text(resp.text)
            if text and len(text.strip()) > 40:
                policies[key] = text.strip()[:8000]
        except httpx.HTTPError:
            continue
    return policies


def product_to_index_text(product: DemoProductSnapshot) -> str:
    lines = [
        f"Product: {product.title}",
        f"Handle: {product.handle}",
        f"URL: {product.url}",
    ]
    if product.min_price:
        lines.append(f"Price: ${product.min_price}")
    if product.vendor:
        lines.append(f"Vendor: {product.vendor}")
    if product.product_type:
        lines.append(f"Type: {product.product_type}")
    if product.tags:
        lines.append(f"Tags: {', '.join(product.tags)}")
    for opt in product.options:
        name = str(opt.get("name") or "")
        values = opt.get("values") if isinstance(opt.get("values"), list) else []
        if name and values:
            lines.append(f"{name}: {', '.join(str(v) for v in values)}")
    if product.description_excerpt:
        lines.append(f"Description: {product.description_excerpt}")
    return "\n".join(lines)


def build_suggested_prompts(
    products: list[DemoProductSnapshot],
    policies: dict[str, str],
) -> list[str]:
    prompts: list[str] = []
    if products:
        top = products[0]
        prompts.append(f"Do you have the {top.title}?")
        if top.min_price:
            prompts.append(f"How much is the {top.title}?")
        if len(products) > 1 and products[0].options and products[1].options:
            a = products[0]
            opt_a = a.options[0]
            vals = opt_a.get("values") if isinstance(opt_a.get("values"), list) else []
            if len(vals) >= 2:
                prompts.append(
                    f"What sizes does the {a.title} come in?"
                )
        elif len(products) > 1:
            prompts.append(f"Tell me about the {products[1].title}")
    if policies.get("refund"):
        prompts.append("What's your return policy?")
    elif policies.get("shipping"):
        prompts.append("What are your shipping options?")
    return prompts[:4]


class StorefrontIngestResult:
    def __init__(
        self,
        *,
        base_url: str,
        display_name: str | None,
        logo_url: str | None,
        brand_color: str | None,
        products: list[DemoProductSnapshot],
        policies: dict[str, str],
        ingest_source: str,
    ) -> None:
        self.base_url = base_url
        self.display_name = display_name
        self.logo_url = logo_url
        self.brand_color = brand_color
        self.products = products
        self.policies = policies
        self.ingest_source = ingest_source

    @property
    def ok(self) -> bool:
        return len(self.products) >= DEMO_MIN_PRODUCT_COUNT


async def ingest_public_storefront(store_url: str) -> StorefrontIngestResult:
    base_url = _normalize_store_url(store_url)
    async with httpx.AsyncClient(timeout=25, follow_redirects=True, headers=_CRAWL_HEADERS) as client:
        products = await _fetch_products_json(client, base_url)
        ingest_source = "products_json"
        display_name, logo_url, brand_color = await _fetch_homepage_meta(client, base_url)
        policies = await _fetch_policies(client, base_url)

        if len(products) < DEMO_MIN_PRODUCT_COUNT:
            ingest_source = "mixed" if products else "crawl_fallback"
            log.warning(
                "demo.products_json_sparse",
                store_url=base_url,
                product_count=len(products),
            )

    if not display_name:
        display_name = urlparse(base_url).netloc.replace("www.", "")

    return StorefrontIngestResult(
        base_url=base_url,
        display_name=display_name,
        logo_url=logo_url,
        brand_color=brand_color,
        products=products,
        policies=policies,
        ingest_source=ingest_source,
    )
