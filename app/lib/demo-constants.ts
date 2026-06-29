/** Fixed demo URLs (mirror backend constants for the Next.js app). */
export const DEMO_PUBLIC_BASE_URL = "https://chatrely.com";
export const DEMO_SHOPIFY_INSTALL_URL = "https://apps.shopify.com/chatrely";

/** Restrained accent for demo outreach UI (user bubbles + CTAs only). */
export const DEMO_ACCENT_HEX = "#4f46e5";

/** Demo page backgrounds: widget column (left) slightly darker than pitch panel (right). */
export function demoPitchPanelBackground(brandColorHex: string): string {
  return `color-mix(in srgb, ${brandColorHex} 4%, #ffffff)`;
}

export function demoWidgetColumnBackground(brandColorHex: string): string {
  return `color-mix(in srgb, ${brandColorHex} 14%, #eef0f3)`;
}
