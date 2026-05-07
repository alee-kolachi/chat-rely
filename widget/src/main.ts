import cssText from "./styles.css?inline";
import { fetchWidgetConfig, streamChat } from "./api";

declare global {
  interface Window {
    __CHATRELY_WIDGET__?: { agentKey?: string; apiBase?: string };
  }
}

function getEmbedLoaderScript(): HTMLScriptElement | null {
  const direct = document.currentScript;
  if (direct instanceof HTMLScriptElement) {
    return direct;
  }
  const byAttr = document.querySelector("script[data-chatrely-agent-key]");
  if (byAttr instanceof HTMLScriptElement) {
    return byAttr;
  }
  const nodes = document.querySelectorAll<HTMLScriptElement>("script[src*='widget']");
  if (nodes.length) {
    return nodes[nodes.length - 1] ?? null;
  }
  return null;
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
  const attr = (script.getAttribute("data-chatrely-agent-key") ?? "").trim();
  return attr;
}

function visitorStorageKey(agentKey: string): string {
  return `chatrely:vid:${agentKey.slice(0, 24)}`;
}

function getOrCreateVisitorId(agentKey: string): string {
  const key = visitorStorageKey(agentKey);
  try {
    const existing = window.localStorage?.getItem(key);
    if (existing) return existing;
    const id = crypto.randomUUID();
    window.localStorage?.setItem(key, id);
    return id;
  } catch {
    return `anon-${Math.random().toString(36).slice(2, 14)}`;
  }
}

function normalizeHexColor(input: string | null | undefined, fallback: string): string {
  if (!input) return fallback;
  const s = input.trim();
  if (/^#[0-9a-fA-F]{6}$/.test(s)) return s;
  return fallback;
}

/** Minimal safe markdown: escape HTML, then **bold** and newlines. */
function renderAssistantHtml(raw: string): string {
  const esc = raw
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
  const withBold = esc.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  return withBold.replace(/\n/g, "<br>");
}

async function boot(): Promise<void> {
  const script = getEmbedLoaderScript();
  if (!script) {
    console.warn(
      "[ChatRely] Could not find the loader <script> (try removing async or set data-chatrely-agent-key on the tag)."
    );
    return;
  }
  const agentKey = resolveAgentKey(script);
  const apiBase = resolveApiBase(script);
  if (!agentKey || !apiBase) {
    console.warn("[ChatRely] Missing data-chatrely-agent-key or API base (data-chatrely-api-base / __CHATRELY_WIDGET__).");
    return;
  }

  const host = document.createElement("div");
  host.id = "chatrely-widget-host";
  const shadow = host.attachShadow({ mode: "open" });
  const sheet = new CSSStyleSheet();
  sheet.replaceSync(cssText);
  shadow.adoptedStyleSheets = [sheet];

  const root = document.createElement("div");
  root.className = "cr-root";
  shadow.append(root);

  const launcher = document.createElement("button");
  launcher.type = "button";
  launcher.className = "cr-launcher";
  launcher.setAttribute("aria-label", "Open chat");
  launcher.innerHTML =
    '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 3C7.03 3 3 6.58 3 11c0 2.13 1.05 4.07 2.76 5.5L4 21l4.67-1.55A9.9 9.9 0 0 0 12 19c4.97 0 9-3.58 9-8s-4.03-8-9-8Z" fill="currentColor"/></svg>';

  const panel = document.createElement("div");
  panel.className = "cr-panel";
  panel.hidden = true;

  const header = document.createElement("div");
  header.className = "cr-panel-header";

  const headerMain = document.createElement("div");
  headerMain.className = "cr-panel-header-main";

  const avatarWrap = document.createElement("div");
  avatarWrap.className = "cr-avatar-wrap";
  const avatarImg = document.createElement("img");
  avatarImg.className = "cr-avatar-img";
  avatarImg.alt = "";
  avatarImg.style.display = "none";
  const avatarFallback = document.createElement("span");
  avatarFallback.className = "cr-avatar-fallback";

  const titleEl = document.createElement("div");
  titleEl.className = "cr-panel-title";

  headerMain.append(avatarWrap);
  avatarWrap.append(avatarImg, avatarFallback);
  headerMain.append(titleEl);
  header.append(headerMain);

  const messages = document.createElement("div");
  messages.className = "cr-messages";

  const escalateRow = document.createElement("div");
  escalateRow.className = "cr-escalate-row";
  escalateRow.style.display = "none";

  const composer = document.createElement("div");
  composer.className = "cr-composer";
  const input = document.createElement("input");
  input.className = "cr-input";
  input.autocomplete = "off";
  input.placeholder = "Message…";
  const send = document.createElement("button");
  send.type = "button";
  send.className = "cr-send";
  send.textContent = "Send";
  composer.append(input, send);

  const footerNote = document.createElement("div");
  footerNote.className = "cr-powered";
  footerNote.textContent = "Powered by ChatRely";

  panel.append(header, escalateRow, messages, composer, footerNote);
  root.append(launcher, panel);

  document.body.appendChild(host);

  let cfg: Awaited<ReturnType<typeof fetchWidgetConfig>>;
  try {
    cfg = await fetchWidgetConfig(apiBase, agentKey);
  } catch (e) {
    console.warn("[ChatRely] Config error:", e);
    return;
  }

  titleEl.textContent = cfg.name || "Chat";
  const accent = normalizeHexColor(cfg.brand_color, "#111827");
  root.style.setProperty("--cr-accent", accent);
  root.classList.add(cfg.widget_position === "bottom_left" ? "cr-root--bl" : "cr-root--br");

  const initial = (cfg.name || "C").trim().charAt(0).toUpperCase() || "?";
  avatarFallback.textContent = initial;

  if (cfg.avatar_url) {
    avatarImg.src = cfg.avatar_url;
    avatarImg.onload = () => {
      avatarImg.style.display = "block";
      avatarFallback.style.display = "none";
    };
    avatarImg.onerror = () => {
      avatarImg.style.display = "none";
      avatarFallback.style.display = "flex";
    };
  }

  if (cfg.human_escalation_available) {
    escalateRow.style.display = "flex";
    const escBtn = document.createElement("button");
    escBtn.type = "button";
    escBtn.className = "cr-escalate";
    escBtn.textContent = "Talk to a human";
    escalateRow.appendChild(escBtn);

    escBtn.addEventListener("click", () => {
      void sendEscalation();
    });
  }

  const visitorId = getOrCreateVisitorId(agentKey);
  let conversationId: string | null = null;
  let sending = false;

  function appendMessage(role: "user" | "assistant" | "err", text: string, html?: boolean): void {
    const el = document.createElement("div");
    el.className = `cr-msg cr-msg--${role}`;
    if (role === "assistant" && html) {
      el.innerHTML = text;
    } else {
      el.textContent = text;
    }
    messages.appendChild(el);
    messages.scrollTop = messages.scrollHeight;
  }

  function setOpen(next: boolean): void {
    panel.hidden = !next;
    launcher.setAttribute("aria-expanded", next ? "true" : "false");
  }

  launcher.addEventListener("click", () => setOpen(!open));

  async function sendEscalation(): Promise<void> {
    if (sending) return;
    input.value = "";
    sending = true;
    send.disabled = true;
    const msg = "I'd like to speak with a human agent.";
    appendMessage("user", msg);
    const assistantEl = document.createElement("div");
    assistantEl.className = "cr-msg cr-msg--assistant";
    assistantEl.innerHTML = "";
    messages.appendChild(assistantEl);

    try {
      for await (const ev of streamChat(apiBase, agentKey, {
        message: msg,
        conversation_id: conversationId,
        visitor_id: visitorId,
        request_human: true,
        locale: navigator.language,
      })) {
        if (ev.type === "start") {
          conversationId = ev.conversation_id;
        } else if (ev.type === "token") {
          const prev = assistantEl.getAttribute("data-plain") || "";
          const nextPlain = prev + ev.text;
          assistantEl.setAttribute("data-plain", nextPlain);
          assistantEl.innerHTML = renderAssistantHtml(nextPlain);
          messages.scrollTop = messages.scrollHeight;
        } else if (ev.type === "done") {
          conversationId = ev.conversation_id;
          if (typeof ev.response === "string" && ev.response) {
            assistantEl.innerHTML = renderAssistantHtml(ev.response);
            assistantEl.removeAttribute("data-plain");
          }
        } else if (ev.type === "error") {
          assistantEl.remove();
          appendMessage("err", ev.message || "Something went wrong.");
        }
      }
    } catch (e) {
      assistantEl.remove();
      appendMessage("err", e instanceof Error ? e.message : "Network error.");
    } finally {
      sending = false;
      send.disabled = false;
    }
  }

  async function sendMessage(): Promise<void> {
    const text = input.value.trim();
    if (!text || sending) return;
    sending = true;
    send.disabled = true;
    input.value = "";
    appendMessage("user", text);
    const assistantEl = document.createElement("div");
    assistantEl.className = "cr-msg cr-msg--assistant";
    assistantEl.innerHTML = "";
    messages.appendChild(assistantEl);

    try {
      for await (const ev of streamChat(apiBase, agentKey, {
        message: text,
        conversation_id: conversationId,
        visitor_id: visitorId,
        locale: navigator.language,
      })) {
        if (ev.type === "start") {
          conversationId = ev.conversation_id;
        } else if (ev.type === "token") {
          const prev =
            assistantEl.getAttribute("data-plain") ||
            assistantEl.textContent ||
            "";
          const nextPlain = prev + ev.text;
          assistantEl.setAttribute("data-plain", nextPlain);
          assistantEl.innerHTML = renderAssistantHtml(nextPlain);
          messages.scrollTop = messages.scrollHeight;
        } else if (ev.type === "done") {
          conversationId = ev.conversation_id;
          if (typeof ev.response === "string" && ev.response) {
            assistantEl.innerHTML = renderAssistantHtml(ev.response);
            assistantEl.removeAttribute("data-plain");
          }
        } else if (ev.type === "error") {
          assistantEl.remove();
          appendMessage("err", ev.message || "Something went wrong.");
        }
      }
    } catch (e) {
      assistantEl.remove();
      appendMessage("err", e instanceof Error ? e.message : "Network error.");
    } finally {
      sending = false;
      send.disabled = false;
    }
  }

  send.addEventListener("click", () => void sendMessage());
  input.addEventListener("keydown", (ev) => {
    if (ev.key === "Enter" && !ev.shiftKey) {
      ev.preventDefault();
      void sendMessage();
    }
  });
}

void boot();
