import cssText from "./styles.css?inline";
import { isAssistantFeedbackEligible } from "./feedback-eligibility";
import {
  fetchWidgetConfig,
  fetchWidgetThread,
  postWidgetVisitorMessage,
  postWidgetMessageFeedback,
  postWidgetVisitorContact,
  streamChat,
  type ProductActionRequest,
  type ProductCard,
  type ProductDetail,
  type WidgetConfig,
  type WidgetThreadMessage,
} from "./api";
import {
  detectWelcomeSocialPlatform,
  SOCIAL_PLATFORM_ICONS,
} from "./welcome-social-platform";
import { clientChatContext } from "./client-context";

declare global {
  interface Window {
    __CHATRELY_WIDGET__?: { agentKey?: string; apiBase?: string; demo?: boolean; demoSeed?: boolean };
  }
}

type StoredMessage = {
  role: "user" | "assistant";
  text: string;
  created_at?: string;
  server_id?: string;
  products?: ProductCard[];
  product_detail?: ProductDetail;
};
type HandoffContext = {
  seller_live?: boolean;
  estimated_minutes?: number | null;
  channel_hint?: string | null;
};
type ThreadRecord = {
  id: string;
  visitorId: string;
  messages: StoredMessage[];
  preview: string;
  updatedAt: number;
  status?: string;
  handoff?: HandoffContext;
};
type WidgetStore = {
  visitorId: string;
  activeConversationId: string | null;
  threads: ThreadRecord[];
};

const DEFAULT_ACCENT = "#831C91";
const EMPTY_REPLY_FALLBACK =
  "I'm not sure about that right now. Try asking in another way, or contact our support team if you need more help.";

function shouldSuppressEmptyAssistantFallback(opts: {
  conversationStatus?: string | null;
  aiChatDisabled?: boolean;
}): boolean {
  const status = (opts.conversationStatus ?? "").trim().toLowerCase();
  return status === "escalated" || opts.aiChatDisabled === true;
}
function buildEscalatedBanner(handoff?: HandoffContext | null): string {
  if (handoff?.seller_live) {
    const n = Math.max(1, Math.round(handoff.estimated_minutes ?? 15));
    return (
      `Our team is on it. Someone should reply within about ${n} minutes. ` +
      "You can add more details here while you wait."
    );
  }
  if (handoff?.channel_hint === "email") {
    return (
      "We're not available for live chat right now. Our team will reach out by email. " +
      "Start a new chat if you need the AI again."
    );
  }
  return (
    "We're not available for live chat right now. Our team will reach out as soon as they're back. " +
    "Start a new chat if you need the AI again."
  );
}
const WIDGET_STYLES_ID = "chatrely-widget-styles";
/** Poll escalated threads for operator replies (no widget SSE stream). */
const WIDGET_OPERATOR_SYNC_MS = 4000;

const ICON_REFRESH =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 16h5v5"/></svg>';
const ICON_LIST =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 6h13"/><path d="M8 12h13"/><path d="M8 18h13"/><path d="M4 6h.01"/><path d="M4 12h.01"/><path d="M4 18h.01"/></svg>';
const ICON_SEND =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3.714 3.048a.498.498 0 0 0-.683.627l2.843 7.627a2 2 0 0 1 0 1.396l-2.842 7.627a.498.498 0 0 0 .682.627l18-8.5a.5.5 0 0 0 0-.904z"/><path d="M6 12h16"/></svg>';
const ICON_CHEVRON =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m15 18-6-6 6-6"/></svg>';
const ICON_ARROW_RIGHT_BOLD =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.25" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>';
const ICON_CLOSE =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>';
const ICON_LAUNCHER_CHAT =
  '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#ffffff" fill-rule="evenodd" clip-rule="evenodd" d="M13.0867 21.3877L13.6288 20.4718C14.0492 19.7614 14.2595 19.4062 14.5972 19.2098C14.9349 19.0134 15.36 19.0061 16.2104 18.9915C17.4658 18.9698 18.2531 18.8929 18.9134 18.6194C20.1386 18.1119 21.1119 17.1386 21.6194 15.9134C22 14.9946 22 13.8297 22 11.5V10.5C22 7.22657 22 5.58985 21.2632 4.38751C20.8509 3.71473 20.2853 3.14908 19.6125 2.7368C18.4101 2 16.7734 2 13.5 2H10.5C7.22657 2 5.58985 2 4.38751 2.7368C3.71473 3.14908 3.14908 3.71473 2.7368 4.38751C2 5.58985 2 7.22657 2 10.5V11.5C2 13.8297 2 14.9946 2.3806 15.9134C2.88807 17.1386 3.86144 18.1119 5.08658 18.6194C5.74689 18.8929 6.53422 18.9698 7.78958 18.9915C8.63992 19.0061 9.06509 19.0134 9.40279 19.2098C9.74049 19.4063 9.95073 19.7614 10.3712 20.4718L10.9133 21.3877C11.3965 22.204 12.6035 22.204 13.0867 21.3877ZM7.5 9.71476C7.5 11.4673 9.6633 13.3304 10.9901 14.3082C11.4442 14.6429 11.6713 14.8103 12 14.8103C12.3287 14.8103 12.5558 14.643 13.0099 14.3082C14.3367 13.3304 16.5 11.4674 16.5 9.71474C16.5 7.03758 14.0249 6.03806 12 8.10614C9.97507 6.03806 7.5 7.03758 7.5 9.71476Z"/></svg>';

function widgetDemoMode(): boolean {
  try {
    if (window.__CHATRELY_WIDGET__?.demo === true) return true;
    return new URLSearchParams(window.location.search).get("demo") === "1";
  } catch {
    return false;
  }
}

function widgetDemoSeed(): boolean {
  try {
    if (window.__CHATRELY_WIDGET__?.demoSeed === true) return true;
    const params = new URLSearchParams(window.location.search);
    return params.get("seed") === "1" || params.get("demo") === "seed";
  } catch {
    return false;
  }
}

const DEMO_STORE_LOGO_URL =
  "https://www.gstatic.com/images/branding/product/2x/googleg_48dp.png";

function buildDemoWidgetConfig(): WidgetConfig {
  return {
    agent_id: "demo",
    name: "AI support agent",
    brand_color: "#79178C",
    widget_position: "bottom_right",
    widget_border_radius: 28,
    widget_animation_enabled: true,
    welcome_screen_enabled: true,
    welcome_screen_headline: "How can we help?",
    welcome_screen_description: "Ask about orders, products, or store policies.",
    welcome_screen_button_label: "Chat with us",
    greeting_messages: ["Hey there! Ask me anything while you preview the chat layout."],
    hide_powered_by_chatrely: false,
    message_feedback_enabled: false,
    avatar_url: DEMO_STORE_LOGO_URL,
  };
}

const DEMO_REPLY_LINES = [
  "Thanks for reaching out. I can help with orders, shipping, returns, and product questions.",
  "Got it. Here is a sample reply so you can preview spacing, bubbles, and scroll behavior.",
  "Happy to help. Send another message to see how the thread looks with more turns.",
  "This is a local preview reply with no backend connected.",
  "Looks good from here. Keep testing font size, padding, and the header fade effect.",
];

function pickDemoReply(userText: string, index: number): string {
  const trimmed = userText.trim();
  if (trimmed.endsWith("?")) {
    return `Good question about “${trimmed.slice(0, 48)}${trimmed.length > 48 ? "…" : ""}”. ${DEMO_REPLY_LINES[index % DEMO_REPLY_LINES.length]}`;
  }
  return DEMO_REPLY_LINES[index % DEMO_REPLY_LINES.length] ?? DEMO_REPLY_LINES[0]!;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}
function buildDemoChatMessages(): StoredMessage[] {
  const pairs: Array<[string, string]> = [
    [
      "Hi, do you ship to Canada?",
      "Yes. We ship to Canada on most orders. Standard delivery is usually 5–9 business days after dispatch.",
    ],
    [
      "What's your return policy?",
      "You can return unworn items within 30 days of delivery. Start a return from your order confirmation email.",
    ],
    [
      "I need help with order #10482.",
      "I can help with that. What issue are you seeing with order #10482?",
    ],
    [
      "It still says processing after a week.",
      "Thanks for checking. Processing can take 3–5 business days before tracking is added. I can flag this order for a manual review if you want.",
    ],
    [
      "Yes please, that would be great.",
      "Done. Our team will review order #10482 and email you within 24 hours with an update.",
    ],
    [
      "Do you have the linen shirt in medium?",
      "Let me check live inventory for the linen shirt in medium.",
    ],
    [
      "Any restock date if it's out?",
      "If medium is out of stock, restocks usually land on Thursdays. I can notify you when medium is back.",
    ],
    [
      "Yes, notify me at alex@example.com.",
      "Got it. I saved alex@example.com for restock alerts on the linen shirt in medium.",
    ],
    [
      "One more thing — do you offer gift wrapping?",
      "Yes. Add a note at checkout that says gift wrap and we will wrap it at no extra charge.",
    ],
    [
      "Perfect, thanks for your help!",
      "Happy to help. Message us anytime if anything else comes up.",
    ],
  ];
  const started = Date.now() - pairs.length * 180_000;
  const rows: StoredMessage[] = [];
  pairs.forEach(([userText, assistantText], index) => {
    const userAt = new Date(started + index * 180_000).toISOString();
    const assistantAt = new Date(started + index * 180_000 + 55_000).toISOString();
    rows.push({ role: "user", text: userText, created_at: userAt });
    rows.push({ role: "assistant", text: assistantText, created_at: assistantAt });
  });
  return rows;
}

function messageCreatedAtIso(iso?: string): string {
  return iso ?? new Date().toISOString();
}

function formatMessageTimestamp(value: string | null | undefined, now = new Date()): string {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";

  const time = d.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
  const datePart = d.toLocaleDateString(
    undefined,
    d.getFullYear() === now.getFullYear()
      ? { month: "short", day: "numeric" }
      : { month: "short", day: "numeric", year: "numeric" }
  );
  return `${datePart} · ${time}`;
}

function ensureMessageTimestamp(
  parent: HTMLElement,
  iso: string | undefined,
  role: "user" | "assistant"
): void {
  if (!iso) return;
  const label = formatMessageTimestamp(iso);
  if (!label) return;
  let time = parent.querySelector(":scope > time.cr-msg-time");
  if (!(time instanceof HTMLTimeElement)) {
    time = document.createElement("time");
    time.className = `cr-msg-time cr-msg-time--${role}`;
    parent.appendChild(time);
  }
  time.dateTime = iso;
  time.textContent = label;
}

function clearMessageTimestamp(parent: HTMLElement): void {
  parent.querySelector(":scope > time.cr-msg-time")?.remove();
}

function messageColumn(wrap: HTMLElement): HTMLElement | null {
  const col = wrap.closest(".cr-msg-col");
  return col instanceof HTMLElement ? col : null;
}

function setMessageColumnProductsMode(wrap: HTMLElement, enabled: boolean): void {
  messageColumn(wrap)?.classList.toggle("cr-msg-col--products", enabled);
}

function getEmbedLoaderScript(): HTMLScriptElement | null {
  const direct = document.currentScript;
  if (direct instanceof HTMLScriptElement) return direct;
  const byAttr = document.querySelector("script[data-chatrely-agent-key]");
  if (byAttr instanceof HTMLScriptElement) return byAttr;
  const nodes = document.querySelectorAll<HTMLScriptElement>("script[src*='widget']");
  return nodes.length ? (nodes[nodes.length - 1] ?? null) : null;
}

const DEFAULT_WIDGET_APP_ORIGIN = "https://chat-rely.vercel.app";

function resolveApiBase(script: HTMLScriptElement): string {
  const win = window.__CHATRELY_WIDGET__;
  const fromWin = (win?.apiBase ?? "").trim().replace(/\/$/, "");
  if (fromWin) return fromWin;
  const attr = (script.getAttribute("data-chatrely-api-base") ?? "").trim().replace(/\/$/, "");
  if (attr) return attr;
  try {
    return new URL(script.src).origin;
  } catch {
    return "";
  }
}

/** Public app origin for static assets (logo), not the API base. */
function resolveWidgetAppOrigin(script: HTMLScriptElement): string {
  try {
    const origin = new URL(script.src).origin;
    if (origin && origin !== "null") return origin.replace(/\/$/, "");
  } catch {
    /* ignore invalid script src */
  }
  return DEFAULT_WIDGET_APP_ORIGIN;
}

function resolveAgentKey(script: HTMLScriptElement): string {
  const win = window.__CHATRELY_WIDGET__;
  const fromWin = (win?.agentKey ?? "").trim();
  if (fromWin) return fromWin;
  return (script.getAttribute("data-chatrely-agent-key") ?? "").trim();
}

function widgetStoreKey(agentKey: string): string {
  return `chatrely:widget-store:${agentKey.slice(0, 24)}`;
}

function newVisitorId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `anon-${Math.random().toString(36).slice(2, 14)}`;
  }
}

function sanitizeWidgetStore(store: WidgetStore): WidgetStore {
  return {
    ...store,
    threads: store.threads.map((thread) => {
      const status = (thread.status ?? "open").trim().toLowerCase();
      const escalated = status === "escalated";
      return escalated ? thread : { ...thread, handoff: undefined };
    }),
  };
}

function readWidgetStore(agentKey: string): WidgetStore {
  try {
    const raw = window.localStorage?.getItem(widgetStoreKey(agentKey));
    if (!raw) return { visitorId: newVisitorId(), activeConversationId: null, threads: [] };
    const parsed = JSON.parse(raw) as Partial<WidgetStore>;
    return sanitizeWidgetStore({
      visitorId: typeof parsed.visitorId === "string" && parsed.visitorId.trim() ? parsed.visitorId : newVisitorId(),
      activeConversationId:
        typeof parsed.activeConversationId === "string" || parsed.activeConversationId === null
          ? parsed.activeConversationId
          : null,
      threads: Array.isArray(parsed.threads)
        ? parsed.threads.filter(
            (t): t is ThreadRecord =>
              !!t &&
              typeof t === "object" &&
              typeof (t as ThreadRecord).id === "string" &&
              typeof (t as ThreadRecord).visitorId === "string" &&
              Array.isArray((t as ThreadRecord).messages)
          )
        : [],
    });
  } catch {
    return { visitorId: newVisitorId(), activeConversationId: null, threads: [] };
  }
}

function writeWidgetStore(agentKey: string, store: WidgetStore): void {
  try {
    window.localStorage?.setItem(widgetStoreKey(agentKey), JSON.stringify(store));
  } catch {
    /* ignore quota / private mode */
  }
}

function ensureWidgetStyles(): void {
  if (document.getElementById(WIDGET_STYLES_ID)) return;
  const styleEl = document.createElement("style");
  styleEl.id = WIDGET_STYLES_ID;
  styleEl.textContent = cssText;
  document.head.appendChild(styleEl);
}

function normalizeHexColor(input: string | null | undefined, fallback: string): string {
  if (!input) return fallback;
  const s = input.trim();
  if (/^#[0-9a-fA-F]{6}$/.test(s)) return s;
  return fallback;
}

function brandChromeClasses(hex: string): {
  lightBg: boolean;
  headerText: string;
  headerIcon: string;
  headerIconHover: string;
  headerIconHoverBg: string;
  headerIconActiveBg: string;
  userText: string;
  launcherIcon: string;
} {
  const h = hex.replace("#", "");
  if (h.length !== 6 || !/^[0-9A-Fa-f]{6}$/.test(h)) {
    return {
      lightBg: false,
      headerText: "#ffffff",
      headerIcon: "rgba(255,255,255,0.9)",
      headerIconHover: "#ffffff",
      headerIconHoverBg: "rgba(255,255,255,0.15)",
      headerIconActiveBg: "rgba(255,255,255,0.2)",
      userText: "#ffffff",
      launcherIcon: "#ffffff",
    };
  }
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  const lightBg = yiq >= 175;
  return {
    lightBg,
    headerText: lightBg ? "#0f172a" : "#ffffff",
    headerIcon: lightBg ? "#64748b" : "rgba(255,255,255,0.9)",
    headerIconHover: lightBg ? "#0f172a" : "#ffffff",
    headerIconHoverBg: lightBg ? "rgba(0,0,0,0.06)" : "rgba(255,255,255,0.15)",
    headerIconActiveBg: lightBg ? "rgba(0,0,0,0.08)" : "rgba(255,255,255,0.2)",
    userText: lightBg ? "#0f172a" : "#ffffff",
    launcherIcon: lightBg ? "#0f172a" : "#ffffff",
  };
}

type ResolvedWidgetTheme = {
  themeMode: "light" | "dark";
  fontFamily: string;
  headerColor: string;
  userBubbleColor: string;
  panelBackground: string;
  assistantBubble: string;
  assistantBubbleBorder: string;
  composerBackground: string;
  textPrimary: string;
  textMuted: string;
};

const THEME_BASE: Record<"light" | "dark", Omit<ResolvedWidgetTheme, "themeMode" | "fontFamily" | "headerColor" | "userBubbleColor">> = {
  light: {
    panelBackground: "#FFFFFF",
    assistantBubble: "#FFFFFF",
    assistantBubbleBorder: "#E5E5E5",
    composerBackground: "#FFFFFF",
    textPrimary: "#000000",
    textMuted: "#6B6B6B",
  },
  dark: {
    panelBackground: "#0F172A",
    assistantBubble: "#1E293B",
    assistantBubbleBorder: "#334155",
    composerBackground: "#1E293B",
    textPrimary: "#F8FAFC",
    textMuted: "#94A3B8",
  },
};

const FONT_FAMILY_CSS: Record<string, string> = {
  geist: '"Geist Sans", ui-sans-serif, system-ui, sans-serif',
  system: 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  inter: '"Inter", ui-sans-serif, system-ui, sans-serif',
  roboto: '"Roboto", ui-sans-serif, system-ui, sans-serif',
  "open-sans": '"Open Sans", ui-sans-serif, system-ui, sans-serif',
  lato: '"Lato", ui-sans-serif, system-ui, sans-serif',
};

const GOOGLE_FONT_URLS: Record<string, string> = {
  inter: "https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap",
  roboto: "https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap",
  "open-sans": "https://fonts.googleapis.com/css2?family=Open+Sans:wght@400;600;700&display=swap",
  lato: "https://fonts.googleapis.com/css2?family=Lato:wght@400;700&display=swap",
};

function defaultAccentPanelBackground(brandHex: string, themeMode: "light" | "dark"): string {
  const accent = normalizeHexColor(brandHex, DEFAULT_ACCENT);
  if (themeMode === "dark") {
    return `color-mix(in srgb, ${accent} 5%, #0F172A)`;
  }
  return `color-mix(in srgb, ${accent} 14%, #f3edff)`;
}

function welcomeGradientBottomForBrand(brandHex: string): string {
  const accent = normalizeHexColor(brandHex, DEFAULT_ACCENT);
  return `color-mix(in srgb, ${accent} 36%, #94a3b8)`;
}

function resolveWidgetTheme(cfg: WidgetConfig, brandHex: string): ResolvedWidgetTheme {
  const appearance = cfg.widget_appearance;
  const themeMode = appearance?.theme_mode === "dark" ? "dark" : "light";
  const fontKey = (appearance?.font_family ?? "geist").trim().toLowerCase().replace(/_/g, "-");
  const fontFamily = FONT_FAMILY_CSS[fontKey] ?? FONT_FAMILY_CSS.geist;
  const base = THEME_BASE[themeMode];
  const custom = appearance?.colors ?? {};
  return {
    themeMode,
    fontFamily,
    headerColor: brandHex,
    userBubbleColor: normalizeHexColor(custom.user_bubble, brandHex),
    panelBackground: normalizeHexColor(
      custom.panel_background,
      defaultAccentPanelBackground(brandHex, themeMode)
    ),
    assistantBubble: normalizeHexColor(custom.assistant_bubble, base.assistantBubble),
    assistantBubbleBorder: normalizeHexColor(custom.assistant_bubble_border, base.assistantBubbleBorder),
    composerBackground: normalizeHexColor(custom.composer_background, base.composerBackground),
    textPrimary: base.textPrimary,
    textMuted: base.textMuted,
  };
}

function loadWidgetFont(fontKey: string): void {
  const url = GOOGLE_FONT_URLS[fontKey];
  if (!url || document.querySelector(`link[data-cr-font="${fontKey}"]`)) return;
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = url;
  link.setAttribute("data-cr-font", fontKey);
  document.head.appendChild(link);
}

function preloadWidgetGeistFonts(): void {
  const weights = ["400", "600", "700"] as const;
  const base = "https://cdn.jsdelivr.net/npm/@fontsource/geist-sans@5.2.5/files/geist-sans-latin-";
  for (const weight of weights) {
    const href = `${base}${weight}-normal.woff2`;
    if (document.querySelector(`link[rel="preload"][href="${href}"]`)) continue;
    const link = document.createElement("link");
    link.rel = "preload";
    link.as = "font";
    link.type = "font/woff2";
    link.crossOrigin = "anonymous";
    link.href = href;
    document.head.appendChild(link);
  }
}

function applyWidgetAppearance(
  targets: HTMLElement[],
  root: HTMLElement,
  theme: ResolvedWidgetTheme,
  headerChrome: ReturnType<typeof brandChromeClasses>,
  userChrome: ReturnType<typeof brandChromeClasses>
): void {
  const vars: Array<[string, string]> = [
    ["--cr-font-family", theme.fontFamily],
    ["--cr-panel-bg", theme.panelBackground],
    ["--cr-surface", theme.panelBackground],
    ["--cr-chat-surface-bottom", theme.panelBackground],
    ["--cr-welcome-gradient-bottom", welcomeGradientBottomForBrand(theme.headerColor)],
    ["--cr-sidebar", theme.composerBackground],
    ["--cr-assistant-bubble", theme.assistantBubble],
    ["--cr-assistant-border", theme.assistantBubbleBorder],
    ["--cr-composer-bg", theme.composerBackground],
    ["--cr-on-surface", theme.textPrimary],
    ["--cr-text-muted", theme.textMuted],
    ["--cr-border", theme.assistantBubbleBorder],
    ["--cr-user-bubble", theme.userBubbleColor],
    ["--cr-header-bg", theme.headerColor],
    ["--cr-user-text", userChrome.userText],
    ["--cr-header-text", headerChrome.headerText],
    ["--cr-header-icon", headerChrome.headerIcon],
    ["--cr-header-icon-hover", headerChrome.headerIconHover],
    ["--cr-header-icon-hover-bg", headerChrome.headerIconHoverBg],
    ["--cr-header-icon-active-bg", headerChrome.headerIconActiveBg],
  ];
  for (const el of targets) {
    for (const [name, value] of vars) {
      el.style.setProperty(name, value);
    }
  }
  if (theme.themeMode === "dark") {
    root.classList.add("cr-root--dark");
  }
}

type WelcomeSocialLink = { label: string; url: string };

function welcomeSocialLinksFromConfig(cfg: WidgetConfig): WelcomeSocialLink[] {
  const defaults: WelcomeSocialLink[] = [
    { label: "Follow us on Instagram", url: "https://www.instagram.com/" },
    { label: "Follow us on TikTok", url: "https://www.tiktok.com/" },
  ];
  const raw = cfg.welcome_screen_social_links;
  if (!Array.isArray(raw)) return defaults;
  const normalize = (item: unknown, fallback: WelcomeSocialLink): WelcomeSocialLink => {
    if (!item || typeof item !== "object") return fallback;
    const row = item as Record<string, unknown>;
    const label =
      typeof row.label === "string" && row.label.trim() ? row.label.trim().slice(0, 80) : fallback.label;
    const url = typeof row.url === "string" ? row.url.trim().slice(0, 500) : "";
    return { label, url };
  };
  return [normalize(raw[0], defaults[0]), normalize(raw[1], defaults[1])];
}

function normalizeExternalUrl(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

function isExternalUrl(url: string): boolean {
  const normalized = normalizeExternalUrl(url);
  return normalized.startsWith("http://") || normalized.startsWith("https://");
}

function createWelcomeSocialCard(link: WelcomeSocialLink): HTMLElement {
  const clickable = isExternalUrl(link.url);
  const card = clickable ? document.createElement("a") : document.createElement("div");
  card.className = clickable
    ? "cr-welcome-social-card"
    : "cr-welcome-social-card cr-welcome-social-card--static";
  if (clickable) {
    const anchor = card as HTMLAnchorElement;
    anchor.href = normalizeExternalUrl(link.url);
    anchor.target = "_blank";
    anchor.rel = "noopener noreferrer";
  }
  const platformEl = document.createElement("span");
  platformEl.className = "cr-welcome-social-platform";
  const platform = detectWelcomeSocialPlatform(link.label, link.url);
  platformEl.innerHTML = SOCIAL_PLATFORM_ICONS[platform];
  const labelEl = document.createElement("span");
  labelEl.className = "cr-welcome-social-label";
  labelEl.textContent = link.label;
  const iconEl = document.createElement("span");
  iconEl.className = "cr-welcome-social-icon";
  iconEl.innerHTML = ICON_CHEVRON_RIGHT;
  card.append(platformEl, labelEl, iconEl);
  return card;
}

const WIDGET_BORDER_RADIUS_MIN = 0;
const WIDGET_BORDER_RADIUS_MAX = 28;
const WIDGET_BORDER_RADIUS_DEFAULT = 28;

function clampWidgetBorderRadius(value: unknown): number {
  const presets = [0, 12, 28];
  let clamped = WIDGET_BORDER_RADIUS_DEFAULT;
  if (typeof value === "number" && Number.isFinite(value)) {
    clamped = Math.max(
      WIDGET_BORDER_RADIUS_MIN,
      Math.min(WIDGET_BORDER_RADIUS_MAX, Math.round(value))
    );
  } else if (typeof value === "string") {
    const parsed = Number.parseInt(value.trim(), 10);
    if (Number.isFinite(parsed)) {
      clamped = Math.max(
        WIDGET_BORDER_RADIUS_MIN,
        Math.min(WIDGET_BORDER_RADIUS_MAX, Math.round(parsed))
      );
    }
  }
  if (presets.includes(clamped)) return clamped;
  let best = WIDGET_BORDER_RADIUS_DEFAULT;
  let bestDistance = Number.POSITIVE_INFINITY;
  for (const preset of presets) {
    const distance = Math.abs(preset - clamped);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = preset;
    }
  }
  return best;
}

function widgetAnimationEnabled(cfg: WidgetConfig): boolean {
  return cfg.widget_animation_enabled !== false;
}

function prefersReducedMotion(): boolean {
  try {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
}

function createLauncherAttentionRing(): HTMLSpanElement {
  const ring = document.createElement("span");
  ring.className = "cr-launcher-attention";
  ring.setAttribute("aria-hidden", "true");
  return ring;
}

function greetingMessagesFromConfig(cfg: WidgetConfig): string[] {
  const fromList = cfg.greeting_messages;
  if (Array.isArray(fromList) && fromList.length) {
    return fromList.map((line) => String(line).trim()).filter(Boolean);
  }
  const single = (cfg.greeting_message || "").trim();
  return single ? [single] : [];
}

function escapeAssistantHtml(raw: string): string {
  return raw
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderAssistantHtml(raw: string): string {
  const linkRe = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g;
  let html = "";
  let last = 0;
  let match: RegExpExecArray | null;
  while ((match = linkRe.exec(raw)) !== null) {
    html += escapeAssistantHtml(raw.slice(last, match.index));
    const href = match[2].replace(/"/g, "&quot;");
    html += `<a href="${href}" target="_blank" rel="noopener noreferrer" class="cr-msg-link">${escapeAssistantHtml(match[1])}</a>`;
    last = match.index + match[0].length;
  }
  html += escapeAssistantHtml(raw.slice(last));
  return html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>").replace(/\n/g, "<br>");
}

function looksLikeProductListLine(line: string): boolean {
  const s = line.trim();
  if (!s) return false;
  if (s.startsWith("**") || s.startsWith("- ") || s.startsWith("![") || s.startsWith("|")) return true;
  if (s.includes(" - Price:") || s.includes("Price:")) return true;
  if (/^\d[.)]/.test(s)) return true;
  if (s.includes("$") && (s.includes("http://") || s.includes("https://") || s.includes("**"))) {
    if (s.includes("**")) return true;
    if (s.includes("[") && s.includes("](")) return false;
    return true;
  }
  return false;
}

function setAssistantBubbleText(assistantEl: HTMLElement, text: string): void {
  assistantEl.classList.remove("cr-msg--thinking");
  const trimmed = text.trim();
  if (!trimmed) {
    assistantEl.classList.add("cr-msg--text-hidden");
    assistantEl.innerHTML = "";
    assistantEl.setAttribute("data-plain", "");
    return;
  }
  assistantEl.classList.remove("cr-msg--text-hidden");
  assistantEl.setAttribute("data-plain", trimmed);
  assistantEl.innerHTML = renderAssistantHtml(trimmed);
}

function introTextForProductCards(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return "";
  const lines = trimmed.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (!lines.length) return "";
  const introLines: string[] = [];
  for (const line of lines) {
    if (looksLikeProductListLine(line)) break;
    introLines.push(line);
  }
  const intro = introLines.join(" ").trim();
  if (intro && !looksLikeProductListLine(intro)) {
    if (intro.length <= 220) return intro;
    for (const sep of [". ", "! ", "? "]) {
      const idx = intro.indexOf(sep);
      if (idx > 10 && idx <= 220) return intro.slice(0, idx + 1);
    }
    const shortened = intro.slice(0, 200).replace(/\s+\S*$/, "").trim();
    return shortened ? `${shortened}...` : intro.slice(0, 220);
  }
  const first = lines[0] ?? trimmed;
  if (!looksLikeProductListLine(first)) {
    if (first.length <= 120) return first;
    for (const sep of [". ", "! ", "? "]) {
      const idx = first.indexOf(sep);
      if (idx > 10 && idx <= 120) return first.slice(0, idx + 1);
    }
  }
  return "";
}

const ICON_INFO =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>';
const ICON_SPARKLES =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"/></svg>';
const ICON_EXTERNAL =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/></svg>';
const ICON_CHEVRON_LEFT =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m15 18-6-6 6-6"/></svg>';
const ICON_CHEVRON_RIGHT =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg>';

function productActionUserMessage(action: ProductActionRequest): string {
  const label = (action.title || action.handle).trim();
  return action.type === "details" ? `Show details for ${label}` : `Show similar to ${label}`;
}

function mountProductCardActions(
  card: ProductCard,
  host: HTMLElement,
  onDetails: (card: ProductCard) => void,
  onSimilar: (card: ProductCard) => void,
  disabled: boolean,
  layout: "row" | "column" = "row",
  hideDetails = false
): void {
  const row = document.createElement("div");
  row.className =
    layout === "column" ? "cr-product-actions cr-product-actions--stack" : "cr-product-actions";
  if (!hideDetails) {
    const detailsBtn = document.createElement("button");
    detailsBtn.type = "button";
    detailsBtn.className = "cr-product-btn cr-product-btn--secondary";
    detailsBtn.innerHTML = `${ICON_INFO}<span>Details</span>`;
    detailsBtn.disabled = disabled;
    detailsBtn.addEventListener("click", () => onDetails(card));
    row.appendChild(detailsBtn);
  }
  const similarBtn = document.createElement("button");
  similarBtn.type = "button";
  similarBtn.className = "cr-product-btn cr-product-btn--secondary";
  similarBtn.innerHTML = `${ICON_SPARKLES}<span>Similar</span>`;
  similarBtn.disabled = disabled;
  similarBtn.addEventListener("click", () => onSimilar(card));
  const viewLink = document.createElement("a");
  viewLink.className = "cr-product-btn cr-product-btn--secondary";
  viewLink.innerHTML = `${ICON_EXTERNAL}<span>View</span>`;
  viewLink.href = card.url;
  viewLink.target = "_blank";
  viewLink.rel = "noopener noreferrer";
  row.append(similarBtn, viewLink);
  host.appendChild(row);
}

function attachCarouselScrollControls(scroller: HTMLElement, host: HTMLElement): void {
  const leftBtn = document.createElement("button");
  leftBtn.type = "button";
  leftBtn.className = "cr-product-scroll cr-product-scroll--left";
  leftBtn.setAttribute("aria-label", "Scroll products left");
  leftBtn.innerHTML = ICON_CHEVRON_LEFT;
  const rightBtn = document.createElement("button");
  rightBtn.type = "button";
  rightBtn.className = "cr-product-scroll cr-product-scroll--right";
  rightBtn.setAttribute("aria-label", "Scroll products right");
  rightBtn.innerHTML = ICON_CHEVRON_RIGHT;

  const sync = (): void => {
    const maxScroll = scroller.scrollWidth - scroller.clientWidth;
    leftBtn.hidden = scroller.scrollLeft <= 4;
    rightBtn.hidden = maxScroll - scroller.scrollLeft <= 4;
  };

  leftBtn.addEventListener("click", () => {
    scroller.scrollBy({ left: -Math.max(160, scroller.clientWidth * 0.85), behavior: "smooth" });
  });
  rightBtn.addEventListener("click", () => {
    scroller.scrollBy({ left: Math.max(160, scroller.clientWidth * 0.85), behavior: "smooth" });
  });
  scroller.addEventListener("scroll", sync, { passive: true });
  host.append(leftBtn, rightBtn, scroller);
  requestAnimationFrame(sync);
  if ("ResizeObserver" in window) {
    const observer = new ResizeObserver(sync);
    observer.observe(scroller);
  }
}

function buildProductCarousel(
  products: ProductCard[],
  onDetails: (card: ProductCard) => void,
  onSimilar: (card: ProductCard) => void,
  disabled: boolean
): HTMLElement {
  const wrap = document.createElement("div");
  wrap.className = "cr-product-carousel-wrap";
  const scroller = document.createElement("div");
  scroller.className = "cr-product-carousel";
  scroller.setAttribute("role", "list");
  products.forEach((product) => {
    const card = document.createElement("article");
    card.className = "cr-product-card";
    card.setAttribute("role", "listitem");
    const imageWrap = document.createElement("div");
    imageWrap.className = "cr-product-card-image";
    if (product.image_url) {
      const img = document.createElement("img");
      img.src = product.image_url;
      img.alt = "";
      img.loading = "lazy";
      imageWrap.appendChild(img);
    } else {
      imageWrap.textContent = "No image";
      imageWrap.classList.add("cr-product-card-image--empty");
    }
    const body = document.createElement("div");
    body.className = "cr-product-card-body";
    const title = document.createElement("p");
    title.className = "cr-product-card-title";
    title.textContent = product.title;
    body.appendChild(title);
    if (product.price) {
      const price = document.createElement("p");
      price.className = "cr-product-card-price";
      price.textContent = product.price;
      body.appendChild(price);
    }
    mountProductCardActions(product, body, onDetails, onSimilar, disabled, "column");
    card.append(imageWrap, body);
    scroller.appendChild(card);
  });
  attachCarouselScrollControls(scroller, wrap);
  return wrap;
}

function removeColumnCarousel(col: HTMLElement | null | undefined): void {
  col?.querySelector(".cr-product-carousel-wrap")?.remove();
}

function mountColumnCarousel(wrap: HTMLElement, carousel: HTMLElement): void {
  const col = messageColumn(wrap);
  if (!col) return;
  removeColumnCarousel(col);
  col.appendChild(carousel);
}

function renderProductDetailView(
  parent: HTMLElement,
  detail: ProductDetail,
  onDetails: (card: ProductCard) => void,
  onSimilar: (card: ProductCard) => void,
  disabled: boolean
): HTMLElement {
  parent.querySelector(".cr-product-carousel-wrap")?.remove();
  parent.querySelector(".cr-product-detail")?.remove();
  const root = document.createElement("div");
  root.className = "cr-product-detail";
  const images = detail.image_urls.length > 0 ? detail.image_urls : detail.image_url ? [detail.image_url] : [];
  if (images.length > 0) {
    const hero = document.createElement("div");
    hero.className = "cr-product-detail-hero";
    const img = document.createElement("img");
    img.src = images[0] ?? "";
    img.alt = "";
    img.loading = "lazy";
    hero.appendChild(img);
    root.appendChild(hero);
    if (images.length > 1) {
      const thumbsWrap = document.createElement("div");
      thumbsWrap.className = "cr-product-detail-thumbs-wrap";
      const thumbs = document.createElement("div");
      thumbs.className = "cr-product-detail-thumbs";
      images.forEach((url, index) => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "cr-product-detail-thumb";
        if (index === 0) btn.classList.add("cr-product-detail-thumb--active");
        const thumbImg = document.createElement("img");
        thumbImg.src = url;
        thumbImg.alt = "";
        btn.appendChild(thumbImg);
        btn.addEventListener("click", () => {
          img.src = url;
          thumbs.querySelectorAll(".cr-product-detail-thumb--active").forEach((el) => {
            el.classList.remove("cr-product-detail-thumb--active");
          });
          btn.classList.add("cr-product-detail-thumb--active");
        });
        thumbs.appendChild(btn);
      });
      attachCarouselScrollControls(thumbs, thumbsWrap);
      root.appendChild(thumbsWrap);
    }
  } else {
    const empty = document.createElement("div");
    empty.className = "cr-product-detail-hero cr-product-detail-hero--empty";
    empty.textContent = "No image";
    root.appendChild(empty);
  }
  const body = document.createElement("div");
  body.className = "cr-product-detail-body";
  const title = document.createElement("p");
  title.className = "cr-product-detail-title";
  title.textContent = detail.title;
  body.appendChild(title);
  if (detail.price) {
    const price = document.createElement("p");
    price.className = "cr-product-detail-price";
    price.textContent = detail.price;
    body.appendChild(price);
  }
  if (detail.vendor || detail.sku) {
    const specs = document.createElement("dl");
    specs.className = "cr-product-detail-specs";
    const addSpec = (label: string, value: string) => {
      const row = document.createElement("div");
      row.className = "cr-product-detail-spec-row";
      const dt = document.createElement("span");
      dt.className = "cr-product-detail-spec-label";
      dt.textContent = label;
      const dd = document.createElement("span");
      dd.className = "cr-product-detail-spec-value";
      dd.textContent = value;
      row.append(dt, dd);
      specs.appendChild(row);
    };
    if (detail.vendor) addSpec("Brand", detail.vendor);
    if (detail.product_type) addSpec("Type", detail.product_type);
    if (detail.sku) addSpec("SKU", detail.sku);
    body.appendChild(specs);
  }
  const descriptionPoints =
    detail.description_points && detail.description_points.length > 0
      ? detail.description_points
      : detail.description
        ? [detail.description]
        : [];
  if (descriptionPoints.length > 0) {
    const block = document.createElement("div");
    block.className = "cr-product-detail-section";
    const heading = document.createElement("p");
    heading.className = "cr-product-detail-section-title";
    heading.textContent = "Details";
    block.appendChild(heading);
    const list = document.createElement("ul");
    list.className = "cr-product-detail-bullets";
    descriptionPoints.forEach((point) => {
      const item = document.createElement("li");
      item.textContent = point;
      list.appendChild(item);
    });
    block.appendChild(list);
    body.appendChild(block);
  }
  detail.options?.forEach((option) => {
    const block = document.createElement("div");
    block.className = "cr-product-detail-section";
    const heading = document.createElement("p");
    heading.className = "cr-product-detail-section-title";
    heading.textContent = option.name;
    block.appendChild(heading);
    const chips = document.createElement("div");
    chips.className = "cr-product-detail-chips";
    option.values.forEach((value) => {
      const chip = document.createElement("span");
      chip.className = "cr-product-detail-chip";
      chip.textContent = value;
      chips.appendChild(chip);
    });
    block.appendChild(chips);
    body.appendChild(block);
  });
  mountProductCardActions(detail, body, onDetails, onSimilar, disabled, "column", true);
  root.appendChild(body);
  parent.appendChild(root);
  return root;
}

function renderAssistantRichContent(
  wrap: HTMLElement,
  assistantEl: HTMLElement,
  msg: Pick<StoredMessage, "text" | "products" | "product_detail">,
  onDetails: (card: ProductCard) => void,
  onSimilar: (card: ProductCard) => void,
  disabled: boolean
): void {
  wrap.querySelector(".cr-product-detail")?.remove();
  removeColumnCarousel(messageColumn(wrap));
  wrap.classList.remove("cr-msg-wrap--products");
  assistantEl.classList.remove("cr-msg--intro-only");
  setMessageColumnProductsMode(wrap, false);

  if (msg.product_detail) {
    wrap.classList.add("cr-msg-wrap--products");
    assistantEl.classList.add("cr-msg--intro-only");
    setAssistantBubbleText(assistantEl, introTextForProductCards(msg.text));
    renderProductDetailView(wrap, msg.product_detail, onDetails, onSimilar, disabled);
  } else if (msg.products?.length) {
    assistantEl.classList.add("cr-msg--intro-only");
    setAssistantBubbleText(assistantEl, introTextForProductCards(msg.text));
    mountColumnCarousel(
      wrap,
      buildProductCarousel(msg.products, onDetails, onSimilar, disabled)
    );
  }

  setMessageColumnProductsMode(
    wrap,
    Boolean(msg.product_detail || msg.products?.length)
  );
}

function chatRelyLogoAssetUrl(appOrigin: string): string {
  return `${appOrigin.replace(/\/$/, "")}/chat-rely.svg`;
}

function poweredByChatRelyHtml(appOrigin: string): string {
  const logoUrl = chatRelyLogoAssetUrl(appOrigin);
  return `<a class="cr-powered-link" href="https://chatrely.com" target="_blank" rel="noopener noreferrer"><img class="cr-powered-logo" src="${logoUrl}" alt="" /><span class="cr-powered-text">Powered by <span class="cr-powered-brand">ChatRely</span></span></a>`;
}

function mountWidgetLogoImage(
  img: HTMLImageElement,
  wrap: HTMLElement,
  logoUrl: string | null | undefined,
  onShow: () => void
): void {
  const src = logoUrl?.trim() || "";
  if (!src) {
    wrap.hidden = true;
    img.style.display = "none";
    return;
  }
  img.referrerPolicy = "no-referrer";
  img.onload = () => {
    wrap.hidden = false;
    img.style.display = "block";
    onShow();
  };
  img.onerror = () => {
    wrap.hidden = true;
    img.style.display = "none";
  };
  img.src = src;
}

function threadPreview(messages: StoredMessage[]): string {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const text = messages[i]?.text?.trim();
    if (text) return text;
  }
  return "No messages yet";
}

function isVisitorMismatchError(message: string): boolean {
  return message.toLowerCase().includes("does not belong to this visitor");
}

function mountMessageFeedback(
  wrap: HTMLElement,
  apiBase: string,
  agentKey: string,
  visitorId: string,
  messageId: string | null | undefined
): void {
  if (!messageId) return;
  const col = messageColumn(wrap);
  if (!col || col.querySelector(":scope > .cr-msg-feedback")) return;
  const row = document.createElement("div");
  row.className = "cr-msg-feedback";
  const up = document.createElement("button");
  const down = document.createElement("button");
  up.type = "button";
  down.type = "button";
  up.className = "cr-feedback-btn";
  down.className = "cr-feedback-btn";
  up.setAttribute("aria-label", "Helpful");
  down.setAttribute("aria-label", "Not helpful");
  up.innerHTML =
    '<svg class="cr-feedback-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 10v12"/><path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2a3.13 3.13 0 0 1 3 3.88Z"/></svg>';
  down.innerHTML =
    '<svg class="cr-feedback-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M17 14V2"/><path d="M9 18.12 10 14H4.17a2 2 0 0 1-1.92-2.56l2.33-8A2 2 0 0 1 6.5 2H20a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-2.76a2 2 0 0 0-1.79 1.11L12 22a3.13 3.13 0 0 1-3-3.88Z"/></svg>';
  let current: 1 | -1 | null = null;
  let acked: 1 | -1 | null | undefined = undefined;
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;

  const runSelectAnim = (btn: HTMLButtonElement): void => {
    btn.classList.remove("cr-feedback-btn--select-anim");
    void btn.offsetWidth;
    btn.classList.add("cr-feedback-btn--select-anim");
    const onEnd = (): void => {
      btn.classList.remove("cr-feedback-btn--select-anim");
      btn.removeEventListener("animationend", onEnd);
    };
    btn.addEventListener("animationend", onEnd);
  };

  const syncVisibility = (): void => {
    up.classList.toggle("cr-feedback-btn--selected-up", current === 1);
    down.classList.toggle("cr-feedback-btn--selected-down", current === -1);
    if (current === null) {
      up.hidden = false;
      down.hidden = false;
    } else if (current === 1) {
      up.hidden = false;
      down.hidden = true;
    } else {
      up.hidden = true;
      down.hidden = false;
    }
  };

  const flush = async (): Promise<void> => {
    debounceTimer = null;
    while (true) {
      const desired = current;
      const hasAcked = acked !== undefined;
      if (!hasAcked) {
        if (desired === null) return;
      } else if (desired === acked) {
        return;
      }
      const snap = desired;
      try {
        if (desired === null) {
          await postWidgetMessageFeedback(apiBase, agentKey, {
            message_id: messageId,
            visitor_id: visitorId,
            remove: true,
          });
        } else {
          await postWidgetMessageFeedback(apiBase, agentKey, {
            message_id: messageId,
            visitor_id: visitorId,
            value: desired,
          });
        }
        acked = desired;
      } catch {
        const roll: 1 | -1 | null = hasAcked ? (acked ?? null) : null;
        if (current === snap) {
          current = roll;
          syncVisibility();
        }
        return;
      }
    }
  };

  const apply = (next: 1 | -1 | null, btn: HTMLButtonElement): void => {
    current = next;
    syncVisibility();
    if (next === 1 || next === -1) {
      runSelectAnim(btn);
    }
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => void flush(), 450);
  };
  up.addEventListener("click", () => apply(current === 1 ? null : 1, up));
  down.addEventListener("click", () => apply(current === -1 ? null : -1, down));
  syncVisibility();
  row.append(up, down);
  col.appendChild(row);
}

function syncAssistantFeedbackButtons(
  messagesEl: HTMLElement,
  transcript: StoredMessage[],
  cfg: WidgetConfig,
  apiBase: string,
  agentKey: string,
  visitorId: string
): void {
  if (!cfg.message_feedback_enabled) return;
  const rows = messagesEl.querySelectorAll<HTMLElement>(".cr-msg-row--assistant");
  let assistantIndex = 0;
  for (const msg of transcript) {
    if (msg.role !== "assistant") continue;
    const row = rows[assistantIndex];
    assistantIndex += 1;
    if (!row || !msg.server_id) continue;
    const wrap = row.querySelector(":scope .cr-msg-wrap");
    if (!(wrap instanceof HTMLElement)) continue;
    if (
      !isAssistantFeedbackEligible(msg.text, {
        hasProducts: Boolean(msg.products?.length),
        hasProductDetail: Boolean(msg.product_detail),
      })
    ) {
      continue;
    }
    mountMessageFeedback(wrap, apiBase, agentKey, visitorId, msg.server_id);
  }
}

async function boot(): Promise<void> {
  const script = getEmbedLoaderScript();
  if (!script) {
    console.warn("[ChatRely] Could not find the loader <script>.");
    return;
  }
  const agentKey = resolveAgentKey(script);
  const apiBase = resolveApiBase(script);
  const appOrigin = resolveWidgetAppOrigin(script);
  const demoMode = widgetDemoMode();
  const demoSeed = widgetDemoSeed();
  if (!demoMode && (!agentKey || !apiBase)) {
    console.warn("[ChatRely] Missing data-chatrely-agent-key or API base.");
    return;
  }

  ensureWidgetStyles();

  let cfg: Awaited<ReturnType<typeof fetchWidgetConfig>>;
  if (demoMode) {
    cfg = buildDemoWidgetConfig();
  } else {
    try {
      cfg = await fetchWidgetConfig(apiBase, agentKey);
    } catch (e) {
      console.warn("[ChatRely] Config error:", e);
      return;
    }
  }

  const brandHex = cfg.brand_color ? normalizeHexColor(cfg.brand_color, DEFAULT_ACCENT) : null;
  const accent = brandHex ?? DEFAULT_ACCENT;
  const theme = resolveWidgetTheme(cfg, accent);
  const widgetAccent = theme.headerColor;
  const headerChrome = brandChromeClasses(theme.headerColor);
  const userChrome = brandChromeClasses(theme.userBubbleColor);
  const launcherChrome = brandChromeClasses(widgetAccent);
  const hasBrand = Boolean(brandHex);
  const bottomLeft = cfg.widget_position === "bottom_left";

  const fontKey = (cfg.widget_appearance?.font_family ?? "geist").trim().toLowerCase().replace(/_/g, "-");
  preloadWidgetGeistFonts();
  loadWidgetFont(fontKey);

  const host = document.createElement("div");
  host.id = "chatrely-widget-host";
  host.style.setProperty("--cr-accent", widgetAccent);
  host.style.setProperty("--cr-launcher-icon", launcherChrome.launcherIcon);

  const root = document.createElement("div");
  root.className = `cr-root${bottomLeft ? " cr-root--bl" : " cr-root--br"}`;
  host.append(root);

  const launcher = document.createElement("button");
  launcher.type = "button";
  launcher.className = "cr-launcher";
  launcher.setAttribute("aria-label", "Open chat");
  launcher.setAttribute("aria-expanded", "false");
  launcher.style.background = widgetAccent;
  const widgetBorderRadius = clampWidgetBorderRadius(cfg.widget_border_radius);
  const radiusPx = `${widgetBorderRadius}px`;
  host.style.setProperty("--cr-launcher-radius", radiusPx);
  launcher.style.setProperty("--cr-launcher-radius", radiusPx);
  launcher.style.borderRadius = radiusPx;

  const launcherChatIcon = document.createElement("span");
  launcherChatIcon.className = "cr-launcher-icon";
  launcherChatIcon.innerHTML = ICON_LAUNCHER_CHAT;

  const launcherSurface = document.createElement("span");
  launcherSurface.className = "cr-launcher-surface";

  if (widgetAnimationEnabled(cfg) && !prefersReducedMotion()) {
    launcher.append(createLauncherAttentionRing());
  }

  launcherSurface.append(launcherChatIcon);
  launcher.append(launcherSurface);

  const panel = document.createElement("div");
  panel.className = "cr-panel";

  const header = document.createElement("div");
  header.className = `cr-panel-header${hasBrand ? " cr-panel-header--brand" : ""}`;

  const headerMain = document.createElement("div");
  headerMain.className = "cr-panel-header-main";

  const headerAvatarWrap = document.createElement("div");
  headerAvatarWrap.className = "cr-avatar-wrap--header";
  headerAvatarWrap.hidden = true;
  const headerAvatarImg = document.createElement("img");
  headerAvatarImg.className = "cr-avatar-img";
  headerAvatarImg.alt = "";
  headerAvatarImg.style.display = "none";
  headerAvatarWrap.append(headerAvatarImg);

  const headerCopy = document.createElement("div");
  headerCopy.className = "cr-panel-header-copy";

  const titleEl = document.createElement("div");
  titleEl.className = "cr-panel-title";
  titleEl.textContent = cfg.name || "Chat";

  headerCopy.append(titleEl);
  headerMain.append(headerAvatarWrap, headerCopy);

  const headerActions = document.createElement("div");
  headerActions.className = "cr-header-actions";

  const resetBtn = document.createElement("button");
  resetBtn.type = "button";
  resetBtn.className = "cr-header-btn";
  resetBtn.innerHTML = ICON_REFRESH;
  resetBtn.setAttribute("aria-label", "Reset conversation and start a new chat thread");
  resetBtn.title = "Reset and start a new thread";

  const historyBtn = document.createElement("button");
  historyBtn.type = "button";
  historyBtn.className = "cr-header-btn";
  historyBtn.innerHTML = ICON_LIST;
  historyBtn.setAttribute("aria-label", "Browse conversations");
  historyBtn.title = "Browse conversations";

  const closeBtn = document.createElement("button");
  closeBtn.type = "button";
  closeBtn.className = "cr-header-btn";
  closeBtn.innerHTML = ICON_CLOSE;
  closeBtn.setAttribute("aria-label", "Close chat");
  closeBtn.title = "Close chat";

  headerActions.append(resetBtn, historyBtn, closeBtn);
  header.append(headerMain, headerActions);

  const body = document.createElement("div");
  body.className = "cr-body";

  const messages = document.createElement("div");
  messages.className = "cr-messages";

  const historyView = document.createElement("div");
  historyView.className = "cr-history cr-view--hidden";

  const welcomeView = document.createElement("div");
  welcomeView.className = "cr-welcome cr-view--hidden";

  const welcomeHero = document.createElement("div");
  welcomeHero.className = "cr-welcome-hero";

  const welcomeCloseBtn = document.createElement("button");
  welcomeCloseBtn.type = "button";
  welcomeCloseBtn.className = "cr-welcome-close";
  welcomeCloseBtn.innerHTML = ICON_CLOSE;
  welcomeCloseBtn.setAttribute("aria-label", "Close chat");
  welcomeCloseBtn.title = "Close chat";

  const welcomeHeadline = document.createElement("h2");
  welcomeHeadline.className = "cr-welcome-headline";
  welcomeHeadline.textContent = (cfg.welcome_screen_headline || "How can we help?").trim();
  welcomeHeadline.style.color = normalizeHexColor(
    cfg.welcome_screen_headline_color,
    "#ffffff"
  );
  welcomeHero.append(welcomeCloseBtn, welcomeHeadline);

  const welcomeContent = document.createElement("div");
  welcomeContent.className = "cr-welcome-content";

  const welcomeCard = document.createElement("div");
  welcomeCard.className = "cr-welcome-card";

  const welcomeCardRow = document.createElement("div");
  welcomeCardRow.className = "cr-welcome-card-row";
  const welcomeCardAvatar = document.createElement("div");
  welcomeCardAvatar.className = "cr-avatar-wrap cr-avatar-wrap--welcome cr-welcome-card-avatar";
  const welcomeAvatarImg = document.createElement("img");
  welcomeAvatarImg.className = "cr-avatar-img";
  welcomeAvatarImg.alt = "";
  welcomeAvatarImg.style.display = "none";
  welcomeCardAvatar.appendChild(welcomeAvatarImg);
  const welcomeCardCopy = document.createElement("div");
  welcomeCardCopy.className = "cr-welcome-card-copy";
  const welcomeCardName = document.createElement("p");
  welcomeCardName.className = "cr-welcome-card-name";
  welcomeCardName.textContent = cfg.name || "Chat";
  const welcomeCardDesc = document.createElement("p");
  welcomeCardDesc.className = "cr-welcome-card-desc";
  welcomeCardDesc.textContent = (
    cfg.welcome_screen_description || "Ask about orders, products, or store policies."
  ).trim();
  welcomeCardCopy.append(welcomeCardName, welcomeCardDesc);
  welcomeCardRow.append(welcomeCardAvatar, welcomeCardCopy);

  const welcomeCta = document.createElement("button");
  welcomeCta.type = "button";
  welcomeCta.className = "cr-welcome-cta";
  welcomeCta.textContent = (cfg.welcome_screen_button_label || "Chat with us").trim();

  welcomeCard.append(welcomeCardRow, welcomeCta);

  const welcomeSocialList = document.createElement("div");
  welcomeSocialList.className = "cr-welcome-social-list";
  for (const link of welcomeSocialLinksFromConfig(cfg)) {
    if (!link.url.trim()) continue;
    welcomeSocialList.appendChild(createWelcomeSocialCard(link));
  }

  const welcomeSpacer = document.createElement("div");
  welcomeSpacer.className = "cr-welcome-spacer";

  const welcomeCardWrap = document.createElement("div");
  welcomeCardWrap.className = "cr-welcome-card-wrap";
  welcomeCardWrap.appendChild(welcomeCard);

  const welcomePanel = document.createElement("div");
  welcomePanel.className = "cr-welcome-panel";
  welcomePanel.append(welcomeSocialList, welcomeSpacer);

  welcomeContent.append(welcomeCardWrap, welcomePanel);
  welcomeView.append(welcomeHero, welcomeContent);

  body.append(welcomeView, messages, historyView);

  const composer = document.createElement("div");
  composer.className = "cr-composer";

  const composerRow = document.createElement("div");
  composerRow.className = "cr-composer-row";

  const composerField = document.createElement("div");
  composerField.className = "cr-composer-field";

  const input = document.createElement("textarea");
  input.className = "cr-input";
  input.autocomplete = "off";
  input.placeholder = "Message…";
  input.rows = 1;

  const send = document.createElement("button");
  send.type = "button";
  send.className = "cr-send";
  send.innerHTML = ICON_SEND;
  send.setAttribute("aria-label", "Send");
  send.disabled = true;

  composerField.append(input, send);
  composerRow.append(composerField);

  const COMPOSER_INPUT_MAX_HEIGHT = 120;
  const COMPOSER_SINGLE_LINE_HEIGHT = 40;

  function syncComposerInputLayout(): void {
    input.style.height = "auto";
    const nextHeight = Math.min(input.scrollHeight, COMPOSER_INPUT_MAX_HEIGHT);
    input.style.height = `${nextHeight}px`;
    composerField.classList.toggle(
      "cr-composer-field--multiline",
      nextHeight > COMPOSER_SINGLE_LINE_HEIGHT
    );
  }

  function resetComposerInputLayout(): void {
    input.style.height = "auto";
    composerField.classList.remove("cr-composer-field--multiline");
  }

  const poweredByEl = document.createElement("div");
  poweredByEl.className = "cr-powered";
  if (!cfg.hide_powered_by_chatrely) {
    poweredByEl.innerHTML = poweredByChatRelyHtml(appOrigin);
  } else {
    poweredByEl.hidden = true;
  }

  const composerHint = document.createElement("p");
  composerHint.className = "cr-composer-hint cr-view--hidden";
  composerHint.textContent = "Choose a conversation above to load it, or use Back to chat.";

  const composerEscalated = document.createElement("p");
  composerEscalated.className = "cr-composer-escalated cr-view--hidden";
  composerEscalated.textContent = buildEscalatedBanner();

  const composerContact = document.createElement("form");
  composerContact.className = "cr-contact-form cr-view--hidden";
  composerContact.innerHTML = `
    <p class="cr-contact-title">Share your contact details</p>
    <p class="cr-contact-hint">Our team needs your name and email to follow up.</p>
    <label class="cr-contact-field">
      <span class="cr-contact-label">Name</span>
      <input class="cr-contact-input" type="text" name="name" autocomplete="name" required />
    </label>
    <label class="cr-contact-field">
      <span class="cr-contact-label">Email</span>
      <input class="cr-contact-input" type="email" name="email" autocomplete="email" required />
    </label>
    <p class="cr-contact-error cr-view--hidden" role="alert"></p>
    <button type="submit" class="cr-contact-submit">Connect me with support</button>
  `;

  composer.append(composerEscalated, composerContact, composerRow, poweredByEl, composerHint);
  panel.append(header, body, composer);
  applyWidgetAppearance([host, root, panel], root, theme, headerChrome, userChrome);
  root.append(launcher, panel);
  document.body.appendChild(host);

  mountWidgetLogoImage(headerAvatarImg, headerAvatarWrap, cfg.avatar_url, () => {});
  mountWidgetLogoImage(welcomeAvatarImg, welcomeCardAvatar, cfg.avatar_url, () => {});

  let store = readWidgetStore(agentKey);
  let visitorId = store.visitorId;
  let conversationId = store.activeConversationId;
  let chatMessages: StoredMessage[] = [];
  let historyOpen = false;
  let sending = false;
  let panelOpen = false;
  let greetingsRendered = false;
  type BodyView = "welcome" | "chat" | "history";
  let bodyView: BodyView = "chat";

  function welcomeScreenEnabled(): boolean {
    return cfg.welcome_screen_enabled !== false;
  }

  function applyBodyView(): void {
    const welcome = bodyView === "welcome";
    const history = bodyView === "history";
    const chat = bodyView === "chat";

    welcomeView.classList.toggle("cr-view--hidden", !welcome);
    messages.classList.toggle("cr-view--hidden", !chat);
    historyView.classList.toggle("cr-view--hidden", !history);
    header.classList.toggle("cr-view--hidden", welcome);
    composer.classList.remove("cr-view--hidden");
    composer.classList.toggle("cr-composer--footer-only", welcome || history);

    composerRow.classList.toggle("cr-view--hidden", !chat || contactCaptureRequired);
    composerContact.classList.toggle("cr-view--hidden", history || !contactCaptureRequired);
    composerHint.classList.toggle("cr-view--hidden", !history);
    const showWaitingBanner =
      !operatorEngaged &&
      !contactCaptureRequired &&
      isEscalatedStatus(conversationStatus);
    composerEscalated.classList.toggle(
      "cr-view--hidden",
      history || contactCaptureRequired || !showWaitingBanner
    );
    poweredByEl.classList.toggle(
      "cr-view--hidden",
      Boolean(cfg.hide_powered_by_chatrely) || contactCaptureRequired
    );
    composer.classList.toggle(
      "cr-composer--no-powered",
      Boolean(cfg.hide_powered_by_chatrely) || contactCaptureRequired
    );
    panel.classList.toggle("cr-panel--chat-surface", chat || history);
    panel.classList.toggle("cr-panel--welcome", welcome);
    panel.classList.toggle("cr-panel--history", history);
  }

  function rebuildSyncedMessageIds(): void {
    syncedServerMessageIds.clear();
    for (const msg of chatMessages) {
      if (msg.server_id) syncedServerMessageIds.add(msg.server_id);
    }
  }

  function ensureChatGreetings(): void {
    if (greetingsRendered || chatMessages.length > 0) return;
    greetingMessagesFromConfig(cfg).forEach((text) => {
      appendAssistantMessage({ text }, true, true);
    });
    greetingsRendered = true;
  }

  function openChatView(): void {
    if (historyOpen) setHistoryOpen(false);
    bodyView = "chat";
    applyBodyView();
    ensureChatGreetings();
    scrollMessages();
  }

  let conversationStatus = "open";
  let contactCaptureRequired = false;
  let operatorEngaged = false;
  let aiChatDisabled = false;
  let planConversationLimitReached = false;
  let handoffContext: HandoffContext | null = null;
  let threadStateReady = false;
  let threadStateSync: Promise<void> | null = null;
  let blockThreadSync = false;
  let operatorPollId: number | null = null;
  const syncedServerMessageIds = new Set<string>();

  const contactNameInput = composerContact.querySelector('input[name="name"]') as HTMLInputElement;
  const contactEmailInput = composerContact.querySelector('input[name="email"]') as HTMLInputElement;
  const contactErrorEl = composerContact.querySelector(".cr-contact-error") as HTMLParagraphElement;
  const contactSubmitBtn = composerContact.querySelector(".cr-contact-submit") as HTMLButtonElement;

  function readContactCaptureRequired(data: Record<string, unknown>): boolean {
    if (data.contact_capture_required === true) return true;
    const escalation = data.escalation;
    if (escalation && typeof escalation === "object" && !Array.isArray(escalation)) {
      return (escalation as Record<string, unknown>).contact_capture_required === true;
    }
    return false;
  }

  function setContactCaptureRequired(next: boolean): void {
    contactCaptureRequired = next;
    if (next) {
      openChatView();
    } else {
      contactErrorEl.classList.add("cr-view--hidden");
      contactErrorEl.textContent = "";
    }
    applyBodyView();
    updateComposerState();
  }

  function isEscalatedStatus(status: string | null | undefined): boolean {
    return (status ?? "").trim().toLowerCase() === "escalated";
  }

  function isHumanHandoffActive(): boolean {
    return (
      contactCaptureRequired ||
      aiChatDisabled ||
      isEscalatedStatus(conversationStatus) ||
      operatorEngaged
    );
  }

  function isComposerBlockedByPlanLimit(): boolean {
    return planConversationLimitReached;
  }

  function threadAwaitingHumanTeam(data: {
    conversation_status?: string;
    ai_chat_disabled?: boolean;
  }): boolean {
    return (
      data.ai_chat_disabled === true ||
      isEscalatedStatus(data.conversation_status)
    );
  }

  function applyConversationStatus(status: string | null | undefined): void {
    conversationStatus = (status ?? "open").trim().toLowerCase() || "open";
    if (isEscalatedStatus(conversationStatus)) {
      aiChatDisabled = true;
    } else if (!operatorEngaged) {
      aiChatDisabled = false;
    }
    updateComposerState();
    if (conversationId) persistStore();
  }

  function applyAiChatDisabledFromSse(value: unknown): void {
    if (value === true) {
      aiChatDisabled = true;
      return;
    }
    if (value === false && !isEscalatedStatus(conversationStatus) && !operatorEngaged) {
      aiChatDisabled = false;
    }
  }

  function purgePhantomAssistantFallbacks(): void {
    if (!isHumanHandoffActive()) return;
    const next = chatMessages.filter(
      (m) => m.role !== "assistant" || m.text.trim() !== EMPTY_REPLY_FALLBACK
    );
    if (next.length === chatMessages.length) return;
    chatMessages = next;
    renderChatMessages();
    persistStore();
  }

  function applyThreadStateFromServer(data: {
    conversation_status?: string;
    ai_chat_disabled?: boolean;
    plan_conversation_limit_reached?: boolean;
    operator_engaged?: boolean;
    handoff?: {
      seller_live?: boolean;
      estimated_minutes?: number | null;
      channel_hint?: string | null;
    } | null;
  }): void {
    conversationStatus = (data.conversation_status ?? "open").trim().toLowerCase() || "open";
    operatorEngaged = data.operator_engaged === true;
    const threadHandoff = readHandoffFromThread(data);
    if (threadHandoff) {
      setHandoffContext(threadHandoff);
    } else if (
      !data.ai_chat_disabled &&
      !isEscalatedStatus(conversationStatus) &&
      !operatorEngaged
    ) {
      setHandoffContext(null);
    }
    aiChatDisabled =
      data.ai_chat_disabled === true ||
      isEscalatedStatus(conversationStatus) ||
      operatorEngaged;
    planConversationLimitReached = data.plan_conversation_limit_reached === true;
    updateComposerState();
  }

  function latestSyncedMessageAt(): string | null {
    let latest: string | null = null;
    for (const msg of chatMessages) {
      const iso = msg.created_at;
      if (!iso) continue;
      if (!latest || iso > latest) latest = iso;
    }
    return latest;
  }

  function needsOperatorThreadSync(): boolean {
    return Boolean(conversationId) && isHumanHandoffActive();
  }

  function stopOperatorPoll(): void {
    if (operatorPollId !== null) {
      window.clearInterval(operatorPollId);
      operatorPollId = null;
    }
  }

  function startOperatorPoll(): void {
    stopOperatorPoll();
    if (!needsOperatorThreadSync() || !panelOpen) return;
    operatorPollId = window.setInterval(() => {
      if (document.visibilityState !== "visible" || !panelOpen || blockThreadSync) return;
      void syncThreadFromServer();
    }, WIDGET_OPERATOR_SYNC_MS);
  }

  function refreshOperatorPoll(): void {
    if (needsOperatorThreadSync() && panelOpen) startOperatorPoll();
    else stopOperatorPoll();
  }

  function updateComposerState(): void {
    const humanHandoff = isHumanHandoffActive();
    const planBlocked = isComposerBlockedByPlanLimit();
    input.disabled = contactCaptureRequired || planBlocked;
    input.placeholder = planBlocked
      ? "Chat unavailable this month"
      : humanHandoff
        ? "Message our team…"
        : "Message…";
    send.disabled =
      contactCaptureRequired ||
      planBlocked ||
      sending ||
      !input.value.trim() ||
      (Boolean(conversationId) && !threadStateReady);
    composerEscalated.textContent = buildEscalatedBanner(handoffContext);
    applyBodyView();
    refreshOperatorPoll();
  }

  async function syncThreadFromServer(): Promise<void> {
    if (!conversationId) {
      threadStateReady = true;
      return;
    }
    if (blockThreadSync) return;
    try {
      const since = latestSyncedMessageAt();
      const data = await fetchWidgetThread(apiBase, agentKey, {
        conversation_id: conversationId,
        visitor_id: visitorId,
        ...(since ? { since } : {}),
      });
      applyThreadStateFromServer(data);
      purgePhantomAssistantFallbacks();
      for (const msg of data.messages) applySyncedThreadMessage(msg);
    } catch {
      /* best-effort */
    } finally {
      threadStateReady = true;
      updateComposerState();
    }
  }

  let demoReplyIndex = 0;

  function ensureThreadStateFresh(): Promise<void> {
    if (demoMode || !conversationId) {
      threadStateReady = true;
      return Promise.resolve();
    }
    if (!threadStateSync) {
      threadStateSync = syncThreadFromServer().finally(() => {
        threadStateSync = null;
      });
    }
    return threadStateSync;
  }

  function requestThreadSync(): void {
    if (demoMode || !conversationId) return;
    void ensureThreadStateFresh();
  }

  function readHandoffFromApiFields(data: {
    seller_live?: boolean;
    estimated_minutes?: number | null;
    channel_hint?: string | null;
  }): HandoffContext {
    return {
      seller_live: data.seller_live === true,
      estimated_minutes:
        typeof data.estimated_minutes === "number" ? data.estimated_minutes : null,
      channel_hint:
        data.channel_hint === "live" || data.channel_hint === "email" ? data.channel_hint : null,
    };
  }

  function readHandoffFromThread(data: {
    conversation_status?: string;
    ai_chat_disabled?: boolean;
    handoff?: {
      seller_live?: boolean;
      estimated_minutes?: number | null;
      channel_hint?: string | null;
    } | null;
  }): HandoffContext | null {
    if (!data.handoff || typeof data.handoff !== "object") return null;
    if (!threadAwaitingHumanTeam(data)) return null;
    return readHandoffFromApiFields(data.handoff);
  }

  function readHandoffFromEscalation(data: Record<string, unknown>): HandoffContext | null {
    const escalation = data.escalation;
    if (!escalation || typeof escalation !== "object" || Array.isArray(escalation)) return null;
    const row = escalation as Record<string, unknown>;
    return {
      seller_live: row.seller_live === true,
      estimated_minutes:
        typeof row.estimated_minutes === "number" ? row.estimated_minutes : null,
      channel_hint:
        row.channel_hint === "live" || row.channel_hint === "email" ? row.channel_hint : null,
    };
  }

  /** Only treat handoff as active after a real escalation, not metadata on every chat turn. */
  function readHandoffFromEscalationIfActive(data: Record<string, unknown>): HandoffContext | null {
    const escalated =
      data.ai_chat_disabled === true ||
      isEscalatedStatus(typeof data.conversation_status === "string" ? data.conversation_status : null);
    const escalation = data.escalation;
    const row =
      escalation && typeof escalation === "object" && !Array.isArray(escalation)
        ? (escalation as Record<string, unknown>)
        : null;
    if (!escalated && row?.occurred !== true && !readContactCaptureRequired(data)) return null;
    return readHandoffFromEscalation(data);
  }

  function removeConfigGreetingsFromTranscript(): void {
    const greetingSet = new Set(greetingMessagesFromConfig(cfg));
    if (!greetingSet.size) return;
    if (chatMessages.some((m) => m.role === "user")) return;
    const next = chatMessages.filter(
      (m) => !(m.role === "assistant" && greetingSet.has(m.text.trim()))
    );
    if (next.length === chatMessages.length) return;
    chatMessages = next;
    renderChatMessages();
  }

  function setHandoffContext(next: HandoffContext | null): void {
    handoffContext = next;
    if (conversationId && store.threads.length) {
      const idx = store.threads.findIndex((t) => t.id === conversationId);
      if (idx >= 0) {
        store.threads[idx] = { ...store.threads[idx], handoff: next ?? undefined };
        writeWidgetStore(agentKey, store);
      }
    }
    updateComposerState();
  }

  function messageAlreadyInTranscript(msg: WidgetThreadMessage): boolean {
    if (msg.id && syncedServerMessageIds.has(msg.id)) return true;
    const text = msg.content.trim();
    return chatMessages.some(
      (m) =>
        m.role === msg.role &&
        m.text.trim() === text &&
        (m.server_id === msg.id || !m.server_id)
    );
  }

  function isConfigGreetingText(text: string): boolean {
    const trimmed = text.trim();
    if (!trimmed) return false;
    return greetingMessagesFromConfig(cfg).some((line) => line.trim() === trimmed);
  }

  function applySyncedThreadMessage(msg: WidgetThreadMessage): void {
    if (
      msg.role === "assistant" &&
      chatMessages.some((m) => m.role === "user") &&
      isConfigGreetingText(msg.content)
    ) {
      syncedServerMessageIds.add(msg.id);
      return;
    }
    if (messageAlreadyInTranscript(msg)) {
      syncedServerMessageIds.add(msg.id);
      return;
    }
    syncedServerMessageIds.add(msg.id);
    if (msg.role === "user") {
      appendUserMessage(msg.content, true, msg.created_at);
      const last = chatMessages[chatMessages.length - 1];
      if (last) last.server_id = msg.id;
    } else {
      appendAssistantMessage(
        { text: msg.content, created_at: msg.created_at, server_id: msg.id },
        true,
        true
      );
      persistStore();
    }
  }

  if (conversationId) {
    const thread = store.threads.find((t) => t.id === conversationId);
    if (thread) {
      visitorId = thread.visitorId;
      chatMessages = [...thread.messages];
      conversationStatus = thread.status ?? "open";
      handoffContext = isEscalatedStatus(conversationStatus) ? (thread.handoff ?? null) : null;
      aiChatDisabled = isEscalatedStatus(conversationStatus) || operatorEngaged;
      for (const msg of chatMessages) {
        if (msg.server_id) syncedServerMessageIds.add(msg.server_id);
      }
    } else {
      conversationId = null;
      store.activeConversationId = null;
      writeWidgetStore(agentKey, store);
    }
  }
  applyConversationStatus(conversationStatus);
  if (conversationId) {
    threadStateReady = false;
    void ensureThreadStateFresh();
  } else {
    threadStateReady = true;
  }

  function updatePoweredByVisibility(): void {
    poweredByEl.hidden = Boolean(cfg.hide_powered_by_chatrely);
    composer.classList.toggle(
      "cr-composer--no-powered",
      Boolean(cfg.hide_powered_by_chatrely) || contactCaptureRequired
    );
  }

  function persistStore(): void {
    if (conversationId) {
      const preview = threadPreview(chatMessages);
      const idx = store.threads.findIndex((t) => t.id === conversationId);
      const row: ThreadRecord = {
        id: conversationId,
        visitorId,
        messages: [...chatMessages],
        preview,
        updatedAt: Date.now(),
        status: conversationStatus,
        handoff:
          isEscalatedStatus(conversationStatus) || aiChatDisabled
            ? handoffContext ?? undefined
            : undefined,
      };
      if (idx >= 0) store.threads[idx] = row;
      else store.threads.unshift(row);
      store.threads.sort((a, b) => b.updatedAt - a.updatedAt);
      store.threads = store.threads.slice(0, 20);
    }
    store.visitorId = visitorId;
    store.activeConversationId = conversationId;
    writeWidgetStore(agentKey, store);
  }

  function syncMessageRowSpacing(): void {
    const rows = messages.querySelectorAll<HTMLElement>(".cr-msg-row");
    rows.forEach((row, index) => {
      row.classList.remove("cr-msg-row--grouped");
      const prev = rows[index - 1];
      if (!prev) return;
      const sameSender =
        (row.classList.contains("cr-msg-row--user") && prev.classList.contains("cr-msg-row--user")) ||
        (row.classList.contains("cr-msg-row--assistant") &&
          prev.classList.contains("cr-msg-row--assistant"));
      if (sameSender) row.classList.add("cr-msg-row--grouped");
    });
  }

  function scrollMessages(): void {
    syncMessageRowSpacing();
    if (historyOpen) return;
    messages.scrollTop = messages.scrollHeight;
  }

  function clearMessagesDom(): void {
    messages.innerHTML = "";
  }

  function renderChatMessages(): void {
    clearMessagesDom();
    for (let i = 0; i < chatMessages.length; i += 1) {
      const msg = chatMessages[i];
      if (msg.role === "user") appendUserMessage(msg.text, false, msg.created_at);
      else appendAssistantMessage(msg, true, false);
    }
    syncAssistantFeedbackButtons(messages, chatMessages, cfg, apiBase, agentKey, visitorId);
    updatePoweredByVisibility();
    scrollMessages();
  }

  function appendUserMessage(text: string, record = true, createdAt?: string): void {
    const iso = messageCreatedAtIso(createdAt);
    if (record) {
      chatMessages.push({ role: "user", text, created_at: iso });
      persistStore();
      updatePoweredByVisibility();
    }
    const row = document.createElement("div");
    row.className = "cr-msg-row cr-msg-row--user";
    const col = document.createElement("div");
    col.className = "cr-msg-col cr-msg-col--user";
    const bubble = document.createElement("div");
    bubble.className = "cr-msg cr-msg--user";
    const body = document.createElement("div");
    body.className = "cr-msg-body";
    const textEl = document.createElement("span");
    textEl.className = "cr-msg-text";
    textEl.textContent = text;
    body.appendChild(textEl);
    bubble.appendChild(body);
    ensureMessageTimestamp(bubble, iso, "user");
    col.appendChild(bubble);
    row.appendChild(col);
    messages.appendChild(row);
    scrollMessages();
  }

  function appendAssistantMessage(
    msg: Pick<StoredMessage, "text" | "products" | "product_detail" | "created_at" | "server_id">,
    html = true,
    record = true
  ): HTMLDivElement {
    const iso = messageCreatedAtIso(msg.created_at);
    if (record) {
      chatMessages.push({
        role: "assistant",
        text: msg.text,
        created_at: iso,
        ...(msg.server_id ? { server_id: msg.server_id } : {}),
        ...(msg.products?.length ? { products: msg.products } : {}),
        ...(msg.product_detail ? { product_detail: msg.product_detail } : {}),
      });
      persistStore();
    }
    const row = document.createElement("div");
    row.className = "cr-msg-row cr-msg-row--assistant";
    const col = document.createElement("div");
    col.className = "cr-msg-col";
    const wrap = document.createElement("div");
    wrap.className = "cr-msg-wrap";
    const bubble = document.createElement("div");
    bubble.className = "cr-msg cr-msg--assistant";
    if (html) bubble.innerHTML = renderAssistantHtml(msg.text);
    else bubble.textContent = msg.text;
    wrap.appendChild(bubble);
    renderAssistantRichContent(
      wrap,
      bubble,
      msg,
      (card) => void runProductAction("details", card),
      (card) => void runProductAction("similar", card),
      sending
    );
    col.appendChild(wrap);
    ensureMessageTimestamp(bubble, iso, "assistant");
    row.appendChild(col);
    messages.appendChild(row);
    if (
      cfg.message_feedback_enabled &&
      msg.server_id &&
      isAssistantFeedbackEligible(msg.text, {
        hasProducts: Boolean(msg.products?.length),
        hasProductDetail: Boolean(msg.product_detail),
      })
    ) {
      mountMessageFeedback(wrap, apiBase, agentKey, visitorId, msg.server_id);
    }
    scrollMessages();
    return bubble;
  }

  function appendError(text: string): void {
    const row = document.createElement("div");
    row.className = "cr-msg-row";
    const bubble = document.createElement("div");
    bubble.className = "cr-msg cr-msg--err";
    bubble.textContent = text;
    row.appendChild(bubble);
    messages.appendChild(row);
    scrollMessages();
  }

  function createAssistantStreamWrap(): {
    row: HTMLDivElement;
    wrap: HTMLDivElement;
    assistantEl: HTMLDivElement;
    createdAt: string;
  } {
    const createdAt = messageCreatedAtIso();
    const row = document.createElement("div");
    row.className = "cr-msg-row cr-msg-row--assistant";
    const col = document.createElement("div");
    col.className = "cr-msg-col";
    const wrap = document.createElement("div");
    wrap.className = "cr-msg-wrap";
    const assistantEl = document.createElement("div");
    assistantEl.className = "cr-msg cr-msg--assistant cr-msg--thinking";
    const dotsEl = document.createElement("div");
    dotsEl.className = "cr-thinking-dots";
    dotsEl.innerHTML =
      '<span class="cr-thinking-dot"></span><span class="cr-thinking-dot"></span><span class="cr-thinking-dot"></span>';
    assistantEl.appendChild(dotsEl);
    wrap.appendChild(assistantEl);
    col.appendChild(wrap);
    row.appendChild(col);
    messages.appendChild(row);
    scrollMessages();
    return { row, wrap, assistantEl, createdAt };
  }

  function renderHistory(): void {
    historyView.innerHTML = "";
    const back = document.createElement("button");
    back.type = "button";
    back.className = "cr-history-back";
    back.innerHTML = `${ICON_CHEVRON} Back to chat`;
    back.addEventListener("click", () => setHistoryOpen(false));

    const heading = document.createElement("div");
    heading.className = "cr-history-heading";
    heading.innerHTML = "<h4>Conversations</h4><p>Your recent chats in this browser.</p>";
    historyView.append(back, heading);

    if (!store.threads.length) {
      const empty = document.createElement("p");
      empty.className = "cr-history-empty";
      empty.textContent = "No conversations yet.";
      historyView.appendChild(empty);
      return;
    }

    const list = document.createElement("ul");
    list.className = "cr-history-list";
    for (const row of store.threads) {
      const li = document.createElement("li");
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "cr-history-item";
      if (conversationId === row.id) btn.classList.add("cr-history-item--active");
      const when = new Date(row.updatedAt).toLocaleString(undefined, {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
      btn.innerHTML = `<div class="cr-history-item-top"><span class="cr-history-item-id">${row.id.slice(0, 8)}…</span><span class="cr-history-item-when">${when}</span></div><p class="cr-history-item-preview">${row.preview.replace(/</g, "&lt;")}</p>`;
      btn.addEventListener("click", () => {
        conversationId = row.id;
        visitorId = row.visitorId;
        chatMessages = [...row.messages];
        store.activeConversationId = conversationId;
        store.visitorId = visitorId;
        writeWidgetStore(agentKey, store);
        setHistoryOpen(false);
        applyConversationStatus(row.status ?? "open");
        rebuildSyncedMessageIds();
        renderChatMessages();
        threadStateReady = false;
        void ensureThreadStateFresh();
      });
      li.appendChild(btn);
      list.appendChild(li);
    }
    historyView.appendChild(list);
  }

  function setHistoryOpen(next: boolean): void {
    historyOpen = next;
    historyBtn.classList.toggle("cr-header-btn--active", next);
    historyBtn.setAttribute("aria-label", next ? "Close conversations list" : "Browse conversations");
    historyBtn.title = next ? "Back to chat" : "Browse conversations";
    if (next) {
      bodyView = "history";
    } else if (welcomeScreenEnabled() && chatMessages.length === 0 && !greetingsRendered) {
      bodyView = "welcome";
    } else {
      bodyView = "chat";
    }
    applyBodyView();
    if (next) renderHistory();
    else if (bodyView === "chat") ensureChatGreetings();
  }

  function resetChat(): void {
    if (conversationId && chatMessages.length) persistStore();
    demoReplyIndex = 0;
    visitorId = newVisitorId();
    conversationId = null;
    chatMessages = [];
    store.visitorId = visitorId;
    store.activeConversationId = null;
    writeWidgetStore(agentKey, store);
    clearMessagesDom();
    setHistoryOpen(false);
    setContactCaptureRequired(false);
    aiChatDisabled = false;
    operatorEngaged = false;
    handoffContext = null;
    threadStateReady = true;
    applyConversationStatus("open");
    greetingsRendered = false;
    if (welcomeScreenEnabled()) {
      bodyView = "welcome";
    } else {
      bodyView = "chat";
      ensureChatGreetings();
    }
    applyBodyView();
    updatePoweredByVisibility();
  }

  function setPanelOpen(next: boolean): void {
    panelOpen = next;
    panel.classList.toggle("cr-panel--open", next);
    root.classList.toggle("cr-root--panel-open", next);
    launcher.classList.toggle("cr-launcher--hidden", next);
    launcher.setAttribute("aria-expanded", next ? "true" : "false");
    if (next) {
      requestThreadSync();
    } else {
      stopOperatorPoll();
    }
  }

  function clearStaleConversation(): void {
    conversationId = null;
    store.activeConversationId = null;
    writeWidgetStore(agentKey, store);
  }

  async function streamDemoAssistantReply(
    userText: string,
    streamWrap: {
      row: HTMLDivElement;
      wrap: HTMLDivElement;
      assistantEl: HTMLDivElement;
      createdAt: string;
    }
  ): Promise<void> {
    const { assistantEl, createdAt } = streamWrap;
    const dotsEl = assistantEl.querySelector(".cr-thinking-dots");
    await sleep(850 + Math.random() * 450);
    const reply = pickDemoReply(userText, demoReplyIndex);
    demoReplyIndex += 1;
    if (dotsEl instanceof HTMLElement) dotsEl.hidden = true;
    assistantEl.classList.remove("cr-msg--thinking");
    assistantEl.setAttribute("data-plain", reply);
    assistantEl.innerHTML = renderAssistantHtml(reply);
    ensureMessageTimestamp(assistantEl, createdAt, "assistant");
    chatMessages.push({ role: "assistant", text: reply, created_at: createdAt });
    persistStore();
    scrollMessages();
  }

  async function streamAssistantReply(
    userText: string,
    streamWrap: {
      row: HTMLDivElement;
      wrap: HTMLDivElement;
      assistantEl: HTMLDivElement;
      createdAt: string;
    },
    retrying: boolean,
    productAction?: ProductActionRequest,
    onComposerReady?: () => void
  ): Promise<void> {
    if (demoMode) {
      await streamDemoAssistantReply(userText, streamWrap);
      onComposerReady?.();
      return;
    }
    if (conversationId) await ensureThreadStateFresh();
    if (isHumanHandoffActive() && conversationId && !productAction) {
      streamWrap.row.remove();
      await postWidgetVisitorMessage(apiBase, agentKey, {
        conversation_id: conversationId,
        visitor_id: visitorId,
        message: userText,
      });
      requestThreadSync();
      return;
    }

    let row = streamWrap.row;
    let wrap = streamWrap.wrap;
    let assistantEl = streamWrap.assistantEl;
    let createdAt = streamWrap.createdAt;
    let dotsEl = assistantEl.querySelector(".cr-thinking-dots");
    let pendingProducts: ProductCard[] | undefined;
    let pendingDetail: ProductDetail | undefined;
    let statusEl: HTMLParagraphElement | null = null;

    const hideDots = (): void => {
      if (dotsEl instanceof HTMLElement) dotsEl.hidden = true;
    };
    const clearStatus = (): void => {
      statusEl?.remove();
      statusEl = null;
    };
    const showStatus = (line: string): void => {
      const trimmed = line.trim();
      if (!trimmed) return;
      if (!statusEl) {
        statusEl = document.createElement("p");
        statusEl.className = "cr-tool-status";
        assistantEl.appendChild(statusEl);
      }
      statusEl.textContent = trimmed;
      hideDots();
      scrollMessages();
    };
    const commitAssistantBubble = (text: string): void => {
      const trimmed = text.trim();
      if (!trimmed) return;
      hideDots();
      clearStatus();
      assistantEl.classList.remove("cr-msg--thinking");
      assistantEl.setAttribute("data-plain", trimmed);
      assistantEl.innerHTML = renderAssistantHtml(trimmed);
      ensureMessageTimestamp(assistantEl, createdAt, "assistant");
      chatMessages.push({ role: "assistant", text: trimmed, created_at: createdAt });
      persistStore();
      scrollMessages();
    };
    const startFollowUpBubble = (): void => {
      const next = createAssistantStreamWrap();
      row = next.row;
      wrap = next.wrap;
      assistantEl = next.assistantEl;
      createdAt = next.createdAt;
      dotsEl = assistantEl.querySelector(".cr-thinking-dots");
      pendingProducts = undefined;
      pendingDetail = undefined;
      statusEl = null;
    };

    let gotDone = false;
    let streamTurnFinalized = false;

    const applyStreamConversationMeta = (ev: Record<string, unknown>): void => {
      if (typeof ev.conversation_id === "string") conversationId = ev.conversation_id;
      if (typeof ev.conversation_status === "string") {
        applyConversationStatus(ev.conversation_status);
      } else if (ev.ai_chat_disabled === true) {
        applyConversationStatus("escalated");
      }
      if (ev.plan_conversation_limit_reached === true) {
        planConversationLimitReached = true;
        updateComposerState();
      }
      applyAiChatDisabledFromSse(ev.ai_chat_disabled);
      setContactCaptureRequired(readContactCaptureRequired(ev));
      const handoff = readHandoffFromEscalationIfActive(ev);
      if (handoff) {
        setHandoffContext(handoff);
      } else if (
        ev.ai_chat_disabled !== true &&
        !isEscalatedStatus(
          typeof ev.conversation_status === "string" ? ev.conversation_status : null
        ) &&
        !readContactCaptureRequired(ev)
      ) {
        setHandoffContext(null);
      }
    };

    const finalizeAssistantStream = (ev: Record<string, unknown>): void => {
      if (streamTurnFinalized) return;
      streamTurnFinalized = true;
      hideDots();
      clearStatus();
      assistantEl.classList.remove("cr-msg--thinking");
      const hasRichProducts =
        Boolean(pendingDetail) ||
        Boolean(pendingProducts?.length) ||
        (Array.isArray(ev.products) && ev.products.length > 0) ||
        Boolean(ev.product_detail && typeof ev.product_detail === "object");
      const aiChatDisabled =
        ev.ai_chat_disabled === true ||
        isEscalatedStatus(
          typeof ev.conversation_status === "string" ? ev.conversation_status : conversationStatus
        );
      const plainAccumulated = (assistantEl.getAttribute("data-plain") || "").trim();
      const fullReply =
        (typeof ev.response === "string" ? ev.response : "").trim() ||
        plainAccumulated ||
        (hasRichProducts || aiChatDisabled || isHumanHandoffActive() ? "" : EMPTY_REPLY_FALLBACK);
      let displayText = hasRichProducts ? introTextForProductCards(fullReply) : fullReply;
      if (!displayText.trim() && !hasRichProducts) {
        if (conversationId) void ensureThreadStateFresh();
        if (aiChatDisabled || isHumanHandoffActive()) {
          row.remove();
          chatMessages = chatMessages.filter(
            (m) => !(m.role === "assistant" && m.created_at === createdAt)
          );
          persistStore();
          return;
        }
        displayText = EMPTY_REPLY_FALLBACK;
      }
      setAssistantBubbleText(assistantEl, displayText);
      ensureMessageTimestamp(assistantEl, createdAt, "assistant");
      const mid = typeof ev.assistant_message_id === "string" ? ev.assistant_message_id : null;
      const stored: StoredMessage = {
        role: "assistant",
        text: fullReply || displayText,
        created_at: createdAt,
        ...(mid ? { server_id: mid } : {}),
      };
      if (pendingDetail) stored.product_detail = pendingDetail;
      else if (pendingProducts?.length) stored.products = pendingProducts;
      else if (Array.isArray(ev.products) && ev.products.length) {
        stored.products = ev.products as ProductCard[];
      } else if (ev.product_detail && typeof ev.product_detail === "object") {
        stored.product_detail = ev.product_detail as ProductDetail;
      }
      const lastMsg = chatMessages[chatMessages.length - 1];
      if (lastMsg?.role === "assistant" && lastMsg.created_at === createdAt) {
        Object.assign(lastMsg, stored);
      } else {
        chatMessages.push(stored);
      }
      renderAssistantRichContent(
        wrap,
        assistantEl,
        stored,
        (card) => void runProductAction("details", card),
        (card) => void runProductAction("similar", card),
        false
      );
      ensureMessageTimestamp(assistantEl, createdAt, "assistant");
      persistStore();
      if (
        cfg.message_feedback_enabled &&
        mid &&
        isAssistantFeedbackEligible(displayText, {
          hasProducts: Boolean(stored.products?.length),
          hasProductDetail: Boolean(stored.product_detail),
        })
      ) {
        mountMessageFeedback(wrap, apiBase, agentKey, visitorId, mid);
      }
      syncAssistantFeedbackButtons(messages, chatMessages, cfg, apiBase, agentKey, visitorId);
      scrollMessages();
    };

    try {
      for await (const ev of streamChat(apiBase, agentKey, {
        message: userText,
        conversation_id: conversationId,
        visitor_id: visitorId,
        ...clientChatContext(),
        ...(productAction
          ? {
              product_action: {
                type: productAction.type,
                handle: productAction.handle,
                title: productAction.title ?? null,
              },
            }
          : {}),
      })) {
        if (ev.type === "preamble") {
          commitAssistantBubble(ev.text);
          startFollowUpBubble();
        } else if (ev.type === "status") showStatus(ev.text);
        else if (ev.type === "products") {
          pendingProducts = ev.products;
          pendingDetail = undefined;
          renderAssistantRichContent(
            wrap,
            assistantEl,
            { text: assistantEl.getAttribute("data-plain") || "", products: pendingProducts },
            (card) => void runProductAction("details", card),
            (card) => void runProductAction("similar", card),
            true
          );
          scrollMessages();
        } else if (ev.type === "product_detail") {
          pendingDetail = ev.product;
          pendingProducts = undefined;
          renderAssistantRichContent(
            wrap,
            assistantEl,
            { text: assistantEl.getAttribute("data-plain") || "", product_detail: pendingDetail },
            (card) => void runProductAction("details", card),
            (card) => void runProductAction("similar", card),
            true
          );
          scrollMessages();
        } else if (ev.type === "token") {
          hideDots();
          clearStatus();
          assistantEl.classList.remove("cr-msg--thinking");
          const prev = assistantEl.getAttribute("data-plain") || "";
          const nextPlain = prev + ev.text;
          assistantEl.classList.remove("cr-msg--text-hidden");
          assistantEl.setAttribute("data-plain", nextPlain);
          const hasRichPending = Boolean(pendingProducts?.length || pendingDetail);
          if (hasRichPending) {
            setAssistantBubbleText(assistantEl, introTextForProductCards(nextPlain));
          } else {
            assistantEl.innerHTML = renderAssistantHtml(nextPlain);
          }
          ensureMessageTimestamp(assistantEl, createdAt, "assistant");
          scrollMessages();
        } else if (ev.type === "ready") {
          gotDone = true;
          applyStreamConversationMeta(ev as Record<string, unknown>);
          finalizeAssistantStream(ev as Record<string, unknown>);
          onComposerReady?.();
        } else if (ev.type === "done") {
          gotDone = true;
          applyStreamConversationMeta(ev as Record<string, unknown>);
          finalizeAssistantStream(ev as Record<string, unknown>);
        } else if (ev.type === "error") {
          if (!retrying && isVisitorMismatchError(ev.message || "")) {
            clearStaleConversation();
            row.remove();
            await streamAssistantReply(userText, createAssistantStreamWrap(), true, productAction);
            return;
          }
          row.remove();
          appendError(ev.message || "Something went wrong.");
          return;
        }
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Network error.";
      if (!retrying && isVisitorMismatchError(msg)) {
        clearStaleConversation();
        row.remove();
        await streamAssistantReply(userText, createAssistantStreamWrap(), true);
        return;
      }
      row.remove();
      appendError(msg);
      return;
    } finally {
      hideDots();
      clearStatus();
      if (!gotDone && !streamTurnFinalized) {
        const plain = (assistantEl.getAttribute("data-plain") || "").trim();
        if (plain) {
          assistantEl.innerHTML = renderAssistantHtml(plain);
          ensureMessageTimestamp(assistantEl, createdAt, "assistant");
          chatMessages.push({ role: "assistant", text: plain, created_at: createdAt });
          persistStore();
        } else if (row.isConnected) {
          row.remove();
          appendError("Something went wrong. Try again.");
        }
      }
    }
  }

  async function runProductAction(type: "details" | "similar", card: ProductCard): Promise<void> {
    if (sending || isHumanHandoffActive()) return;
    const action: ProductActionRequest = { type, handle: card.handle, title: card.title };
    const userText = productActionUserMessage(action);
    sending = true;
    blockThreadSync = true;
    send.disabled = true;
    appendUserMessage(userText);
    const streamWrap = createAssistantStreamWrap();
    try {
      await streamAssistantReply(userText, streamWrap, false, action, () => {
        sending = false;
        send.disabled = !input.value.trim();
      });
    } finally {
      sending = false;
      blockThreadSync = false;
      send.disabled = !input.value.trim();
      requestThreadSync();
    }
  }

  async function submitVisitorContact(ev: Event): Promise<void> {
    ev.preventDefault();
    if (!conversationId || contactSubmitBtn.disabled) return;
    const name = contactNameInput.value.trim();
    const email = contactEmailInput.value.trim();
    if (!name || !email) {
      contactErrorEl.textContent = "Name and email are required.";
      contactErrorEl.classList.remove("cr-view--hidden");
      return;
    }
    contactSubmitBtn.disabled = true;
    contactErrorEl.classList.add("cr-view--hidden");
    contactErrorEl.textContent = "";
    try {
      const result = await postWidgetVisitorContact(apiBase, agentKey, {
        conversation_id: conversationId,
        visitor_id: visitorId,
        visitor_name: name,
        visitor_email: email,
      });
      setContactCaptureRequired(result.contact_capture_required);
      applyConversationStatus(result.conversation_status);
      setHandoffContext(readHandoffFromApiFields(result));
      appendAssistantMessage({ text: result.handoff_message }, true, true);
      requestThreadSync();
      contactNameInput.value = "";
      contactEmailInput.value = "";
    } catch (e) {
      contactErrorEl.textContent = e instanceof Error ? e.message : "Could not submit contact details.";
      contactErrorEl.classList.remove("cr-view--hidden");
    } finally {
      contactSubmitBtn.disabled = false;
    }
  }

  async function sendMessage(): Promise<void> {
    const text = input.value.trim();
    if (!text || sending || contactCaptureRequired || planConversationLimitReached) return;
    const humanHandoff = isHumanHandoffActive();
    removeConfigGreetingsFromTranscript();
    sending = true;
    blockThreadSync = true;
    send.disabled = true;
    input.disabled = true;
    input.value = "";
    resetComposerInputLayout();
    appendUserMessage(text);
    try {
      if (humanHandoff && conversationId) {
        await postWidgetVisitorMessage(apiBase, agentKey, {
          conversation_id: conversationId,
          visitor_id: visitorId,
          message: text,
        });
      } else {
        const streamWrap = createAssistantStreamWrap();
        await streamAssistantReply(text, streamWrap, false, undefined);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Something went wrong.";
      appendError(msg);
    } finally {
      sending = false;
      blockThreadSync = false;
      input.disabled = contactCaptureRequired;
      updateComposerState();
      requestThreadSync();
    }
  }

  if (demoMode && demoSeed) {
    chatMessages = buildDemoChatMessages();
    conversationId = null;
    store.activeConversationId = null;
    greetingsRendered = true;
  }

  if (chatMessages.length) {
    renderChatMessages();
    bodyView = "chat";
    greetingsRendered = true;
  } else if (welcomeScreenEnabled()) {
    bodyView = "welcome";
  } else {
    bodyView = "chat";
    ensureChatGreetings();
  }
  applyBodyView();
  updatePoweredByVisibility();

  welcomeCta.addEventListener("click", () => openChatView());
  welcomeCloseBtn.addEventListener("click", () => setPanelOpen(false));
  resetBtn.addEventListener("click", resetChat);
  historyBtn.addEventListener("click", () => setHistoryOpen(!historyOpen));
  closeBtn.addEventListener("click", () => setPanelOpen(false));
  launcher.addEventListener("click", () => {
    if (!panelOpen) setPanelOpen(true);
  });
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible" && panelOpen) requestThreadSync();
  });
  composerContact.addEventListener("submit", (ev) => void submitVisitorContact(ev));
  send.addEventListener("click", () => void sendMessage());
  input.addEventListener("input", () => {
    syncComposerInputLayout();
    send.disabled = sending || contactCaptureRequired || !input.value.trim();
  });
  input.addEventListener("keydown", (ev) => {
    if (ev.key === "Enter" && !ev.shiftKey) {
      ev.preventDefault();
      void sendMessage();
    }
  });
}

void boot();
