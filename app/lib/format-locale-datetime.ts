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
  return d.toLocaleTimeString();
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
