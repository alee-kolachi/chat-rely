import cssText from "./styles.css?inline";
import {
  fetchWidgetConfig,
  postWidgetMessageFeedback,
  postWidgetVisitorContact,
  streamChat,
  type ProductActionRequest,
  type ProductCard,
  type ProductDetail,
  type WidgetConfig,
} from "./api";
import {
  detectWelcomeSocialPlatform,
  SOCIAL_PLATFORM_ICONS,
} from "./welcome-social-platform";
import { clientChatContext } from "./client-context";

declare global {
  interface Window {
    __CHATRELY_WIDGET__?: { agentKey?: string; apiBase?: string };
  }
}

type StoredMessage = {
  role: "user" | "assistant";
  text: string;
  created_at?: string;
  products?: ProductCard[];
  product_detail?: ProductDetail;
};
type ThreadRecord = {
  id: string;
  visitorId: string;
  messages: StoredMessage[];
  preview: string;
  updatedAt: number;
  status?: string;
};
type WidgetStore = {
  visitorId: string;
  activeConversationId: string | null;
  threads: ThreadRecord[];
};

const DEFAULT_ACCENT = "#831C91";
const EMPTY_REPLY_FALLBACK =
  "I'm not sure about that right now. Try asking in another way, or contact our support team if you need more help.";
const ESCALATED_CHAT_BANNER =
  "This chat was escalated to human support. Start a new chat to talk to the AI again.";
const WIDGET_STYLES_ID = "chatrely-widget-styles";

const ICON_REFRESH =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 16h5v5"/></svg>';
const ICON_LIST =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="8" x2="21" y1="6" y2="6"/><line x1="8" x2="21" y1="12" y2="12"/><line x1="8" x2="21" y1="18" y2="18"/><line x1="3" x2="3.01" y1="6" y2="6"/><line x1="3" x2="3.01" y1="12" y2="12"/><line x1="3" x2="3.01" y1="18" y2="18"/></svg>';
const ICON_SEND =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3.714 3.048a.498.498 0 0 0-.683.627l2.843 7.627a2 2 0 0 1 0 1.396l-2.842 7.627a.498.498 0 0 0 .682.627l18-8.5a.5.5 0 0 0 0-.904z"/><path d="M6 12h16"/></svg>';
const ICON_CHEVRON =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m15 18-6-6 6-6"/></svg>';
const ICON_ARROW_RIGHT_BOLD =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.25" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>';
const ICON_CLOSE =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>';

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

function getEmbedLoaderScript(): HTMLScriptElement | null {
  const direct = document.currentScript;
  if (direct instanceof HTMLScriptElement) return direct;
  const byAttr = document.querySelector("script[data-chatrely-agent-key]");
  if (byAttr instanceof HTMLScriptElement) return byAttr;
  const nodes = document.querySelectorAll<HTMLScriptElement>("script[src*='widget']");
  return nodes.length ? (nodes[nodes.length - 1] ?? null) : null;
}

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

function readWidgetStore(agentKey: string): WidgetStore {
  try {
    const raw = window.localStorage?.getItem(widgetStoreKey(agentKey));
    if (!raw) return { visitorId: newVisitorId(), activeConversationId: null, threads: [] };
    const parsed = JSON.parse(raw) as Partial<WidgetStore>;
    return {
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
    };
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
  return `color-mix(in srgb, ${accent} 5%, #ffffff)`;
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
    headerColor: normalizeHexColor(custom.header, brandHex),
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

function applyWidgetAppearance(host: HTMLElement, root: HTMLElement, theme: ResolvedWidgetTheme, headerChrome: ReturnType<typeof brandChromeClasses>, userChrome: ReturnType<typeof brandChromeClasses>): void {
  host.style.setProperty("--cr-font-family", theme.fontFamily);
  host.style.setProperty("--cr-panel-bg", theme.panelBackground);
  host.style.setProperty("--cr-surface", theme.panelBackground);
  host.style.setProperty("--cr-sidebar", theme.composerBackground);
  host.style.setProperty("--cr-assistant-bubble", theme.assistantBubble);
  host.style.setProperty("--cr-assistant-border", theme.assistantBubbleBorder);
  host.style.setProperty("--cr-composer-bg", theme.composerBackground);
  host.style.setProperty("--cr-on-surface", theme.textPrimary);
  host.style.setProperty("--cr-text-muted", theme.textMuted);
  host.style.setProperty("--cr-border", theme.assistantBubbleBorder);
  host.style.setProperty("--cr-user-bubble", theme.userBubbleColor);
  host.style.setProperty("--cr-header-bg", theme.headerColor);
  host.style.setProperty("--cr-user-text", userChrome.userText);
  host.style.setProperty("--cr-header-text", headerChrome.headerText);
  host.style.setProperty("--cr-header-icon", headerChrome.headerIcon);
  host.style.setProperty("--cr-header-icon-hover", headerChrome.headerIconHover);
  host.style.setProperty("--cr-header-icon-hover-bg", headerChrome.headerIconHoverBg);
  host.style.setProperty("--cr-header-icon-active-bg", headerChrome.headerIconActiveBg);
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
  iconEl.innerHTML = ICON_ARROW_RIGHT_BOLD;
  card.append(platformEl, labelEl, iconEl);
  return card;
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
  if (intro && !looksLikeProductListLine(intro) && intro.length <= 160) return intro;
  const first = lines[0] ?? trimmed;
  if (!looksLikeProductListLine(first) && first.length <= 100) return first;
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
  layout: "row" | "column" = "row"
): void {
  const row = document.createElement("div");
  row.className =
    layout === "column" ? "cr-product-actions cr-product-actions--stack" : "cr-product-actions";
  const detailsBtn = document.createElement("button");
  detailsBtn.type = "button";
  detailsBtn.className = "cr-product-btn cr-product-btn--secondary";
  detailsBtn.innerHTML = `${ICON_INFO}<span>Details</span>`;
  detailsBtn.disabled = disabled;
  detailsBtn.addEventListener("click", () => onDetails(card));
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
  row.append(detailsBtn, similarBtn, viewLink);
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
  const col = wrap.parentElement;
  if (!col) return;
  removeColumnCarousel(col);
  const ts = col.querySelector(".cr-msg-ts");
  if (ts) col.insertBefore(carousel, ts);
  else col.appendChild(carousel);
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
  mountProductCardActions(detail, body, onDetails, onSimilar, disabled, "column");
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
  removeColumnCarousel(wrap.parentElement);
  wrap.classList.remove("cr-msg-wrap--products");
  assistantEl.classList.remove("cr-msg--intro-only");

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
}

function poweredByChatRelyHtml(apiBase: string): string {
  const logoUrl = `${apiBase.replace(/\/$/, "")}/chat-rely.svg`;
  return `<a class="cr-powered-link" href="https://chatrely.com" target="_blank" rel="noopener noreferrer"><img class="cr-powered-logo" src="${logoUrl}" alt="" width="4931" height="3503" /><span class="cr-powered-text">Powered by <strong>ChatRely</strong></span></a>`;
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
  wrap.appendChild(row);
}

async function boot(): Promise<void> {
  const script = getEmbedLoaderScript();
  if (!script) {
    console.warn("[ChatRely] Could not find the loader <script>.");
    return;
  }
  const agentKey = resolveAgentKey(script);
  const apiBase = resolveApiBase(script);
  if (!agentKey || !apiBase) {
    console.warn("[ChatRely] Missing data-chatrely-agent-key or API base.");
    return;
  }

  ensureWidgetStyles();

  let cfg: Awaited<ReturnType<typeof fetchWidgetConfig>>;
  try {
    cfg = await fetchWidgetConfig(apiBase, agentKey);
  } catch (e) {
    console.warn("[ChatRely] Config error:", e);
    return;
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
  loadWidgetFont(fontKey);

  const host = document.createElement("div");
  host.id = "chatrely-widget-host";
  host.style.setProperty("--cr-accent", widgetAccent);
  host.style.setProperty("--cr-launcher-icon", launcherChrome.launcherIcon);

  const root = document.createElement("div");
  root.className = `cr-root${bottomLeft ? " cr-root--bl" : " cr-root--br"}`;
  applyWidgetAppearance(host, root, theme, headerChrome, userChrome);
  host.append(root);

  const launcher = document.createElement("button");
  launcher.type = "button";
  launcher.className = "cr-launcher";
  launcher.setAttribute("aria-label", "Open chat");
  launcher.setAttribute("aria-expanded", "false");
  launcher.style.background = widgetAccent;

  const launcherInitial =
    (cfg.name || "C").trim().charAt(0).toUpperCase() || "?";

  const launcherLogo = document.createElement("img");
  launcherLogo.className = "cr-launcher-logo";
  launcherLogo.alt = "";
  launcherLogo.hidden = true;

  const launcherFallback = document.createElement("span");
  launcherFallback.className = "cr-launcher-fallback";
  launcherFallback.style.color = launcherChrome.launcherIcon;
  launcherFallback.textContent = launcherInitial;

  const launcherClose = document.createElement("span");
  launcherClose.className = "cr-launcher-close";
  launcherClose.innerHTML = ICON_CLOSE;

  launcher.append(launcherLogo, launcherFallback, launcherClose);

  if (cfg.avatar_url) {
    launcherFallback.hidden = true;
    launcherLogo.referrerPolicy = "no-referrer";
    launcherLogo.src = cfg.avatar_url;
    launcherLogo.onload = () => {
      launcherLogo.hidden = false;
      launcherFallback.hidden = true;
    };
    launcherLogo.onerror = () => {
      launcherLogo.hidden = true;
      launcherFallback.hidden = false;
    };
  }

  const panel = document.createElement("div");
  panel.className = "cr-panel";

  const header = document.createElement("div");
  header.className = `cr-panel-header${hasBrand ? " cr-panel-header--brand" : ""}`;
  if (hasBrand) header.style.backgroundColor = theme.headerColor;

  const headerMain = document.createElement("div");
  headerMain.className = "cr-panel-header-main";

  const headerAvatarWrap = document.createElement("div");
  headerAvatarWrap.className = "cr-avatar-wrap";
  const headerAvatarImg = document.createElement("img");
  headerAvatarImg.className = "cr-avatar-img";
  headerAvatarImg.alt = "";
  headerAvatarImg.style.display = "none";
  const headerAvatarFallback = document.createElement("span");
  headerAvatarFallback.className = "cr-avatar-fallback";
  headerAvatarFallback.textContent = (cfg.name || "C").trim().charAt(0).toUpperCase() || "?";
  headerAvatarWrap.append(headerAvatarImg, headerAvatarFallback);

  const titleEl = document.createElement("div");
  titleEl.className = "cr-panel-title";
  titleEl.textContent = cfg.name || "Chat";

  headerMain.append(headerAvatarWrap, titleEl);

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

  headerActions.append(resetBtn, historyBtn);
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
  const welcomeHeadline = document.createElement("h2");
  welcomeHeadline.className = "cr-welcome-headline";
  welcomeHeadline.textContent = (cfg.welcome_screen_headline || "How can we help?").trim();
  welcomeHeadline.style.color = normalizeHexColor(
    cfg.welcome_screen_headline_color,
    "#ffffff"
  );
  welcomeHero.appendChild(welcomeHeadline);

  const welcomeContent = document.createElement("div");
  welcomeContent.className = "cr-welcome-content";

  const welcomeCard = document.createElement("div");
  welcomeCard.className = "cr-welcome-card";

  const welcomeCardRow = document.createElement("div");
  welcomeCardRow.className = "cr-welcome-card-row";
  const welcomeCardAvatar = document.createElement("div");
  welcomeCardAvatar.className = "cr-avatar-wrap cr-avatar-wrap--welcome cr-welcome-card-avatar";
  if (cfg.avatar_url) {
    const welcomeAvatarImg = document.createElement("img");
    welcomeAvatarImg.className = "cr-avatar-img";
    welcomeAvatarImg.alt = "";
    welcomeAvatarImg.referrerPolicy = "no-referrer";
    welcomeAvatarImg.src = cfg.avatar_url;
    welcomeAvatarImg.onerror = () => {
      welcomeCardAvatar.textContent = headerAvatarFallback.textContent || "?";
      welcomeCardAvatar.style.display = "flex";
      welcomeCardAvatar.style.alignItems = "center";
      welcomeCardAvatar.style.justifyContent = "center";
      welcomeCardAvatar.style.fontWeight = "700";
      welcomeCardAvatar.style.fontSize = "18px";
      welcomeCardAvatar.style.color = widgetAccent;
    };
    welcomeCardAvatar.appendChild(welcomeAvatarImg);
  } else {
    welcomeCardAvatar.textContent = headerAvatarFallback.textContent || "?";
    welcomeCardAvatar.style.display = "flex";
    welcomeCardAvatar.style.alignItems = "center";
    welcomeCardAvatar.style.justifyContent = "center";
    welcomeCardAvatar.style.fontWeight = "700";
    welcomeCardAvatar.style.fontSize = "18px";
    welcomeCardAvatar.style.color = widgetAccent;
  }
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
  welcomeCta.style.backgroundColor = widgetAccent;
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

  const welcomePowered = document.createElement("div");
  welcomePowered.className = "cr-welcome-powered";
  if (!cfg.hide_powered_by_chatrely) {
    welcomePowered.innerHTML = poweredByChatRelyHtml(apiBase);
  } else {
    welcomePowered.hidden = true;
  }

  const welcomeCardWrap = document.createElement("div");
  welcomeCardWrap.className = "cr-welcome-card-wrap";
  welcomeCardWrap.appendChild(welcomeCard);

  const welcomePanel = document.createElement("div");
  welcomePanel.className = "cr-welcome-panel";
  welcomePanel.append(welcomeSocialList, welcomeSpacer, welcomePowered);

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

  const poweredByEl = document.createElement("div");
  poweredByEl.className = "cr-powered";
  if (!cfg.hide_powered_by_chatrely) {
    poweredByEl.innerHTML = poweredByChatRelyHtml(apiBase);
  } else {
    poweredByEl.hidden = true;
  }

  const composerHint = document.createElement("p");
  composerHint.className = "cr-composer-hint cr-view--hidden";
  composerHint.textContent = "Choose a conversation above to load it, or use Back to chat.";

  const composerEscalated = document.createElement("p");
  composerEscalated.className = "cr-composer-escalated cr-view--hidden";
  composerEscalated.textContent = ESCALATED_CHAT_BANNER;

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
  root.append(launcher, panel);
  document.body.appendChild(host);

  if (cfg.avatar_url) {
    headerAvatarImg.referrerPolicy = "no-referrer";
    headerAvatarImg.src = cfg.avatar_url;
    headerAvatarImg.onload = () => {
      headerAvatarImg.style.display = "block";
      headerAvatarFallback.style.display = "none";
    };
    headerAvatarImg.onerror = () => {
      headerAvatarImg.style.display = "none";
      headerAvatarFallback.style.display = "flex";
    };
  }

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
    composer.classList.toggle("cr-view--hidden", welcome);

    composerRow.classList.toggle("cr-view--hidden", !chat || contactCaptureRequired);
    composerContact.classList.toggle("cr-view--hidden", history || !contactCaptureRequired);
    composerHint.classList.toggle("cr-view--hidden", !history);
    composerEscalated.classList.toggle(
      "cr-view--hidden",
      history || contactCaptureRequired || !isEscalatedStatus(conversationStatus)
    );
    poweredByEl.classList.toggle("cr-view--hidden", welcome || contactCaptureRequired);
    welcomePowered.hidden = Boolean(cfg.hide_powered_by_chatrely) || !welcome;
  }

  function ensureChatGreetings(): void {
    if (greetingsRendered || chatMessages.length > 0) return;
    greetingMessagesFromConfig(cfg).forEach((text) => {
      appendAssistantMessage({ text }, true, true, true);
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
    if (!next) {
      contactErrorEl.classList.add("cr-view--hidden");
      contactErrorEl.textContent = "";
    }
    applyBodyView();
  }

  function isEscalatedStatus(status: string | null | undefined): boolean {
    return (status ?? "").trim().toLowerCase() === "escalated";
  }

  function setAiChatDisabled(disabled: boolean): void {
    input.disabled = disabled || contactCaptureRequired;
    input.placeholder = disabled ? "Start a new chat to talk to the AI" : "Message…";
    send.disabled = disabled || contactCaptureRequired || sending || !input.value.trim();
    applyBodyView();
  }

  function applyConversationStatus(status: string | null | undefined): void {
    conversationStatus = (status ?? "open").trim().toLowerCase() || "open";
    setAiChatDisabled(isEscalatedStatus(conversationStatus));
  }

  if (conversationId) {
    const thread = store.threads.find((t) => t.id === conversationId);
    if (thread) {
      visitorId = thread.visitorId;
      chatMessages = [...thread.messages];
      conversationStatus = thread.status ?? "open";
    } else {
      conversationId = null;
      store.activeConversationId = null;
      writeWidgetStore(agentKey, store);
    }
  }
  applyConversationStatus(conversationStatus);

  function updatePoweredByVisibility(): void {
    poweredByEl.hidden = Boolean(cfg.hide_powered_by_chatrely);
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

  function createBubbleAvatar(): HTMLDivElement {
    const wrap = document.createElement("div");
    wrap.className = "cr-avatar-wrap cr-avatar-wrap--bubble";
    if (cfg.avatar_url) {
      const img = document.createElement("img");
      img.className = "cr-avatar-img";
      img.alt = "";
      img.referrerPolicy = "no-referrer";
      img.src = cfg.avatar_url;
      img.onerror = () => {
        wrap.textContent = headerAvatarFallback.textContent || "?";
        wrap.style.display = "flex";
        wrap.style.alignItems = "center";
        wrap.style.justifyContent = "center";
        wrap.style.fontWeight = "700";
        wrap.style.fontSize = "12px";
        wrap.style.color = accent;
      };
      wrap.appendChild(img);
    } else {
      wrap.textContent = headerAvatarFallback.textContent || "?";
      wrap.style.display = "flex";
      wrap.style.alignItems = "center";
      wrap.style.justifyContent = "center";
      wrap.style.fontWeight = "700";
      wrap.style.fontSize = "12px";
      wrap.style.color = accent;
    }
    return wrap;
  }

  function scrollMessages(): void {
    if (historyOpen) return;
    messages.scrollTop = messages.scrollHeight;
  }

  function clearMessagesDom(): void {
    messages.innerHTML = "";
  }

  function renderChatMessages(): void {
    clearMessagesDom();
    for (const msg of chatMessages) {
      if (msg.role === "user") appendUserMessage(msg.text, false, msg.created_at);
      else appendAssistantMessage(msg, true, false);
    }
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
    ensureMessageTimestamp(body, iso, "user");
    bubble.appendChild(body);
    col.appendChild(bubble);
    row.appendChild(col);
    messages.appendChild(row);
    scrollMessages();
  }

  function appendAssistantMessage(
    msg: Pick<StoredMessage, "text" | "products" | "product_detail" | "created_at">,
    html = true,
    record = true,
    showAvatar = true
  ): HTMLDivElement {
    const iso = messageCreatedAtIso(msg.created_at);
    if (record) {
      chatMessages.push({
        role: "assistant",
        text: msg.text,
        created_at: iso,
        ...(msg.products?.length ? { products: msg.products } : {}),
        ...(msg.product_detail ? { product_detail: msg.product_detail } : {}),
      });
      persistStore();
    }
    const row = document.createElement("div");
    row.className = "cr-msg-row cr-msg-row--assistant";
    if (showAvatar) {
      row.appendChild(createBubbleAvatar());
    } else {
      const spacer = document.createElement("div");
      spacer.className = "cr-avatar-wrap cr-avatar-wrap--bubble";
      spacer.setAttribute("aria-hidden", "true");
      spacer.style.visibility = "hidden";
      row.appendChild(spacer);
    }
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
    ensureMessageTimestamp(bubble, iso, "assistant");
    col.appendChild(wrap);
    row.appendChild(col);
    messages.appendChild(row);
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
    row.appendChild(createBubbleAvatar());
    const col = document.createElement("div");
    col.className = "cr-msg-col";
    const wrap = document.createElement("div");
    wrap.className = "cr-msg-wrap";
    const assistantEl = document.createElement("div");
    assistantEl.className = "cr-msg cr-msg--assistant";
    const dotsEl = document.createElement("div");
    dotsEl.className = "cr-thinking-dots";
    dotsEl.innerHTML =
      '<span class="cr-thinking-dot"></span><span class="cr-thinking-dot"></span><span class="cr-thinking-dot"></span>';
    assistantEl.appendChild(dotsEl);
    ensureMessageTimestamp(assistantEl, createdAt, "assistant");
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
        renderChatMessages();
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
    visitorId = newVisitorId();
    conversationId = null;
    chatMessages = [];
    store.visitorId = visitorId;
    store.activeConversationId = null;
    writeWidgetStore(agentKey, store);
    clearMessagesDom();
    setHistoryOpen(false);
    setContactCaptureRequired(false);
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
    launcher.classList.toggle("cr-launcher--open", next);
    launcher.setAttribute("aria-expanded", next ? "true" : "false");
    launcher.setAttribute("aria-label", next ? "Close chat" : "Open chat");
  }

  function clearStaleConversation(): void {
    conversationId = null;
    store.activeConversationId = null;
    writeWidgetStore(agentKey, store);
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
    productAction?: ProductActionRequest
  ): Promise<void> {
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
          ensureMessageTimestamp(assistantEl, createdAt, "assistant");
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
          ensureMessageTimestamp(assistantEl, createdAt, "assistant");
          scrollMessages();
        } else if (ev.type === "token") {
          hideDots();
          clearStatus();
          const prev = assistantEl.getAttribute("data-plain") || "";
          const nextPlain = prev + ev.text;
          assistantEl.classList.remove("cr-msg--text-hidden");
          assistantEl.setAttribute("data-plain", nextPlain);
          assistantEl.innerHTML = renderAssistantHtml(nextPlain);
          ensureMessageTimestamp(assistantEl, createdAt, "assistant");
          scrollMessages();
        } else if (ev.type === "done") {
          gotDone = true;
          if (ev.conversation_id) conversationId = ev.conversation_id;
          if (typeof ev.conversation_status === "string") {
            applyConversationStatus(ev.conversation_status);
          } else if (ev.ai_chat_disabled === true) {
            applyConversationStatus("escalated");
          }
          setContactCaptureRequired(readContactCaptureRequired(ev as Record<string, unknown>));
          hideDots();
          clearStatus();
          const hasRichProducts =
            Boolean(pendingDetail) ||
            Boolean(pendingProducts?.length) ||
            (Array.isArray(ev.products) && ev.products.length > 0) ||
            Boolean(ev.product_detail && typeof ev.product_detail === "object");
          const plainAccumulated = (assistantEl.getAttribute("data-plain") || "").trim();
          const reply =
            (typeof ev.response === "string" ? ev.response : "").trim() ||
            plainAccumulated ||
            (hasRichProducts ? "" : EMPTY_REPLY_FALLBACK);
          let displayText = hasRichProducts ? introTextForProductCards(reply || plainAccumulated) : reply;
          if (!displayText.trim() && !hasRichProducts) {
            displayText = EMPTY_REPLY_FALLBACK;
          }
          setAssistantBubbleText(assistantEl, displayText);
          ensureMessageTimestamp(assistantEl, createdAt, "assistant");
          const stored: StoredMessage = {
            role: "assistant",
            text: displayText,
            created_at: createdAt,
          };
          if (pendingDetail) stored.product_detail = pendingDetail;
          else if (pendingProducts?.length) stored.products = pendingProducts;
          else if (Array.isArray(ev.products) && ev.products.length) {
            stored.products = ev.products as ProductCard[];
          } else if (ev.product_detail && typeof ev.product_detail === "object") {
            stored.product_detail = ev.product_detail as ProductDetail;
          }
          chatMessages.push(stored);
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
          const mid = typeof ev.assistant_message_id === "string" ? ev.assistant_message_id : null;
          if (cfg.message_feedback_enabled && mid) mountMessageFeedback(wrap, apiBase, agentKey, visitorId, mid);
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
      if (!gotDone) {
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
    if (sending || isEscalatedStatus(conversationStatus)) return;
    const action: ProductActionRequest = { type, handle: card.handle, title: card.title };
    const userText = productActionUserMessage(action);
    sending = true;
    send.disabled = true;
    appendUserMessage(userText);
    const streamWrap = createAssistantStreamWrap();
    try {
      await streamAssistantReply(userText, streamWrap, false, action);
    } finally {
      sending = false;
      send.disabled = !input.value.trim();
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
      appendAssistantMessage({ text: result.handoff_message }, true, true);
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
    if (!text || sending || contactCaptureRequired || isEscalatedStatus(conversationStatus)) return;
    sending = true;
    send.disabled = true;
    input.value = "";
    input.style.height = "auto";
    appendUserMessage(text);
    const streamWrap = createAssistantStreamWrap();
    try {
      await streamAssistantReply(text, streamWrap, false);
    } finally {
      sending = false;
      send.disabled = !input.value.trim();
    }
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
  resetBtn.addEventListener("click", resetChat);
  historyBtn.addEventListener("click", () => setHistoryOpen(!historyOpen));
  launcher.addEventListener("click", () => setPanelOpen(!panelOpen));
  composerContact.addEventListener("submit", (ev) => void submitVisitorContact(ev));
  send.addEventListener("click", () => void sendMessage());
  input.addEventListener("input", () => {
    input.style.height = "auto";
    input.style.height = `${Math.min(input.scrollHeight, 120)}px`;
    send.disabled =
      sending || contactCaptureRequired || isEscalatedStatus(conversationStatus) || !input.value.trim();
  });
  input.addEventListener("keydown", (ev) => {
    if (ev.key === "Enter" && !ev.shiftKey) {
      ev.preventDefault();
      void sendMessage();
    }
  });
}

void boot();
