const GENERIC_LOGO_MARKERS = [
  "/s2/favicons",
  "shopify-bag",
  "shopify_bag",
  "gstatic.com/generate_204",
] as const;

export function storeInitials(displayName: string): string {
  const words = displayName.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  if (words.length === 1) return words[0]!.slice(0, 2).toUpperCase();
  return `${words[0]!.charAt(0)}${words[1]!.charAt(0)}`.toUpperCase();
}

/** Drop generic favicon proxies and other non-store stand-ins. */
export function sanitizeDemoLogoUrl(url: string | null | undefined): string | null {
  const trimmed = url?.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith("data:")) return trimmed;
  const lowered = trimmed.toLowerCase();
  for (const marker of GENERIC_LOGO_MARKERS) {
    if (lowered.includes(marker)) return null;
  }
  if (lowered.includes("shopify.com") && lowered.includes("favicon")) return null;
  return trimmed;
}
