"use client";

import Link from "next/link";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";
import {
  ChevronRight,
  History,
  List,
  RefreshCw,
  Send,
  Settings2,
  ShoppingBag,
  UserRound,
} from "lucide-react";
import { MessageFeedbackButtons } from "@/components/chat/message-feedback-buttons";
import {
  StreamingAssistantMessage,
  type AssistantStreamPhase,
} from "@/components/chat/StreamingAssistantMessage";
import { chatSseStream } from "@/lib/chat-sse";
import { applyChatSseEvent, chatStreamTerminalEvent } from "@/lib/chat-stream-handlers";
import {
  productActionUserMessage,
  type ProductActionRequest,
  type ProductCard,
  type ProductDetail,
} from "@/lib/product-card";
import { useDashboardAgent } from "@/components/layout/dashboard-agent-context";
import { useMeContext } from "@/components/layout/me-context-provider";
import { ActionToggle } from "@/components/actions/action-toggle";
import { UnsavedChangesActionBar } from "@/components/ui/unsaved-changes-action-bar";
import { useAgentIntegrationsBootstrap } from "@/components/integrations/use-agent-integrations-bootstrap";
import { onboardingType } from "@/components/onboarding/onboarding-ui";
import {
  PlaygroundHistoryListSkeleton,
  PlaygroundSettingsColumnSkeleton,
  PlaygroundShopifyActionsSkeleton,
} from "@/components/playground/playground-page-skeleton";
import { DashboardSelectAgentEmptyState } from "@/components/dashboard/dashboard-page-skeleton";
import { BackendApiError, backendFetch, consumeBackendSseJson } from "@/lib/backend-api";
import { isRenderableTranscriptMessage, parseMessageProductMetadata } from "@/lib/conversation-transcript";
import { brandChromeClasses, parseBrandColorHex } from "@/lib/brand-chrome";
import { effectiveWelcomeMessage } from "@/lib/agent-settings";
import { PoweredByChatRely } from "@/components/branding/powered-by-chatrely";
import { messageFeedbackEnabledForPlanSlug, planHidesPoweredByChatrely } from "@/lib/widget-branding";
import { getWidgetPreviewContext } from "@/lib/widget-appearance";
import { InfoHint } from "@/components/ui/info-hint";
import { AppSegmentGroup, AppSegmentOption } from "@/components/ui/app-segment-group";
import { IsoGridPanelBackground } from "@/components/marketing/iso-grid-panel-background";
import {
  CREATIVITY_BANDS,
  normalizeCreativity,
  type CreativityLevel,
} from "@/lib/agent-settings";
import { useActionDrafts } from "@/hooks/use-action-drafts";
import { unsavedChangesMessage } from "@/lib/action-draft-utils";
import { appButtonClassName } from "@/lib/button-styles";
import { cn } from "@/lib/utils";
import { EscalatedChatNotice } from "@/components/chat/escalated-chat-notice";
import { VisitorContactForm } from "@/components/chat/visitor-contact-form";
import { MessageTimestamp, UserBubbleBody } from "@/components/chat/message-timestamp";
import { WidgetBrandAvatar } from "@/components/chat/widget-brand-avatar";
import { WidgetWelcomeMessageRow } from "@/components/chat/widget-chat-shell";
import {
  PlaygroundComposer,
  resizePlaygroundComposer,
} from "@/components/chat/playground-composer";
import {
  isAiChatDisabledStatus,
  readConversationStatus,
} from "@/lib/escalated-conversation";
import { readContactCaptureRequired } from "@/lib/visitor-contact";
import { messageCreatedAtIso } from "@/lib/format-locale-datetime";

const PLAYGROUND_CREATIVITY_HINT =
  "Conservative stays close to your knowledge; Creative allows more flexible wording.";

const PLAYGROUND_CREATIVITY_DESCRIPTION =
  "How varied replies are in preview. Save to apply on your live widget.";

const PLAYGROUND_ACTIONS_DESCRIPTION =
  "Turn Shopify tools and human handoff on or off for this agent.";

const PLAYGROUND_AGENT_DESCRIPTION =
  "Choose a preset voice or write custom instructions for how the agent responds.";

const PLAYGROUND_SYSTEM_PROMPT_PLACEHOLDER = `e.g. Mention our 30-day return policy on order questions.
Keep replies to 2–3 short sentences.
Never guess stock or prices—search the catalog first.`;

const PLAYGROUND_AGENT_TYPE_HINT =
  "Brand Support: on-brand shop answers, warm and direct. General AI: flexible helper for any question. Customer Support: resolves issues step by step with a calm tone. Custom: you write the full system prompt.";

/** Uses global `.ds-app-field` (design-system tokens + focus ring). */
const fieldControlClass = cn("ds-app-field");

const playgroundSettingsCardClass =
  "border-ds-outline rounded-ds-xl border bg-ds-surface p-5 shadow-sm sm:p-6";

const playgroundSettingsCardHeaderClass = "mb-4";

const playgroundSettingsCardTitleClass = "text-ds-on-surface text-base font-semibold";

const playgroundSettingsFieldLabelClass = "text-ds-on-surface text-sm font-semibold";

const playgroundSettingsCardDescriptionClass =
  "text-ds-on-surface-variant mt-1.5 text-sm leading-relaxed";

const fieldControlPointerClass = cn(fieldControlClass, "cursor-pointer");

type PlaygroundPreviewMessage = {
  from: "user" | "assistant";
  text: string;
  createdAt?: string;
  assistantMessageId?: string | null;
  feedbackVote?: 1 | -1 | null;
  streamPhase?: AssistantStreamPhase;
  errorMessage?: string | null;
  statusLine?: string | null;
  products?: ProductCard[] | null;
  productDetail?: ProductDetail | null;
};

type PlaygroundThreadCacheEntry = {
  visitorId: string;
  messages: PlaygroundPreviewMessage[];
  status?: string;
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

/** Fallback when operator-thread SSE fails (escalated / operator-engaged threads only). */
const PLAYGROUND_OPERATOR_SYNC_FALLBACK_MS = 30_000;

type PlaygroundConversationDetailPayload = {
  conversation: { status?: string; metadata?: Record<string, unknown> };
  messages: Array<{
    id?: string;
    role: string;
    content: string;
    created_at?: string;
    tool_call_payload?: unknown;
  }>;
};

function playgroundNeedsOperatorThreadSync(
  status: string,
  metadata: Record<string, unknown> | undefined
): boolean {
  return isAiChatDisabledStatus(status) || metadata?.operator_engaged === true;
}

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

/** Keep optimistic thumbs votes when the thread poll refreshes from the API. */
function mergePlaygroundTranscriptFromServer(
  local: PlaygroundPreviewMessage[],
  server: PlaygroundPreviewMessage[]
): PlaygroundPreviewMessage[] {
  const voteByMessageId = new Map<string, 1 | -1>();
  for (const m of local) {
    if (m.from === "assistant" && m.assistantMessageId && (m.feedbackVote === 1 || m.feedbackVote === -1)) {
      voteByMessageId.set(m.assistantMessageId, m.feedbackVote);
    }
  }
  if (voteByMessageId.size === 0) return server;
  return server.map((m) => {
    if (m.from !== "assistant" || !m.assistantMessageId) return m;
    const vote = voteByMessageId.get(m.assistantMessageId);
    if (vote === undefined) return m;
    return { ...m, feedbackVote: vote };
  });
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
  created_at?: string;
  tool_call_payload?: unknown;
  metadata?: unknown;
}): PlaygroundPreviewMessage | null {
  if (!isRenderableTranscriptMessage(m)) return null;
  const from = m.role as "user" | "assistant";
  const row: PlaygroundPreviewMessage = {
    from,
    text: m.content ?? "",
    ...(typeof m.created_at === "string" && m.created_at.length > 0
      ? { createdAt: m.created_at }
      : {}),
  };
  if (from === "assistant" && m.id != null && String(m.id).length > 0) {
    row.assistantMessageId = String(m.id);
  }
  if (from === "assistant" && m.metadata && typeof m.metadata === "object") {
    const { products, productDetail } = parseMessageProductMetadata(m.metadata);
    row.products = products ?? null;
    row.productDetail = productDetail ?? null;
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
  toneDescriptionRaw,
  behaviorSettings,
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
  toneDescriptionRaw: string | null;
  behaviorSettings: Record<string, unknown> | null | undefined;
  languageRaw: string | null;
  agentType: string;
  systemPrompt: string;
  creativity: CreativityLevel;
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
  const [conversationStatus, setConversationStatus] = useState<string>("open");
  const [contactCaptureRequired, setContactCaptureRequired] = useState(false);
  const aiChatDisabled = isAiChatDisabledStatus(conversationStatus);
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
        conversation: { visitor_id: string; status?: string };
        messages: Array<{
          id?: string;
          role: string;
          content: string;
          created_at?: string;
          tool_call_payload?: unknown;
        }>;
      }>(`/api/v1/conversations/${encodeURIComponent(threadId)}`);
      const mapped: PlaygroundPreviewMessage[] = [];
      for (const m of data.messages) {
        const row = mapApiMessageToPlaygroundPreview(m);
        if (row) mapped.push(row);
      }
      const entry = {
        visitorId: data.conversation.visitor_id.trim() || newPlaygroundVisitorId(),
        messages: mapped,
        status: data.conversation.status ?? "open",
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
        setConversationStatus("open");
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
    if (!conversationId) {
      setConversationStatus("open");
      return;
    }
    cacheThread(conversationId, {
      visitorId,
      messages: previewMessages,
      status: conversationStatus,
    });
  }, [conversationId, visitorId, previewMessages, conversationStatus, cacheThread]);

  useEffect(() => {
    if (!agentId || !conversationId) return;
    const aid = agentId;
    const cid = conversationId;
    let cancelled = false;
    let fallbackInterval: ReturnType<typeof setInterval> | null = null;
    const ac = new AbortController();
    const liveThreadSyncRef = { current: false };

    function applyDetail(data: PlaygroundConversationDetailPayload) {
      if (cancelled || blockThreadSyncRef.current) return;
      const nextStatus = data.conversation.status ?? "open";
      liveThreadSyncRef.current = playgroundNeedsOperatorThreadSync(
        nextStatus,
        data.conversation.metadata
      );
      const mapped: PlaygroundPreviewMessage[] = [];
      for (const m of data.messages) {
        const row = mapApiMessageToPlaygroundPreview(m);
        if (row) mapped.push(row);
      }
      setConversationStatus(nextStatus);
      setPreviewMessages((current) => {
        if (!shouldApplyServerPlaygroundTranscript(current, mapped)) {
          return current;
        }
        const merged = mergePlaygroundTranscriptFromServer(current, mapped);
        cacheThread(cid, { visitorId, messages: merged, status: nextStatus });
        return merged;
      });
    }

    async function syncFromServer() {
      if (blockThreadSyncRef.current) return;
      try {
        const data = await backendFetch<PlaygroundConversationDetailPayload>(
          `/api/v1/conversations/${encodeURIComponent(cid)}`
        );
        if (cancelled) return;
        if (blockThreadSyncRef.current) return;
        applyDetail(data);
      } catch (e) {
        if (isStalePlaygroundConversationError(e)) {
          setConversationId(null);
          writePlaygroundChatToStorage(aid, previewMessages, null, visitorId);
        }
      }
    }

    void (async () => {
      await syncFromServer();
      if (cancelled) return;
      if (!liveThreadSyncRef.current && !isAiChatDisabledStatus(conversationStatus)) return;
      try {
        await consumeBackendSseJson<PlaygroundConversationDetailPayload>(
          `/api/v1/conversations/${encodeURIComponent(cid)}/stream`,
          applyDetail,
          { signal: ac.signal }
        );
      } catch {
        if (ac.signal.aborted || cancelled) return;
        fallbackInterval = window.setInterval(() => {
          if (document.visibilityState !== "visible") return;
          void syncFromServer();
        }, PLAYGROUND_OPERATOR_SYNC_FALLBACK_MS);
      }
    })();

    const onVisibility = () => {
      if (document.visibilityState !== "visible") return;
      if (!liveThreadSyncRef.current && !isAiChatDisabledStatus(conversationStatus)) return;
      void syncFromServer();
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelled = true;
      ac.abort();
      if (fallbackInterval) window.clearInterval(fallbackInterval);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [agentId, conversationId, visitorId, cacheThread, conversationStatus]);

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
    ac: AbortController,
    productAction?: ProductActionRequest
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
        ...(productAction
          ? {
              product_action: {
                type: productAction.type,
                handle: productAction.handle,
                title: productAction.title ?? null,
              },
            }
          : {}),
      }),
    })) {
      if (ac.signal.aborted) break;
      if (ev.type === "done") {
        if (ev.conversation_id) {
          setConversationId(ev.conversation_id);
        }
        const nextStatus = readConversationStatus(ev.conversation_status);
        if (nextStatus) {
          setConversationStatus(nextStatus);
        } else if (ev.ai_chat_disabled === true) {
          setConversationStatus("escalated");
        }
        setContactCaptureRequired(readContactCaptureRequired(ev as Record<string, unknown>));
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
      if (chatStreamTerminalEvent(ev)) {
        setIsSending(false);
      }
    }
    setPreviewMessages((prev) => {
      if (prev.length === 0) return prev;
      const last = prev[prev.length - 1];
      if (last.from !== "assistant") return prev;
      if (last.streamPhase === "done" || last.streamPhase === "error") return prev;
      const next = [...prev];
      next[next.length - 1] = {
        ...last,
        streamPhase: "done",
        statusLine: null,
      };
      return next;
    });
  }

  const runProductAction = useCallback(
    async (action: ProductActionRequest) => {
      if (!agentId || isSending || historyThreadLoading || aiChatDisabled) return;
      const userMessage = productActionUserMessage(action);
      stickToBottomRef.current = true;
      blockThreadSyncRef.current = true;
      setPreviewMessages((prev) => [...prev, { from: "user", text: userMessage, createdAt: messageCreatedAtIso() }]);
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
          createdAt: messageCreatedAtIso(),
        },
      ]);
      const thread = { conversationId, visitorId };
      try {
        await streamPlaygroundReply(userMessage, thread, ac, action);
      } catch (e) {
        if (ac.signal.aborted) return;
        const errMsg = e instanceof Error ? e.message : "Could not load product";
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
    },
    [agentId, conversationId, creativity, historyThreadLoading, isSending, visitorId, agentType, systemPrompt, aiChatDisabled]
  );

  async function handleSendMessage() {
    const draft = (messageInputRef.current?.value ?? messageInput).trim();
    if (!agentId || !draft || isSending || historyThreadLoading || aiChatDisabled) return;
    stickToBottomRef.current = true;
    // `blockThreadSyncRef` is otherwise updated in layout after commit; without this, an in-flight
    // poll can finish between optimistic updates and that effect and overwrite the transcript.
    blockThreadSyncRef.current = true;
    const userMessage = draft;
    setMessageInput("");
    if (messageInputRef.current) {
      messageInputRef.current.value = "";
      resizePlaygroundComposer(messageInputRef.current);
    }
    setPreviewMessages((prev) => [...prev, { from: "user", text: userMessage, createdAt: messageCreatedAtIso() }]);
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
        createdAt: messageCreatedAtIso(),
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
            next[next.length - 1] = {
              from: "assistant",
              text: "",
              streamPhase: "thinking",
              createdAt: next[next.length - 1]?.createdAt ?? messageCreatedAtIso(),
            };
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

  async function handleSubmitVisitorContact(fields: { name: string; email: string }) {
    if (!agentId || !conversationId) {
      throw new Error("Send a message before connecting to support.");
    }
    const data = await backendFetch<{
      handoff_message: string;
      conversation_status: string;
      contact_capture_required: boolean;
    }>(`/api/v1/conversations/${encodeURIComponent(conversationId)}/visitor-contact`, {
      method: "POST",
      body: JSON.stringify({
        agent_id: agentId,
        visitor_name: fields.name,
        visitor_email: fields.email,
      }),
    });
    setContactCaptureRequired(data.contact_capture_required);
    setConversationStatus(data.conversation_status);
    setPreviewMessages((prev) => [
      ...prev,
      {
        from: "assistant",
        text: data.handoff_message,
        createdAt: messageCreatedAtIso(),
        streamPhase: "done",
      },
    ]);
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
    setConversationStatus("open");
    setContactCaptureRequired(false);
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
      setConversationStatus(cached.status ?? "open");
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
      setConversationStatus(next.status ?? "open");
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

  const { resolved: appearanceResolved, headerChrome, userChrome } = useMemo(
    () => getWidgetPreviewContext(behaviorSettings, brandColorHex, meData?.plan.slug),
    [behaviorSettings, brandColorHex, meData?.plan.slug]
  );

  const submitPlaygroundFeedback = useCallback(
    (messageId: string, clicked: 1 | -1) => {
      if (!agentId) return;
      let found = false;
      flushSync(() => {
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
  const chrome = headerChrome;
  const displayName = (agentName?.trim() || "Assistant preview").trim();
  const toneDescription = toneDescriptionRaw?.trim() || null;
  const languageLabel = languagePreviewLabel(languageRaw);
  const emptyAssistantLine = effectiveWelcomeMessage(behaviorSettings, agentName);

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
        "border-ds-outline flex min-h-0 w-full max-w-[26rem] flex-col overflow-hidden rounded-[28px] border shadow-[0_20px_55px_rgba(15,23,42,0.06)]",
        "h-full max-h-full",
        "xl:h-[min(37.5rem,85vh)]"
      )}
      style={{
        backgroundColor: appearanceResolved.colors.panelBackground,
        borderColor: appearanceResolved.colors.assistantBubbleBorder,
        color: appearanceResolved.colors.textPrimary,
      }}
    >
      <div
        className={cn(
          "flex shrink-0 items-center justify-between border-b px-5 py-3.5 sm:px-6",
          hasBrand ? "border-black/10" : "border-ds-outline bg-ds-sidebar"
        )}
        style={
          hasBrand
            ? { backgroundColor: appearanceResolved.colors.header }
            : appearanceResolved.themeMode === "dark"
              ? { backgroundColor: appearanceResolved.colors.composerBackground }
              : undefined
        }
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
        style={{ backgroundColor: appearanceResolved.colors.panelBackground }}
      >
        {historyOpen ? (
          <div className="flex flex-col p-4 sm:p-5" role="region" aria-label="Conversations">
            <button
              type="button"
              className={cn(
                "ds-app-body-muted hover:text-ds-on-surface hover:bg-ds-outline/40 -mx-1 mb-4 flex w-fit cursor-pointer items-center gap-2 rounded-ds-md px-2 py-1.5 text-sm font-semibold transition-colors",
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
          <div className="space-y-5 px-4 py-5 sm:px-5 sm:py-8">
            {historyThreadLoading ? (
              <p className={cn(onboardingType.hint, "text-center italic")}>Loading conversation…</p>
            ) : null}
            {!historyThreadLoading && previewMessages.length === 0 ? (
              <div className="space-y-3">
                <WidgetWelcomeMessageRow
                  message={emptyAssistantLine}
                  resolved={appearanceResolved}
                  brandColorHex={brandColorHex}
                  websiteLogoUrl={websiteLogoUrl}
                  websiteLogoPending={websiteLogoPending}
                />
                {toneDescription || languageLabel ? (
                  <p className={cn(onboardingType.hint, "ds-app-body-muted pl-11 text-left text-xs")}>
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
              const hasCarousel =
                msg.from === "assistant" &&
                Boolean(msg.products?.length && !msg.productDetail);
              const assistantBubbleClass =
                "rounded-2xl rounded-tl-none border px-4 py-3 text-sm shadow-sm sm:px-5";
              const assistantBubbleStyle = {
                backgroundColor: appearanceResolved.colors.assistantBubble,
                borderColor: appearanceResolved.colors.assistantBubbleBorder,
                color: appearanceResolved.colors.textPrimary,
              };
              const assistantTimeFooter =
                msg.createdAt && (phase === "done" || phase === "error") ? (
                  <MessageTimestamp
                    variant="bubble"
                    value={msg.createdAt}
                    style={{ color: appearanceResolved.colors.textMuted }}
                  />
                ) : null;
              return (
                <div key={`${msg.from}-${index}`} className={`flex ${msg.from === "user" ? "justify-end" : "justify-start"}`}>
                  {msg.from === "assistant" ? (
                    <div
                      className={cn(
                        "flex gap-3",
                        hasCarousel ? "max-w-[min(100%,640px)]" : "max-w-[90%]"
                      )}
                    >
                      <WidgetBrandAvatar
                        logoUrl={websiteLogoUrl}
                        logoPending={websiteLogoPending}
                        hasBrand={hasBrand}
                        chrome={chrome}
                        size="bubble"
                      />
                      <div className="flex min-w-0 flex-1 flex-col gap-1">
                        {hasCarousel ? (
                          <StreamingAssistantMessage
                            text={msg.text}
                            phase={phase}
                            errorMessage={msg.errorMessage}
                            statusLine={msg.statusLine}
                            brandColorHex={brandColorHex}
                            products={msg.products}
                            productDetail={msg.productDetail}
                            productActionsDisabled={isSending || aiChatDisabled}
                            introBubbleClassName={assistantBubbleClass}
                            introBubbleStyle={assistantBubbleStyle}
                            bubbleFooter={assistantTimeFooter}
                            onShowProductDetails={(product) =>
                              void runProductAction({
                                type: "details",
                                handle: product.handle,
                                title: product.title,
                              })
                            }
                            onShowSimilarProducts={(product) =>
                              void runProductAction({
                                type: "similar",
                                handle: product.handle,
                                title: product.title,
                              })
                            }
                          />
                        ) : (
                        <div className={assistantBubbleClass} style={assistantBubbleStyle}>
                          <StreamingAssistantMessage
                            text={msg.text}
                            phase={phase}
                            errorMessage={msg.errorMessage}
                            statusLine={msg.statusLine}
                            brandColorHex={brandColorHex}
                            products={msg.products}
                            productDetail={msg.productDetail}
                            productActionsDisabled={isSending || aiChatDisabled}
                            onShowProductDetails={(product) =>
                              void runProductAction({
                                type: "details",
                                handle: product.handle,
                                title: product.title,
                              })
                            }
                            onShowSimilarProducts={(product) =>
                              void runProductAction({
                                type: "similar",
                                handle: product.handle,
                                title: product.title,
                              })
                            }
                            bubbleFooter={assistantTimeFooter}
                          />
                        </div>
                        )}
                        {messageFeedbackEnabled &&
                        msg.assistantMessageId &&
                        phase === "done" &&
                        msg.text.trim() ? (
                          <MessageFeedbackButtons
                            vote={msg.feedbackVote ?? null}
                            accentColor={brandColorHex}
                            onVote={(clicked) =>
                              submitPlaygroundFeedback(msg.assistantMessageId!, clicked)
                            }
                          />
                        ) : null}
                      </div>
                    </div>
                  ) : (
                    <div
                      className="max-w-[85%] rounded-2xl rounded-tr-none px-4 py-3 text-sm leading-relaxed shadow-sm sm:px-5"
                      style={{
                        backgroundColor: appearanceResolved.colors.userBubble,
                        color: userChrome.lightBg ? "#0f172a" : "#ffffff",
                      }}
                    >
                      <UserBubbleBody
                        timestamp={
                          <MessageTimestamp
                            variant="bubble"
                            value={msg.createdAt}
                            tone={userChrome.lightBg ? "muted" : "on-primary"}
                          />
                        }
                      >
                        {msg.text}
                      </UserBubbleBody>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div
        className="shrink-0 px-4 pb-2.5 pt-2 sm:px-5"
        style={{ backgroundColor: appearanceResolved.colors.composerBackground }}
      >
        {historyOpen ? (
          <>
            <p className="ds-app-body-muted text-center">
              Choose a conversation above to load it, or use <span className="font-semibold">Back to chat</span>.
            </p>
            {footerError ? (
              <p className="text-rose-600 mt-3 text-center text-sm">{footerError}</p>
            ) : null}
          </>
        ) : contactCaptureRequired ? (
          <VisitorContactForm
            compact
            onSubmit={handleSubmitVisitorContact}
          />
        ) : (
          <div className="flex flex-col gap-1">
            {aiChatDisabled ? <EscalatedChatNotice /> : null}
            <PlaygroundComposer
              textareaRef={messageInputRef}
              value={messageInput}
              onChange={setMessageInput}
              onSend={() => void handleSendMessage()}
              sendDisabled={
                !agentId || isSending || historyThreadLoading || !messageInput.trim() || aiChatDisabled
              }
              disabled={aiChatDisabled}
              placeholder={
                aiChatDisabled
                  ? "Start a new chat to talk to the AI"
                  : languageLabel
                    ? `Test your agent (${languageLabel})…`
                    : "Test your agent…"
              }
              brandColorHex={brandColorHex}
              hasBrand={hasBrand}
              chrome={chrome}
              shellStyle={{ backgroundColor: appearanceResolved.colors.composerBackground }}
            />
            {!hidePoweredByPlan ? (
              <PoweredByChatRely compact className="bg-transparent px-0 py-0" />
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
  creativity: CreativityLevel;
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
  const [systemPrompt, setSystemPrompt] = useState("");
  const [creativity, setCreativity] = useState<CreativityLevel>(0.5);
  const [agentType, setAgentType] = useState<string>("brand_support");
  const [baseline, setBaseline] = useState<PlaygroundFormBaseline | null>(null);
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

  const {
    resolveEnabled,
    setEnabledDraft,
    isDirty: actionsDirty,
    changeCount: actionChangeCount,
    cancelAll: cancelActionDrafts,
    saveAll: saveActionDrafts,
  } = useActionDrafts(selectedAgentId || undefined, actionsCatalog?.entries);

  /* Hydrate playground form when the selected agent changes (not when the agent list reference refreshes). */
  useEffect(() => {
    if (!selectedAgentId) {
      hydratedAgentIdRef.current = null;
      queueMicrotask(() => {
        setBaseline(null);
        setSystemPrompt("");
        setCreativity(0.5);
        setAgentType("brand_support");
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
    });
  }, [selectedAgentId, agents]);

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
      const saveTasks: Promise<boolean | void>[] = [];

      if (formFieldsDirty) {
        saveTasks.push(
          (async () => {
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
          })()
        );
      }

      if (actionsDirty) {
        saveTasks.push(
          saveActionDrafts((message) => {
            if (!selectedAgentId) return;
            setSaveError({ agentId: selectedAgentId, message });
          })
        );
      }

      const results = await Promise.all(saveTasks);
      if (results.some((result) => result === false)) return;

      if (formFieldsDirty) {
        await refreshAgents({ silent: true });
      }
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
    formFieldsDirty,
    actionsDirty,
    systemPrompt,
    creativity,
    agentType,
    selectedAgent,
    refreshAgents,
    saveActionDrafts,
  ]);

  const handleCancel = useCallback(() => {
    if (!baseline) return;
    setSystemPrompt(baseline.systemPrompt);
    setCreativity(baseline.creativity);
    setAgentType(baseline.agentType);
    cancelActionDrafts();
    setSaveError(null);
  }, [baseline, cancelActionDrafts]);

  return (
    <div className="ds-app-shell ds-app-shell--flush flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="border-ds-outline bg-ds-app-canvas/80 flex shrink-0 items-center gap-2 border-b p-2.5 lg:hidden">
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

      <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden lg:flex-row lg:items-stretch">
        <section
          className={cn(
            "border-ds-outline relative z-10 flex w-full min-h-0 flex-col overflow-hidden border-b bg-ds-app-canvas",
            "lg:w-[42%] lg:min-w-[450px] lg:max-w-[500px] lg:shrink-0 lg:border-r lg:border-b-0",
            mobileTab === "settings" ? "flex-1 lg:flex-none" : "hidden lg:flex"
          )}
        >
          <div className="border-ds-outline shrink-0 border-b bg-ds-app-canvas px-5 py-4 sm:px-6">
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
              <div className="space-y-6">

            <section className={playgroundSettingsCardClass}>
              <div className={playgroundSettingsCardHeaderClass}>
                <div className="flex items-center gap-2">
                  <h2 id="playground-creativity-label" className={playgroundSettingsCardTitleClass}>
                    Creativity
                  </h2>
                  <InfoHint text={PLAYGROUND_CREATIVITY_HINT} labelFor="Creativity" className="ml-0" />
                </div>
                <p className={playgroundSettingsCardDescriptionClass}>{PLAYGROUND_CREATIVITY_DESCRIPTION}</p>
              </div>
              <AppSegmentGroup aria-labelledby="playground-creativity-label">
                {CREATIVITY_BANDS.map((band) => (
                  <AppSegmentOption
                    key={band.value}
                    selected={creativity === band.value}
                    onSelect={() => setCreativity(band.value)}
                  >
                    {band.label}
                  </AppSegmentOption>
                ))}
              </AppSegmentGroup>
            </section>

            <section className={playgroundSettingsCardClass}>
              <div className={playgroundSettingsCardHeaderClass}>
                <h2 className={playgroundSettingsCardTitleClass}>Actions</h2>
                <p className={playgroundSettingsCardDescriptionClass}>{PLAYGROUND_ACTIONS_DESCRIPTION}</p>
              </div>
              <div className="space-y-3">
              <div className="border-ds-outline overflow-hidden rounded-ds-lg border">
                <button
                  type="button"
                  className="bg-ds-sidebar/60 flex w-full cursor-pointer items-center justify-between px-4 py-3 text-left transition-colors hover:bg-ds-sidebar/80"
                  onClick={() => setShopifyActionsOpen((o) => !o)}
                  aria-expanded={shopifyActionsOpen}
                >
                  <div className="flex items-center gap-3">
                    <IconBag className="text-ds-primary size-4 shrink-0" aria-hidden />
                    <span className="text-ds-on-surface text-sm font-medium">Shopify</span>
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
                            <ActionToggle
                              checked={resolveEnabled(e.action_key, Boolean(e.enabled))}
                              disabled={integrationsLoading}
                              onChange={(next) => setEnabledDraft(e.action_key, next)}
                              label={`Enable ${e.label}`}
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : null}
              </div>

              {humanEscalationLive ? (
                <div className="border-ds-outline flex items-center justify-between rounded-ds-lg border p-4">
                  <div className="flex items-center gap-3">
                    <IconPersonPin className="text-ds-primary size-4 shrink-0" aria-hidden />
                    <span className="text-ds-on-surface text-sm font-medium">Escalate to human</span>
                  </div>
                  <ActionToggle
                    checked={resolveEnabled(
                      "human.escalate",
                      Boolean(humanEscalationEntry?.enabled)
                    )}
                    disabled={integrationsLoading}
                    onChange={(next) => setEnabledDraft("human.escalate", next)}
                    label="Enable escalate to human"
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
            </section>

            <section className={playgroundSettingsCardClass}>
              <div className={playgroundSettingsCardHeaderClass}>
                <h2 className={playgroundSettingsCardTitleClass}>Agent</h2>
                <p className={playgroundSettingsCardDescriptionClass}>{PLAYGROUND_AGENT_DESCRIPTION}</p>
              </div>
              <div className="space-y-6">
                <div>
                  <div className="flex items-center gap-2">
                    <label htmlFor="playground-agent-type" className={playgroundSettingsFieldLabelClass}>
                      Agent type
                    </label>
                    <InfoHint
                      text={PLAYGROUND_AGENT_TYPE_HINT}
                      labelFor="Agent type"
                      placement="right"
                      className="ml-0"
                    />
                  </div>
                  <select
                    id="playground-agent-type"
                    className={cn(fieldControlPointerClass, "mt-3")}
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

                <div className={cn(agentType !== "custom" && "opacity-55")}>
                  <div className="flex items-center justify-between gap-3">
                    <label htmlFor="playground-system-prompt" className={playgroundSettingsFieldLabelClass}>
                      System prompt
                    </label>
                    {agentType === "custom" ? (
                      <button
                        type="button"
                        className="text-ds-on-surface-variant hover:text-ds-interactive-hover inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-ds-md py-1 text-xs font-semibold transition-colors disabled:pointer-events-none disabled:opacity-40"
                        disabled={!baseline || systemPrompt === baseline.systemPrompt}
                        onClick={() => baseline && setSystemPrompt(baseline.systemPrompt)}
                      >
                        <IconHistory className="size-3.5" aria-hidden />
                        Reset
                      </button>
                    ) : null}
                  </div>
                  <textarea
                    id="playground-system-prompt"
                    className={cn(fieldControlClass, "mt-3 leading-relaxed")}
                    value={systemPrompt}
                    disabled={agentType !== "custom"}
                    placeholder={
                      agentType === "custom"
                        ? PLAYGROUND_SYSTEM_PROMPT_PLACEHOLDER
                        : "Select Custom Prompt above to edit."
                    }
                    onChange={(e) => setSystemPrompt(e.target.value)}
                  />
                </div>
              </div>
            </section>

              </div>
            )}
          </div>
        </section>

        <section
          className={cn(
            "relative flex min-h-0 min-w-0 flex-1 flex-col items-stretch justify-start overflow-hidden p-4 pt-6 sm:p-6 sm:pt-8",
            "lg:self-stretch lg:p-10 lg:pt-8 lg:pb-10",
            mobileTab === "preview" ? "" : "hidden lg:flex"
          )}
        >
          <IsoGridPanelBackground id="playground-iso-grid" className="min-h-full" />
          <div className="relative z-10 flex min-h-0 w-full max-w-full flex-1 flex-col items-center justify-start overflow-hidden">
            <PlaygroundPreviewConversation
              key={selectedAgentId ?? "__no_agent__"}
              agentId={selectedAgentId}
              agentName={selectedAgent?.name ?? null}
              brandColorHex={parseBrandColorHex(selectedAgent?.behavior_settings?.brand_color)}
              toneDescriptionRaw={
                typeof selectedAgent?.behavior_settings?.tone_description === "string"
                  ? selectedAgent.behavior_settings.tone_description
                  : null
              }
              behaviorSettings={selectedAgent?.behavior_settings}
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

      <UnsavedChangesActionBar
        open={isDirty}
        isSaving={isSaving}
        saveDisabled={!selectedAgentId}
        onSave={handleSave}
        onCancel={handleCancel}
        message={unsavedChangesMessage(actionChangeCount, formFieldsDirty)}
      />
    </div>
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
