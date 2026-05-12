"use client";

import Link from "next/link";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  Bot,
  ChevronRight,
  History,
  Info,
  List,
  RefreshCw,
  Send,
  Settings2,
  ShoppingBag,
  UserRound,
} from "lucide-react";
import { AssistantMarkdown } from "@/components/chat/assistant-markdown";
import { AssistantThinkingDots } from "@/components/chat/assistant-thinking-dots";
import { useDashboardAgent } from "@/components/layout/dashboard-agent-context";
import { useSetDashboardTopbarExtras } from "@/components/layout/dashboard-topbar-extras-context";
import { useAgentIntegrationsBootstrap } from "@/components/integrations/use-agent-integrations-bootstrap";
import { onboardingType } from "@/components/onboarding/onboarding-ui";
import {
  PlaygroundHistoryListSkeleton,
  PlaygroundSettingsColumnSkeleton,
  PlaygroundShopifyActionsSkeleton,
} from "@/components/playground/playground-page-skeleton";
import { DashboardSelectAgentEmptyState } from "@/components/dashboard/dashboard-page-skeleton";
import { BackendApiError, backendFetch, backendNdjsonStream } from "@/lib/backend-api";
import { isRenderableTranscriptMessage } from "@/lib/conversation-transcript";
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

type PlaygroundThreadCacheEntry = {
  visitorId: string;
  messages: PlaygroundPreviewMessage[];
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

function languagePreviewLabel(raw: string | null): string | null {
  if (!raw) return null;
  const key = raw.trim().toLowerCase();
  if (!key || key === "auto") return null;
  const labels: Record<string, string> = {
    en: "English",
    es: "Spanish",
    fr: "French",
    de: "German",
    pt: "Portuguese",
    it: "Italian",
    nl: "Dutch",
    ja: "Japanese",
    zh: "Chinese",
  };
  return labels[key] ?? raw;
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
  toneDescriptionRaw,
  greetingMessageRaw,
  languageRaw,
  model,
  agentType,
  systemPrompt,
  creativity,
  saveError,
  websiteLogoUrl,
}: {
  agentId: string | null;
  agentName: string | null;
  brandColorHex: string | null;
  toneRaw: string | null;
  toneDescriptionRaw: string | null;
  greetingMessageRaw: string | null;
  languageRaw: string | null;
  model: string;
  agentType: string;
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
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [historyThreadLoading, setHistoryThreadLoading] = useState(false);
  const [, setThreadCacheState] = useState<Record<string, PlaygroundThreadCacheEntry>>({});
  const blockThreadSyncRef = useRef(false);
  const threadCacheRef = useRef<Record<string, PlaygroundThreadCacheEntry>>({});
  const threadRequestsRef = useRef(new Map<string, Promise<PlaygroundThreadCacheEntry>>());
  /** When false, transcript updates (polling) must not yank scroll position. */
  const stickToBottomRef = useRef(true);
  useLayoutEffect(() => {
    blockThreadSyncRef.current = isSending || historyThreadLoading;
  }, [isSending, historyThreadLoading]);

  useEffect(() => {
    if (!agentId) return;
    writePlaygroundChatToStorage(agentId, previewMessages, conversationId, visitorId);
  }, [agentId, previewMessages, conversationId, visitorId]);

  const cacheThread = useCallback((threadId: string, entry: PlaygroundThreadCacheEntry) => {
    threadCacheRef.current = {
      ...threadCacheRef.current,
      [threadId]: entry,
    };
    setThreadCacheState(threadCacheRef.current);
  }, []);

  const loadThreadForCache = useCallback(async (threadId: string) => {
    const cached = threadCacheRef.current[threadId];
    if (cached) return cached;

    const existing = threadRequestsRef.current.get(threadId);
    if (existing) return existing;

    const request = (async () => {
      const data = await backendFetch<{
        conversation: { visitor_id: string };
        messages: Array<{ role: string; content: string; tool_call_payload?: unknown }>;
      }>(`/api/v1/conversations/${encodeURIComponent(threadId)}`);
      const mapped: PlaygroundPreviewMessage[] = [];
      for (const m of data.messages) {
        if (!isRenderableTranscriptMessage(m)) continue;
        mapped.push({
          from: m.role as "user" | "assistant",
          text: m.content ?? "",
        });
      }
      const entry = {
        visitorId: data.conversation.visitor_id.trim() || newPlaygroundVisitorId(),
        messages: mapped,
      };
      cacheThread(threadId, entry);
      return entry;
    })().finally(() => {
      threadRequestsRef.current.delete(threadId);
    });
    threadRequestsRef.current.set(threadId, request);
    return request;
  }, [cacheThread]);

  const prefetchHistoryConversation = useCallback((threadId: string) => {
    if (threadCacheRef.current[threadId] || threadRequestsRef.current.has(threadId)) return;
    void loadThreadForCache(threadId).catch(() => {
      /* ignore speculative prefetch failures */
    });
  }, [loadThreadForCache]);

  useEffect(() => {
    queueMicrotask(() => {
      setHistoryRows([]);
      setHistoryLoaded(false);
      setHistoryLoading(false);
      setHistoryThreadLoading(false);
      threadCacheRef.current = {};
      threadRequestsRef.current.clear();
      setThreadCacheState({});

      if (!agentId) {
        setConversationId(null);
        setVisitorId(newPlaygroundVisitorId());
        setPreviewMessages([]);
        return;
      }

      const stored = readPlaygroundChatFromStorage(agentId);
      const nextMessages = stored?.previewMessages ?? [];
      const nextConversationId = stored?.conversationId ?? null;
      const nextVisitorId = stored?.visitorId ?? "playground-preview";
      setConversationId(nextConversationId);
      setVisitorId(nextVisitorId);
      setPreviewMessages(nextMessages);
      if (nextConversationId) {
        cacheThread(nextConversationId, { visitorId: nextVisitorId, messages: nextMessages });
      }
    });
  }, [agentId, cacheThread]);

  useEffect(() => {
    if (!conversationId) return;
    cacheThread(conversationId, { visitorId, messages: previewMessages });
  }, [conversationId, visitorId, previewMessages, cacheThread]);

  useEffect(() => {
    if (!agentId || !conversationId) return;
    const cid = conversationId;
    let cancelled = false;
    async function syncFromServer() {
      if (blockThreadSyncRef.current) return;
      try {
        const data = await backendFetch<{
          messages: Array<{ role: string; content: string; tool_call_payload?: unknown }>;
        }>(`/api/v1/conversations/${encodeURIComponent(cid)}`);
        if (cancelled) return;
        // A poll that started before this render can resolve after the user sends a message.
        // Applying it would wipe optimistic rows until the next poll (messages "vanish").
        if (blockThreadSyncRef.current) return;
        const mapped: PlaygroundPreviewMessage[] = [];
        for (const m of data.messages) {
          if (!isRenderableTranscriptMessage(m)) continue;
          mapped.push({
            from: m.role as "user" | "assistant",
            text: m.content ?? "",
          });
        }
        cacheThread(cid, { visitorId, messages: mapped });
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
  }, [agentId, conversationId, visitorId, cacheThread]);

  useEffect(() => {
    if (!historyOpen || !agentId) return;
    let cancelled = false;
    void (async () => {
      if (!historyLoaded) setHistoryLoading(true);
      try {
        const data = await backendFetch<{ conversations: PlaygroundConversationRow[] }>(
          `/api/v1/conversations?agent_id=${encodeURIComponent(agentId)}&limit=40`
        );
        if (!cancelled) {
          setHistoryRows(data.conversations);
          setHistoryLoaded(true);
        }
      } catch {
        if (!cancelled && !historyLoaded) setHistoryRows([]);
      } finally {
        if (!cancelled) setHistoryLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [historyOpen, agentId, historyLoaded]);

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
    // `blockThreadSyncRef` is otherwise updated in layout after commit; without this, an in-flight
    // poll can finish between optimistic updates and that effect and overwrite the transcript.
    blockThreadSyncRef.current = true;
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
          agent_type_override: agentType,
          system_prompt_override: agentType === "custom" ? systemPrompt : null,
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
            const merged = reply.trim().length > 0 ? reply : last.text;
            if (!merged.trim()) {
              return prev.slice(0, -1);
            }
            const next = [...prev];
            next[next.length - 1] = { from: "assistant", text: merged };
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
    setChatError(null);
    const cached = threadCacheRef.current[threadId];
    if (cached) {
      stickToBottomRef.current = true;
      setConversationId(threadId);
      setVisitorId(cached.visitorId);
      setPreviewMessages(cached.messages);
      setHistoryOpen(false);
      writePlaygroundChatToStorage(agentId, cached.messages, threadId, cached.visitorId);
    } else {
      stickToBottomRef.current = true;
      setConversationId(threadId);
      setPreviewMessages([]);
      setHistoryOpen(false);
      setHistoryThreadLoading(true);
    }
    try {
      const next = await loadThreadForCache(threadId);
      stickToBottomRef.current = true;
      setConversationId(threadId);
      setVisitorId(next.visitorId);
      setPreviewMessages(next.messages);
      setHistoryOpen(false);
      writePlaygroundChatToStorage(agentId, next.messages, threadId, next.visitorId);
    } catch (e) {
      if (!cached) setChatError(e instanceof Error ? e.message : "Could not load chat");
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
  const greetingMessage = greetingMessageRaw?.trim() || null;
  const toneDescription = toneDescriptionRaw?.trim() || null;
  const languageLabel = languagePreviewLabel(languageRaw);
  const emptyAssistantLine = greetingMessage ?? emptyToneLine;

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
                        onMouseEnter={() => prefetchHistoryConversation(row.id)}
                        onFocus={() => prefetchHistoryConversation(row.id)}
                        onClick={() => void handlePickHistoryConversation(row.id)}
                        className={cn(
                          "border-ds-outline group cursor-pointer rounded-2xl border bg-white p-3.5 text-left shadow-sm transition-all",
                          "hover:border-black/35 hover:shadow-md active:scale-[0.99]",
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
            {!historyThreadLoading && previewMessages.length === 0 ? (
              <div className={cn(onboardingType.body, "space-y-3 text-center")}>
                <p className="border-ds-outline text-ds-on-surface rounded-2xl rounded-tl-sm border bg-white px-4 py-3 text-sm leading-relaxed shadow-sm">
                  {emptyAssistantLine}
                </p>
                {toneDescription || languageLabel ? (
                  <p className={cn(onboardingType.hint, "text-ds-on-surface-variant text-xs")}>
                    {toneDescription ? `Tone guidance: ${toneDescription}` : null}
                    {toneDescription && languageLabel ? " \u00b7 " : null}
                    {languageLabel ? `Reply language: ${languageLabel}` : null}
                  </p>
                ) : null}
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
                placeholder={languageLabel ? `Test your agent (${languageLabel})…` : "Test your agent…"}
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
                    : "bg-ds-primary text-ds-on-primary hover:bg-ds-primary-hover"
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
    catalog: actionsCatalog,
    shopify: shopifyConnection,
    websitePreview: integrationsWebsitePreview,
    loading: integrationsLoading,
    refresh: refreshIntegrations,
  } = useAgentIntegrationsBootstrap(selectedAgentId || undefined, { includeWebsitePreview: false });
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
  const websiteLogoUrl = useMemo(() => {
    if (!selectedAgentId || integrationsLoading) return null;
    const raw = integrationsWebsitePreview?.source_url?.trim();
    if (!raw) return null;
    return faviconServiceUrl(raw) || null;
  }, [selectedAgentId, integrationsLoading, integrationsWebsitePreview?.source_url]);
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
        await refreshIntegrations();
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
    refreshIntegrations,
  ]);

  const handleSaveRef = useRef(handleSave);

  useLayoutEffect(() => {
    handleSaveRef.current = handleSave;
  }, [handleSave]);

  useLayoutEffect(() => {
    setTopbarExtras(
      <>
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
              className="bg-ds-primary text-ds-on-primary hover:bg-ds-primary-hover cursor-pointer inline-flex items-center justify-center rounded-ds-md px-4 py-2.5 text-xs font-semibold tracking-wide uppercase transition-colors active:scale-[0.98] disabled:pointer-events-none disabled:opacity-45"
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
                  className="text-ds-on-surface-variant hover:text-ds-interactive-hover cursor-pointer rounded-ds-md p-1 transition-colors"
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
                    {integrationsLoading ? (
                      <PlaygroundShopifyActionsSkeleton rows={4} />
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
              <p className={onboardingType.hint}>
                Custom Prompt unlocks manual system prompt editing.
              </p>
            </div>

            {agentType === "custom" ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <label className={cn(onboardingType.label, "text-ds-on-surface-variant mb-0 text-[11px] uppercase tracking-[0.14em]")}>
                    System prompt
                  </label>
                  <button
                    type="button"
                    className="text-ds-on-surface-variant hover:text-ds-interactive-hover inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-ds-md py-1 text-[11px] font-semibold tracking-wide uppercase transition-colors disabled:pointer-events-none disabled:opacity-40"
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
            ) : null}

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
                  className="bg-ds-primary text-ds-on-primary hover:bg-ds-primary-hover inline-flex shrink-0 cursor-pointer items-center justify-center rounded-ds-md px-4 py-2.5 text-xs font-semibold tracking-wide uppercase transition-colors active:scale-[0.98] disabled:pointer-events-none disabled:opacity-45"
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
              toneDescriptionRaw={
                typeof selectedAgent?.behavior_settings?.tone_description === "string"
                  ? selectedAgent.behavior_settings.tone_description
                  : null
              }
              greetingMessageRaw={
                typeof selectedAgent?.behavior_settings?.greeting_message === "string"
                  ? selectedAgent.behavior_settings.greeting_message
                  : null
              }
              languageRaw={
                typeof selectedAgent?.behavior_settings?.language === "string"
                  ? selectedAgent.behavior_settings.language
                  : null
              }
              model={model}
              agentType={agentType}
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

function IconTune({ className }: { className?: string }) {
  return <Settings2 className={className} strokeWidth={1.8} aria-hidden />;
}

function IconInfo({ className }: { className?: string }) {
  return <Info className={className} strokeWidth={1.8} aria-hidden />;
}

function IconBag({ className }: { className?: string }) {
  return <ShoppingBag className={className} strokeWidth={1.8} aria-hidden />;
}

function IconChevron({ className }: { className?: string }) {
  return <ChevronRight className={className} strokeWidth={1.8} aria-hidden />;
}

function IconPersonPin({ className }: { className?: string }) {
  return <UserRound className={className} strokeWidth={1.8} aria-hidden />;
}

function IconHistory({ className }: { className?: string }) {
  return <History className={className} strokeWidth={1.8} aria-hidden />;
}

function IconBot({ className }: { className?: string }) {
  return <Bot className={className} strokeWidth={1.8} aria-hidden />;
}

function IconListChats({ className }: { className?: string }) {
  return <List className={className} strokeWidth={1.8} aria-hidden />;
}

function IconRefresh({ className }: { className?: string }) {
  return <RefreshCw className={className} strokeWidth={1.8} aria-hidden />;
}

function IconSend({ className }: { className?: string }) {
  return <Send className={className} strokeWidth={1.8} aria-hidden />;
}
