"use client";

import { Suspense, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { TranscriptAssistantMessage } from "@/components/chat/transcript-assistant-message";
import { MessageTimestamp, UserBubbleBody } from "@/components/chat/message-timestamp";
import { useDashboardAgent } from "@/components/layout/dashboard-agent-context";
import { backendFetch, consumeBackendSseJson } from "@/lib/backend-api";
import { isRenderableTranscriptMessage, messageHasProductCarousel } from "@/lib/conversation-transcript";
import {
  mergeConversationMessagesFromServer,
  shouldApplyServerConversationMessages,
  type ConversationMessageRow,
} from "@/lib/conversation-message-merge";
import { VisitorPresenceBadges } from "@/components/chat/visitor-presence-badges";
import { formatLocaleDateTime, formatLocaleTime } from "@/lib/format-locale-datetime";
import {
  formatVisitorContactLabel,
  readVisitorContactFromMetadata,
} from "@/lib/visitor-contact";
import { useClientMounted } from "@/lib/use-client-mounted";
import { appButtonClassName } from "@/lib/button-styles";
import { cn } from "@/lib/utils";

/** Clear queue spinner if live stream is slow; REST fetch still runs first. */
const WORKSPACE_LOAD_TIMEOUT_MS = 12_000;

/** Same-origin proxy with a long server timeout (summary LLM can take up to ~60s). */
function conversationSummaryPath(conversationId: string): string {
  return `/api/dashboard/conversations/${conversationId}/summary`;
}

function startOfLocalDayIso(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  if (!y || !m || !d) return "";
  return new Date(y, m - 1, d, 0, 0, 0, 0).toISOString();
}

/** Exclusive upper bound for conversations started on or before `dateStr` (inclusive). */
function startOfNextLocalDayIso(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  if (!y || !m || !d) return "";
  const dt = new Date(y, m - 1, d, 0, 0, 0, 0);
  dt.setDate(dt.getDate() + 1);
  return dt.toISOString();
}

type Conversation = {
  id: string;
  status: string;
  latest_message_preview: string | null;
  last_activity_at: string;
  updated_at: string;
  metadata?: Record<string, unknown>;
  conversation_active?: boolean;
  visitor_online?: boolean;
};

type ConversationSummaryState = {
  summary: string | null;
  key_points: string[];
  computed_at: string | null;
  message_count: number;
  stale: boolean;
  model: string;
};

type WorkspaceStreamPayload = {
  conversations: Conversation[];
  detail: {
    conversation: { id: string };
    messages: ConversationMessageRow[];
  } | null;
};

function ConversationMessagesSkeleton() {
  return (
    <div className="space-y-3" aria-label="Loading conversation messages">
      <div className="bg-ds-sidebar h-16 w-3/4 animate-pulse rounded-2xl" />
      <div className="bg-ds-sidebar ml-auto h-16 w-2/3 animate-pulse rounded-2xl" />
      <div className="bg-ds-sidebar h-16 w-4/5 animate-pulse rounded-2xl" />
    </div>
  );
}

function ConversationsPageContent() {
  const localeReady = useClientMounted();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const conversationFromUrl = searchParams.get("conversation");
  const agentFromUrl = searchParams.get("agent");
  const trainingTopicFromUrl = searchParams.get("training_topic");
  const { selectedAgentId, agentsLoading } = useDashboardAgent();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ConversationMessageRow[]>([]);
  const [, setMessagesByConversation] = useState<Record<string, ConversationMessageRow[]>>({});
  const [reply, setReply] = useState("");
  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [summaryByConversation, setSummaryByConversation] = useState<
    Record<string, ConversationSummaryState>
  >({});
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryGenerating, setSummaryGenerating] = useState(false);
  const [showSummaryPanel, setShowSummaryPanel] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [replyHint, setReplyHint] = useState<string | null>(null);
  const replyInputRef = useRef<HTMLInputElement>(null);
  const replyDraftRef = useRef("");
  const sendingRef = useRef(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [trainingTopicFilter, setTrainingTopicFilter] = useState("");
  const selectedConversationIdRef = useRef<string | null>(null);
  const skipNextMessagesRefreshRef = useRef(false);
  const messagesRequestIdRef = useRef(0);
  const messagesByConversationRef = useRef<Record<string, ConversationMessageRow[]>>({});
  const conversationsCountRef = useRef(0);
  const [isWideLayout, setIsWideLayout] = useState(false);
  const isWideLayoutRef = useRef(false);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1280px)");
    const sync = () => {
      isWideLayoutRef.current = mq.matches;
      setIsWideLayout(mq.matches);
    };
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);
  useLayoutEffect(() => {
    selectedConversationIdRef.current = selectedConversationId;
  }, [selectedConversationId]);

  useEffect(() => {
    conversationsCountRef.current = conversations.length;
  }, [conversations.length]);

  const cacheMessages = useCallback((conversationId: string, nextMessages: ConversationMessageRow[]) => {
    messagesByConversationRef.current = {
      ...messagesByConversationRef.current,
      [conversationId]: nextMessages,
    };
    setMessagesByConversation(messagesByConversationRef.current);
  }, []);

  const selectedConversation = useMemo(
    () => conversations.find((item) => item.id === selectedConversationId) ?? null,
    [conversations, selectedConversationId]
  );

  const selectedStatus = selectedConversation?.status ?? null;
  const selectedVisitorContact = readVisitorContactFromMetadata(selectedConversation?.metadata);
  const selectedVisitorLabel = formatVisitorContactLabel(selectedVisitorContact);
  const canResolve =
    Boolean(selectedConversationId) &&
    (selectedStatus === "open" || selectedStatus === "escalated");
  const canReopen =
    Boolean(selectedConversationId) &&
    (selectedStatus === "resolved" ||
      selectedStatus === "idle_closed" ||
      selectedStatus === "escalated");

  const selectedSummary = selectedConversationId
    ? (summaryByConversation[selectedConversationId] ?? null)
    : null;

  const activeFilterCount = useMemo(() => {
    let n = 0;
    if (statusFilter) n += 1;
    if (dateFrom) n += 1;
    if (dateTo) n += 1;
    if (trainingTopicFilter.trim()) n += 1;
    return n;
  }, [statusFilter, dateFrom, dateTo, trainingTopicFilter]);

  useEffect(() => {
    queueMicrotask(() => setTrainingTopicFilter((trainingTopicFromUrl ?? "").trim()));
  }, [trainingTopicFromUrl]);

  const loadConversations = useCallback(async (opts?: { silent?: boolean; detailId?: string | null }) => {
    const silent = Boolean(opts?.silent);
    if (!silent) {
      setLoading(true);
      setError(null);
    }
    try {
      const qs = new URLSearchParams();
      const agentId = (agentFromUrl ?? "").trim() || selectedAgentId;
      if (agentId) qs.set("agent_id", agentId);
      if (statusFilter) qs.set("status", statusFilter);
      if (dateFrom) {
        const iso = startOfLocalDayIso(dateFrom);
        if (iso) qs.set("started_after", iso);
      }
      if (dateTo) {
        const iso = startOfNextLocalDayIso(dateTo);
        if (iso) qs.set("started_before", iso);
      }
      const topic = trainingTopicFilter.trim();
      if (topic) qs.set("training_topic", topic);
      const detailId =
        opts?.detailId !== undefined
          ? (opts.detailId ?? "").trim()
          : (conversationFromUrl ?? "").trim() ||
            selectedConversationIdRef.current ||
            "";
      if (detailId) {
        qs.set("detail_conversation_id", detailId);
      }
      const path = `/api/v1/conversations/workspace?${qs.toString()}`;
      const data = await backendFetch<{
        conversations: Conversation[];
        detail: {
          conversation: { id: string };
          messages: ConversationMessageRow[];
        } | null;
      }>(path);
      setConversations(data.conversations);

      if (!silent && data.detail) {
        const visible = data.detail.messages.filter(isRenderableTranscriptMessage);
        cacheMessages(data.detail.conversation.id, visible);
        setMessages(visible);
        setMessagesLoading(false);
        setSelectedConversationId(data.detail.conversation.id);
        skipNextMessagesRefreshRef.current = true;
      } else {
        const currentId = selectedConversationIdRef.current;
        if (!silent && detailId && !data.detail) {
          setSelectedConversationId(detailId);
        } else if (!currentId && data.conversations[0] && isWideLayoutRef.current) {
          setSelectedConversationId(data.conversations[0].id);
        } else if (
          currentId &&
          data.conversations.length > 0 &&
          !data.conversations.some((c) => c.id === currentId)
        ) {
          setSelectedConversationId(data.conversations[0].id);
        }
      }
    } catch (e) {
      if (!silent) {
        setError(e instanceof Error ? e.message : "Failed to load conversations");
      }
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  }, [
    agentFromUrl,
    selectedAgentId,
    statusFilter,
    dateFrom,
    dateTo,
    trainingTopicFilter,
    conversationFromUrl,
    cacheMessages,
  ]);

  function clearFilters() {
    setStatusFilter("");
    setDateFrom("");
    setDateTo("");
    setTrainingTopicFilter("");
    const params = new URLSearchParams(searchParams.toString());
    params.delete("training_topic");
    const q = params.toString();
    router.replace(q ? `${pathname}?${q}` : pathname);
  }

  const fetchSummaryState = useCallback(async (conversationId: string, opts?: { silent?: boolean }) => {
    const silent = Boolean(opts?.silent);
    if (!silent) setSummaryLoading(true);
    try {
      const data = await backendFetch<{
        conversation_id: string;
        summary: string | null;
        key_points: string[];
        computed_at: string | null;
        message_count: number;
        stale: boolean;
        model: string;
      }>(conversationSummaryPath(conversationId), { sameOrigin: true });
      setSummaryByConversation((prev) => ({
        ...prev,
        [conversationId]: {
          summary: data.summary,
          key_points: data.key_points ?? [],
          computed_at: data.computed_at,
          message_count: data.message_count,
          stale: data.stale,
          model: data.model,
        },
      }));
    } catch (e) {
      if (!silent) {
        setError(e instanceof Error ? e.message : "Failed to load summary");
      }
    } finally {
      if (!silent) setSummaryLoading(false);
    }
  }, []);

  async function generateSummary(regenerate: boolean) {
    if (!selectedConversationId || summaryGenerating) return;
    setSummaryGenerating(true);
    setError(null);
    const conversationId = selectedConversationId;
    try {
      const data = await backendFetch<{
        conversation_id: string;
        summary: string;
        key_points: string[];
        computed_at: string;
        message_count: number;
        stale: boolean;
        model: string;
      }>(conversationSummaryPath(conversationId), {
        method: "POST",
        sameOrigin: true,
        body: JSON.stringify({ regenerate }),
      });
      setSummaryByConversation((prev) => ({
        ...prev,
        [conversationId]: {
          summary: data.summary,
          key_points: data.key_points ?? [],
          computed_at: data.computed_at,
          message_count: data.message_count,
          stale: data.stale,
          model: data.model,
        },
      }));
      setShowSummaryPanel(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to generate summary");
    } finally {
      setSummaryGenerating(false);
    }
  }

  function hideSummaryPanel() {
    setShowSummaryPanel(false);
  }

  function handleSummaryButtonClick() {
    if (!selectedConversationId) return;
    const state = selectedSummary;
    if (state?.summary && showSummaryPanel && !state.stale) {
      hideSummaryPanel();
      return;
    }
    if (state?.summary && !showSummaryPanel) {
      setShowSummaryPanel(true);
      return;
    }
    void generateSummary(Boolean(state?.summary && state.stale));
  }

  function clearConversationSelection() {
    setSelectedConversationId(null);
    const params = new URLSearchParams(searchParams.toString());
    params.delete("conversation");
    const q = params.toString();
    router.replace(q ? `${pathname}?${q}` : pathname);
  }

  function selectConversation(conversationId: string) {
    if (conversationId === selectedConversationIdRef.current) return;
    const cached = messagesByConversationRef.current[conversationId];
    if (cached) {
      setMessages(cached);
      setMessagesLoading(false);
    } else {
      setMessages([]);
      setMessagesLoading(true);
    }
    setShowSummaryPanel(false);
    setSelectedConversationId(conversationId);
    void fetchSummaryState(conversationId, { silent: true });
  }

  const refreshMessages = useCallback(
    async (conversationId: string, opts?: { silent?: boolean }) => {
      const silent = Boolean(opts?.silent);
      const requestId = ++messagesRequestIdRef.current;
      if (!silent) {
        setMessagesLoading(true);
        setError(null);
      }
      try {
        const data = await backendFetch<{ messages: ConversationMessageRow[] }>(
          `/api/v1/conversations/${conversationId}`
        );
        const visible = data.messages.filter(isRenderableTranscriptMessage);
        cacheMessages(conversationId, visible);
        if (selectedConversationIdRef.current === conversationId) {
          setMessages((prev) => {
            if (!shouldApplyServerConversationMessages(prev, visible)) return prev;
            return mergeConversationMessagesFromServer(prev, visible);
          });
        }
      } catch (e) {
        if (!silent && selectedConversationIdRef.current === conversationId) {
          setError(e instanceof Error ? e.message : "Failed to load conversation");
        }
      } finally {
        if (!silent && messagesRequestIdRef.current === requestId && selectedConversationIdRef.current === conversationId) {
          setMessagesLoading(false);
        }
      }
    },
    [cacheMessages]
  );

  useEffect(() => {
    if (!selectedConversationId) {
      return;
    }
    if (!summaryByConversation[selectedConversationId]) {
      void fetchSummaryState(selectedConversationId, { silent: true });
    }
  }, [selectedConversationId, summaryByConversation, fetchSummaryState]);

  useEffect(() => {
    if (!selectedConversationId) {
      return;
    }
    if (skipNextMessagesRefreshRef.current) {
      skipNextMessagesRefreshRef.current = false;
      setMessagesLoading(false);
      return;
    }
    const id = selectedConversationId;
    const cached = messagesByConversationRef.current[id];
    queueMicrotask(() => {
      void refreshMessages(id, { silent: Boolean(cached) });
    });
  }, [selectedConversationId, refreshMessages]);

  useEffect(() => {
    const agentId = (agentFromUrl ?? "").trim() || selectedAgentId;
    if (!agentId) {
      if (!agentsLoading) {
        setLoading(false);
      }
      return;
    }

    const ac = new AbortController();
    let loadingTimeoutId: number | null = null;

    void loadConversations({ silent: conversationsCountRef.current > 0 });

    loadingTimeoutId = window.setTimeout(() => {
      setLoading((current) => {
        if (!current) return current;
        setError(
          (prev) =>
            prev ??
            "Live updates are slow. The list below is from your last fetch; refresh if it looks empty."
        );
        return false;
      });
    }, WORKSPACE_LOAD_TIMEOUT_MS);

    const applyWorkspace = (data: WorkspaceStreamPayload) => {
      setConversations(data.conversations);
      setLoading(false);
      if (data.detail) {
        const visible = data.detail.messages.filter(isRenderableTranscriptMessage);
        const detailId = data.detail.conversation.id;
        setMessages((prev) => {
          if (detailId !== selectedConversationIdRef.current) return visible;
          if (!shouldApplyServerConversationMessages(prev, visible)) return prev;
          return mergeConversationMessagesFromServer(prev, visible);
        });
        cacheMessages(detailId, visible);
        setMessagesLoading(false);
        setSelectedConversationId(detailId);
        skipNextMessagesRefreshRef.current = true;
      } else {
        const currentId = selectedConversationIdRef.current;
        const detailId = (conversationFromUrl ?? "").trim();
        if (detailId && !data.detail) {
          setSelectedConversationId(detailId);
        } else if (!currentId && data.conversations[0] && isWideLayoutRef.current) {
          setSelectedConversationId(data.conversations[0].id);
        } else if (
          currentId &&
          data.conversations.length > 0 &&
          !data.conversations.some((c) => c.id === currentId)
        ) {
          setSelectedConversationId(data.conversations[0].id);
        }
      }
    };

    void (async () => {
      try {
        const qs = new URLSearchParams();
        const agentId = (agentFromUrl ?? "").trim() || selectedAgentId;
        if (agentId) qs.set("agent_id", agentId);
        if (statusFilter) qs.set("status", statusFilter);
        if (dateFrom) {
          const iso = startOfLocalDayIso(dateFrom);
          if (iso) qs.set("started_after", iso);
        }
        if (dateTo) {
          const iso = startOfNextLocalDayIso(dateTo);
          if (iso) qs.set("started_before", iso);
        }
        const topic = trainingTopicFilter.trim();
        if (topic) qs.set("training_topic", topic);
        const detailFocus =
          selectedConversationId ?? (conversationFromUrl ?? "").trim();
        if (detailFocus) qs.set("detail_conversation_id", detailFocus);

        await consumeBackendSseJson<WorkspaceStreamPayload>(
          `/api/v1/conversations/workspace/stream?${qs.toString()}`,
          (data) => {
            applyWorkspace(data);
          },
          { signal: ac.signal },
        );
      } catch {
        if (!ac.signal.aborted) {
          setError(
            (prev) =>
              prev ??
              "Live updates disconnected. Data refreshes when you return to this tab."
          );
        }
      }
    })();

    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        void loadConversations({ silent: true });
        const id = selectedConversationIdRef.current;
        if (id) void refreshMessages(id, { silent: true });
      }
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      ac.abort();
      if (loadingTimeoutId) window.clearTimeout(loadingTimeoutId);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [
    agentFromUrl,
    selectedAgentId,
    agentsLoading,
    statusFilter,
    dateFrom,
    dateTo,
    trainingTopicFilter,
    conversationFromUrl,
    selectedConversationId,
    loadConversations,
    refreshMessages,
    cacheMessages,
  ]);

  async function handleReply() {
    const content = (
      replyDraftRef.current ||
      replyInputRef.current?.value ||
      reply
    ).trim();
    if (!selectedConversationId || !content || sending) return;
    const conversationId = selectedConversationId;
    const optimisticId = `pending-${Date.now()}`;
    const optimistic: ConversationMessageRow = {
      id: optimisticId,
      role: "assistant",
      content,
      created_at: new Date().toISOString(),
    };

    setSending(true);
    sendingRef.current = true;
    setError(null);
    setReplyHint(null);
    replyDraftRef.current = "";
    setReply("");
    setMessages((prev) => [...prev, optimistic]);

    try {
      const result = await backendFetch<{
        message: ConversationMessageRow;
        visitor_online: boolean;
        visitor_email: string | null;
      }>(`/api/v1/conversations/${conversationId}/messages`, {
        method: "POST",
        body: JSON.stringify({ role: "assistant", content }),
      });
      if (!result.visitor_online) {
        const email = result.visitor_email?.trim();
        setReplyHint(
          email
            ? `Visitor is offline. They'll see this when they return, or email them at ${email}.`
            : "Visitor is offline. They'll see this when they return."
        );
      }
      if (selectedConversationIdRef.current === conversationId) {
        setMessages((prev) => {
          const withoutPending = prev.filter((m) => m.id !== optimisticId);
          const saved = result.message;
          if (withoutPending.some((m) => m.id === saved.id)) return withoutPending;
          return [...withoutPending, saved];
        });
      }
      void fetchSummaryState(conversationId, { silent: true });
      void refreshMessages(conversationId, { silent: true });
    } catch (e) {
      setMessages((prev) => prev.filter((m) => m.id !== optimisticId));
      replyDraftRef.current = content;
      setReply(content);
      setError(e instanceof Error ? e.message : "Failed to send reply");
    } finally {
      sendingRef.current = false;
      setSending(false);
    }
  }

  async function updateStatus(status: "open" | "resolved") {
    if (!selectedConversationId || statusUpdating) return;
    setStatusUpdating(true);
    setError(null);
    const conversationId = selectedConversationId;
    try {
      const data = await backendFetch<{ conversation: Conversation }>(
        `/api/v1/conversations/${conversationId}`,
        {
          method: "PATCH",
          body: JSON.stringify({ status }),
        }
      );
      setConversations((prev) =>
        prev.map((item) =>
          item.id === data.conversation.id
            ? {
                ...item,
                status: data.conversation.status,
                updated_at: data.conversation.updated_at,
                last_activity_at: data.conversation.last_activity_at ?? item.last_activity_at,
              }
            : item
        )
      );
      await loadConversations({ silent: true, detailId: conversationId });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update status");
    } finally {
      setStatusUpdating(false);
    }
  }

  const mobileDetailActive = Boolean(selectedConversationId) && !isWideLayout;

  return (
    <div className="ds-app-shell ds-app-shell--flush flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="ds-flush-page-pad mx-auto flex min-h-0 w-full max-w-[1200px] flex-1 flex-col gap-4 overflow-hidden sm:gap-6">
        <header className={cn("shrink-0", mobileDetailActive && "hidden xl:block")}>
          <h1 className="ds-app-page-title">Conversations</h1>
          <p className="ds-app-page-description ds-app-page-description--wide">
            Monitor threads, review context, and jump in when needed.
          </p>
        </header>
        {error ? <p className={cn("shrink-0 text-sm text-rose-600", mobileDetailActive && "hidden xl:block")}>{error}</p> : null}

        <section className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden sm:gap-6 xl:grid xl:grid-cols-[380px_1fr] xl:grid-rows-[minmax(0,1fr)]">
          <div
            className={cn(
              "border-ds-outline flex min-h-0 flex-col overflow-hidden rounded-ds-xl border bg-ds-surface shadow-sm",
              mobileDetailActive ? "hidden xl:flex" : "flex min-h-0 flex-1",
            )}
          >
            <div className="border-ds-outline bg-ds-sidebar/90 flex shrink-0 items-center justify-between border-b px-4 py-3">
              <h2 className="ds-app-kicker text-ds-on-surface font-semibold">Live queue</h2>
              <button
                type="button"
                className="text-ds-primary flex items-center gap-1.5 text-sm font-semibold hover:underline"
                aria-expanded={filtersOpen}
                onClick={() => setFiltersOpen((o) => !o)}
              >
                Filters
                {activeFilterCount > 0 ? (
                  <span className="bg-ds-primary text-ds-on-primary inline-flex min-w-[1.125rem] items-center justify-center rounded-full px-1 text-[10px] font-bold tabular-nums">
                    {activeFilterCount}
                  </span>
                ) : null}
              </button>
            </div>
            {filtersOpen ? (
              <div className="border-ds-outline bg-ds-sidebar/40 shrink-0 space-y-3 border-b px-4 py-3">
                <label className="block">
                  <span className="text-ds-on-surface-variant mb-1 block text-xs font-semibold uppercase tracking-wide">
                    Status
                  </span>
                  <select
                    className={cn(
                      "ds-app-field w-full rounded-ds-md py-2 text-sm",
                      !statusFilter && "text-ds-on-surface-variant"
                    )}
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                  >
                    <option value="">All statuses</option>
                    <option value="open">Open</option>
                    <option value="escalated">Escalated</option>
                    <option value="resolved">Resolved</option>
                    <option value="idle_closed">Idle closed</option>
                  </select>
                </label>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <label className="block min-w-0">
                    <span className="text-ds-on-surface-variant mb-1 block text-xs font-semibold uppercase tracking-wide">
                      Started from
                    </span>
                    <input
                      type="date"
                      className="ds-app-field w-full min-w-0 rounded-ds-md py-2 text-sm"
                      value={dateFrom}
                      onChange={(e) => setDateFrom(e.target.value)}
                    />
                  </label>
                  <label className="block min-w-0">
                    <span className="text-ds-on-surface-variant mb-1 block text-xs font-semibold uppercase tracking-wide">
                      Started to
                    </span>
                    <input
                      type="date"
                      className="ds-app-field w-full min-w-0 rounded-ds-md py-2 text-sm"
                      value={dateTo}
                      onChange={(e) => setDateTo(e.target.value)}
                    />
                  </label>
                </div>
                <p className="text-ds-on-surface-variant text-xs leading-snug">
                  Date range filters by when the conversation started (your local timezone).
                </p>
                <label className="block">
                  <span className="text-ds-on-surface-variant mb-1 block text-xs font-semibold uppercase tracking-wide">
                    Training topic
                  </span>
                  <input
                    type="text"
                    className="ds-app-field w-full rounded-ds-md py-2 text-sm"
                    placeholder="Slug from outcomes (optional)"
                    value={trainingTopicFilter}
                    onChange={(e) => setTrainingTopicFilter(e.target.value)}
                  />
                </label>
                <button
                  type="button"
                  className={appButtonClassName("default", {
                    size: "sm",
                    className: "ds-app-body-muted hover:text-ds-on-surface",
                  })}
                  onClick={() => clearFilters()}
                  disabled={activeFilterCount === 0}
                >
                  Clear filters
                </button>
              </div>
            ) : null}
            <div className="divide-ds-outline min-h-0 flex-1 divide-y overflow-y-auto overscroll-contain">
              {loading && conversations.length === 0 ? (
                <p className="text-ds-on-surface-variant p-4 text-sm">Loading conversations…</p>
              ) : null}
              {!loading && conversations.length === 0 ? (
                <p className="text-ds-on-surface-variant p-4 text-sm">No conversations yet.</p>
              ) : null}
              {conversations.map((item) => (
                <button
                  type="button"
                  key={item.id}
                  className={cn(
                    "w-full cursor-pointer px-4 py-4 text-left transition-colors",
                    selectedConversationId === item.id ? "bg-ds-primary/8" : "hover:bg-ds-sidebar/70"
                  )}
                  onClick={() => selectConversation(item.id)}
                >
                  <div className="mb-1 flex items-start justify-between gap-2">
                    <p className="ds-app-card-title">{item.id.slice(0, 8)}</p>
                    <span className="ds-app-caption shrink-0">
                      {formatLocaleTime(item.last_activity_at || item.updated_at, localeReady)}
                    </span>
                  </div>
                  <p className="ds-app-body-muted line-clamp-1">
                    {item.latest_message_preview ?? "No messages yet"}
                  </p>
                  <div className="mt-2">
                    <VisitorPresenceBadges
                      conversationActive={Boolean(
                        item.conversation_active ??
                          (item.status === "open" || item.status === "escalated")
                      )}
                      visitorOnline={Boolean(item.visitor_online)}
                      status={item.status}
                    />
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div
            className={cn(
              "border-ds-outline flex min-h-0 flex-col overflow-hidden rounded-ds-xl border bg-ds-surface shadow-sm",
              mobileDetailActive ? "flex min-h-0 flex-1" : "hidden xl:flex",
            )}
          >
            <div className="border-ds-outline bg-ds-sidebar/90 flex shrink-0 items-center gap-2 border-b px-4 py-3 xl:hidden">
              <button
                type="button"
                onClick={() => clearConversationSelection()}
                className="text-ds-on-surface-variant hover:bg-ds-neutral hover:text-ds-on-surface touch-manipulation flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-ds-md transition-colors"
                aria-label="Back to conversation list"
              >
                <ChevronLeft className="size-5" strokeWidth={2} aria-hidden />
              </button>
              <span className="ds-app-kicker text-ds-on-surface min-w-0 flex-1 truncate font-semibold">
                Conversation
              </span>
            </div>
            <div className="border-ds-outline bg-ds-sidebar/90 flex shrink-0 flex-wrap items-center justify-between gap-3 border-b px-4 py-4 sm:px-6">
              <div className="min-w-0">
                <h3 className="text-ds-on-surface truncate text-sm font-semibold">
                  {selectedConversation ? selectedConversation.id : "No conversation selected"}
                </h3>
                <p className="ds-app-body-muted">
                  {selectedVisitorLabel
                    ? `Visitor: ${selectedVisitorLabel}`
                    : selectedStatus === "escalated"
                      ? "Visitor contact not captured yet"
                      : "Live transcript"}
                </p>
                {selectedConversation ? (
                  <VisitorPresenceBadges
                    className="mt-2"
                    conversationActive={Boolean(selectedConversation.conversation_active)}
                    visitorOnline={Boolean(selectedConversation.visitor_online)}
                    status={selectedConversation.status}
                  />
                ) : null}
              </div>
              <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
                <button
                  type="button"
                  className={appButtonClassName("default", { size: "sm" })}
                  onClick={() => handleSummaryButtonClick()}
                  disabled={!selectedConversationId || summaryGenerating || summaryLoading}
                >
                  {summaryGenerating
                    ? "Generating…"
                    : selectedSummary?.summary && showSummaryPanel && !selectedSummary.stale
                      ? "Hide summary"
                      : selectedSummary?.summary && !selectedSummary.stale
                        ? "View summary"
                        : selectedSummary?.stale
                          ? "Update summary"
                          : "Generate summary"}
                </button>
                {canReopen ? (
                  <button
                    type="button"
                    className={appButtonClassName("default", { size: "sm" })}
                    onClick={() => void updateStatus("open")}
                    disabled={statusUpdating}
                  >
                    {statusUpdating ? "Updating…" : "Reopen"}
                  </button>
                ) : null}
                {canResolve ? (
                  <button
                    type="button"
                    className={appButtonClassName("default", { size: "sm" })}
                    onClick={() => void updateStatus("resolved")}
                    disabled={statusUpdating}
                  >
                    {statusUpdating ? "Updating…" : "Resolve"}
                  </button>
                ) : null}
              </div>
            </div>
            {showSummaryPanel && selectedConversationId ? (
              <div className="border-ds-outline bg-ds-sidebar/50 shrink-0 border-b px-5 py-4 sm:px-6">
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <h4 className="text-ds-on-surface text-sm font-semibold">Conversation summary</h4>
                  {selectedSummary?.computed_at ? (
                    <span className="text-ds-on-surface-variant text-[11px]">
                      Generated{" "}
                      {formatLocaleDateTime(selectedSummary.computed_at, localeReady, undefined, "-")}
                      {selectedSummary.stale ? " · thread updated" : ""}
                    </span>
                  ) : null}
                </div>
                {summaryLoading || summaryGenerating ? (
                  <div className="space-y-2" aria-busy="true">
                    <div className="bg-ds-sidebar h-4 w-full animate-pulse rounded" />
                    <div className="bg-ds-sidebar h-4 w-5/6 animate-pulse rounded" />
                    <div className="bg-ds-sidebar h-4 w-2/3 animate-pulse rounded" />
                  </div>
                ) : selectedSummary?.summary ? (
                  <div className="space-y-3">
                    <p className="text-ds-on-surface text-sm leading-relaxed">{selectedSummary.summary}</p>
                    {selectedSummary.key_points.length > 0 ? (
                      <ul className="text-ds-on-surface-variant list-disc space-y-1 pl-5 text-sm">
                        {selectedSummary.key_points.map((point) => (
                          <li key={point}>{point}</li>
                        ))}
                      </ul>
                    ) : null}
                    {selectedSummary.stale ? (
                      <p className="text-amber-800 text-xs font-medium">
                        New messages since this summary. Click Update summary to refresh.
                      </p>
                    ) : null}
                  </div>
                ) : (
                  <p className="text-ds-on-surface-variant text-sm">
                    No summary yet. Click Generate summary to create a quick read of this thread.
                  </p>
                )}
                <button
                  type="button"
                  className="text-ds-primary mt-3 text-sm font-semibold hover:underline"
                  onClick={() => hideSummaryPanel()}
                >
                  Hide summary
                </button>
              </div>
            ) : null}
            <div
              className={cn(
                "min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-5 py-6 sm:px-6",
                showSummaryPanel && "hidden"
              )}
            >
              {messagesLoading ? (
                <ConversationMessagesSkeleton />
              ) : (
                messages.filter(isRenderableTranscriptMessage).map((message) => {
                  const messageContent = message.content ?? "";
                  const hasCarousel =
                    message.role === "assistant" && messageHasProductCarousel(message.metadata);
                  const messageTime = (
                    <MessageTimestamp variant="bubble" value={message.created_at} tone="on-primary" />
                  );
                  const assistantTime = (
                    <MessageTimestamp variant="bubble" value={message.created_at} />
                  );
                  return (
                  <div
                    key={message.id}
                    className={cn(
                      "flex",
                      message.role === "user" ? "justify-end" : "justify-start",
                      hasCarousel ? "max-w-[min(100%,540px)]" : ""
                    )}
                  >
                    {message.role === "assistant" && hasCarousel ? (
                      <TranscriptAssistantMessage
                        content={messageContent}
                        metadata={message.metadata}
                        bubbleFooter={assistantTime}
                      />
                    ) : (
                    <div
                      className={cn(
                        "max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm",
                        message.role === "user"
                          ? "bg-ds-primary text-ds-on-primary rounded-tr-none"
                          : "border-ds-outline text-ds-on-surface rounded-tl-none border bg-white"
                      )}
                    >
                      {message.role === "assistant" ? (
                        <TranscriptAssistantMessage
                          content={messageContent}
                          metadata={message.metadata}
                          bubbleFooter={assistantTime}
                        />
                      ) : (
                        <UserBubbleBody timestamp={messageTime}>{messageContent}</UserBubbleBody>
                      )}
                    </div>
                    )}
                  </div>
                  );
                })
              )}
            </div>
            <div className="border-ds-outline shrink-0 border-t bg-ds-surface px-5 py-4 sm:px-6">
              {replyHint ? (
                <p className="text-ds-on-surface-variant mb-3 text-xs leading-relaxed">{replyHint}</p>
              ) : null}
              <form
                className="flex items-center gap-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  void handleReply();
                }}
              >
                <input
                  ref={replyInputRef}
                  className={cn("ds-app-field", "min-h-0 flex-1 rounded-ds-lg py-2.5")}
                  placeholder="Reply to customer…"
                  value={reply}
                  onChange={(e) => {
                    replyDraftRef.current = e.target.value;
                    setReply(e.target.value);
                  }}
                />
                <button
                  type="submit"
                  className={appButtonClassName("default", { className: "shrink-0" })}
                  disabled={!selectedConversationId || !reply.trim() || sending}
                >
                  {sending ? "Sending…" : "Send"}
                </button>
              </form>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

export default function ConversationsPage() {
  return (
    <Suspense
      fallback={
        <div className="ds-app-shell ds-app-shell--flush text-ds-on-surface-variant flex min-h-0 flex-1 flex-col text-sm">
          Loading…
        </div>
      }
    >
      <ConversationsPageContent />
    </Suspense>
  );
}
