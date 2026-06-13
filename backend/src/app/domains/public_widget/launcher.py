"""Storefront widget launcher shape and attention animation (behavior_settings)."""

from typing import Any

WIDGET_BORDER_RADIUS_MIN = 0
WIDGET_BORDER_RADIUS_MAX = 28
WIDGET_BORDER_RADIUS_DEFAULT = WIDGET_BORDER_RADIUS_MAX


def _clamp_border_radius(value: int) -> int:
    return max(WIDGET_BORDER_RADIUS_MIN, min(WIDGET_BORDER_RADIUS_MAX, value))


def resolve_widget_border_radius(behavior: dict[str, Any]) -> int:
    raw = behavior.get("widget_border_radius")
    if raw is None:
        return WIDGET_BORDER_RADIUS_DEFAULT
    if isinstance(raw, bool):
        return WIDGET_BORDER_RADIUS_DEFAULT
    if isinstance(raw, (int, float)):
        return _clamp_border_radius(int(raw))
    if isinstance(raw, str):
        stripped = raw.strip()
        if not stripped:
            return WIDGET_BORDER_RADIUS_DEFAULT
        try:
            return _clamp_border_radius(int(float(stripped)))
        except ValueError:
            return WIDGET_BORDER_RADIUS_DEFAULT
    return WIDGET_BORDER_RADIUS_DEFAULT


def resolve_widget_animation_enabled(behavior: dict[str, Any]) -> bool:
    raw = behavior.get("widget_animation_enabled")
    if raw is None:
        return True
    if isinstance(raw, bool):
        return raw
    if isinstance(raw, (int, float)):
        return bool(raw)
    if isinstance(raw, str):
        lowered = raw.strip().lower()
        if lowered in ("0", "false", "no", "off"):
            return False
        if lowered in ("1", "true", "yes", "on"):
            return True
    return True
