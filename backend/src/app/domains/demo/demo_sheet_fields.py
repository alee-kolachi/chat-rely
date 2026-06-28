"""Optional Google Sheet columns for demo outreach."""

from __future__ import annotations

from typing import Any
from urllib.parse import urlparse

SHEET_LOGO_LINK_HEADER = "logo link"
SHEET_INSTAGRAM_LINK_HEADER = "instagram link"


def normalize_sheet_logo_url(url: str | None) -> str | None:
    """Normalize a manual logo URL from the outreach sheet."""
    if not url or not str(url).strip():
        return None
    value = str(url).strip()
    if value.startswith("//"):
        value = f"https:{value}"
    parsed = urlparse(value)
    if parsed.scheme in {"http", "https"} and parsed.netloc:
        return value
    return None


def logo_link_from_sheet_snapshot(sheet_snapshot: dict[str, Any] | None) -> str | None:
    """Return the sheet Logo Link when the row provided one."""
    if not isinstance(sheet_snapshot, dict):
        return None
    raw = sheet_snapshot.get(SHEET_LOGO_LINK_HEADER)
    if raw is None:
        return None
    return normalize_sheet_logo_url(str(raw))


def normalize_instagram_url(url: str | None) -> str | None:
    """Normalize Instagram profile URLs from the outreach sheet."""
    if not url or not str(url).strip():
        return None
    value = str(url).strip()
    if value.startswith("@"):
        handle = value.lstrip("@").strip().split("/")[0]
        return f"https://www.instagram.com/{handle}/" if handle else None
    if value.startswith("//"):
        value = f"https:{value}"
    if not value.startswith(("http://", "https://")):
        if "instagram.com" in value.casefold():
            value = f"https://{value.lstrip('/')}"
        else:
            handle = value.lstrip("@").split("/")[0]
            return f"https://www.instagram.com/{handle}/" if handle else None
    parsed = urlparse(value)
    if parsed.scheme in {"http", "https"} and "instagram.com" in (parsed.netloc or "").casefold():
        return value
    return None


def instagram_link_from_sheet_snapshot(sheet_snapshot: dict[str, Any] | None) -> str | None:
    """Return the sheet Instagram Link when the row provided one."""
    if not isinstance(sheet_snapshot, dict):
        return None
    raw = sheet_snapshot.get(SHEET_INSTAGRAM_LINK_HEADER)
    if raw is None:
        return None
    return normalize_instagram_url(str(raw))


def build_demo_welcome_social_links(
    *,
    store_url: str,
    sheet_snapshot: dict[str, Any] | None,
) -> list[dict[str, str]]:
    """Welcome screen links: store website plus optional Instagram from the sheet."""
    links: list[dict[str, str]] = []
    website = normalize_sheet_logo_url(store_url)
    if website:
        links.append({"label": "Visit our website", "url": website})
    instagram = instagram_link_from_sheet_snapshot(sheet_snapshot)
    if instagram:
        links.append({"label": "Follow us on Instagram", "url": instagram})
    return links[:2]
