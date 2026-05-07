"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { AssistantMarkdown } from "@/components/chat/assistant-markdown";
import { AssistantThinkingDots } from "@/components/chat/assistant-thinking-dots";
import { useDashboardAgent } from "@/components/layout/dashboard-agent-context";
import { useSetDashboardTopbarExtras } from "@/components/layout/dashboard-topbar-extras-context";
import { useActionCatalog } from "@/components/actions/use-action-catalog";
import { useShopifyConnection } from "@/components/integrations/use-shopify-connection";
import { onboardingType } from "@/components/onboarding/onboarding-ui";
import {
  PlaygroundConnectionCheckSkeleton,
  PlaygroundHistoryListSkeleton,
  PlaygroundSettingsColumnSkeleton,
  PlaygroundShopifyActionsSkeleton,
} from "@/components/playground/playground-page-skeleton";
import { DashboardSelectAgentEmptyState } from "@/components/dashboard/dashboard-page-skeleton";
import { BackendApiError, backendFetch, backendNdjsonStream } from "@/lib/backend-api";
import { brandChromeClasses, parseBrandColorHex, previewAssistantLineForTone } from "@/lib/brand-chrome";
import { cn } from "@/lib/utils";

/** Uses global `.ds-app-field` (design-system tokens + focus ring). */
const fieldControlClass = cn("ds-app-field");
const fieldControlPointerClass = cn(fieldControlClass, "cursor-pointer");

function actionsConfigDirty(
  draft: Record<string, boolean>,
  base: Record<string, boolean> | null
): boolean {
  if (!base) return false;
  const keys = new Set([...Object.keys(draft), ...Object.keys(base)]);
  for (const k of keys) {
    if (Boolean(draft[k]) !== Boolean(base[k])) return true;
  }
  return false;
}

type PlaygroundPreviewMessage = {
  from: "user" | "assistant";
  text: string;
};

type PlaygroundConversationRow = {
  id: string;
  latest_message_preview: string | null;
  last_activity_at: string;
  updated_at: string;
  status: string;
};

const playgroundChatStorageKey = (agentId: string) => `chatrely.playground-chat.v1:${agentId}`;

const PLAYGROUND_AGENT_TYPES = [
  { value: "brand_support", label: "Brand Support Agent" },
  { value: "general", label: "General AI Agent" },
  { value: "customer_support", label: "Customer Support Agent" },
  { value: "custom", label: "Custom Prompt" },
] as const;

function normalizeCreativity(raw: unknown): 0 | 0.5 | 1 {
  const n =
    typeof raw === "number"
      ? raw
      : typeof raw === "string"
        ? Number.parseFloat(raw)
        : Number.NaN;
  if (n === 0 || n === 0.5 || n === 1) return n;
  if (!Number.isFinite(n)) return 0.5;
  const snapped = Math.round(n * 2) / 2;
  if (snapped <= 0) return 0;
  if (snapped >= 1) return 1;
  return 0.5;
}

function creativityBandLabel(value: number): string {
  if (value <= 0) return "Conservative";
  if (value >= 1) return "Creative";
  return "Balanced";
}

/** Keep playground transcript in sync with Conversations (operator replies, same thread). */
const PLAYGROUND_THREAD_POLL_MS = 4000;

function newPlaygroundVisitorId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `playground-${crypto.randomUUID()}`;
  }
  return `playground-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function readPlaygroundChatFromStorage(agentId: string): {
  previewMessages: PlaygroundPreviewMessage[];
  conversationId: string | null;
  visitorId: string;
} | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(playgroundChatStorageKey(agentId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as {
      previewMessages?: unknown;
      conversationId?: string | null;
      visitorId?: unknown;
    };
    if (!parsed || !Array.isArray(parsed.previewMessages)) return null;
    const previewMessages = parsed.previewMessages.filter(
      (m): m is PlaygroundPreviewMessage =>
        m !== null &&
        typeof m === "object" &&
        (m as { from?: string }).from !== undefined &&
        ((m as { from: string }).from === "user" || (m as { from: string }).from === "assistant") &&
        typeof (m as { text?: unknown }).text === "string"
    );
    const conversationId =
      typeof parsed.conversationId === "string" || parsed.conversationId === null
        ? parsed.conversationId
        : null;
    const visitorId =
      typeof parsed.visitorId === "string" && parsed.visitorId.trim().length > 0
        ? parsed.visitorId.trim()
        : "playground-preview";
    return { previewMessages, conversationId, visitorId };
  } catch {
    return null;
  }
}

function writePlaygroundChatToStorage(
  agentId: string,
  previewMessages: PlaygroundPreviewMessage[],
  conversationId: string | null,
  visitorId: string
) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(
      playgroundChatStorageKey(agentId),
      JSON.stringify({ previewMessages, conversationId, visitorId })
    );
  } catch {
    /* ignore quota / private mode */
  }
}

function faviconServiceUrl(siteUrl: string): string {
  try {
    const host = new URL(siteUrl).hostname;
    return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(host)}&sz=128`;
  } catch {
    return "";
  }
}

function PlaygroundPreviewConversation({
  agentId,
  agentName,
  brandColorHex,
  toneRaw,
  model,
  systemPrompt,
  creativity,
  saveError,
  websiteLogoUrl,
}: {
  agentId: string | null;
  agentName: string | null;
  brandColorHex: string | null;
  toneRaw: string | null;
  model: string;
  systemPrompt: string;
  creativity: number;
  saveError: string | null;
  websiteLogoUrl: string | null;
}) {
  const messagesScrollRef = useRef<HTMLDivElement>(null);
  const [messageInput, setMessageInput] = useState("");
  const [previewMessages, setPreviewMessages] = useState<PlaygroundPreviewMessage[]>(() => {
    if (!agentId) return [];
    return readPlaygroundChatFromStorage(agentId)?.previewMessages ?? [];
  });
  const [conversationId, setConversationId] = useState<string | null>(() => {
    if (!agentId) return null;
    return readPlaygroundChatFromStorage(agentId)?.conversationId ?? null;
  });
  const [visitorId, setVisitorId] = useState<string>(() => {
    if (!agentId) return newPlaygroundVisitorId();
    return readPlaygroundChatFromStorage(agentId)?.visitorId ?? "playground-preview";
  });
  const [chatError, setChatError] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyRows, setHistoryRows] = useState<PlaygroundConversationRow[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyThreadLoading, setHistoryThreadLoading] = useState(false);
  const blockThreadSyncRef = useRef(false);
  /** When false, transcript updates (polling) must not yank scroll position. */
  const stickToBottomRef = useRef(true);
  useLayoutEffect(() => {
    blockThreadSyncRef.current = isSending || historyThreadLoading;
  }, [isSending, historyThreadLoading]);

  useEffect(() => {
    if (!agentId) return;
    writePlaygroundChatToStorage(agentId, previewMessages, conversationId, visitorId);
  }, [agentId, previewMessages, conversationId, visitorId]);

  useEffect(() => {
    if (!agentId || !conversationId) return;
    const cid = conversationId;
    let cancelled = false;
    async function syncFromServer() {
      if (blockThreadSyncRef.current) return;
      try {
        const data = await backendFetch<{
          messages: Array<{ role: string; content: string }>;
        }>(`/api/v1/conversations/${encodeURIComponent(cid)}`);
        if (cancelled) return;
        const mapped: PlaygroundPreviewMessage[] = [];
        for (const m of data.messages) {
          if (m.role !== "user" && m.role !== "assistant") continue;
          mapped.push({
            from: m.role as "user" | "assistant",
            text: m.content,
          });
        }
        setPreviewMessages(mapped);
      } catch {
        /* ignore — offline or transient */
      }
    }
    void syncFromServer();
    const interval = window.setInterval(() => {
      if (document.visibilityState !== "visible") return;
      void syncFromServer();
    }, PLAYGROUND_THREAD_POLL_MS);
    const onVisibility = () => {
      if (document.visibilityState === "visible") void syncFromServer();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [agentId, conversationId]);

  useEffect(() => {
    if (!historyOpen || !agentId) return;
    let cancelled = false;
    void (async () => {
      setHistoryLoading(true);
      try {
        const data = await backendFetch<{ conversations: PlaygroundConversationRow[] }>(
          `/api/v1/conversations?agent_id=${encodeURIComponent(agentId)}&limit=40`
        );
        if (!cancelled) setHistoryRows(data.conversations);
      } catch {
        if (!cancelled) setHistoryRows([]);
      } finally {
        if (!cancelled) setHistoryLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [historyOpen, agentId]);

  const onMessagesScroll = useCallback(() => {
    const el = messagesScrollRef.current;
    if (!el) return;
    const threshold = 80;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight <= threshold;
    stickToBottomRef.current = nearBottom;
  }, []);

  useLayoutEffect(() => {
    const el = messagesScrollRef.current;
    if (!el || !stickToBottomRef.current) return;
    el.scrollTop = el.scrollHeight;
  }, [previewMessages, isSending]);

  useLayoutEffect(() => {
    if (!historyOpen) return;
    const el = messagesScrollRef.current;
    if (el) el.scrollTop = 0;
  }, [historyOpen]);

  async function handleSendMessage() {
    if (!agentId || !messageInput.trim() || isSending || historyThreadLoading) return;
    stickToBottomRef.current = true;
    const userMessage = messageInput.trim();
    setMessageInput("");
    setPreviewMessages((prev) => [...prev, { from: "user", text: userMessage }]);
    setIsSending(true);
    setChatError(null);
    setPreviewMessages((prev) => [...prev, { from: "assistant", text: "" }]);
    try {
      for await (const ev of backendNdjsonStream("/api/v1/runtime/chat/stream", {
        method: "POST",
        body: JSON.stringify({
          agent_id: agentId,
          message: userMessage,
          conversation_id: conversationId,
          model_override: model,
          system_prompt_override: systemPrompt,
          creativity_override: creativity,
          visitor_id: visitorId,
        }),
      })) {
        if (ev.type === "start") {
          setConversationId(ev.conversation_id);
        } else if (ev.type === "token") {
          setPreviewMessages((prev) => {
            if (prev.length === 0) return prev;
            const last = prev[prev.length - 1];
            if (last.from !== "assistant") return prev;
            const next = [...prev];
            next[next.length - 1] = { from: "assistant", text: last.text + ev.text };
            return next;
          });
        } else if (ev.type === "done") {
          setConversationId(ev.conversation_id);
          const reply = typeof ev.response === "string" ? ev.response : "";
          setPreviewMessages((prev) => {
            if (prev.length === 0) return prev;
            const last = prev[prev.length - 1];
            if (last.from !== "assistant") return prev;
            const next = [...prev];
            next[next.length - 1] = { from: "assistant", text: reply };
            return next;
          });
        } else if (ev.type === "error") {
          throw new BackendApiError(ev.message ?? "Chat failed", 0, ev.code, ev.details);
        }
      }
    } catch (e) {
      setChatError(e instanceof Error ? e.message : "Failed to send message");
      setPreviewMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last?.from === "assistant" && !(last.text ?? "").trim()) {
          return prev.slice(0, -1);
        }
        return prev;
      });
    } finally {
      setIsSending(false);
    }
  }

  function handleResetPreviewChat() {
    if (!agentId) return;
    stickToBottomRef.current = true;
    const nextVisitorId = newPlaygroundVisitorId();
    setVisitorId(nextVisitorId);
    setConversationId(null);
    setPreviewMessages([]);
    setChatError(null);
    setHistoryOpen(false);
    writePlaygroundChatToStorage(agentId, [], null, nextVisitorId);
  }

  async function handlePickHistoryConversation(threadId: string) {
    if (!agentId) return;
    setHistoryThreadLoading(true);
    setChatError(null);
    try {
      const data = await backendFetch<{
        conversation: { visitor_id: string };
        messages: Array<{ role: string; content: string }>;
      }>(`/api/v1/conversations/${encodeURIComponent(threadId)}`);
      const mapped: PlaygroundPreviewMessage[] = [];
      for (const m of data.messages) {
        if (m.role !== "user" && m.role !== "assistant") continue;
        mapped.push({
          from: m.role,
          text: m.content,
        });
      }
      const nextVisitorId = data.conversation.visitor_id.trim() || newPlaygroundVisitorId();
      stickToBottomRef.current = true;
      setConversationId(threadId);
      setVisitorId(nextVisitorId);
      setPreviewMessages(mapped);
      setHistoryOpen(false);
      writePlaygroundChatToStorage(agentId, mapped, threadId, nextVisitorId);
    } catch (e) {
      setChatError(e instanceof Error ? e.message : "Could not load chat");
    } finally {
      setHistoryThreadLoading(false);
    }
  }

  const footerError = saveError ?? chatError;

  const hasBrand = Boolean(brandColorHex);
  const chrome = useMemo(
    () => (brandColorHex ? brandChromeClasses(brandColorHex) : null),
    [brandColorHex]
  );
  const displayName = (agentName?.trim() || "Assistant preview").trim();
  const emptyToneLine = previewAssistantLineForTone(toneRaw);

  const headerToolbarIconBtnClass = useMemo(
    () =>
      cn(
        "cursor-pointer rounded-ds-md p-2.5 transition-colors disabled:pointer-events-none disabled:opacity-40",
        !hasBrand && "text-ds-on-surface-variant hover:bg-ds-outline/50 hover:text-ds-on-surface",
        hasBrand &&
          chrome &&
          (chrome.lightBg
            ? "text-ds-on-surface-variant hover:bg-black/[0.06] hover:text-ds-on-surface"
            : "text-white/90 hover:bg-white/15 hover:text-white")
      ),
    [hasBrand, chrome]
  );

  return (
    <div
      className={cn(
        "border-ds-outline flex min-h-0 w-full max-w-[26rem] flex-col overflow-hidden rounded-[28px] border bg-white shadow-[0_20px_55px_rgba(15,23,42,0.06)]",
        /* Mobile preview tab: fill panel; desktop: fixed shell like embeddable chat widgets — transcript scrolls inside */
        "h-full max-h-full",
        "xl:h-[min(37.5rem,85vh)]"
      )}
    >
      <div
        className={cn(
          "flex shrink-0 items-center justify-between border-b px-5 py-3.5 sm:px-6",
          hasBrand ? "border-black/10" : "border-ds-outline bg-ds-sidebar"
        )}
        style={hasBrand && brandColorHex ? { backgroundColor: brandColorHex } : undefined}
      >
        <div className="flex min-w-0 items-center gap-3">
          <div className="relative shrink-0">
            {websiteLogoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- remote logo/fallback asset
              <img
                src={websiteLogoUrl}
                alt=""
                className="block max-h-9 w-auto max-w-[10rem] object-contain"
                width={160}
                height={36}
                referrerPolicy="no-referrer"
              />
            ) : (
              <div
                className={cn(
                  "flex size-9 items-center justify-center rounded-lg shadow-sm ring-1 ring-black/10",
                  hasBrand && chrome
                    ? chrome.lightBg
                      ? "bg-black/[0.06] text-ds-on-surface"
                      : "bg-white/20 text-white"
                    : "bg-ds-primary text-ds-on-primary"
                )}
              >
                <IconBot className="size-4" />
              </div>
            )}
            {!websiteLogoUrl ? (
              <div
                className={cn(
                  "border-ds-surface absolute -right-0.5 -bottom-0.5 size-2.5 rounded-full border-2",
                  hasBrand && chrome ? chrome.dotClass : "bg-emerald-500"
                )}
              />
            ) : null}
          </div>
          <div className="min-w-0">
            <h3
              className={cn(
                "truncate text-sm font-semibold tracking-tight",
                hasBrand && chrome ? chrome.titleClass : "text-ds-on-surface"
              )}
            >
              {displayName}
            </h3>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-0.5">
          <button
            type="button"
            className={headerToolbarIconBtnClass}
            aria-label="Reset conversation and start a new chat thread"
            title="Reset — clears preview and starts a new server thread (old messages no longer influence replies)"
            onClick={handleResetPreviewChat}
            disabled={!agentId}
          >
            <IconRefresh className="size-5" />
          </button>
          <button
            type="button"
            className={cn(
              headerToolbarIconBtnClass,
              !hasBrand && historyOpen && "bg-ds-outline/50 text-ds-on-surface",
              hasBrand && chrome && historyOpen && (chrome.lightBg ? "bg-black/[0.08]" : "bg-white/20")
            )}
            aria-expanded={historyOpen}
            aria-label={historyOpen ? "Close conversations list" : "Browse conversations"}
            title={historyOpen ? "Back to chat" : "Browse conversations"}
            onClick={() => setHistoryOpen((o) => !o)}
            disabled={!agentId || historyThreadLoading}
          >
            <IconListChats className="size-5" />
          </button>
        </div>
      </div>

      <div
        ref={messagesScrollRef}
        onScroll={historyOpen ? undefined : onMessagesScroll}
        className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain"
      >
        {historyOpen ? (
          <div className="flex flex-col p-4 sm:p-5" role="region" aria-label="Conversations">
            <button
              type="button"
              className={cn(
                "text-ds-on-surface-variant hover:text-ds-on-surface hover:bg-ds-outline/40 -mx-1 mb-4 flex w-fit cursor-pointer items-center gap-2 rounded-ds-md px-2 py-1.5 text-xs font-semibold tracking-wide uppercase transition-colors",
                historyThreadLoading && "pointer-events-none opacity-45"
              )}
              onClick={() => setHistoryOpen(false)}
            >
              <IconChevron className="size-4 rotate-180" aria-hidden />
              Back to chat
            </button>
            <div className="mb-5 border-b border-ds-outline pb-4">
              <h4 className="text-ds-on-surface text-sm font-semibold tracking-tight">Conversations</h4>
              <p className="text-ds-on-surface-variant mt-1 text-[11px] leading-relaxed">
                Same threads as in Conversations. Tap one to load it here.
              </p>
            </div>
            {historyLoading ? (
              <PlaygroundHistoryListSkeleton rows={5} />
            ) : historyRows.length === 0 ? (
              <p className={cn(onboardingType.hint, "text-ds-on-surface-variant py-8 text-center")}>No conversations yet.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {historyRows.map((row) => {
                  const isActive = conversationId === row.id;
                  const when = new Date(row.last_activity_at || row.updated_at).toLocaleString(undefined, {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  });
                  return (
                    <li key={row.id}>
                      <button
                        type="button"
                        disabled={historyThreadLoading}
                        onClick={() => void handlePickHistoryConversation(row.id)}
                        className={cn(
                          "border-ds-outline group cursor-pointer rounded-2xl border bg-white p-3.5 text-left shadow-sm transition-all",
                          "hover:border-ds-primary/35 hover:shadow-md active:scale-[0.99]",
                          "disabled:pointer-events-none disabled:opacity-45",
                          isActive && "border-ds-primary/50 ring-ds-primary/25 bg-ds-sidebar/40 ring-2"
                        )}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className="text-ds-on-surface font-mono text-[11px] font-semibold tracking-tight">
                            {row.id.slice(0, 8)}…
                          </span>
                          <span className="text-ds-on-surface-variant shrink-0 text-[10px] tabular-nums">{when}</span>
                        </div>
                        <p className="text-ds-on-surface-variant mt-2 line-clamp-2 text-[13px] leading-snug">
                          {row.latest_message_preview?.trim() ? row.latest_message_preview : "No messages yet"}
                        </p>
                        {isActive ? (
                          <p className="text-ds-primary mt-2 text-[10px] font-semibold uppercase tracking-wide">
                            Open in preview
                          </p>
                        ) : null}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        ) : (
          <div className="space-y-5 p-5 sm:p-8">
            {historyThreadLoading ? (
              <p className={cn(onboardingType.hint, "text-center italic")}>Loading conversation…</p>
            ) : null}
            {previewMessages.length === 0 ? (
              <div className={cn(onboardingType.body, "space-y-3 text-center")}>
                <p className="border-ds-outline text-ds-on-surface rounded-2xl rounded-tl-sm border bg-white px-4 py-3 text-sm leading-relaxed shadow-sm">
                  {emptyToneLine}
                </p>
                <p className={cn(onboardingType.hint, "text-ds-on-surface-variant")}>Send a message to test this agent.</p>
              </div>
            ) : null}
            {previewMessages.map((msg, index) => {
              const isStreamingAssistant =
                msg.from === "assistant" &&
                isSending &&
                index === previewMessages.length - 1 &&
                !msg.text.trim();
              return (
                <div key={`${msg.from}-${index}`} className={`flex ${msg.from === "user" ? "justify-end" : "justify-start"}`}>
                  {msg.from === "assistant" ? (
                    <div className="flex max-w-[90%] gap-3">
                      <div className="border-ds-outline flex size-7 shrink-0 items-center justify-center overflow-hidden rounded-full border bg-white shadow-sm">
                        {websiteLogoUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element -- remote store logo / favicon
                          <img
                            src={websiteLogoUrl}
                            alt=""
                            className="size-full object-contain p-0.5"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <IconBot className="text-ds-on-surface-variant size-3.5" />
                        )}
                      </div>
                      <div
                        className={cn(
                          "border-ds-outline text-ds-on-surface rounded-2xl rounded-tl-none border bg-white text-sm shadow-sm",
                          isStreamingAssistant
                            ? "flex items-center leading-none px-3 py-2 sm:px-3.5 sm:py-2"
                            : "leading-relaxed px-4 py-3 sm:px-5"
                        )}
                      >
                        {isStreamingAssistant ? (
                          <AssistantThinkingDots brandColorHex={brandColorHex} />
                        ) : (
                          <AssistantMarkdown>{msg.text}</AssistantMarkdown>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div
                      className={cn(
                        "max-w-[85%] rounded-2xl rounded-tr-none px-4 py-3 text-sm leading-relaxed shadow-sm sm:px-5",
                        hasBrand && chrome ? chrome.titleClass : "bg-ds-primary text-ds-on-primary"
                      )}
                      style={hasBrand && brandColorHex ? { backgroundColor: brandColorHex } : undefined}
                    >
                      {msg.text}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="border-ds-outline shrink-0 border-t bg-ds-surface p-4 sm:p-5">
        {historyOpen ? (
          <>
            <p className="text-ds-on-surface-variant text-center text-[11px] leading-relaxed">
              Choose a conversation above to load it, or use <span className="font-semibold">Back to chat</span>.
            </p>
            {footerError ? (
              <p className="text-rose-600 mt-3 text-center text-sm">{footerError}</p>
            ) : null}
          </>
        ) : (
          <>
            <div className="flex items-center gap-2 sm:gap-3">
              <input
                className={cn(fieldControlClass, "min-w-0 flex-1 sm:px-5")}
                placeholder="Test your agent…"
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key !== "Enter" || e.nativeEvent.isComposing) return;
                  e.preventDefault();
                  void handleSendMessage();
                }}
              />
              <button
                type="button"
                className={cn(
                  "cursor-pointer shrink-0 rounded-ds-md p-3 transition-colors active:scale-[0.98] disabled:pointer-events-none disabled:opacity-40",
                  hasBrand && chrome
                    ? cn(chrome.fabIconClass, "hover:opacity-90")
                    : "bg-ds-primary text-ds-on-primary hover:bg-ds-secondary"
                )}
                style={hasBrand && brandColorHex ? { backgroundColor: brandColorHex } : undefined}
                onClick={() => void handleSendMessage()}
                disabled={!agentId || isSending || historyThreadLoading || !messageInput.trim()}
                aria-label="Send"
              >
                <IconSend className="size-4.5" />
              </button>
            </div>
            {footerError ? <p className="text-rose-600 mt-2 text-sm">{footerError}</p> : null}
          </>
        )}
      </div>
    </div>
  );
}

type PlaygroundFormBaseline = {
  model: string;
  systemPrompt: string;
  creativity: number;
  agentType: string;
};

export default function PlaygroundPage() {
  const [mobileTab, setMobileTab] = useState<"settings" | "preview">("settings");
  const { agents, selectedAgentId, selectedAgent, refreshAgents, setSelectedAgentId, agentsLoading } =
    useDashboardAgent();
  const appliedUrlAgentRef = useRef(false);

  /** One-time: Installation "Finish" links with ?agentId= so the right agent is selected. */
  useEffect(() => {
    if (appliedUrlAgentRef.current || typeof window === "undefined") return;
    const id = new URLSearchParams(window.location.search).get("agentId");
    if (!id || agentsLoading) return;
    if (!agents.some((a) => a.id === id)) return;
    setSelectedAgentId(id);
    appliedUrlAgentRef.current = true;
  }, [agents, agentsLoading, setSelectedAgentId]);
  const {
    data: actionsCatalog,
    loading: catalogLoading,
    refresh: refreshActionCatalog,
  } = useActionCatalog(selectedAgentId || undefined);
  const { data: shopifyConnection, loading: shopifyConnectionLoading } = useShopifyConnection(
    selectedAgentId || undefined
  );
  const shopifyConnected = Boolean(shopifyConnection?.connected);
  const setTopbarExtras = useSetDashboardTopbarExtras();
  const [model, setModel] = useState("gpt-4o-mini");
  const [systemPrompt, setSystemPrompt] = useState("");
  const [creativity, setCreativity] = useState<number>(0.5);
  const [agentType, setAgentType] = useState<string>("brand_support");
  const [baseline, setBaseline] = useState<PlaygroundFormBaseline | null>(null);
  const [actionDraft, setActionDraft] = useState<Record<string, boolean>>({});
  const [actionBaseline, setActionBaseline] = useState<Record<string, boolean> | null>(null);
  const [shopifyActionsOpen, setShopifyActionsOpen] = useState(true);
  const [saveError, setSaveError] = useState<{ agentId: string; message: string } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [websiteLogoUrl, setWebsiteLogoUrl] = useState<string | null>(null);
  const hydratedAgentIdRef = useRef<string | null>(null);
  const actionsHydratedForAgentIdRef = useRef<string | null>(null);
  const shopifyConnPrevRef = useRef<boolean | undefined>(undefined);

  /* Hydrate playground form when the selected agent changes (not when the agent list reference refreshes). */
  useEffect(() => {
    if (!selectedAgentId) {
      hydratedAgentIdRef.current = null;
      queueMicrotask(() => {
        setBaseline(null);
        setModel("gpt-4o-mini");
        setSystemPrompt("");
        setCreativity(0.5);
        setAgentType("brand_support");
        setActionDraft({});
        setActionBaseline(null);
        actionsHydratedForAgentIdRef.current = null;
      });
      return;
    }
    const match = agents.find((a) => a.id === selectedAgentId);
    if (!match) return;

    /** Same agent row — skip re-loading form when only `agents` reference changed (e.g. refresh). */
    if (hydratedAgentIdRef.current === selectedAgentId) return;

    hydratedAgentIdRef.current = selectedAgentId;
    const behavior = (match.behavior_settings ?? {}) as Record<string, unknown>;
    const cr = normalizeCreativity(behavior.creativity);
    const atRaw = behavior.agent_type;
    const at =
      typeof atRaw === "string" &&
      PLAYGROUND_AGENT_TYPES.some((t) => t.value === atRaw)
        ? atRaw
        : "brand_support";
    const m = match.model || "gpt-4o-mini";
    const sp = match.system_prompt || "";
    queueMicrotask(() => {
      setModel(m);
      setSystemPrompt(sp);
      setCreativity(cr);
      setAgentType(at);
      setBaseline({ model: m, systemPrompt: sp, creativity: cr, agentType: at });
      setSaveError(null);
      setActionDraft({});
      setActionBaseline(null);
      actionsHydratedForAgentIdRef.current = null;
    });
  }, [selectedAgentId, agents]);

  /* Load action toggles from catalog; deferred until Save. Re-sync when agent or Shopify connection changes. */
  useEffect(() => {
    if (!selectedAgentId || !actionsCatalog) return;

    const buildDraft = (includeShopify: boolean) => {
      const d: Record<string, boolean> = {};
      const human = actionsCatalog.entries.find((e) => e.action_key === "human.escalate");
      if (human) {
        d["human.escalate"] = Boolean(human.enabled && human.status === "live");
      }
      if (includeShopify) {
        for (const e of actionsCatalog.entries) {
          if (e.provider === "shopify") {
            d[e.action_key] = Boolean(e.enabled && e.status === "live");
          }
        }
      }
      return d;
    };

    if (actionsHydratedForAgentIdRef.current !== selectedAgentId) {
      const draft = buildDraft(shopifyConnected);
      queueMicrotask(() => {
        setActionDraft(draft);
        setActionBaseline(draft);
      });
      actionsHydratedForAgentIdRef.current = selectedAgentId;
      shopifyConnPrevRef.current = shopifyConnected;
      return;
    }

    const prevConn = shopifyConnPrevRef.current;
    shopifyConnPrevRef.current = shopifyConnected;
    if (prevConn === false && shopifyConnected) {
      queueMicrotask(() => {
        setActionDraft((prev) => {
          const next = { ...prev };
          for (const e of actionsCatalog.entries) {
            if (e.provider === "shopify") {
              next[e.action_key] = Boolean(e.enabled && e.status === "live");
            }
          }
          return next;
        });
        setActionBaseline((prev) => {
          if (!prev) return prev;
          const next = { ...prev };
          for (const e of actionsCatalog.entries) {
            if (e.provider === "shopify") {
              next[e.action_key] = Boolean(e.enabled && e.status === "live");
            }
          }
          return next;
        });
      });
    }
  }, [selectedAgentId, actionsCatalog, shopifyConnected]);

  const humanEscalationEntry = useMemo(
    () => actionsCatalog?.entries.find((e) => e.action_key === "human.escalate"),
    [actionsCatalog]
  );

  const shopifyCatalogEntries = useMemo(
    () => actionsCatalog?.entries.filter((e) => e.provider === "shopify") ?? [],
    [actionsCatalog]
  );

  const formFieldsDirty = Boolean(
    baseline &&
      selectedAgentId &&
      (model !== baseline.model ||
        systemPrompt !== baseline.systemPrompt ||
        creativity !== baseline.creativity ||
        agentType !== baseline.agentType)
  );
  const actionsDirty = actionsConfigDirty(actionDraft, actionBaseline);
  const isDirty = Boolean(
    selectedAgentId && baseline && (formFieldsDirty || actionsDirty)
  );

  const showPlaygroundSettingsSkeleton =
    agentsLoading || Boolean(selectedAgentId && baseline === null);

  const handleSave = useCallback(async () => {
    if (!selectedAgentId || isSaving || !baseline) return;
    setIsSaving(true);
    setSaveError(null);
    try {
      const prevBehavior = (selectedAgent?.behavior_settings ?? {}) as Record<string, unknown>;
      const behavior_settings = {
        ...prevBehavior,
        creativity,
        agent_type: agentType,
      };
      const updated = await backendFetch<{
        model: string;
        system_prompt: string;
        behavior_settings: Record<string, unknown>;
      }>(`/api/v1/agents/${selectedAgentId}`, {
        method: "PATCH",
        body: JSON.stringify({ model, system_prompt: systemPrompt, behavior_settings }),
      });
      await refreshAgents();

      if (actionBaseline) {
        const keys = new Set([
          ...Object.keys(actionDraft),
          ...Object.keys(actionBaseline),
        ]);
        for (const actionKey of keys) {
          const next = Boolean(actionDraft[actionKey]);
          const prev = Boolean(actionBaseline[actionKey]);
          if (next !== prev) {
            await backendFetch(
              `/api/v1/agents/${selectedAgentId}/actions/${encodeURIComponent(actionKey)}`,
              {
                method: "PATCH",
                body: JSON.stringify({ enabled: next }),
              }
            );
          }
        }
        await refreshActionCatalog();
        setActionBaseline({ ...actionDraft });
      }

      const cr = normalizeCreativity(updated.behavior_settings?.creativity);
      const atRaw = updated.behavior_settings?.agent_type;
      const at =
        typeof atRaw === "string" &&
        PLAYGROUND_AGENT_TYPES.some((t) => t.value === atRaw)
          ? atRaw
          : agentType;
      setModel(updated.model);
      setSystemPrompt(updated.system_prompt);
      setCreativity(cr);
      setAgentType(at);
      setBaseline({
        model: updated.model,
        systemPrompt: updated.system_prompt,
        creativity: cr,
        agentType: at,
      });
    } catch (e) {
      setSaveError({
        agentId: selectedAgentId,
        message: e instanceof Error ? e.message : "Failed to save agent settings",
      });
    } finally {
      setIsSaving(false);
    }
  }, [
    selectedAgentId,
    isSaving,
    baseline,
    model,
    systemPrompt,
    creativity,
    agentType,
    selectedAgent,
    refreshAgents,
    actionBaseline,
    actionDraft,
    refreshActionCatalog,
  ]);

  const handleSaveRef = useRef(handleSave);

  useLayoutEffect(() => {
    handleSaveRef.current = handleSave;
  }, [handleSave]);

  useLayoutEffect(() => {
    setTopbarExtras(
      <>
        <button
          type="button"
          className="text-ds-on-surface-variant hover:text-ds-on-surface hover:bg-ds-outline/40 cursor-pointer rounded-ds-md p-2 transition-colors"
          aria-label="Help"
        >
          <IconQuestion className="size-5" />
        </button>
        <button
          type="button"
          className="text-ds-on-surface-variant hover:text-ds-on-surface hover:bg-ds-outline/40 cursor-pointer rounded-ds-md p-2 transition-colors"
          aria-label="Notifications"
        >
          <IconBell className="size-5" />
        </button>
        {isDirty ? (
          <div className="border-ds-outline ml-1 hidden items-center gap-3 border-l pl-3 lg:flex">
            <div className="flex items-center gap-2">
              <span className="size-2 shrink-0 animate-pulse rounded-full bg-amber-500" />
              <span className="text-ds-on-surface-variant text-[11px] font-semibold tracking-wide uppercase">
                Unsaved
              </span>
            </div>
            <button
              type="button"
              className="bg-ds-primary text-ds-on-primary hover:bg-ds-secondary cursor-pointer inline-flex items-center justify-center rounded-ds-md px-4 py-2.5 text-xs font-semibold tracking-wide uppercase transition-colors active:scale-[0.98] disabled:pointer-events-none disabled:opacity-45"
              onClick={() => void handleSaveRef.current()}
              disabled={!selectedAgentId || isSaving}
            >
              {isSaving ? "Saving…" : "Save changes"}
            </button>
          </div>
        ) : null}
      </>
    );
    return () => setTopbarExtras(null);
  }, [setTopbarExtras, isSaving, selectedAgentId, isDirty]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (!selectedAgentId) {
        setWebsiteLogoUrl(null);
        return;
      }
      try {
        const data = await backendFetch<{
          sources: Array<{ source_url: string | null; website_mode: string | null; title: string | null }>;
        }>(
          `/api/v1/knowledge/website/sources?agent_id=${encodeURIComponent(selectedAgentId)}`
        );
        if (cancelled) return;
        const prioritizedSource =
          data.sources.find(
            (source) => typeof source.source_url === "string" && source.source_url && source.website_mode !== "individual"
          ) ??
          data.sources.find((source) => typeof source.source_url === "string" && source.source_url);
        const sourceUrl = prioritizedSource?.source_url ?? null;
        setWebsiteLogoUrl(sourceUrl ? faviconServiceUrl(sourceUrl) : null);
      } catch {
        if (!cancelled) setWebsiteLogoUrl(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedAgentId]);

  return (
    <div className="onboarding-main-surface -mx-6 -mt-6 -mb-6 flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="border-ds-outline bg-ds-sidebar/80 flex shrink-0 items-center gap-2 border-b p-2.5 xl:hidden">
        <button
          type="button"
          onClick={() => setMobileTab("settings")}
          className={cn(
            "cursor-pointer rounded-ds-md px-3 py-2 text-xs font-semibold transition-colors",
            mobileTab === "settings"
              ? "border-ds-primary/40 text-ds-primary border bg-white shadow-sm"
              : "text-ds-on-surface-variant hover:text-ds-on-surface hover:bg-white/70"
          )}
        >
          Settings
        </button>
        <button
          type="button"
          onClick={() => setMobileTab("preview")}
          className={cn(
            "cursor-pointer rounded-ds-md px-3 py-2 text-xs font-semibold transition-colors",
            mobileTab === "preview"
              ? "border-ds-primary/40 text-ds-primary border bg-white shadow-sm"
              : "text-ds-on-surface-variant hover:text-ds-on-surface hover:bg-white/70"
          )}
        >
          Preview
        </button>
      </div>

      <div className="dot-grid flex min-h-0 flex-1 flex-col overflow-hidden xl:flex-row xl:items-stretch">
        <section
          className={cn(
            "border-ds-outline flex w-full min-h-0 flex-col overflow-hidden border-b bg-white",
            "xl:w-[420px] xl:shrink-0 xl:border-r xl:border-b-0",
            mobileTab === "settings" ? "flex-1 xl:flex-none" : "hidden xl:flex"
          )}
        >
          <div className="border-ds-outline bg-ds-sidebar/90 shrink-0 border-b px-5 py-4 backdrop-blur-sm sm:px-6">
            <h2 className="text-ds-on-surface flex items-center gap-2 text-sm font-semibold tracking-tight">
              <IconTune className="text-ds-primary size-4 shrink-0" aria-hidden />
              Playground settings
            </h2>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-5 py-6 sm:px-8 sm:py-8">
            {!agentsLoading && !selectedAgentId ? (
              <DashboardSelectAgentEmptyState />
            ) : showPlaygroundSettingsSkeleton ? (
              <PlaygroundSettingsColumnSkeleton />
            ) : (
              <div className="space-y-10">
            <div className="space-y-2">
              <label className={cn(onboardingType.label, "text-ds-on-surface-variant text-[11px] uppercase tracking-[0.14em]")}>
                AI model
              </label>
              <select
                className={fieldControlPointerClass}
                value={model}
                onChange={(e) => setModel(e.target.value)}
              >
                <option value="gpt-4o-mini">GPT-4o mini</option>
                <option value="gpt-4o">GPT-4o</option>
              </select>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <label className={cn(onboardingType.label, "text-ds-on-surface-variant mb-0 text-[11px] uppercase tracking-[0.14em]")}>
                  Creativity
                </label>
                <button
                  type="button"
                  className="text-ds-on-surface-variant hover:text-ds-primary cursor-pointer rounded-ds-md p-1 transition-colors"
                  aria-label="About creativity"
                >
                  <IconInfo className="size-4" />
                </button>
              </div>
              <input
                className="accent-ds-primary w-full cursor-pointer"
                type="range"
                min="0"
                max="1"
                step="0.5"
                value={creativity}
                onChange={(e) => setCreativity(Number.parseFloat(e.target.value))}
              />
              <div className="text-ds-on-surface-variant flex justify-between text-[11px] font-medium tracking-wide">
                <span>Conservative</span>
                <span className="text-ds-on-surface font-semibold">{creativityBandLabel(creativity)}</span>
                <span>Creative</span>
              </div>
            </div>

            <div className="space-y-4">
              <label className={cn(onboardingType.label, "text-ds-on-surface-variant text-[11px] uppercase tracking-[0.14em]")}>
                Enabled actions
              </label>
              <div className="border-ds-outline overflow-hidden rounded-ds-lg border bg-ds-surface shadow-sm">
                <button
                  type="button"
                  className="bg-ds-sidebar flex w-full cursor-pointer items-center justify-between px-4 py-3 text-left transition-colors hover:bg-ds-sidebar/80"
                  onClick={() => setShopifyActionsOpen((o) => !o)}
                  aria-expanded={shopifyActionsOpen}
                >
                  <div className="flex items-center gap-3">
                    <IconBag className="text-ds-primary size-4 shrink-0" aria-hidden />
                    <span className="text-ds-on-surface text-sm font-semibold">Shopify actions</span>
                  </div>
                  <IconChevron
                    className={cn(
                      "text-ds-on-surface-variant size-4 transition-transform",
                      shopifyActionsOpen ? "rotate-90" : "-rotate-90"
                    )}
                    aria-hidden
                  />
                </button>
                {shopifyActionsOpen ? (
                  <div className="border-ds-outline border-t p-4">
                    {shopifyConnectionLoading ? (
                      <PlaygroundConnectionCheckSkeleton />
                    ) : !shopifyConnected ? (
                      <div className="space-y-3">
                        <p className={cn(onboardingType.hint, "text-[13px]")}>
                          Connect your Shopify store under Actions &amp; integrations to enable product, order, and
                          customer tools for this agent.
                        </p>
                        <Link
                          href="/actions#shopify-integration"
                          className="text-ds-primary hover:text-ds-secondary inline-flex cursor-pointer font-semibold underline-offset-2 transition-colors hover:underline"
                        >
                          Connect Shopify
                        </Link>
                      </div>
                    ) : catalogLoading ? (
                      <PlaygroundShopifyActionsSkeleton rows={4} />
                    ) : shopifyCatalogEntries.length === 0 ? (
                      <p className="text-ds-on-surface-variant text-sm">
                        No Shopify actions are available yet. Open Actions &amp; integrations to connect your store and
                        enable tools.
                      </p>
                    ) : (
                      <div className="space-y-4">
                        {shopifyCatalogEntries.map((e) => {
                          const off = e.status !== "live";
                          return (
                            <div
                              key={e.action_key}
                              className={cn("flex items-center justify-between", off && "opacity-50")}
                            >
                              <div>
                                <p className="text-ds-on-surface text-sm font-medium">{e.label}</p>
                                <p className={cn(onboardingType.hint, "mt-0.5 text-[13px]")}>
                                  {e.description}
                                </p>
                              </div>
                              <ToggleSwitch
                                checked={Boolean(actionDraft[e.action_key])}
                                disabled={off}
                                onCheckedChange={
                                  off
                                    ? undefined
                                    : (next) =>
                                        setActionDraft((prev) => ({ ...prev, [e.action_key]: next }))
                                }
                              />
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ) : null}
              </div>

              <div className="border-ds-outline flex items-center justify-between rounded-ds-lg border bg-ds-surface p-4 shadow-sm">
                <div className="flex items-center gap-3">
                  <IconPersonPin className="text-ds-primary size-4 shrink-0" aria-hidden />
                  <span className="text-ds-on-surface text-sm font-semibold">Escalate to human</span>
                </div>
                <ToggleSwitch
                  checked={Boolean(actionDraft["human.escalate"])}
                  disabled={humanEscalationEntry?.status !== "live"}
                  onCheckedChange={
                    humanEscalationEntry?.status !== "live"
                      ? undefined
                      : (next) =>
                          setActionDraft((prev) => ({ ...prev, "human.escalate": next }))
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className={cn(onboardingType.label, "text-ds-on-surface-variant text-[11px] uppercase tracking-[0.14em]")}>
                Agent type
              </label>
              <select
                className={fieldControlPointerClass}
                value={agentType}
                onChange={(e) => setAgentType(e.target.value)}
              >
                {PLAYGROUND_AGENT_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
              <p className={onboardingType.hint}>Advanced mode: manual prompt editing enabled.</p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <label className={cn(onboardingType.label, "text-ds-on-surface-variant mb-0 text-[11px] uppercase tracking-[0.14em]")}>
                  System prompt
                </label>
                <button
                  type="button"
                  className="text-ds-on-surface-variant hover:text-ds-primary inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-ds-md py-1 text-[11px] font-semibold tracking-wide uppercase transition-colors disabled:pointer-events-none disabled:opacity-40"
                  disabled={!baseline || systemPrompt === baseline.systemPrompt}
                  onClick={() => baseline && setSystemPrompt(baseline.systemPrompt)}
                >
                  <IconHistory className="size-3.5" aria-hidden />
                  Reset
                </button>
              </div>
              <textarea
                className={cn(fieldControlClass, "leading-relaxed")}
                value={systemPrompt}
                onChange={(e) => setSystemPrompt(e.target.value)}
              />
            </div>

            <p className={cn(onboardingType.hint, "pb-4 text-center lg:pb-8")}>
              Save your changes for them to take effect in the live agent.
            </p>

            {isDirty ? (
              <div className="border-ds-outline bg-ds-surface/95 sticky bottom-0 -mx-5 flex shrink-0 items-center justify-between gap-3 border-t p-4 backdrop-blur-sm sm:-mx-8 lg:hidden">
                <div className="flex min-w-0 items-center gap-2">
                  <span className="size-2 shrink-0 animate-pulse rounded-full bg-amber-500" />
                  <span className="text-ds-on-surface-variant truncate text-[11px] font-semibold uppercase tracking-wide">
                    Unsaved
                  </span>
                </div>
                <button
                  type="button"
                  className="bg-ds-primary text-ds-on-primary hover:bg-ds-secondary inline-flex shrink-0 cursor-pointer items-center justify-center rounded-ds-md px-4 py-2.5 text-xs font-semibold tracking-wide uppercase transition-colors active:scale-[0.98] disabled:pointer-events-none disabled:opacity-45"
                  onClick={() => void handleSave()}
                  disabled={!selectedAgentId || isSaving}
                >
                  {isSaving ? "Saving…" : "Save"}
                </button>
              </div>
            ) : null}
              </div>
            )}
          </div>
        </section>

        <section
          className={cn(
            "min-w-0 flex min-h-0 flex-1 flex-col items-stretch justify-start overflow-hidden p-4 pt-6 sm:p-6 sm:pt-8",
            "xl:items-center xl:justify-center xl:self-start xl:min-h-0 xl:p-12 xl:pt-10 xl:pb-12",
            mobileTab === "preview" ? "" : "hidden xl:flex"
          )}
        >
          <div className="flex min-h-0 w-full max-w-full flex-1 flex-col items-center justify-center overflow-hidden xl:flex-none xl:h-auto xl:justify-start">
            <PlaygroundPreviewConversation
              key={selectedAgentId ?? "__no_agent__"}
              agentId={selectedAgentId}
              agentName={selectedAgent?.name ?? null}
              brandColorHex={parseBrandColorHex(selectedAgent?.behavior_settings?.brand_color)}
              toneRaw={
                typeof selectedAgent?.behavior_settings?.tone === "string"
                  ? selectedAgent.behavior_settings.tone
                  : null
              }
              model={model}
              systemPrompt={systemPrompt}
              creativity={creativity}
              saveError={saveError?.agentId === selectedAgentId ? saveError.message : null}
              websiteLogoUrl={websiteLogoUrl}
            />
          </div>
        </section>
      </div>
    </div>
  );
}

function ToggleSwitch({
  checked,
  disabled,
  onCheckedChange,
}: {
  checked: boolean;
  disabled?: boolean;
  onCheckedChange?: (next: boolean) => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={checked}
      disabled={disabled}
      onClick={() => {
        if (disabled || !onCheckedChange) return;
        onCheckedChange(!checked);
      }}
      className={cn(
        "flex h-5 w-9 items-center rounded-full p-0.5 transition-colors",
        checked ? "bg-ds-primary" : "bg-ds-outline",
        disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"
      )}
    >
      <span
        className={`h-4 w-4 rounded-full bg-white transition-transform ${
          checked ? "translate-x-4" : "translate-x-0"
        }`}
      />
    </button>
  );
}

function IconBase({
  className,
  children,
  fill = "none",
  strokeWidth = "1.8",
}: {
  className?: string;
  children: ReactNode;
  fill?: string;
  strokeWidth?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill={fill}
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      {children}
    </svg>
  );
}

function IconQuestion({ className }: { className?: string }) {
  return (
    <IconBase className={className}>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.5 9a2.5 2.5 0 1 1 4 2c-.7.6-1.5 1.1-1.5 2" />
      <circle cx="12" cy="16.5" r="0.6" fill="currentColor" strokeWidth="0" />
    </IconBase>
  );
}

function IconBell({ className }: { className?: string }) {
  return (
    <IconBase className={className}>
      <path d="M6 10a6 6 0 0 1 12 0v5l1.5 2h-15L6 15v-5Z" />
      <path d="M10 19a2 2 0 0 0 4 0" />
    </IconBase>
  );
}

function IconTune({ className }: { className?: string }) {
  return (
    <IconBase className={className}>
      <path d="M4 7h8M16 7h4M9 7v10M4 17h4M12 17h8M15 17V7" />
    </IconBase>
  );
}

function IconInfo({ className }: { className?: string }) {
  return (
    <IconBase className={className}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 10v6M12 7.5h.01" />
    </IconBase>
  );
}

function IconBag({ className }: { className?: string }) {
  return (
    <IconBase className={className}>
      <path d="M6 8h12l-1 11H7L6 8Z" />
      <path d="M9 9V7a3 3 0 1 1 6 0v2" />
    </IconBase>
  );
}

function IconChevron({ className }: { className?: string }) {
  return (
    <IconBase className={className}>
      <path d="m9 18 6-6-6-6" />
    </IconBase>
  );
}

function IconPersonPin({ className }: { className?: string }) {
  return (
    <IconBase className={className}>
      <circle cx="12" cy="8.5" r="3" />
      <path d="M6 18c1.4-2.5 3.5-3.8 6-3.8s4.6 1.3 6 3.8" />
    </IconBase>
  );
}

function IconHistory({ className }: { className?: string }) {
  return (
    <IconBase className={className}>
      <path d="M4 12a8 8 0 1 0 2.4-5.7" />
      <path d="M4 4v4h4" />
      <path d="M12 8v5l3 2" />
    </IconBase>
  );
}

function IconBot({ className }: { className?: string }) {
  return (
    <IconBase className={className}>
      <rect x="5" y="7" width="14" height="11" rx="3" />
      <circle cx="10" cy="12" r="1" fill="currentColor" strokeWidth="0" />
      <circle cx="14" cy="12" r="1" fill="currentColor" strokeWidth="0" />
      <path d="M12 4v3M9 16h6" />
    </IconBase>
  );
}

function IconListChats({ className }: { className?: string }) {
  return (
    <IconBase className={className}>
      <path d="M8 6h13M8 12h13M8 18h13" />
      <path d="M3 6h.01M3 12h.01M3 18h.01" />
    </IconBase>
  );
}

function IconRefresh({ className }: { className?: string }) {
  return (
    <IconBase className={className}>
      <path d="M20 12a8 8 0 1 1-2.3-5.6" />
      <path d="M20 4v5h-5" />
    </IconBase>
  );
}

function IconSend({ className }: { className?: string }) {
  return (
    <IconBase className={className}>
      <path d="M21 3 9 15" />
      <path d="m21 3-7 18-5-6-6-5 18-7Z" />
    </IconBase>
  );
}
