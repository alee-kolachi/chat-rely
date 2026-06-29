/** Fixed demo URLs (mirror backend constants for the Next.js app). */
export const DEMO_PUBLIC_BASE_URL = "https://chatrely.com";
export const DEMO_SIGNUP_URL = "/signup";
export const DEMO_SHOPIFY_INSTALL_URL = "https://apps.shopify.com/chatrely";

/** Static ChatRely blue for all demo outreach UI (page + widget chrome). */
export const DEMO_CHAT_PRIMARY = "#2563EB";

/** @deprecated Use DEMO_CHAT_PRIMARY */
export const DEMO_ACCENT_HEX = DEMO_CHAT_PRIMARY;

/** Demo page: left widget column (light gray). */
export const DEMO_WIDGET_COLUMN_BG = "#f3f4f6";

/** Demo page: right pitch panel (10% primary on white). */
export const DEMO_PITCH_PANEL_BG = `color-mix(in srgb, ${DEMO_CHAT_PRIMARY} 10%, #ffffff)`;

/** Chat view gradient stops. */
export const DEMO_CHAT_SURFACE_TOP = "#ffffff";
export const DEMO_CHAT_SURFACE_BOTTOM = `color-mix(in srgb, ${DEMO_CHAT_PRIMARY} 10%, #ffffff)`;

/** Welcome screen gradient bottom (80% primary on white). */
export const DEMO_WELCOME_GRADIENT_BOTTOM = `color-mix(in srgb, ${DEMO_CHAT_PRIMARY} 80%, #ffffff)`;

/** Welcome panel background gradient for demo widget. */
export function demoWelcomePanelGradient(): string {
  const top = DEMO_CHAT_PRIMARY;
  const bottom = DEMO_WELCOME_GRADIENT_BOTTOM;
  const mid = `color-mix(in srgb, ${top} 78%, #000000)`;
  return [
    "linear-gradient(180deg,",
    `${top} 0%,`,
    `${top} 18%,`,
    `color-mix(in srgb, ${top} 92%, #000000) 24%,`,
    `${mid} 28%,`,
    `color-mix(in srgb, ${mid} 82%, ${bottom}) 38%,`,
    `color-mix(in srgb, ${mid} 62%, ${bottom}) 48%,`,
    `color-mix(in srgb, ${mid} 42%, ${bottom}) 58%,`,
    `color-mix(in srgb, ${mid} 30%, ${bottom}) 68%,`,
    `color-mix(in srgb, ${mid} 22%, ${bottom}) 78%,`,
    `color-mix(in srgb, ${mid} 12%, ${bottom}) 88%,`,
    `${bottom} 100%)`,
  ].join(" ");
}

/** Widget appearance override so chat shell uses demo chat-surface stops. */
export const DEMO_WIDGET_APPEARANCE = {
  theme_mode: "light" as const,
  font_family: "geist",
  colors: {
    panel_background: DEMO_CHAT_SURFACE_BOTTOM,
  },
};
