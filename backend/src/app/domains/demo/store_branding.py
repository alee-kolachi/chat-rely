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

_LIGHT_LOGO_MARKERS = (
    "-white",
    "_white",
    "white-",
    "white_",
    "/white/",
    "logo-white",
    "logo_white",
    "inverted",
    "reverse",
)

_SECONDARY_LOGO_HINTS = (
    "--secondary",
    "logoimage--secondary",
    "logo--secondary",
    "logo-secondary",
    "logo_secondary",
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


def _hex_to_rgb(hex_color: str) -> tuple[int, int, int]:
    value = hex_color.lstrip("#")
    return int(value[0:2], 16), int(value[2:4], 16), int(value[4:6], 16)


def _rgb_to_hex(r: int, g: int, b: int) -> str:
    return f"#{max(0, min(255, r)):02x}{max(0, min(255, g)):02x}{max(0, min(255, b)):02x}"


def _color_luminance_yiq(hex_color: str) -> float:
    r, g, b = _hex_to_rgb(hex_color)
    return (r * 299 + g * 587 + b * 114) / 1000


def refine_demo_brand_color(hex_color: str | None) -> str | None:
    """Darken auto-extracted primaries that are too light for welcome gradients (e.g. yellow)."""
    normalized = _normalize_hex_color(hex_color)
    if not normalized:
        return None
    yiq = _color_luminance_yiq(normalized)
    if yiq <= 140:
        return normalized
    # Light colors get more black mixed in; already-dark colors are unchanged above.
    mix_black = 0.15 + min(1.0, (yiq - 140) / 115) * 0.35
    r, g, b = _hex_to_rgb(normalized)
    keep = 1.0 - mix_black
    return _rgb_to_hex(int(r * keep), int(g * keep), int(b * keep))


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
    value = raw.strip()
    if value.startswith("//"):
        value = f"https:{value}"
    absolute = urljoin(base_url, value)
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
    srcset = tag.get("srcset")
    if srcset:
        best = _best_srcset_url(str(srcset))
        if best:
            return best
    for attr in ("src", "data-src", "data-srcset"):
        raw = tag.get(attr)
        if not raw:
            continue
        value = str(raw).strip()
        if not value:
            continue
        if attr == "data-srcset":
            value = _best_srcset_url(value) or value.split(",")[0].strip().split()[0]
        return value
    return None


def _best_srcset_url(srcset: str) -> str | None:
    """Pick the highest-density URL from an img srcset attribute."""
    best_url: str | None = None
    best_density = -1.0
    for part in srcset.split(","):
        chunk = part.strip()
        if not chunk:
            continue
        pieces = chunk.split()
        if not pieces:
            continue
        url = pieces[0].strip()
        density = 1.0
        if len(pieces) >= 2:
            descriptor = pieces[1].strip().lower()
            if descriptor.endswith("x"):
                try:
                    density = float(descriptor[:-1])
                except ValueError:
                    density = 1.0
            elif descriptor.endswith("w"):
                try:
                    density = float(descriptor[:-1])
                except ValueError:
                    density = 1.0
        if density >= best_density and url:
            best_density = density
            best_url = url
    return best_url


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


def is_light_background_logo_url(url: str | None) -> bool:
    """True when the asset is a white/inverted mark meant for dark headers."""
    if not url or not str(url).strip():
        return False
    lowered = str(url).strip().casefold()
    return any(marker in lowered for marker in _LIGHT_LOGO_MARKERS)


def upgrade_logo_asset_url(url: str | None) -> str | None:
    """Prefer full-size Shopify CDN assets over tiny header thumbnails."""
    if not url or not str(url).strip():
        return None
    value = str(url).strip()
    if value.startswith("//"):
        value = f"https:{value}"
    if "@2x." in value.casefold():
        return value
    upgraded = re.sub(
        r"(_(?:\d+)x(?:@\d+x)?)(\.(?:png|jpe?g|webp|gif|svg))",
        r"\2",
        value,
        count=1,
        flags=re.I,
    )
    return upgraded or value


def _logo_tag_score(tag: Tag) -> tuple[int, int]:
    attrs = " ".join(
        [
            str(tag.get("class") or ""),
            str(tag.get("id") or ""),
            str(tag.get("alt") or ""),
            str(tag.get("src") or ""),
        ]
    ).casefold()
    if not any(hint in attrs for hint in _HEADER_LOGO_HINTS):
        return (99, 99)
    if any(hint in attrs for hint in _SECONDARY_LOGO_HINTS):
        return (0, 0)
    if is_light_background_logo_url(attrs):
        return (1, 1)
    return (0, 1)


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
    candidates: list[tuple[tuple[int, int], str]] = []
    for tag in soup.find_all("img"):
        src = _img_src(tag)
        if not src:
            continue
        absolute = _absolute_asset_url(src, base_url)
        if not absolute or is_generic_logo_url(absolute):
            continue
        score = _logo_tag_score(tag)
        if score[0] >= 99:
            continue
        candidates.append((score, absolute))
    if not candidates:
        return None
    candidates.sort(key=lambda item: item[0])
    return candidates[0][1]


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
    header = extract_header_logo_url(soup, base_url)
    favicon = extract_favicon_url(soup, base_url)

    if header and not is_light_background_logo_url(header):
        return upgrade_logo_asset_url(header)

    if favicon and not is_generic_logo_url(favicon):
        return upgrade_logo_asset_url(favicon)

    if header:
        return upgrade_logo_asset_url(header)

    if social_preview_url and not is_generic_logo_url(social_preview_url):
        return upgrade_logo_asset_url(social_preview_url)

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
            return refine_demo_brand_color(candidate)
    return None


def store_initials(display_name: str) -> str:
    words = [part for part in re.split(r"\s+", display_name.strip()) if part]
    if not words:
        return "?"
    if len(words) == 1:
        return words[0][:2].upper()
    return f"{words[0][0]}{words[1][0]}".upper()
