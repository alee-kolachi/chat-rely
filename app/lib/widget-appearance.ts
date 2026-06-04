/**
 * Pro-only widget appearance (theme, font, granular colors).
 * Stored in `behavior_settings.widget_appearance`.
 */

import { brandChromeClasses, formatHex, parseBrandColorHex } from "@/lib/brand-chrome";
import { planAllowsAdvancedAppearance } from "@/lib/widget-branding";

export type WidgetThemeMode = "light" | "dark";

export type WidgetFontFamily =
  | "geist"
  | "system"
  | "inter"
  | "roboto"
  | "open-sans"
  | "lato";

export type WidgetAppearanceColors = {
  header?: string;
  user_bubble?: string;
  panel_background?: string;
  assistant_bubble?: string;
  assistant_bubble_border?: string;
  composer_background?: string;
};

export type WidgetAppearanceSettings = {
  theme_mode?: WidgetThemeMode;
  font_family?: WidgetFontFamily;
  colors?: WidgetAppearanceColors;
};

export type ResolvedWidgetAppearance = {
  themeMode: WidgetThemeMode;
  fontFamily: WidgetFontFamily;
  colors: {
    header: string;
    userBubble: string;
    panelBackground: string;
    assistantBubble: string;
    assistantBubbleBorder: string;
    composerBackground: string;
    textPrimary: string;
    textMuted: string;
  };
};

export const WIDGET_FONT_OPTIONS: ReadonlyArray<{ value: WidgetFontFamily; label: string }> = [
  { value: "geist", label: "Geist (default)" },
  { value: "system", label: "System" },
  { value: "inter", label: "Inter" },
  { value: "roboto", label: "Roboto" },
  { value: "open-sans", label: "Open Sans" },
  { value: "lato", label: "Lato" },
] as const;

export const WIDGET_COLOR_RESOLVED_KEY: Record<
  keyof WidgetAppearanceColors,
  keyof ResolvedWidgetAppearance["colors"]
> = {
  header: "header",
  user_bubble: "userBubble",
  panel_background: "panelBackground",
  assistant_bubble: "assistantBubble",
  assistant_bubble_border: "assistantBubbleBorder",
  composer_background: "composerBackground",
};

export const WIDGET_COLOR_FIELDS: ReadonlyArray<{
  key: keyof WidgetAppearanceColors;
  label: string;
  hint: string;
  usesBrand?: boolean;
}> = [
  { key: "header", label: "Header", hint: "Top bar behind agent name.", usesBrand: true },
  { key: "user_bubble", label: "Visitor messages", hint: "Background for customer replies.", usesBrand: true },
  { key: "panel_background", label: "Chat background", hint: "Main conversation area." },
  { key: "assistant_bubble", label: "Assistant messages", hint: "Background for bot replies." },
  { key: "assistant_bubble_border", label: "Assistant border", hint: "Outline on bot reply bubbles." },
  { key: "composer_background", label: "Message input", hint: "Area behind the text field." },
] as const;

/** Grouped for the agent settings appearance UI. */
export const WIDGET_COLOR_GROUPS: ReadonlyArray<{
  title: string;
  description: string;
  fields: ReadonlyArray<(typeof WIDGET_COLOR_FIELDS)[number]["key"]>;
}> = [
  {
    title: "Header",
    description: "Top bar behind the agent name and actions.",
    fields: ["header"],
  },
  {
    title: "Chat background",
    description: "Main conversation panel behind messages.",
    fields: ["panel_background"],
  },
  {
    title: "Assistant messages",
    description: "Bot reply bubbles and their outline.",
    fields: ["assistant_bubble", "assistant_bubble_border"],
  },
  {
    title: "Visitor messages",
    description: "Background for customer reply bubbles.",
    fields: ["user_bubble"],
  },
  {
    title: "Message input",
    description: "Composer area behind the text field.",
    fields: ["composer_background"],
  },
] as const;

const THEME_DEFAULTS: Record<
  WidgetThemeMode,
  Omit<ResolvedWidgetAppearance["colors"], "header" | "userBubble">
> = {
  light: {
    panelBackground: "#FFFFFF",
    assistantBubble: "#FFFFFF",
    assistantBubbleBorder: "#E5E5E5",
    composerBackground: "#FFFFFF",
    textPrimary: "#000000",
    textMuted: "#6B6B6B",
  },
  dark: {
    panelBackground: "#0F172A",
    assistantBubble: "#1E293B",
    assistantBubbleBorder: "#334155",
    composerBackground: "#1E293B",
    textPrimary: "#F8FAFC",
    textMuted: "#94A3B8",
  },
};

const FONT_FAMILY_CSS: Record<WidgetFontFamily, string> = {
  geist: '"Geist Sans", ui-sans-serif, system-ui, sans-serif',
  system: 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  inter: '"Inter", ui-sans-serif, system-ui, sans-serif',
  roboto: '"Roboto", ui-sans-serif, system-ui, sans-serif',
  "open-sans": '"Open Sans", ui-sans-serif, system-ui, sans-serif',
  lato: '"Lato", ui-sans-serif, system-ui, sans-serif',
};

const GOOGLE_FONT_URLS: Partial<Record<WidgetFontFamily, string>> = {
  inter: "https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap",
  roboto: "https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap",
  "open-sans": "https://fonts.googleapis.com/css2?family=Open+Sans:wght@400;600;700&display=swap",
  lato: "https://fonts.googleapis.com/css2?family=Lato:wght@400;700&display=swap",
};

const VALID_THEME_MODES = new Set<WidgetThemeMode>(["light", "dark"]);
const VALID_FONT_FAMILIES = new Set<WidgetFontFamily>(
  WIDGET_FONT_OPTIONS.map((o) => o.value)
);

function readColor(raw: unknown): string | undefined {
  if (typeof raw !== "string") return undefined;
  return formatHex(raw) ?? undefined;
}

/** Live preview / resolved theme: full hex, or pad partial input for CSS. */
function resolveAppearanceColor(raw: string | undefined, fallback: string): string {
  if (!raw) return fallback;
  const strict = formatHex(raw);
  if (strict) return strict;
  const cleaned = raw.replace(/[^0-9A-Fa-f]/g, "").slice(0, 6);
  if (cleaned.length > 0) {
    return `#${cleaned.padEnd(6, "0").toUpperCase()}`;
  }
  return fallback;
}

export function normalizeWidgetThemeMode(raw: unknown): WidgetThemeMode {
  const v = typeof raw === "string" ? raw.trim().toLowerCase() : "";
  return VALID_THEME_MODES.has(v as WidgetThemeMode) ? (v as WidgetThemeMode) : "light";
}

export function normalizeWidgetFontFamily(raw: unknown): WidgetFontFamily {
  const v = typeof raw === "string" ? raw.trim().toLowerCase().replace(/_/g, "-") : "";
  return VALID_FONT_FAMILIES.has(v as WidgetFontFamily) ? (v as WidgetFontFamily) : "geist";
}

export function readWidgetAppearance(
  behavior: Record<string, unknown> | null | undefined
): WidgetAppearanceSettings {
  const raw = behavior?.widget_appearance;
  if (!raw || typeof raw !== "object") return {};
  const obj = raw as Record<string, unknown>;
  const colorsRaw = obj.colors;
  const colorsObj =
    colorsRaw && typeof colorsRaw === "object" ? (colorsRaw as Record<string, unknown>) : {};
  const colors: WidgetAppearanceColors = {};
  for (const field of WIDGET_COLOR_FIELDS) {
    const c = readColor(colorsObj[field.key]);
    if (c) colors[field.key] = c;
  }
  return {
    theme_mode: normalizeWidgetThemeMode(obj.theme_mode),
    font_family: normalizeWidgetFontFamily(obj.font_family),
    colors: Object.keys(colors).length > 0 ? colors : undefined,
  };
}

export function widgetAppearanceToPayload(
  settings: WidgetAppearanceSettings
): Record<string, unknown> | undefined {
  const theme_mode = normalizeWidgetThemeMode(settings.theme_mode);
  const font_family = normalizeWidgetFontFamily(settings.font_family);
  const colors: Record<string, string> = {};
  for (const field of WIDGET_COLOR_FIELDS) {
    const c = readColor(settings.colors?.[field.key]);
    if (c) colors[field.key] = c;
  }
  const hasColors = Object.keys(colors).length > 0;
  const isDefault = theme_mode === "light" && font_family === "geist" && !hasColors;
  if (isDefault) return undefined;
  return {
    theme_mode,
    font_family,
    ...(hasColors ? { colors } : {}),
  };
}

export function sanitizeWidgetAppearanceForPlan(
  behavior: Record<string, unknown>,
  planSlug: string | null | undefined
): Record<string, unknown> {
  if (planAllowsAdvancedAppearance(planSlug)) return behavior;
  if (!("widget_appearance" in behavior)) return behavior;
  const next = { ...behavior };
  delete next.widget_appearance;
  return next;
}

export function resolveWidgetAppearance(
  settings: WidgetAppearanceSettings | null | undefined,
  brandColorHex: string | null | undefined
): ResolvedWidgetAppearance {
  const brand = parseBrandColorHex(brandColorHex) ?? "#831C91";
  const themeMode = normalizeWidgetThemeMode(settings?.theme_mode);
  const fontFamily = normalizeWidgetFontFamily(settings?.font_family);
  const base = THEME_DEFAULTS[themeMode];
  const custom = settings?.colors ?? {};

  return {
    themeMode,
    fontFamily,
    colors: {
      header: resolveAppearanceColor(custom.header, brand),
      userBubble: resolveAppearanceColor(custom.user_bubble, brand),
      panelBackground: resolveAppearanceColor(custom.panel_background, base.panelBackground),
      assistantBubble: resolveAppearanceColor(custom.assistant_bubble, base.assistantBubble),
      assistantBubbleBorder: resolveAppearanceColor(
        custom.assistant_bubble_border,
        base.assistantBubbleBorder
      ),
      composerBackground: resolveAppearanceColor(
        custom.composer_background,
        base.composerBackground
      ),
      textPrimary: base.textPrimary,
      textMuted: base.textMuted,
    },
  };
}

/** Returns a field label if any custom color is present but not 6 hex digits. */
export function incompleteWidgetColorField(
  colors: WidgetAppearanceColors | undefined
): string | null {
  if (!colors) return null;
  for (const field of WIDGET_COLOR_FIELDS) {
    const raw = colors[field.key];
    if (!raw) continue;
    if (!formatHex(raw)) return field.label;
  }
  return null;
}

export function widgetFontFamilyCss(font: WidgetFontFamily): string {
  return FONT_FAMILY_CSS[font] ?? FONT_FAMILY_CSS.geist;
}

export function widgetGoogleFontUrl(font: WidgetFontFamily): string | null {
  return GOOGLE_FONT_URLS[font] ?? null;
}

export function contrastTextForBackground(hex: string): string {
  const h = hex.replace("#", "");
  if (h.length !== 6 || !/^[0-9A-Fa-f]{6}$/.test(h)) return "#FFFFFF";
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq >= 175 ? "#000000" : "#FFFFFF";
}

export function getWidgetPreviewContext(
  behavior: Record<string, unknown> | null | undefined,
  brandColorHex: string | null | undefined,
  planSlug: string | null | undefined
) {
  const brand = parseBrandColorHex(brandColorHex) ?? "#831C91";
  const appearance = planAllowsAdvancedAppearance(planSlug) ? readWidgetAppearance(behavior) : {};
  const resolved = resolveWidgetAppearance(appearance, brand);
  return {
    resolved,
    headerChrome: brandChromeClasses(resolved.colors.header),
    userChrome: brandChromeClasses(resolved.colors.userBubble),
  };
}
