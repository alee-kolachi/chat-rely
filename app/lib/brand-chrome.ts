/** YIQ luminance — light text on darker fills, dark text on light/pastel fills */
export function brandChromeClasses(hex: string) {
  const h = hex.replace("#", "").toUpperCase();
  if (h.length !== 6 || !/^[0-9A-F]{6}$/.test(h)) {
    return {
      titleClass: "text-white",
      dotClass: "bg-emerald-300",
      fabIconClass: "text-white",
      lightBg: false,
      headerIconButtonClass: "hover:bg-white/15 text-white/90",
    } as const;
  }
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  const lightBg = yiq >= 175;
  return {
    titleClass: lightBg ? "text-ds-on-surface" : "text-white",
    dotClass: lightBg ? "bg-emerald-600" : "bg-emerald-300",
    fabIconClass: lightBg ? "text-ds-on-surface" : "text-white",
    lightBg,
    headerIconButtonClass: lightBg ? "hover:bg-black/[0.06] text-ds-on-surface-variant" : "hover:bg-white/15 text-white/90",
  } as const;
}

/** Normalize stored brand color to `#RRGGBB` or null. */
export function parseBrandColorHex(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const cleaned = raw.replace(/[^0-9A-Fa-f]/g, "").slice(0, 6);
  if (cleaned.length !== 6) return null;
  return `#${cleaned.toUpperCase()}`;
}

export function previewAssistantLineForTone(tone: string | null | undefined): string {
  const t = (tone ?? "").trim().toLowerCase();
  if (t === "professional") return "Hello— how may I assist you today?";
  if (t === "concise") return "Hi. What do you need?";
  return "Thanks for reaching out— how can I help?";
}
