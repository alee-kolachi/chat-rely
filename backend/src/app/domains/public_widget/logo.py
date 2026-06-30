"""Resolve widget header logo from merchant upload or website favicon."""

from __future__ import annotations

from typing import Any


def widget_logo_url_from_behavior(behavior: dict[str, Any] | None) -> str | None:
    if not behavior:
        return None
    raw = behavior.get("widget_logo_url")
    if isinstance(raw, str):
        trimmed = raw.strip()
        if trimmed:
            return trimmed
    return None


def resolve_widget_avatar_url(
    behavior: dict[str, Any] | None,
    *,
    website_favicon_url: str | None,
) -> str | None:
    custom = widget_logo_url_from_behavior(behavior)
    if custom:
        return custom
    favicon = (website_favicon_url or "").strip()
    return favicon or None
