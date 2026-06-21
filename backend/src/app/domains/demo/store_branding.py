"""Store logo and brand color extraction for demo outreach."""

from __future__ import annotations

import re
from urllib.parse import urlparse, urljoin

from bs4 import BeautifulSoup, Tag

_GENERIC_LOGO_MARKERS = (
    "shopify-bag",
    "shopify_bag",
    "shopify-editions",
    "/s2/favicons",
    "gstatic.com/generate_204",
    "favicon.ico?0",
)

_ICON_REL_HINTS = (
    "apple-touch-icon",
    "apple-touch-icon-precomposed",
    "icon",
    "shortcut icon",
    "fluid-icon",
)

_HEADER_LOGO_HINTS = (
    "logo",
    "brand",
    "header__heading-logo",
    "site-header__logo",
    "header-logo",
)


def _normalize_hex_color(raw: str | None) -> str | None:
    if not raw:
        return None
    value = raw.strip()
    if not value:
        return None
    if value.startswith("#"):
        hex_part = value[1:]
    else:
        hex_part = value
    if len(hex_part) == 3 and re.fullmatch(r"[0-9a-fA-F]{3}", hex_part):
        hex_part = "".join(ch * 2 for ch in hex_part)
    if re.fullmatch(r"[0-9a-fA-F]{6}", hex_part):
        return f"#{hex_part.lower()}"
    return None


def is_generic_logo_url(url: str | None) -> bool:
    if not url or not str(url).strip():
        return True
    lowered = str(url).strip().casefold()
    if lowered.startswith("data:"):
        return False
    for marker in _GENERIC_LOGO_MARKERS:
        if marker in lowered:
            return True
    if "shopify.com" in lowered and "favicon" in lowered:
        return True
    return False


def _absolute_asset_url(raw: str, base_url: str) -> str | None:
    absolute = urljoin(base_url, raw.strip())
    parsed = urlparse(absolute)
    if parsed.scheme in {"http", "https"} and parsed.netloc:
        return absolute
    return None


def _link_href(tag: Tag) -> str | None:
    href = tag.get("href")
    if href and str(href).strip():
        return str(href).strip()
    return None


def _img_src(tag: Tag) -> str | None:
    for attr in ("src", "data-src", "data-srcset"):
        raw = tag.get(attr)
        if not raw:
            continue
        value = str(raw).strip()
        if not value:
            continue
        if attr == "data-srcset":
            value = value.split(",")[0].strip().split()[0]
        return value
    return None


def _rel_values(tag: Tag) -> list[str]:
    rel = tag.get("rel")
    if isinstance(rel, list):
        return [str(item).casefold() for item in rel]
    if rel:
        return [str(rel).casefold()]
    return []


def _icon_priority(rel: str) -> int:
    if "apple-touch-icon" in rel:
        return 0
    if "icon" in rel:
        return 1
    return 2


def extract_favicon_url(soup: BeautifulSoup, base_url: str) -> str | None:
    candidates: list[tuple[int, int, str]] = []
    for tag in soup.find_all("link", href=True):
        rel = " ".join(_rel_values(tag))
        if not any(hint in rel for hint in _ICON_REL_HINTS):
            continue
        href = _link_href(tag)
        if not href:
            continue
        absolute = _absolute_asset_url(href, base_url)
        if not absolute or is_generic_logo_url(absolute):
            continue
        size_raw = str(tag.get("sizes") or "")
        size_match = re.search(r"(\d+)\s*x\s*(\d+)", size_raw, re.I)
        size_score = -int(size_match.group(1)) if size_match else -32
        candidates.append((_icon_priority(rel), size_score, absolute))
    if not candidates:
        return None
    candidates.sort()
    return candidates[0][2]


def extract_header_logo_url(soup: BeautifulSoup, base_url: str) -> str | None:
    candidates: list[str] = []
    for tag in soup.find_all("img"):
        src = _img_src(tag)
        if not src:
            continue
        absolute = _absolute_asset_url(src, base_url)
        if not absolute or is_generic_logo_url(absolute):
            continue
        attrs = " ".join(
            [
                str(tag.get("class") or ""),
                str(tag.get("id") or ""),
                str(tag.get("alt") or ""),
                str(tag.get("src") or ""),
            ]
        ).casefold()
        if any(hint in attrs for hint in _HEADER_LOGO_HINTS):
            candidates.append(absolute)
    return candidates[0] if candidates else None


def extract_theme_color(soup: BeautifulSoup) -> str | None:
    for name in ("theme-color", "msapplication-TileColor"):
        tag = soup.find("meta", attrs={"name": name})
        if not tag:
            continue
        content = tag.get("content")
        if isinstance(content, str):
            color = _normalize_hex_color(content)
            if color:
                return color
    return None


def extract_shopify_theme_color(html_text: str) -> str | None:
    patterns = (
        r'"color_primary"\s*:\s*"([^"]+)"',
        r'"primary_color"\s*:\s*"([^"]+)"',
        r'"colors"\s*:\s*\{[^}]*"primary"\s*:\s*"([^"]+)"',
    )
    for pattern in patterns:
        match = re.search(pattern, html_text, re.I)
        if match:
            color = _normalize_hex_color(match.group(1))
            if color:
                return color
    return None


def pick_store_logo_url(
    *,
    soup: BeautifulSoup,
    base_url: str,
    social_preview_url: str | None,
) -> str | None:
    for candidate in (
        extract_header_logo_url(soup, base_url),
        extract_favicon_url(soup, base_url),
        social_preview_url,
    ):
        if candidate and not is_generic_logo_url(candidate):
            return candidate
    return None


def pick_brand_color(
    *,
    soup: BeautifulSoup,
    html_text: str,
) -> str | None:
    for candidate in (
        extract_theme_color(soup),
        extract_shopify_theme_color(html_text),
    ):
        if candidate:
            return candidate
    return None


def store_initials(display_name: str) -> str:
    words = [part for part in re.split(r"\s+", display_name.strip()) if part]
    if not words:
        return "?"
    if len(words) == 1:
        return words[0][:2].upper()
    return f"{words[0][0]}{words[1][0]}".upper()
