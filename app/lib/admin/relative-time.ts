// Tiny, dependency-free relative-time renderer used by the admin Overview/System
// pages. We deliberately don't pull in `date-fns` for two strings.

const SECOND = 1_000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

export function formatRelative(
  iso: string | null | undefined,
  emptyPlaceholder: string = "Never"
): string {
  if (!iso) return emptyPlaceholder;
  const ts = Date.parse(iso);
  if (Number.isNaN(ts)) return iso;
  const now = Date.now();
  const diff = now - ts;
  if (diff < 0) return "in the future";
  if (diff < MINUTE) {
    const s = Math.max(1, Math.floor(diff / SECOND));
    return `${s}s ago`;
  }
  if (diff < HOUR) {
    const m = Math.floor(diff / MINUTE);
    return `${m}m ago`;
  }
  if (diff < DAY) {
    const h = Math.floor(diff / HOUR);
    return `${h}h ago`;
  }
  const d = Math.floor(diff / DAY);
  return `${d}d ago`;
}

/** Returns true when the timestamp is older than `thresholdMs` (defaults to 10 minutes). */
export function isStale(
  iso: string | null | undefined,
  thresholdMs: number = 10 * MINUTE
): boolean {
  if (!iso) return true;
  const ts = Date.parse(iso);
  if (Number.isNaN(ts)) return true;
  return Date.now() - ts > thresholdMs;
}
