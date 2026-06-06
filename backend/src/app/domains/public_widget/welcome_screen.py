"""Welcome home screen copy for the embed widget (stored in behavior_settings JSON)."""

from typing import Any

DEFAULT_WELCOME_SCREEN_HEADLINE = "How can we help?"
DEFAULT_WELCOME_SCREEN_DESCRIPTION = "Ask about orders, products, or store policies."
DEFAULT_WELCOME_SCREEN_BUTTON_LABEL = "Chat with us"
DEFAULT_WELCOME_SCREEN_SOCIAL_LINKS: list[dict[str, str]] = [
    {"label": "Follow us on Instagram", "url": ""},
    {"label": "Follow us on TikTok", "url": ""},
]


def _read_bool(value: object, *, default: bool) -> bool:
    if isinstance(value, bool):
        return value
    return default


def resolve_welcome_screen_enabled(behavior: dict[str, Any] | None) -> bool:
    b = behavior if isinstance(behavior, dict) else {}
    return _read_bool(b.get("welcome_screen_enabled"), default=True)


def resolve_welcome_screen_headline(behavior: dict[str, Any] | None) -> str:
    b = behavior if isinstance(behavior, dict) else {}
    raw = b.get("welcome_screen_headline")
    if isinstance(raw, str) and raw.strip():
        return raw.strip()[:120]
    return DEFAULT_WELCOME_SCREEN_HEADLINE


def resolve_welcome_screen_description(behavior: dict[str, Any] | None) -> str:
    b = behavior if isinstance(behavior, dict) else {}
    raw = b.get("welcome_screen_description")
    if isinstance(raw, str) and raw.strip():
        return raw.strip()[:200]
    return DEFAULT_WELCOME_SCREEN_DESCRIPTION


def resolve_welcome_screen_button_label(behavior: dict[str, Any] | None) -> str:
    b = behavior if isinstance(behavior, dict) else {}
    raw = b.get("welcome_screen_button_label")
    if isinstance(raw, str) and raw.strip():
        return raw.strip()[:40]
    return DEFAULT_WELCOME_SCREEN_BUTTON_LABEL


def _normalize_social_link(raw: object, *, fallback_label: str) -> dict[str, str]:
    if not isinstance(raw, dict):
        return {"label": fallback_label, "url": ""}
    label_raw = raw.get("label")
    url_raw = raw.get("url")
    label = label_raw.strip()[:80] if isinstance(label_raw, str) and label_raw.strip() else fallback_label
    url = url_raw.strip()[:500] if isinstance(url_raw, str) else ""
    return {"label": label, "url": url}


def resolve_welcome_screen_social_links(behavior: dict[str, Any] | None) -> list[dict[str, str]]:
    b = behavior if isinstance(behavior, dict) else {}
    raw = b.get("welcome_screen_social_links")
    defaults = DEFAULT_WELCOME_SCREEN_SOCIAL_LINKS
    if not isinstance(raw, list):
        return [dict(item) for item in defaults]
    first = _normalize_social_link(raw[0] if len(raw) > 0 else None, fallback_label=defaults[0]["label"])
    second = _normalize_social_link(raw[1] if len(raw) > 1 else None, fallback_label=defaults[1]["label"])
    return [first, second]
