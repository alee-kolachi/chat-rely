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
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14.536 21.686a.5.5 0 0 0 .937-.024l6.5-19a.496.496 0 0 0-.635-.635l-19 6.5a.5.5 0 0 0-.024.937l7.93 3.18a2 2 0 0 1 1.112 1.11z"/><path d="m21.854 2.147-10.94 10.939"/></svg>';
const ICON_CHEVRON =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m15 18-6-6 6-6"/></svg>';
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
    panelBackground: normalizeHexColor(custom.panel_background, base.panelBackground),
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

function renderAssistantHtml(raw: string): string {
  const esc = raw
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
  return esc.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>").replace(/\n/g, "<br>");
}

function introTextForProductCards(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return "Here are a few options:";
  const lines = trimmed.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const first = lines[0] ?? trimmed;
  const looksLikeProductList =
    lines.length > 1 ||
    first.includes(" - Price:") ||
    first.includes("Price:") ||
    first.startsWith("**") ||
    first.startsWith("- ") ||
    first.includes("$");
  if (looksLikeProductList || first.length > 100) return "Here are a few options:";
  return first;
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
    assistantEl.innerHTML = renderAssistantHtml(introTextForProductCards(msg.text));
    renderProductDetailView(wrap, msg.product_detail, onDetails, onSimilar, disabled);
  } else if (msg.products?.length) {
    assistantEl.classList.add("cr-msg--intro-only");
    assistantEl.innerHTML = renderAssistantHtml(introTextForProductCards(msg.text));
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

  const syncVisibility = (): void => {
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

  const apply = (next: 1 | -1 | null): void => {
    current = next;
    syncVisibility();
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => void flush(), 450);
  };
  up.addEventListener("click", () => apply(current === 1 ? null : 1));
  down.addEventListener("click", () => apply(current === -1 ? null : -1));
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
  const headerChrome = brandChromeClasses(theme.headerColor);
  const userChrome = brandChromeClasses(theme.userBubbleColor);
  const launcherChrome = brandChromeClasses(accent);
  const hasBrand = Boolean(brandHex);
  const bottomLeft = cfg.widget_position === "bottom_left";

  const fontKey = (cfg.widget_appearance?.font_family ?? "geist").trim().toLowerCase().replace(/_/g, "-");
  loadWidgetFont(fontKey);

  const host = document.createElement("div");
  host.id = "chatrely-widget-host";
  host.style.setProperty("--cr-accent", accent);
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
  launcher.style.background = accent;

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

  body.append(messages, historyView);

  const composer = document.createElement("div");
  composer.className = "cr-composer";

  const composerRow = document.createElement("div");
  composerRow.className = "cr-composer-row";

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

  composerRow.append(input, send);

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
    composerContact.classList.toggle("cr-view--hidden", !next || historyOpen);
    composerRow.classList.toggle("cr-view--hidden", next);
    poweredByEl.classList.toggle("cr-view--hidden", next);
    if (!next) {
      contactErrorEl.classList.add("cr-view--hidden");
      contactErrorEl.textContent = "";
    }
  }

  function isEscalatedStatus(status: string | null | undefined): boolean {
    return (status ?? "").trim().toLowerCase() === "escalated";
  }

  function setAiChatDisabled(disabled: boolean): void {
    composerEscalated.classList.toggle("cr-view--hidden", !disabled || historyOpen || contactCaptureRequired);
    composerRow.classList.toggle("cr-view--hidden", contactCaptureRequired || historyOpen);
    input.disabled = disabled || contactCaptureRequired;
    input.placeholder = disabled ? "Start a new chat to talk to the AI" : "Message…";
    send.disabled = disabled || contactCaptureRequired || sending || !input.value.trim();
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
    record = true
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
    row.appendChild(createBubbleAvatar());
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
    messages.classList.toggle("cr-view--hidden", next);
    historyView.classList.toggle("cr-view--hidden", !next);
    composerRow.classList.toggle("cr-view--hidden", next || contactCaptureRequired);
    composerContact.classList.toggle("cr-view--hidden", next || !contactCaptureRequired);
    composerHint.classList.toggle("cr-view--hidden", !next);
    composerEscalated.classList.toggle(
      "cr-view--hidden",
      next || contactCaptureRequired || !isEscalatedStatus(conversationStatus)
    );
    if (next) renderHistory();
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
    const greeting = (cfg.greeting_message || "").trim();
    if (greeting) appendAssistantMessage({ text: greeting }, true, false);
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
    const { row, wrap, assistantEl, createdAt } = streamWrap;
    const dotsEl = assistantEl.querySelector(".cr-thinking-dots");
    let pendingProducts: ProductCard[] | undefined;
    let pendingDetail: ProductDetail | undefined;
    const hideDots = (): void => {
      if (dotsEl instanceof HTMLElement) dotsEl.hidden = true;
    };
    let statusEl: HTMLParagraphElement | null = null;
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

    let gotDone = false;
    try {
      for await (const ev of streamChat(apiBase, agentKey, {
        message: userText,
        conversation_id: conversationId,
        visitor_id: visitorId,
        locale: navigator.language,
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
        if (ev.type === "status") showStatus(ev.text);
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
          const reply =
            (typeof ev.response === "string" ? ev.response : "").trim() ||
            (assistantEl.getAttribute("data-plain") || "").trim() ||
            EMPTY_REPLY_FALLBACK;
          assistantEl.innerHTML = renderAssistantHtml(introTextForProductCards(reply));
          ensureMessageTimestamp(assistantEl, createdAt, "assistant");
          const stored: StoredMessage = {
            role: "assistant",
            text: introTextForProductCards(reply),
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

  const greeting = (cfg.greeting_message || "").trim();
  if (chatMessages.length) renderChatMessages();
  else if (greeting) appendAssistantMessage({ text: greeting }, true, false);
  updatePoweredByVisibility();

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
