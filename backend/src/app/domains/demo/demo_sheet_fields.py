"""Optional Google Sheet columns for demo outreach."""

from __future__ import annotations

from typing import Any
from urllib.parse import urlparse

SHEET_LOGO_LINK_HEADER = "logo link"


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
