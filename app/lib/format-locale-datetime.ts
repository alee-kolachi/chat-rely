/** Stable placeholder for SSR; real locale formatting runs only after client mount. */
export function formatLocaleDateTime(
  value: string | null | undefined,
  localeReady: boolean,
  options: Intl.DateTimeFormatOptions = {
    month: "short",
    day: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  },
  emptyLabel = "Not indexed yet"
): string {
  if (!value) return emptyLabel;
  if (!localeReady) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return emptyLabel;
  return d.toLocaleString(undefined, options);
}

export function formatLocaleTime(
  value: string | null | undefined,
  localeReady: boolean
): string {
  if (!value) return "—";
  if (!localeReady) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

/** ISO timestamp for a newly sent chat message. */
export function messageCreatedAtIso(iso?: string): string {
  return iso ?? new Date().toISOString();
}

const MESSAGE_TIME_OPTIONS: Intl.DateTimeFormatOptions = {
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
};

/** Bubble timestamp with date and 12-hour time, e.g. "May 31 · 7:24 PM". */
export function formatMessageTimestamp(
  value: string | null | undefined,
  localeReady: boolean,
  now: Date = new Date()
): string {
  if (!value || !localeReady) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";

  const time = d.toLocaleTimeString(undefined, MESSAGE_TIME_OPTIONS);
  const datePart = d.toLocaleDateString(
    undefined,
    d.getFullYear() === now.getFullYear()
      ? { month: "short", day: "numeric" }
      : { month: "short", day: "numeric", year: "numeric" }
  );
  return `${datePart} · ${time}`;
}

export function formatLocaleDate(
  value: string | null | undefined,
  localeReady: boolean,
  options: Intl.DateTimeFormatOptions = { dateStyle: "medium" },
  emptyLabel = "—"
): string {
  if (!value) return emptyLabel;
  if (!localeReady) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return emptyLabel;
  return d.toLocaleDateString(undefined, options);
}

export function formatLocaleNumber(
  value: number,
  localeReady: boolean,
  options?: Intl.NumberFormatOptions
): string {
  if (!localeReady) return "—";
  return value.toLocaleString(undefined, options);
}

export function formatLocaleCurrency(
  cents: number,
  localeReady: boolean,
  currency = "USD"
): string {
  if (!localeReady) return "—";
  return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(cents / 100);
}
