export const WIDGET_BORDER_RADIUS_MIN = 0;
export const WIDGET_BORDER_RADIUS_MAX = 28;
export const WIDGET_BORDER_RADIUS_DEFAULT = WIDGET_BORDER_RADIUS_MAX;

export const WIDGET_BORDER_RADIUS_PRESETS = [
  { value: 0, label: "Square" },
  { value: 12, label: "Rounded" },
  { value: 28, label: "Circle" },
] as const;

export function clampWidgetBorderRadius(value: number): number {
  if (!Number.isFinite(value)) return WIDGET_BORDER_RADIUS_DEFAULT;
  return Math.max(
    WIDGET_BORDER_RADIUS_MIN,
    Math.min(WIDGET_BORDER_RADIUS_MAX, Math.round(value))
  );
}

export function readWidgetBorderRadius(
  behavior: Record<string, unknown> | null | undefined
): number {
  const raw = behavior?.widget_border_radius;
  if (raw == null || raw === "") return WIDGET_BORDER_RADIUS_DEFAULT;
  if (typeof raw === "number") return clampWidgetBorderRadius(raw);
  if (typeof raw === "string") {
    const parsed = Number.parseInt(raw.trim(), 10);
    if (Number.isFinite(parsed)) return clampWidgetBorderRadius(parsed);
  }
  return WIDGET_BORDER_RADIUS_DEFAULT;
}

export function readWidgetAnimationEnabled(
  behavior: Record<string, unknown> | null | undefined
): boolean {
  const raw = behavior?.widget_animation_enabled;
  if (raw == null) return true;
  if (typeof raw === "boolean") return raw;
  if (typeof raw === "number") return raw !== 0;
  if (typeof raw === "string") {
    const lowered = raw.trim().toLowerCase();
    if (["0", "false", "no", "off"].includes(lowered)) return false;
    if (["1", "true", "yes", "on"].includes(lowered)) return true;
  }
  return true;
}
