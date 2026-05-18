import cssText from "./styles.css?inline";
import { fetchWidgetConfig, postWidgetMessageFeedback, streamChat } from "./api";

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

const EMPTY_REPLY_FALLBACK =
  "I'm not sure about that right now. Try asking in another way, or contact our support team if you need more help.";

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

function poweredByChatRelyHtml(): string {
  const logo =
    '<svg class="cr-powered-logo" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><rect width="24" height="24" rx="7" fill="#0f172a"/><rect x="6" y="9" width="3" height="6" rx="0.5" fill="#831C91"/><rect x="10.5" y="9" width="3" height="6" rx="0.5" fill="#831C91"/><rect x="15" y="9" width="3" height="6" rx="0.5" fill="#831C91"/></svg>';
  return `<span class="cr-powered-row">${logo}<span class="cr-powered-text">Powered by <strong>ChatRely</strong></span></span>`;
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
  /** undefined = no successful sync yet for this bubble */
  let acked: 1 | -1 | null | undefined = undefined;
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;

  const syncVisibility = () => {
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
        const roll = hasAcked ? acked : null;
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
  up.addEventListener("click", () => {
    apply(current === 1 ? null : 1);
  });
  down.addEventListener("click", () => {
    apply(current === -1 ? null : -1);
  });
  syncVisibility();
  row.append(up, down);
  wrap.appendChild(row);
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
  const attachWrap = document.createElement("div");
  attachWrap.className = "cr-attach-wrap";
  attachWrap.style.display = "none";
  const attachBtn = document.createElement("button");
  attachBtn.type = "button";
  attachBtn.className = "cr-attach";
  attachBtn.setAttribute("aria-label", "Add attachment");
  attachBtn.title = "Attachments coming soon";
  attachBtn.disabled = true;
  attachBtn.innerHTML =
    '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M17.5 12.5v-5a5.5 5.5 0 1 0-11 0v9a4 4 0 0 0 8 0V9a2.5 2.5 0 0 0-5 0v6.5" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  attachWrap.appendChild(attachBtn);
  const input = document.createElement("input");
  input.className = "cr-input";
  input.autocomplete = "off";
  input.placeholder = "Message…";
  const send = document.createElement("button");
  send.type = "button";
  send.className = "cr-send";
  send.textContent = "Send";
  composer.append(attachWrap, input, send);

  panel.append(header, escalateRow, messages, composer);
  root.append(launcher, panel);

  document.body.appendChild(host);

  let cfg: Awaited<ReturnType<typeof fetchWidgetConfig>>;
  try {
    cfg = await fetchWidgetConfig(apiBase, agentKey);
  } catch (e) {
    console.warn("[ChatRely] Config error:", e);
    return;
  }

  let poweredByEl: HTMLDivElement | null = null;
  function hidePoweredByLine(): void {
    if (poweredByEl) {
      poweredByEl.style.display = "none";
    }
  }

  if (!cfg.hide_powered_by_chatrely) {
    poweredByEl = document.createElement("div");
    poweredByEl.className = "cr-powered";
    poweredByEl.innerHTML = poweredByChatRelyHtml();
    panel.appendChild(poweredByEl);
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

  if (cfg.attachments_ui_enabled) {
    attachWrap.style.display = "flex";
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

  const greeting = (cfg.greeting_message || "").trim();
  if (greeting) {
    appendMessage("assistant", renderAssistantHtml(greeting), true);
  }

  function setOpen(next: boolean): void {
    panel.hidden = !next;
    launcher.setAttribute("aria-expanded", next ? "true" : "false");
  }

  launcher.addEventListener("click", () => setOpen(panel.hidden));

  async function sendEscalation(): Promise<void> {
    if (sending) return;
    input.value = "";
    sending = true;
    send.disabled = true;
    const msg = "I'd like to speak with a human agent.";
    appendMessage("user", msg);
    hidePoweredByLine();
    const wrap = document.createElement("div");
    wrap.className = "cr-msg-wrap";
    const assistantEl = document.createElement("div");
    assistantEl.className = "cr-msg cr-msg--assistant";
    assistantEl.innerHTML = "";
    wrap.appendChild(assistantEl);
    messages.appendChild(wrap);

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
          const mid =
            typeof (ev as { assistant_message_id?: unknown }).assistant_message_id === "string"
              ? (ev as { assistant_message_id: string }).assistant_message_id
              : null;
          if (cfg.message_feedback_enabled && mid) {
            mountMessageFeedback(wrap, apiBase, agentKey, visitorId, mid);
          }
        } else if (ev.type === "error") {
          wrap.remove();
          appendMessage("err", ev.message || "Something went wrong.");
        }
      }
    } catch (e) {
      wrap.remove();
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
    hidePoweredByLine();
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
    messages.appendChild(wrap);

    const hideDots = (): void => {
      dotsEl.hidden = true;
    };

    let statusEl: HTMLDivElement | null = null;
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
      messages.scrollTop = messages.scrollHeight;
    };

    let gotDone = false;
    try {
      for await (const ev of streamChat(apiBase, agentKey, {
        message: text,
        conversation_id: conversationId,
        visitor_id: visitorId,
        locale: navigator.language,
      })) {
        if (ev.type === "status") {
          showStatus(ev.text);
        } else if (ev.type === "token") {
          hideDots();
          clearStatus();
          const prev = assistantEl.getAttribute("data-plain") || "";
          const nextPlain = prev + ev.text;
          assistantEl.setAttribute("data-plain", nextPlain);
          assistantEl.innerHTML = renderAssistantHtml(nextPlain);
          messages.scrollTop = messages.scrollHeight;
        } else if (ev.type === "done") {
          gotDone = true;
          if (ev.conversation_id) conversationId = ev.conversation_id;
          hideDots();
          clearStatus();
          const reply = typeof ev.response === "string" ? ev.response : "";
          const plain = assistantEl.getAttribute("data-plain") || "";
          const finalReply = reply.trim() || plain.trim() || EMPTY_REPLY_FALLBACK;
          assistantEl.setAttribute("data-plain", finalReply);
          assistantEl.innerHTML = renderAssistantHtml(finalReply);
          const mid =
            typeof ev.assistant_message_id === "string" ? ev.assistant_message_id : null;
          if (cfg.message_feedback_enabled && mid) {
            mountMessageFeedback(wrap, apiBase, agentKey, visitorId, mid);
          }
        } else if (ev.type === "error") {
          wrap.remove();
          appendMessage("err", ev.message || "Something went wrong.");
        }
      }
    } catch (e) {
      wrap.remove();
      appendMessage("err", e instanceof Error ? e.message : "Network error.");
    } finally {
      hideDots();
      clearStatus();
      if (!gotDone) {
        const plain = (assistantEl.getAttribute("data-plain") || "").trim();
        if (plain) {
          assistantEl.innerHTML = renderAssistantHtml(plain);
        } else {
          wrap.remove();
          appendMessage("err", "Something went wrong. Try again.");
        }
      }
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
