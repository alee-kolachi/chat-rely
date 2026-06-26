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

from app.domains.demo.constants import DEMO_MAX_PRODUCTS, DEMO_MIN_PRODUCT_COUNT, DEMO_PRODUCTS_JSON_MAX_PAGES
from app.domains.demo.schemas import DemoProductSnapshot
from app.domains.demo.store_branding import pick_brand_color, pick_store_logo_url
from app.domains.knowledge.service import _extract_page_text, _extract_social_preview_image

log = structlog.get_logger("demo.storefront_ingest")

_CRAWL_HEADERS = {
    "User-Agent": "ChatRelyDemoBot/1.0 (+https://chatrely.com; outreach demo)",
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


def _extract_image_urls_from_node(node: dict[str, Any]) -> list[str]:
    images = node.get("images") if isinstance(node.get("images"), list) else []
    urls: list[str] = []
    seen: set[str] = set()
    for img in images:
        if not isinstance(img, dict):
            continue
        src = str(img.get("src") or "").strip()
        if src and src not in seen:
            seen.add(src)
            urls.append(src)
    return urls


def _extract_description_points(raw_html: str | None) -> list[str]:
    if not raw_html or not str(raw_html).strip():
        return []
    soup = BeautifulSoup(str(raw_html), "lxml")
    points: list[str] = []
    for li in soup.find_all("li"):
        text = _strip_html(li.get_text(" ", strip=True))
        if text:
            points.append(text)
    if points:
        return points[:12]
    for paragraph in soup.find_all("p"):
        text = _strip_html(paragraph.get_text(" ", strip=True))
        if text:
            points.append(text)
    if points:
        return points[:12]
    text = _strip_html(str(raw_html))
    return [text] if text else []


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


def _extract_shop_currency(html_text: str) -> str | None:
    """Read Shopify's active storefront currency from theme bootstrapping scripts."""
    for pattern in (
        r'Shopify\.currency\s*=\s*\{[^}]*"active"\s*:\s*"([A-Z]{3})"',
        r'"currencyCode"\s*:\s*"([A-Z]{3})"',
        r'"currency"\s*:\s*"([A-Z]{3})"',
    ):
        match = re.search(pattern, html_text)
        if match:
            return match.group(1)
    return None


def _extract_shopify_policy_text(html: str) -> str:
    """Pull policy body text; avoid head meta / og tags that pollute RAG."""
    soup = BeautifulSoup(html, "lxml")
    for selector in (
        ".shopify-policy__body",
        ".shopify-policy__container .rte",
        "main .rte",
        "article .rte",
        "main",
    ):
        node = soup.select_one(selector)
        if node is None:
            continue
        text = _strip_html(node.get_text("\n", strip=True))
        if len(text) > 40 and "og:site_name" not in text.casefold():
            return text
    if soup.body:
        text = _strip_html(soup.body.get_text("\n", strip=True))
        if len(text) > 40 and "og:site_name" not in text.casefold():
            return text
    return ""


def _parse_homepage_meta(
    html_text: str, base_url: str
) -> tuple[str | None, str | None, str | None]:
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


def _normalize_product(
    node: dict[str, Any], *, base_url: str, currency: str = "USD"
) -> DemoProductSnapshot | None:
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
    image_urls = _extract_image_urls_from_node(node)
    image_url = image_urls[0] if image_urls else None
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
    body_html = str(node.get("body_html") or "")
    description_points = _extract_description_points(body_html)
    excerpt = body[:400] if body else None
    pid = node.get("id")
    shopify_id = int(pid) if isinstance(pid, int) else None
    store_currency = (currency or "USD").strip().upper() or "USD"
    return DemoProductSnapshot(
        shopify_product_id=shopify_id,
        handle=handle,
        title=title,
        url=_product_page_url(base_url, handle),
        image_url=image_url,
        image_urls=image_urls,
        min_price=min_price,
        max_price=max_price,
        currency=store_currency,
        vendor=str(node.get("vendor") or "").strip() or None,
        product_type=str(node.get("product_type") or "").strip() or None,
        tags=_parse_tags(node.get("tags")),
        options=options,
        variants=variants,
        description_excerpt=excerpt,
        description_points=description_points,
    )


async def fetch_storefront_product_enrichment(
    store_url: str,
    handle: str,
    *,
    timeout: float = 8.0,
) -> dict[str, Any] | None:
    """Live product JSON for gallery images and structured description bullets."""
    safe_handle = (handle or "").strip()
    if not safe_handle:
        return None
    base_url = _normalize_store_url(store_url)
    url = urljoin(base_url.rstrip("/") + "/", f"products/{safe_handle}.json")
    try:
        async with httpx.AsyncClient(
            headers=_CRAWL_HEADERS,
            follow_redirects=True,
            timeout=timeout,
        ) as client:
            resp = await client.get(url)
            if resp.status_code == 404:
                return None
            resp.raise_for_status()
            payload = resp.json()
    except (httpx.HTTPError, json.JSONDecodeError):
        return None
    product = payload.get("product") if isinstance(payload, dict) else None
    if not isinstance(product, dict):
        return None
    image_urls = _extract_image_urls_from_node(product)
    description_points = _extract_description_points(str(product.get("body_html") or ""))
    enriched: dict[str, Any] = {}
    if image_urls:
        enriched["image_urls"] = image_urls
    if description_points:
        enriched["description_points"] = description_points
    return enriched or None


async def _fetch_products_json(
    client: httpx.AsyncClient, base_url: str, *, currency: str = "USD"
) -> list[DemoProductSnapshot]:
    products: list[DemoProductSnapshot] = []
    page = 1
    while page <= DEMO_PRODUCTS_JSON_MAX_PAGES and len(products) < DEMO_MAX_PRODUCTS:
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
            if len(products) >= DEMO_MAX_PRODUCTS:
                break
            if not isinstance(node, dict):
                continue
            normalized = _normalize_product(node, base_url=base_url, currency=currency)
            if normalized is not None:
                products.append(normalized)
        if len(batch) < 250 or len(products) >= DEMO_MAX_PRODUCTS:
            break
        page += 1
    return products


async def _fetch_homepage_meta(
    client: httpx.AsyncClient, base_url: str
) -> tuple[str | None, str | None, str | None, str | None]:
    try:
        resp = await client.get(base_url)
        resp.raise_for_status()
        html_text = resp.text
    except httpx.HTTPError:
        return None, None, None, None
    display_name, logo, brand_color = _parse_homepage_meta(html_text, base_url)
    currency = _extract_shop_currency(html_text)
    return display_name, logo, brand_color, currency


async def _fetch_policies(client: httpx.AsyncClient, base_url: str) -> dict[str, str]:
    policies: dict[str, str] = {}
    for key, path in _POLICY_PATHS:
        url = urljoin(base_url.rstrip("/") + "/", path.lstrip("/"))
        try:
            resp = await client.get(url)
            if resp.status_code >= 400:
                continue
            text = _extract_shopify_policy_text(resp.text)
            if not text:
                text = _extract_page_text(resp.text)
            if text and len(text.strip()) > 40 and "og:site_name" not in text.casefold():
                policies[key] = text.strip()
        except httpx.HTTPError:
            continue
    return policies


def discover_policy_page_urls(html: str, base_url: str) -> list[str]:
    """Footer /pages/* links that look like return, shipping, or policy pages."""
    if not html.strip():
        return []
    soup = BeautifulSoup(html, "lxml")
    found: list[str] = []
    seen: set[str] = set()
    for anchor in soup.find_all("a", href=True):
        href = str(anchor.get("href") or "").strip()
        if not href or href.startswith(("#", "mailto:", "tel:")):
            continue
        absolute = urljoin(base_url.rstrip("/") + "/", href)
        parsed = urlparse(absolute)
        if parsed.netloc and parsed.netloc.casefold() != urlparse(base_url).netloc.casefold():
            continue
        path = (parsed.path or "").casefold()
        if "/pages/" not in path:
            continue
        if not any(
            seg in path
            for seg in (
                "return",
                "refund",
                "shipping",
                "exchange",
                "privacy",
                "terms",
                "policy",
                "delivery",
            )
        ):
            continue
        clean = f"{parsed.scheme}://{parsed.netloc}{parsed.path.rstrip('/')}"
        if clean not in seen:
            seen.add(clean)
            found.append(clean)
    return found[:4]


async def _fetch_policies_and_pages(client: httpx.AsyncClient, base_url: str) -> dict[str, str]:
    """Standard policy URLs plus /pages/* policy links from the homepage."""
    policies = await _fetch_policies(client, base_url)
    try:
        home_resp = await client.get(base_url)
        if home_resp.status_code >= 400:
            return policies
        home_html = home_resp.text
    except httpx.HTTPError:
        return policies

    for url in discover_policy_page_urls(home_html, base_url):
        try:
            resp = await client.get(url)
            if resp.status_code >= 400:
                continue
            text = _extract_shopify_policy_text(resp.text) or _extract_page_text(resp.text)
            if not text or len(text.strip()) < 40:
                continue
            path = urlparse(url).path.casefold()
            if any(k in path for k in ("return", "refund", "exchange")):
                key = "refund"
            elif any(k in path for k in ("ship", "deliver")):
                key = "shipping"
            elif "privacy" in path:
                key = "privacy"
            elif "terms" in path:
                key = "terms"
            else:
                key = "policy_page"
            if key not in policies or len(text) > len(policies.get(key, "")):
                policies[key] = text.strip()
        except httpx.HTTPError:
            continue
    return policies


def _format_price_for_index(product: DemoProductSnapshot) -> str:
    if not product.min_price:
        return ""
    currency = (product.currency or "USD").strip().upper()
    if currency == "USD":
        return f"${product.min_price}"
    return f"{product.min_price} {currency}"


def product_to_index_text(product: DemoProductSnapshot) -> str:
    lines = [
        f"Product: {product.title}",
        f"Handle: {product.handle}",
        f"URL: {product.url}",
    ]
    price_line = _format_price_for_index(product)
    if price_line:
        lines.append(f"Price: {price_line}")
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
    if not prompts:
        prompts.append("What products do you carry?")
    return prompts[:4]


async def _probe_catalog_product_count(
    client: httpx.AsyncClient, base_url: str
) -> int:
    url = urljoin(base_url.rstrip("/") + "/", "products.json?limit=250&page=1")
    try:
        resp = await client.get(url)
        if resp.status_code >= 400:
            return 0
        payload = resp.json()
    except (httpx.HTTPError, json.JSONDecodeError):
        return 0
    batch = payload.get("products") if isinstance(payload, dict) else None
    if not isinstance(batch, list):
        return 0
    return len(batch)


class DemoProvisionIngestResult:
    def __init__(
        self,
        *,
        base_url: str,
        display_name: str | None,
        logo_url: str | None,
        brand_color: str | None,
        policies: dict[str, str],
        product_count_estimate: int,
        ingest_source: str,
    ) -> None:
        self.base_url = base_url
        self.display_name = display_name
        self.logo_url = logo_url
        self.brand_color = brand_color
        self.policies = policies
        self.product_count_estimate = product_count_estimate
        self.ingest_source = ingest_source

    @property
    def ok(self) -> bool:
        return self.product_count_estimate >= DEMO_MIN_PRODUCT_COUNT


async def ingest_demo_for_provision(store_url: str) -> DemoProvisionIngestResult:
    """Branding, policies, and catalog eligibility only (no full product fetch)."""
    base_url = _normalize_store_url(store_url)
    async with httpx.AsyncClient(timeout=25, follow_redirects=True, headers=_CRAWL_HEADERS) as client:
        display_name, logo_url, brand_color, _currency_code = await _fetch_homepage_meta(client, base_url)
        policies = await _fetch_policies_and_pages(client, base_url)
        product_count = await _probe_catalog_product_count(client, base_url)
        ingest_source = "products_json_probe"

        if product_count < DEMO_MIN_PRODUCT_COUNT:
            ingest_source = "mixed" if product_count else "crawl_fallback"
            log.warning(
                "demo.products_json_sparse",
                store_url=base_url,
                product_count=product_count,
            )

    if not display_name:
        display_name = urlparse(base_url).netloc.replace("www.", "")

    return DemoProvisionIngestResult(
        base_url=base_url,
        display_name=display_name,
        logo_url=logo_url,
        brand_color=brand_color,
        policies=policies,
        product_count_estimate=product_count,
        ingest_source=ingest_source,
    )


async def fetch_storefront_product_catalog(store_url: str) -> list[DemoProductSnapshot]:
    """Full public product catalog (called when the demo page loads)."""
    base_url = _normalize_store_url(store_url)
    async with httpx.AsyncClient(timeout=45, follow_redirects=True, headers=_CRAWL_HEADERS) as client:
        _display_name, _logo, _brand, currency_code = await _fetch_homepage_meta(client, base_url)
        store_currency = (currency_code or "USD").strip().upper() or "USD"
        return await _fetch_products_json(client, base_url, currency=store_currency)


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
        self.catalog_product_count = len(products)

    @property
    def ok(self) -> bool:
        return len(self.products) >= DEMO_MIN_PRODUCT_COUNT


async def ingest_public_storefront(store_url: str) -> StorefrontIngestResult:
    base_url = _normalize_store_url(store_url)
    async with httpx.AsyncClient(timeout=25, follow_redirects=True, headers=_CRAWL_HEADERS) as client:
        display_name, logo_url, brand_color, currency_code = await _fetch_homepage_meta(client, base_url)
        store_currency = (currency_code or "USD").strip().upper() or "USD"
        products = await _fetch_products_json(client, base_url, currency=store_currency)
        ingest_source = "products_json"
        policies = await _fetch_policies_and_pages(client, base_url)

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
