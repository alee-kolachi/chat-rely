/** Fixed demo URLs (mirror backend constants for the Next.js app). */
export const DEMO_PUBLIC_BASE_URL = "https://chatrely.com";
export const DEMO_SHOPIFY_INSTALL_URL = "https://apps.shopify.com/chatrely";

/** Restrained accent for demo outreach UI (user bubbles + CTAs only). */
export const DEMO_ACCENT_HEX = "#4f46e5";

/** Demo page widget column background (matches pitch panel tint). */
export function demoWidgetColumnBackground(brandColorHex: string): string {
  return `color-mix(in srgb, ${brandColorHex} 7%, #fafafa)`;
}
