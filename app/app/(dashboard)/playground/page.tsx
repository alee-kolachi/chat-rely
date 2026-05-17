"use client";

import Link from "next/link";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  ChevronRight,
  History,
  List,
  RefreshCw,
  Send,
  Settings2,
  ShoppingBag,
  ThumbsDown,
  ThumbsUp,
  UserRound,
} from "lucide-react";
import {
  StreamingAssistantMessage,
  type AssistantStreamPhase,
} from "@/components/chat/StreamingAssistantMessage";
import { chatSseStream } from "@/lib/chat-sse";
import { applyChatSseEvent } from "@/lib/chat-stream-handlers";
import { useDashboardAgent } from "@/components/layout/dashboard-agent-context";
import { useMeContext } from "@/components/layout/me-context-provider";
import { useSetDashboardTopbarExtras } from "@/components/layout/dashboard-topbar-extras-context";
import { useAgentIntegrationsBootstrap } from "@/components/integrations/use-agent-integrations-bootstrap";
import { onboardingType } from "@/components/onboarding/onboarding-ui";
import {
  PlaygroundHistoryListSkeleton,
  PlaygroundSettingsColumnSkeleton,
  PlaygroundShopifyActionsSkeleton,
} from "@/components/playground/playground-page-skeleton";
import { DashboardSelectAgentEmptyState } from "@/components/dashboard/dashboard-page-skeleton";
import { BackendApiError, backendFetch } from "@/lib/backend-api";
import { isRenderableTranscriptMessage } from "@/lib/conversation-transcript";
import { brandChromeClasses, parseBrandColorHex, previewAssistantLineForTone } from "@/lib/brand-chrome";
import { PoweredByChatRely } from "@/components/branding/powered-by-chatrely";
import { messageFeedbackEnabledForPlanSlug, planHidesPoweredByChatrely } from "@/lib/widget-branding";
import { InfoHint } from "@/components/ui/info-hint";
import { cn } from "@/lib/utils";
import { WidgetBrandAvatar } from "@/components/chat/widget-brand-avatar";

const PLAYGROUND_CREATIVITY_HINT =
  "How varied replies are. Conservative stays close to your knowledge; Creative allows more flexible wording.";

/** Uses global `.ds-app-field` (design-system tokens + focus ring). */
const fieldControlClass = cn("ds-app-field");

const PLAYGROUND_COMPOSER_MAX_LINES = 3;

/** Grow/shrink playground composer between 1 and 3 lines, then scroll. */
function resizePlaygroundComposer(textarea: HTMLTextAreaElement) {
  const style = getComputedStyle(textarea);
  const lineHeight = Number.parseFloat(style.lineHeight) || 22;
  const padY = Number.parseFloat(style.paddingTop) + Number.parseFloat(style.paddingBottom);
  const borderY = Number.parseFloat(style.borderTopWidth) + Number.parseFloat(style.borderBottomWidth);
  const oneLineHeight = lineHeight + padY + borderY;
  const maxHeight = lineHeight * PLAYGROUND_COMPOSER_MAX_LINES + padY + borderY;

  textarea.style.height = "0px";
  const contentHeight = textarea.scrollHeight;
  const nextHeight = Math.min(Math.max(contentHeight, oneLineHeight), maxHeight);
  textarea.style.height = `${nextHeight}px`;
  textarea.style.overflowY = contentHeight > maxHeight ? "auto" : "hidden";
}

const playgroundComposerClass = cn(fieldControlClass, "playground-composer-input min-w-0 flex-1");

/** Matches agent-settings form labels (not uppercase kickers). */
const settingsFieldLabelClass = "ds-app-label mb-1.5 block";
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
  assistantMessageId?: string | null;
  feedbackVote?: 1 | -1 | null;
  streamPhase?: AssistantStreamPhase;
  errorMessage?: string | null;
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

function isStalePlaygroundConversationError(e: unknown): boolean {
  return (
    e instanceof BackendApiError &&
    (e.code === "conversation.not_found" || e.code === "conversation.forbidden")
  );
}

/** Do not replace local transcript when the server poll is behind the optimistic UI. */
function shouldApplyServerPlaygroundTranscript(
  local: PlaygroundPreviewMessage[],
  server: PlaygroundPreviewMessage[]
): boolean {
  return server.length >= local.length;
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

/** Map API transcript row to playground state; keep assistant `id` for thumbs / feedback. */
function mapApiMessageToPlaygroundPreview(m: {
  role: string;
  content?: string | null;
  id?: string;
  tool_call_payload?: unknown;
}): PlaygroundPreviewMessage | null {
  if (!isRenderableTranscriptMessage(m)) return null;
  const from = m.role as "user" | "assistant";
  const row: PlaygroundPreviewMessage = {
    from,
    text: m.content ?? "",
  };
  if (from === "assistant" && m.id != null && String(m.id).length > 0) {
    row.assistantMessageId = String(m.id);
  }
  return row;
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
  agentType,
  systemPrompt,
  creativity,
  saveError,
  websiteLogoUrl,
  websiteLogoPending,
}: {
  agentId: string | null;
  agentName: string | null;
  brandColorHex: string | null;
  toneRaw: string | null;
  toneDescriptionRaw: string | null;
  greetingMessageRaw: string | null;
  languageRaw: string | null;
  agentType: string;
  systemPrompt: string;
  creativity: number;
  saveError: string | null;
  websiteLogoUrl: string | null;
  websiteLogoPending: boolean;
}) {
  const messagesScrollRef = useRef<HTMLDivElement>(null);
  const messageInputRef = useRef<HTMLTextAreaElement>(null);
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
  const chatAbortRef = useRef<AbortController | null>(null);
  const blockThreadSyncRef = useRef(false);
  const threadCacheRef = useRef<Record<string, PlaygroundThreadCacheEntry>>({});
  const threadRequestsRef = useRef(new Map<string, Promise<PlaygroundThreadCacheEntry>>());
  /** When false, transcript updates (polling) must not yank scroll position. */
  const stickToBottomRef = useRef(true);
  /** Last vote successfully synced per assistant message (undefined = not yet synced this session). */
  const feedbackAckedRef = useRef<Map<string, 1 | -1 | null>>(new Map());
  const feedbackDesiredRef = useRef<Map<string, 1 | -1 | null>>(new Map());
  const feedbackDebounceRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  useLayoutEffect(() => {
    blockThreadSyncRef.current = isSending || historyThreadLoading;
  }, [isSending, historyThreadLoading]);

  useEffect(() => {
    return () => {
      chatAbortRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    chatAbortRef.current?.abort();
    chatAbortRef.current = null;
  }, [agentId]);

  const clearFeedbackSyncState = useCallback(() => {
    for (const t of feedbackDebounceRef.current.values()) clearTimeout(t);
    feedbackDebounceRef.current.clear();
    feedbackAckedRef.current.clear();
    feedbackDesiredRef.current.clear();
  }, []);

  useEffect(() => {
    return () => {
      for (const t of feedbackDebounceRef.current.values()) clearTimeout(t);
      feedbackDebounceRef.current.clear();
    };
  }, []);

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
        messages: Array<{ id?: string; role: string; content: string; tool_call_payload?: unknown }>;
      }>(`/api/v1/conversations/${encodeURIComponent(threadId)}`);
      const mapped: PlaygroundPreviewMessage[] = [];
      for (const m of data.messages) {
        const row = mapApiMessageToPlaygroundPreview(m);
        if (row) mapped.push(row);
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
      clearFeedbackSyncState();
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
  }, [agentId, cacheThread, clearFeedbackSyncState]);

  useEffect(() => {
    if (!conversationId) return;
    cacheThread(conversationId, { visitorId, messages: previewMessages });
  }, [conversationId, visitorId, previewMessages, cacheThread]);

  useEffect(() => {
    if (!agentId || !conversationId) return;
    const aid = agentId;
    const cid = conversationId;
    let cancelled = false;
    void backendFetch(`/api/v1/conversations/${encodeURIComponent(cid)}`).catch((e) => {
      if (cancelled || !isStalePlaygroundConversationError(e)) return;
      setConversationId(null);
      writePlaygroundChatToStorage(aid, previewMessages, null, visitorId);
    });
    return () => {
      cancelled = true;
    };
  }, [agentId, conversationId, previewMessages, visitorId]);

  useEffect(() => {
    if (!agentId || !conversationId) return;
    const aid = agentId;
    const cid = conversationId;
    let cancelled = false;
    async function syncFromServer() {
      if (blockThreadSyncRef.current) return;
      try {
        const data = await backendFetch<{
          messages: Array<{ id?: string; role: string; content: string; tool_call_payload?: unknown }>;
        }>(`/api/v1/conversations/${encodeURIComponent(cid)}`);
        if (cancelled) return;
        // A poll that started before this render can resolve after the user sends a message.
        // Applying it would wipe optimistic rows until the next poll (messages "vanish").
        if (blockThreadSyncRef.current) return;
        const mapped: PlaygroundPreviewMessage[] = [];
        for (const m of data.messages) {
          const row = mapApiMessageToPlaygroundPreview(m);
          if (row) mapped.push(row);
        }
        setPreviewMessages((current) => {
          if (!shouldApplyServerPlaygroundTranscript(current, mapped)) {
            return current;
          }
          cacheThread(cid, { visitorId, messages: mapped });
          return mapped;
        });
      } catch (e) {
        if (isStalePlaygroundConversationError(e)) {
          setConversationId(null);
          writePlaygroundChatToStorage(aid, previewMessages, null, visitorId);
        }
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

  async function streamPlaygroundReply(
    userMessage: string,
    thread: { conversationId: string | null; visitorId: string },
    ac: AbortController
  ) {
    for await (const ev of chatSseStream("/api/chat/stream", {
      method: "POST",
      signal: ac.signal,
      body: JSON.stringify({
        agent_id: agentId,
        message: userMessage,
        conversation_id: thread.conversationId,
        agent_type_override: agentType,
        system_prompt_override: agentType === "custom" ? systemPrompt : null,
        creativity_override: creativity,
        visitor_id: thread.visitorId,
      }),
    })) {
      if (ac.signal.aborted) break;
      if (ev.type === "done" && ev.conversation_id) {
        setConversationId(ev.conversation_id);
      }
      setPreviewMessages((prev) => {
        if (prev.length === 0) return prev;
        const last = prev[prev.length - 1];
        if (last.from !== "assistant") return prev;
        const patch = applyChatSseEvent(ev, {
          text: last.text,
          streamPhase: last.streamPhase ?? "thinking",
        });
        if (!patch) return prev;
        const next = [...prev];
        next[next.length - 1] = {
          ...last,
          ...patch,
          from: "assistant",
          ...(patch.assistantMessageId
            ? { assistantMessageId: patch.assistantMessageId }
            : {}),
        };
        return next;
      });
      if (ev.type === "error") {
        throw new BackendApiError(ev.message ?? "Chat failed", 0, ev.code, ev.details);
      }
    }
  }

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
    chatAbortRef.current?.abort();
    const ac = new AbortController();
    chatAbortRef.current = ac;
    setPreviewMessages((prev) => [
      ...prev,
      {
        from: "assistant",
        text: "",
        streamPhase: "thinking",
      },
    ]);
    let thread = { conversationId, visitorId };
    try {
      try {
        await streamPlaygroundReply(userMessage, thread, ac);
      } catch (e) {
        if (ac.signal.aborted) return;
        if (!isStalePlaygroundConversationError(e)) throw e;
        const freshVisitorId = newPlaygroundVisitorId();
        thread = { conversationId: null, visitorId: freshVisitorId };
        setConversationId(null);
        setVisitorId(freshVisitorId);
        setPreviewMessages((prev) => {
          const next = [...prev];
          if (next[next.length - 1]?.from === "assistant") {
            next[next.length - 1] = { from: "assistant", text: "", streamPhase: "thinking" };
          }
          return next;
        });
        await streamPlaygroundReply(userMessage, thread, ac);
      }
    } catch (e) {
      if (ac.signal.aborted) return;
      const errMsg = e instanceof Error ? e.message : "Failed to send message";
      setChatError(errMsg);
      setPreviewMessages((prev) => {
        if (prev.length === 0) return prev;
        const last = prev[prev.length - 1];
        if (last?.from !== "assistant") return prev;
        const next = [...prev];
        next[next.length - 1] = {
          ...last,
          streamPhase: "error",
          errorMessage: errMsg,
        };
        return next;
      });
    } finally {
      if (chatAbortRef.current === ac) chatAbortRef.current = null;
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

  const { data: meData, loading: meLoading } = useMeContext();
  const hidePoweredByPlan = useMemo(
    () => !meLoading && planHidesPoweredByChatrely(meData?.plan.slug),
    [meLoading, meData?.plan.slug]
  );
  const messageFeedbackEnabled = useMemo(
    () => messageFeedbackEnabledForPlanSlug(meData?.plan.slug),
    [meData?.plan.slug]
  );

  const submitPlaygroundFeedback = useCallback(
    (messageId: string, clicked: 1 | -1) => {
      if (!agentId) return;
      let found = false;
      setPreviewMessages((prev) => {
        const i = prev.findIndex((m) => m.assistantMessageId === messageId);
        if (i === -1) return prev;
        found = true;
        const cur = prev[i].feedbackVote ?? null;
        const remove = cur === clicked;
        const nextVote = remove ? null : clicked;
        feedbackDesiredRef.current.set(messageId, nextVote);
        return prev.map((m, j) => (j === i ? { ...m, feedbackVote: nextVote } : m));
      });
      if (!found) return;

      const existing = feedbackDebounceRef.current.get(messageId);
      if (existing) clearTimeout(existing);
      const t = setTimeout(() => {
        feedbackDebounceRef.current.delete(messageId);
        void (async () => {
          const aid = agentId;
          const vid = visitorId;
          if (!aid) return;
          while (true) {
            const desired = feedbackDesiredRef.current.get(messageId) ?? null;
            const hasAcked = feedbackAckedRef.current.has(messageId);
            const ackedVal = hasAcked ? feedbackAckedRef.current.get(messageId)! : undefined;
            if (!hasAcked) {
              if (desired === null) return;
            } else if (desired === ackedVal) {
              return;
            }

            const snap = desired;
            try {
              if (desired === null) {
                await backendFetch(`/api/v1/agents/${encodeURIComponent(aid)}/message-feedback`, {
                  method: "POST",
                  body: JSON.stringify({
                    message_id: messageId,
                    remove: true,
                    visitor_id: vid,
                  }),
                });
              } else {
                await backendFetch(`/api/v1/agents/${encodeURIComponent(aid)}/message-feedback`, {
                  method: "POST",
                  body: JSON.stringify({
                    message_id: messageId,
                    value: desired,
                    visitor_id: vid,
                  }),
                });
              }
              feedbackAckedRef.current.set(messageId, desired);
            } catch {
              const rollHas = feedbackAckedRef.current.has(messageId);
              const roll = rollHas ? feedbackAckedRef.current.get(messageId)! : null;
              if ((feedbackDesiredRef.current.get(messageId) ?? null) === snap) {
                feedbackDesiredRef.current.set(messageId, roll);
                setPreviewMessages((prev) =>
                  prev.map((m) =>
                    m.assistantMessageId === messageId ? { ...m, feedbackVote: roll } : m
                  )
                );
              }
              return;
            }
          }
        })();
      }, 450);
      feedbackDebounceRef.current.set(messageId, t);
    },
    [agentId, visitorId]
  );

  const hasBrand = Boolean(brandColorHex);

  useLayoutEffect(() => {
    const el = messageInputRef.current;
    if (!el) return;
    resizePlaygroundComposer(el);
  }, [messageInput]);
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
          <WidgetBrandAvatar
            logoUrl={websiteLogoUrl}
            logoPending={websiteLogoPending}
            hasBrand={hasBrand}
            chrome={chrome}
            size="header"
          />
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
            title="Reset preview and start a new thread"
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
                "ds-app-body-muted hover:text-ds-on-surface hover:bg-ds-outline/40 -mx-1 mb-4 flex w-fit cursor-pointer items-center gap-2 rounded-ds-md px-2 py-1.5 font-semibold tracking-wide uppercase transition-colors",
                historyThreadLoading && "pointer-events-none opacity-45"
              )}
              onClick={() => setHistoryOpen(false)}
            >
              <IconChevron className="size-4 rotate-180" aria-hidden />
              Back to chat
            </button>
            <div className="mb-5 border-b border-ds-outline pb-4">
              <h4 className="text-ds-on-surface text-sm font-semibold tracking-tight">Conversations</h4>
              <p className="ds-app-body-muted mt-1">
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
                          <span className="ds-app-caption text-ds-on-surface font-mono font-semibold tracking-tight">
                            {row.id.slice(0, 8)}…
                          </span>
                          <span className="ds-app-caption shrink-0 tabular-nums">{when}</span>
                        </div>
                        <p className="ds-app-body-muted mt-2 line-clamp-2">
                          {row.latest_message_preview?.trim() ? row.latest_message_preview : "No messages yet"}
                        </p>
                        {isActive ? (
                          <p className="ds-app-kicker text-ds-primary mt-2 font-semibold">
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
                  <p className={cn(onboardingType.hint, "ds-app-body-muted")}>
                    {toneDescription ? `Tone guidance: ${toneDescription}` : null}
                    {toneDescription && languageLabel ? " \u00b7 " : null}
                    {languageLabel ? `Reply language: ${languageLabel}` : null}
                  </p>
                ) : null}
              </div>
            ) : null}
            {previewMessages.map((msg, index) => {
              const isLastAssistant =
                msg.from === "assistant" && index === previewMessages.length - 1;
              const phase: AssistantStreamPhase =
                msg.streamPhase ??
                (isLastAssistant && isSending
                  ? "thinking"
                  : msg.text.trim()
                    ? "done"
                    : "thinking");
              return (
                <div key={`${msg.from}-${index}`} className={`flex ${msg.from === "user" ? "justify-end" : "justify-start"}`}>
                  {msg.from === "assistant" ? (
                    <div className="flex max-w-[90%] gap-3">
                      <WidgetBrandAvatar
                        logoUrl={websiteLogoUrl}
                        logoPending={websiteLogoPending}
                        hasBrand={hasBrand}
                        chrome={chrome}
                        size="bubble"
                      />
                      <div className="flex min-w-0 flex-1 flex-col gap-1">
                        <div className="border-ds-outline text-ds-on-surface rounded-2xl rounded-tl-none border bg-white px-4 py-3 text-sm shadow-sm sm:px-5">
                          <StreamingAssistantMessage
                            text={msg.text}
                            phase={phase}
                            errorMessage={msg.errorMessage}
                            brandColorHex={brandColorHex}
                          />
                        </div>
                        {messageFeedbackEnabled &&
                        msg.assistantMessageId &&
                        phase === "done" &&
                        msg.text.trim() ? (
                          <div className="flex items-center gap-0.5 pl-0.5">
                            {(msg.feedbackVote ?? null) !== -1 ? (
                              <button
                                type="button"
                                className="text-ds-on-surface-variant hover:text-ds-on-surface hover:bg-ds-sidebar/80 inline-flex size-7 items-center justify-center rounded-md transition-colors"
                                aria-label="Good response"
                                onClick={() => submitPlaygroundFeedback(msg.assistantMessageId!, 1)}
                              >
                                <ThumbsUp className="size-3" strokeWidth={2} />
                              </button>
                            ) : null}
                            {(msg.feedbackVote ?? null) !== 1 ? (
                              <button
                                type="button"
                                className="text-ds-on-surface-variant hover:text-ds-on-surface hover:bg-ds-sidebar/80 inline-flex size-7 items-center justify-center rounded-md transition-colors"
                                aria-label="Bad response"
                                onClick={() => submitPlaygroundFeedback(msg.assistantMessageId!, -1)}
                              >
                                <ThumbsDown className="size-3" strokeWidth={2} />
                              </button>
                            ) : null}
                          </div>
                        ) : null}
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
            <p className="ds-app-body-muted text-center">
              Choose a conversation above to load it, or use <span className="font-semibold">Back to chat</span>.
            </p>
            {footerError ? (
              <p className="text-rose-600 mt-3 text-center text-sm">{footerError}</p>
            ) : null}
          </>
        ) : (
          <div className="flex flex-col gap-2">
            <div className="flex items-end gap-2 sm:gap-3">
              <textarea
                ref={messageInputRef}
                rows={1}
                className={playgroundComposerClass}
                placeholder={languageLabel ? `Test your agent (${languageLabel})…` : "Test your agent…"}
                value={messageInput}
                onChange={(e) => {
                  setMessageInput(e.target.value);
                  resizePlaygroundComposer(e.target);
                }}
                onKeyDown={(e) => {
                  if (e.key !== "Enter" || e.shiftKey || e.nativeEvent.isComposing) return;
                  e.preventDefault();
                  void handleSendMessage();
                }}
              />
              <button
                type="button"
                className={cn(
                  "mb-0.5 cursor-pointer shrink-0 rounded-ds-md p-3 transition-colors active:scale-[0.98] disabled:pointer-events-none disabled:opacity-40",
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
            {!hidePoweredByPlan ? (
              <PoweredByChatRely compact className="bg-transparent px-0 py-0.5" />
            ) : null}
            {footerError ? <p className="text-rose-600 text-sm">{footerError}</p> : null}
          </div>
        )}
      </div>
    </div>
  );
}

type PlaygroundFormBaseline = {
  systemPrompt: string;
  creativity: number;
  agentType: string;
};

export default function PlaygroundPage() {
  const [mobileTab, setMobileTab] = useState<"settings" | "preview">("settings");
  const { agents, selectedAgentId, selectedAgent, refreshAgents, setSelectedAgentId, agentsLoading } =
    useDashboardAgent();
  const appliedUrlAgentRef = useRef(false);

  /** One-time: onboarding / pricing flow links with ?agentId= so the right agent is selected. */
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
  } = useAgentIntegrationsBootstrap(selectedAgentId || undefined);
  const shopifyConnected = Boolean(shopifyConnection?.connected);
  const setTopbarExtras = useSetDashboardTopbarExtras();
  const [systemPrompt, setSystemPrompt] = useState("");
  const [creativity, setCreativity] = useState<number>(0.5);
  const [agentType, setAgentType] = useState<string>("brand_support");
  const [baseline, setBaseline] = useState<PlaygroundFormBaseline | null>(null);
  const [actionDraft, setActionDraft] = useState<Record<string, boolean>>({});
  const [actionBaseline, setActionBaseline] = useState<Record<string, boolean> | null>(null);
  const [shopifyActionsOpen, setShopifyActionsOpen] = useState(true);
  const [saveError, setSaveError] = useState<{ agentId: string; message: string } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const websiteLogoPending = Boolean(selectedAgentId && integrationsLoading);
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
    const sp = match.system_prompt || "";
    queueMicrotask(() => {
      setSystemPrompt(sp);
      setCreativity(cr);
      setAgentType(at);
      setBaseline({ systemPrompt: sp, creativity: cr, agentType: at });
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

  const availableShopifyActions = useMemo(
    () => shopifyCatalogEntries.filter((e) => e.status === "live" && e.scopes_satisfied),
    [shopifyCatalogEntries]
  );

  const humanEscalationLive = humanEscalationEntry?.status === "live";

  const formFieldsDirty = Boolean(
    baseline &&
      selectedAgentId &&
      (systemPrompt !== baseline.systemPrompt ||
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
        system_prompt: string;
        behavior_settings: Record<string, unknown>;
      }>(`/api/v1/agents/${selectedAgentId}`, {
        method: "PATCH",
        body: JSON.stringify({ system_prompt: systemPrompt, behavior_settings }),
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
      setSystemPrompt(updated.system_prompt);
      setCreativity(cr);
      setAgentType(at);
      setBaseline({
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
              <span className="ds-app-kicker font-semibold">
                Unsaved
              </span>
            </div>
            <button
              type="button"
              className="bg-ds-primary text-ds-on-primary hover:bg-ds-primary-hover cursor-pointer inline-flex items-center justify-center rounded-ds-md px-4 py-2.5 text-sm font-semibold tracking-wide uppercase transition-colors active:scale-[0.98] disabled:pointer-events-none disabled:opacity-45"
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
    <div className="onboarding-main-surface -mx-6 -mt-6 flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="border-ds-outline bg-ds-sidebar/80 flex shrink-0 items-center gap-2 border-b p-2.5 xl:hidden">
        <button
          type="button"
          onClick={() => setMobileTab("settings")}
          className={cn(
            "cursor-pointer rounded-ds-md px-3 py-2 text-sm font-semibold transition-colors",
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
            "cursor-pointer rounded-ds-md px-3 py-2 text-sm font-semibold transition-colors",
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
            <h2 className="ds-app-card-title flex items-center gap-2">
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

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <label className={cn(settingsFieldLabelClass, "mb-0")}>
                  Creativity
                </label>
                <InfoHint text={PLAYGROUND_CREATIVITY_HINT} labelFor="Creativity" className="ml-0" />
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
              <div className="ds-app-kicker flex justify-between font-medium">
                <span>Conservative</span>
                <span className="text-ds-on-surface font-semibold">{creativityBandLabel(creativity)}</span>
                <span>Creative</span>
              </div>
            </div>

            <div className="space-y-4">
              <label className={settingsFieldLabelClass}>
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
                    <span className="ds-app-card-title">Shopify actions</span>
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
                        <p className={cn(onboardingType.hint)}>
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
                    ) : availableShopifyActions.length === 0 ? (
                      <p className="text-ds-on-surface-variant text-sm">
                        No Shopify tools are available with your current store connection.
                      </p>
                    ) : (
                      <div className="space-y-4">
                        {availableShopifyActions.map((e) => (
                          <div key={e.action_key} className="flex items-center justify-between">
                            <div>
                              <p className="text-ds-on-surface text-sm font-medium">{e.label}</p>
                              <p className={cn(onboardingType.hint, "mt-0.5")}>{e.description}</p>
                            </div>
                            <ToggleSwitch
                              checked={Boolean(actionDraft[e.action_key])}
                              onCheckedChange={(next) =>
                                setActionDraft((prev) => ({ ...prev, [e.action_key]: next }))
                              }
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : null}
              </div>

              {humanEscalationLive ? (
                <div className="border-ds-outline flex items-center justify-between rounded-ds-lg border bg-ds-surface p-4 shadow-sm">
                  <div className="flex items-center gap-3">
                    <IconPersonPin className="text-ds-primary size-4 shrink-0" aria-hidden />
                    <span className="ds-app-card-title">Escalate to human</span>
                  </div>
                  <ToggleSwitch
                    checked={Boolean(actionDraft["human.escalate"])}
                    onCheckedChange={(next) =>
                      setActionDraft((prev) => ({ ...prev, "human.escalate": next }))
                    }
                  />
                </div>
              ) : humanEscalationEntry?.status === "blocked_by_plan" ? (
                <p className={cn(onboardingType.hint, "text-ds-on-surface-variant")}>
                  Human escalation requires a paid plan with actions.{" "}
                  <Link href="/account/plan" className="text-ds-primary font-semibold hover:underline">
                    Upgrade plan
                  </Link>
                </p>
              ) : null}
            </div>

            <div className="space-y-2">
              <label className={settingsFieldLabelClass}>
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
            </div>

            <div
              className={cn(
                "space-y-2",
                agentType !== "custom" && "opacity-55"
              )}
            >
              <div className="flex items-center justify-between gap-3">
                <label className={cn(settingsFieldLabelClass, "mb-0")}>System prompt</label>
                {agentType === "custom" ? (
                  <button
                    type="button"
                    className="text-ds-on-surface-variant hover:text-ds-interactive-hover ds-app-kicker inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-ds-md py-1 font-semibold transition-colors disabled:pointer-events-none disabled:opacity-40"
                    disabled={!baseline || systemPrompt === baseline.systemPrompt}
                    onClick={() => baseline && setSystemPrompt(baseline.systemPrompt)}
                  >
                    <IconHistory className="size-3.5" aria-hidden />
                    Reset
                  </button>
                ) : null}
              </div>
              <textarea
                className={cn(fieldControlClass, "leading-relaxed")}
                value={systemPrompt}
                disabled={agentType !== "custom"}
                placeholder={
                  agentType === "custom"
                    ? "Instructions for this agent…"
                    : "Select Custom Prompt above to edit."
                }
                onChange={(e) => setSystemPrompt(e.target.value)}
              />
            </div>

            {isDirty ? (
              <div className="border-ds-outline bg-ds-surface/95 sticky bottom-0 -mx-5 flex shrink-0 items-center justify-between gap-3 border-t p-4 backdrop-blur-sm sm:-mx-8 lg:hidden">
                <div className="flex min-w-0 items-center gap-2">
                  <span className="size-2 shrink-0 animate-pulse rounded-full bg-amber-500" />
                  <span className="ds-app-kicker truncate font-semibold">
                    Unsaved
                  </span>
                </div>
                <button
                  type="button"
                  className="bg-ds-primary text-ds-on-primary hover:bg-ds-primary-hover inline-flex shrink-0 cursor-pointer items-center justify-center rounded-ds-md px-4 py-2.5 text-sm font-semibold tracking-wide uppercase transition-colors active:scale-[0.98] disabled:pointer-events-none disabled:opacity-45"
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
            "xl:items-center xl:justify-start xl:self-start xl:min-h-0 xl:p-12 xl:pt-10 xl:pb-12",
            mobileTab === "preview" ? "" : "hidden xl:flex"
          )}
        >
          <div className="flex min-h-0 w-full max-w-full flex-1 flex-col items-center justify-start overflow-hidden xl:flex-none xl:h-auto">
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
              agentType={agentType}
              systemPrompt={systemPrompt}
              creativity={creativity}
              saveError={saveError?.agentId === selectedAgentId ? saveError.message : null}
              websiteLogoUrl={websiteLogoUrl}
              websiteLogoPending={websiteLogoPending}
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

function IconListChats({ className }: { className?: string }) {
  return <List className={className} strokeWidth={1.8} aria-hidden />;
}

function IconRefresh({ className }: { className?: string }) {
  return <RefreshCw className={className} strokeWidth={1.8} aria-hidden />;
}

function IconSend({ className }: { className?: string }) {
  return <Send className={className} strokeWidth={1.8} aria-hidden />;
}
