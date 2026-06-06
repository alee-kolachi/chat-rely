/** Browser locale and country hints sent with chat requests for analytics metadata. */

function isAlpha2(value: string): boolean {
  if (value.length !== 2) return false;
  for (let i = 0; i < 2; i += 1) {
    const code = value.charCodeAt(i);
    const isLetter =
      (code >= 65 && code <= 90) || (code >= 97 && code <= 122);
    if (!isLetter) return false;
  }
  return true;
}

export function regionFromBcp47Locale(locale: string | undefined): string | undefined {
  if (!locale) return undefined;
  const tag = locale.trim().replace("_", "-");
  if (!tag.includes("-")) return undefined;
  const parts = tag.split("-");
  for (let i = parts.length - 1; i >= 1; i -= 1) {
    const candidate = parts[i]?.trim() ?? "";
    if (isAlpha2(candidate)) return candidate.toUpperCase();
  }
  return undefined;
}

export function clientBrowserLocale(): string | undefined {
  if (typeof navigator === "undefined") return undefined;
  const primary = navigator.language?.trim();
  if (primary) return primary;
  const fallback = navigator.languages?.[0]?.trim();
  return fallback || undefined;
}

export function clientCountryCode(): string | undefined {
  if (typeof navigator === "undefined") return undefined;
  const candidates = [navigator.language, ...(navigator.languages ?? [])];
  for (const raw of candidates) {
    const locale = raw?.trim();
    if (!locale) continue;
    try {
      const parsed = new Intl.Locale(locale);
      const region = parsed.region;
      if (region && isAlpha2(region)) return region.toUpperCase();
    } catch {
      /* fall through to tag parsing */
    }
    const fromTag = regionFromBcp47Locale(locale);
    if (fromTag) return fromTag;
  }
  return undefined;
}

export function clientChatContext(): { locale?: string; country_code?: string } {
  const locale = clientBrowserLocale();
  const country_code = clientCountryCode();
  return {
    ...(locale ? { locale } : {}),
    ...(country_code ? { country_code } : {}),
  };
}
