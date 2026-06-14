"""Pro-only widget appearance parsing for public embed config."""

from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field

WidgetThemeMode = Literal["light", "dark"]
WidgetFontFamily = Literal["geist", "system", "inter", "roboto", "open-sans", "lato"]

THEME_DEFAULTS: dict[WidgetThemeMode, dict[str, str]] = {
    "light": {
        "panel_background": "#FFFFFF",
        "assistant_bubble": "#FFFFFF",
        "assistant_bubble_border": "#E5E5E5",
        "composer_background": "#FFFFFF",
        "text_primary": "#000000",
        "text_muted": "#6B6B6B",
    },
    "dark": {
        "panel_background": "#0F172A",
        "assistant_bubble": "#1E293B",
        "assistant_bubble_border": "#334155",
        "composer_background": "#1E293B",
        "text_primary": "#F8FAFC",
        "text_muted": "#94A3B8",
    },
}

VALID_THEME_MODES = frozenset({"light", "dark"})
VALID_FONT_FAMILIES = frozenset({"geist", "system", "inter", "roboto", "open-sans", "lato"})
COLOR_KEYS = (
    "header",
    "user_bubble",
    "panel_background",
    "assistant_bubble",
    "assistant_bubble_border",
    "composer_background",
)


def advanced_appearance_enabled_for_plan_slug(plan_slug: str | None) -> bool:
    """Pro / Scale: fonts, granular widget colors."""
    s = (plan_slug or "").strip().lower()
    return s in ("pro", "scale")


def _normalize_hex(raw: object) -> str | None:
    if not isinstance(raw, str):
        return None
    cleaned = "".join(c for c in raw.upper() if c in "0123456789ABCDEF")[:6]
    return f"#{cleaned}" if len(cleaned) == 6 else None


def _normalize_theme_mode(raw: object) -> WidgetThemeMode:
    v = str(raw or "").strip().lower()
    return "dark" if v == "dark" else "light"


def _normalize_font_family(raw: object) -> WidgetFontFamily:
    v = str(raw or "").strip().lower().replace("_", "-")
    if v in VALID_FONT_FAMILIES:
        return v  # type: ignore[return-value]
    return "geist"


class PublicWidgetAppearanceColors(BaseModel):
    model_config = ConfigDict(extra="forbid")

    header: str | None = None
    user_bubble: str | None = None
    panel_background: str | None = None
    assistant_bubble: str | None = None
    assistant_bubble_border: str | None = None
    composer_background: str | None = None


class PublicWidgetAppearance(BaseModel):
    model_config = ConfigDict(extra="forbid")

    theme_mode: WidgetThemeMode = "light"
    font_family: WidgetFontFamily = "geist"
    colors: PublicWidgetAppearanceColors | None = None


def parse_widget_appearance_from_behavior(
    behavior: dict[str, Any],
) -> PublicWidgetAppearance | None:
    raw = behavior.get("widget_appearance")
    if not isinstance(raw, dict):
        return None
    theme_mode = _normalize_theme_mode(raw.get("theme_mode"))
    font_family = _normalize_font_family(raw.get("font_family"))
    colors_raw = raw.get("colors")
    colors: dict[str, str] = {}
    if isinstance(colors_raw, dict):
        for key in COLOR_KEYS:
            hex_val = _normalize_hex(colors_raw.get(key))
            if hex_val:
                colors[key] = hex_val
    appearance = PublicWidgetAppearance(
        theme_mode=theme_mode,
        font_family=font_family,
        colors=PublicWidgetAppearanceColors(**colors) if colors else None,
    )
    if (
        appearance.theme_mode == "light"
        and appearance.font_family == "geist"
        and appearance.colors is None
    ):
        return None
    return appearance


def _mix_hex(foreground: str, background: str, foreground_weight: float) -> str:
    fg = foreground.lstrip("#")
    bg = background.lstrip("#")
    w = max(0.0, min(1.0, foreground_weight))
    parts: list[str] = []
    for i in (0, 2, 4):
        blended = round(int(fg[i : i + 2], 16) * w + int(bg[i : i + 2], 16) * (1.0 - w))
        parts.append(f"{blended:02X}")
    return f"#{''.join(parts)}"


def default_accent_panel_background(brand_color: str, theme_mode: WidgetThemeMode = "light") -> str:
    """Light chat panel: 5% accent, 95% white."""
    if theme_mode == "dark":
        return _mix_hex(brand_color, "#0F172A", 0.05)
    return _mix_hex(brand_color, "#FFFFFF", 0.05)


def resolve_widget_appearance_colors(
    appearance: PublicWidgetAppearance | None,
    brand_color: str | None,
) -> dict[str, str]:
    brand = _normalize_hex(brand_color) if brand_color else None
    brand = brand or "#831C91"
    theme_mode = appearance.theme_mode if appearance else "light"
    base = THEME_DEFAULTS[theme_mode]
    custom = appearance.colors.model_dump(exclude_none=True) if appearance and appearance.colors else {}
    return {
        "header": brand,
        "user_bubble": custom.get("user_bubble") or brand,
        "panel_background": custom.get("panel_background") or default_accent_panel_background(brand, theme_mode),
        "assistant_bubble": custom.get("assistant_bubble") or base["assistant_bubble"],
        "assistant_bubble_border": custom.get("assistant_bubble_border") or base["assistant_bubble_border"],
        "composer_background": custom.get("composer_background") or base["composer_background"],
        "text_primary": base["text_primary"],
        "text_muted": base["text_muted"],
    }


def strip_widget_appearance_from_behavior(behavior: dict[str, Any]) -> dict[str, Any]:
    if "widget_appearance" not in behavior:
        return behavior
    out = dict(behavior)
    del out["widget_appearance"]
    return out
