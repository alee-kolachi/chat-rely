// Display helpers for the admin Costing surfaces. Backend ships USD as `float`;
// every place we render it goes through these so the table layout stays consistent
// (sub-cent precision for tiny values, cents for normal amounts, thousands separators
// for big aggregates).

const DASH = "—";

export type FormatCostUsdOptions = {
  /** When true, drop trailing zeros — useful for inline footers. */
  compact?: boolean;
  /** Render `null`/`undefined` as this string. Defaults to em-dash. */
  emptyPlaceholder?: string;
};

/**
 * Render a USD float as a display string.
 *  - Less than $0.01 → 4 decimals (e.g. `$0.0042`)
 *  - $0.01 .. $99.99 → 2 decimals (e.g. `$12.34`)
 *  - $100+           → thousand-separated (e.g. `$1,234.56`)
 *  - Negative values keep the sign (`-$12.34`)
 */
export function formatCostUsd(
  value: number | null | undefined,
  opts: FormatCostUsdOptions = {}
): string {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return opts.emptyPlaceholder ?? DASH;
  }
  const sign = value < 0 ? "-" : "";
  const abs = Math.abs(value);
  let formatted: string;
  if (abs > 0 && abs < 0.01) {
    formatted = abs.toFixed(4);
  } else if (abs < 100) {
    formatted = abs.toFixed(2);
  } else {
    formatted = abs.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }
  if (opts.compact && formatted.includes(".")) {
    formatted = formatted.replace(/0+$/, "").replace(/\.$/, "");
  }
  return `${sign}$${formatted}`;
}

/**
 * Render a margin percentage (already in 0..100 / -∞..100 scale from the API).
 * `null` (revenue == 0) renders as the empty placeholder.
 */
export function formatMarginPct(
  value: number | null | undefined,
  opts: { emptyPlaceholder?: string } = {}
): string {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return opts.emptyPlaceholder ?? DASH;
  }
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(1)}%`;
}

export type MarginTone = "good" | "warn" | "bad" | "neutral";

/**
 * Map (margin_usd, margin_pct) to a UI badge tone.
 *  - bad  : losing money (margin_usd < 0)
 *  - warn : margin_pct < 25% (thin margin)
 *  - good : margin_pct >= 50%
 *  - neutral: in between, or revenue is 0 (no plan / pre-paying customer)
 *
 * The thresholds are intentionally simple — Phase 4 can wire them to alerting later.
 */
export function marginBadgeTone(
  marginUsd: number | null | undefined,
  marginPct: number | null | undefined
): MarginTone {
  if (marginUsd === null || marginUsd === undefined) return "neutral";
  if (marginUsd < 0) return "bad";
  if (marginPct === null || marginPct === undefined) return "neutral";
  if (marginPct >= 50) return "good";
  if (marginPct < 25) return "warn";
  return "neutral";
}

const TONE_CLASS: Record<MarginTone, string> = {
  good: "border border-emerald-200 bg-emerald-50 text-emerald-700",
  warn: "border border-amber-200 bg-amber-50 text-amber-700",
  bad: "border border-rose-200 bg-rose-50 text-rose-700",
  neutral: "border border-ds-outline bg-ds-surface text-ds-on-surface-variant",
};

/** Tailwind class string for a small inline margin pill. */
export function marginToneClass(tone: MarginTone): string {
  return TONE_CLASS[tone];
}

/** Render a delta (current - prior) as a small string with sign. */
export function formatDeltaUsd(delta: number | null | undefined): string {
  if (delta === null || delta === undefined || Number.isNaN(delta)) return DASH;
  const sign = delta > 0 ? "+" : delta < 0 ? "-" : "";
  return `${sign}${formatCostUsd(Math.abs(delta), { compact: true })}`;
}
