import cssText from "./styles.css?inline";
import { fetchWidgetConfig, postWidgetMessageFeedback, streamChat } from "./api";

declare global {
  interface Window {
    __CHATRELY_WIDGET__?: { agentKey?: string; apiBase?: string };
  }
}

type StoredMessage = { role: "user" | "assistant"; text: string };
type ThreadRecord = {
  id: string;
  visitorId: string;
  messages: StoredMessage[];
  preview: string;
  updatedAt: number;
};
type WidgetStore = {
  visitorId: string;
  activeConversationId: string | null;
  threads: ThreadRecord[];
};

const DEFAULT_ACCENT = "#8A05FF";
const EMPTY_REPLY_FALLBACK =
  "I'm not sure about that right now. Try asking in another way, or contact our support team if you need more help.";
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

function renderAssistantHtml(raw: string): string {
  const esc = raw
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
  return esc.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>").replace(/\n/g, "<br>");
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
  const chrome = brandChromeClasses(accent);
  const hasBrand = Boolean(brandHex);
  const bottomLeft = cfg.widget_position === "bottom_left";

  const host = document.createElement("div");
  host.id = "chatrely-widget-host";
  host.style.setProperty("--cr-accent", accent);
  host.style.setProperty("--cr-user-text", chrome.userText);
  host.style.setProperty("--cr-header-text", chrome.headerText);
  host.style.setProperty("--cr-header-icon", chrome.headerIcon);
  host.style.setProperty("--cr-header-icon-hover", chrome.headerIconHover);
  host.style.setProperty("--cr-header-icon-hover-bg", chrome.headerIconHoverBg);
  host.style.setProperty("--cr-header-icon-active-bg", chrome.headerIconActiveBg);
  host.style.setProperty("--cr-launcher-icon", chrome.launcherIcon);

  const root = document.createElement("div");
  root.className = `cr-root${bottomLeft ? " cr-root--bl" : " cr-root--br"}`;
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
  launcherFallback.style.color = chrome.launcherIcon;
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
  if (hasBrand) header.style.backgroundColor = accent;

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

  composer.append(composerRow, composerHint, poweredByEl);
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

  if (conversationId) {
    const thread = store.threads.find((t) => t.id === conversationId);
    if (thread) {
      visitorId = thread.visitorId;
      chatMessages = [...thread.messages];
    } else {
      conversationId = null;
      store.activeConversationId = null;
      writeWidgetStore(agentKey, store);
    }
  }

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
      if (msg.role === "user") appendUserMessage(msg.text, false);
      else appendAssistantMessage(msg.text, true, false);
    }
    updatePoweredByVisibility();
    scrollMessages();
  }

  function appendUserMessage(text: string, record = true): void {
    if (record) {
      chatMessages.push({ role: "user", text });
      persistStore();
      updatePoweredByVisibility();
    }
    const row = document.createElement("div");
    row.className = "cr-msg-row cr-msg-row--user";
    const bubble = document.createElement("div");
    bubble.className = "cr-msg cr-msg--user";
    bubble.textContent = text;
    row.appendChild(bubble);
    messages.appendChild(row);
    scrollMessages();
  }

  function appendAssistantMessage(text: string, html = true, record = true): HTMLDivElement {
    if (record) {
      chatMessages.push({ role: "assistant", text });
      persistStore();
    }
    const row = document.createElement("div");
    row.className = "cr-msg-row cr-msg-row--assistant";
    row.appendChild(createBubbleAvatar());
    const col = document.createElement("div");
    col.className = "cr-msg-col";
    const bubble = document.createElement("div");
    bubble.className = "cr-msg cr-msg--assistant";
    if (html) bubble.innerHTML = renderAssistantHtml(text);
    else bubble.textContent = text;
    col.appendChild(bubble);
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

  function createAssistantStreamWrap(): { row: HTMLDivElement; wrap: HTMLDivElement; assistantEl: HTMLDivElement } {
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
    wrap.appendChild(assistantEl);
    col.appendChild(wrap);
    row.appendChild(col);
    messages.appendChild(row);
    scrollMessages();
    return { row, wrap, assistantEl };
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
    composerRow.classList.toggle("cr-view--hidden", next);
    composerHint.classList.toggle("cr-view--hidden", !next);
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
    const greeting = (cfg.greeting_message || "").trim();
    if (greeting) appendAssistantMessage(greeting, true, false);
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
    streamWrap: { row: HTMLDivElement; wrap: HTMLDivElement; assistantEl: HTMLDivElement },
    retrying: boolean
  ): Promise<void> {
    const { row, wrap, assistantEl } = streamWrap;
    const dotsEl = assistantEl.querySelector(".cr-thinking-dots");
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
      })) {
        if (ev.type === "status") showStatus(ev.text);
        else if (ev.type === "token") {
          hideDots();
          clearStatus();
          const prev = assistantEl.getAttribute("data-plain") || "";
          const nextPlain = prev + ev.text;
          assistantEl.setAttribute("data-plain", nextPlain);
          assistantEl.innerHTML = renderAssistantHtml(nextPlain);
          scrollMessages();
        } else if (ev.type === "done") {
          gotDone = true;
          if (ev.conversation_id) conversationId = ev.conversation_id;
          hideDots();
          clearStatus();
          const reply =
            (typeof ev.response === "string" ? ev.response : "").trim() ||
            (assistantEl.getAttribute("data-plain") || "").trim() ||
            EMPTY_REPLY_FALLBACK;
          assistantEl.innerHTML = renderAssistantHtml(reply);
          chatMessages.push({ role: "assistant", text: reply });
          persistStore();
          const mid = typeof ev.assistant_message_id === "string" ? ev.assistant_message_id : null;
          if (cfg.message_feedback_enabled && mid) mountMessageFeedback(wrap, apiBase, agentKey, visitorId, mid);
        } else if (ev.type === "error") {
          if (!retrying && isVisitorMismatchError(ev.message || "")) {
            clearStaleConversation();
            row.remove();
            await streamAssistantReply(userText, createAssistantStreamWrap(), true);
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
          chatMessages.push({ role: "assistant", text: plain });
          persistStore();
        } else if (row.isConnected) {
          row.remove();
          appendError("Something went wrong. Try again.");
        }
      }
    }
  }

  async function sendMessage(): Promise<void> {
    const text = input.value.trim();
    if (!text || sending) return;
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
  else if (greeting) appendAssistantMessage(greeting, true, false);
  updatePoweredByVisibility();

  resetBtn.addEventListener("click", resetChat);
  historyBtn.addEventListener("click", () => setHistoryOpen(!historyOpen));
  launcher.addEventListener("click", () => setPanelOpen(!panelOpen));
  send.addEventListener("click", () => void sendMessage());
  input.addEventListener("input", () => {
    input.style.height = "auto";
    input.style.height = `${Math.min(input.scrollHeight, 120)}px`;
    send.disabled = sending || !input.value.trim();
  });
  input.addEventListener("keydown", (ev) => {
    if (ev.key === "Enter" && !ev.shiftKey) {
      ev.preventDefault();
      void sendMessage();
    }
  });
}

void boot();
