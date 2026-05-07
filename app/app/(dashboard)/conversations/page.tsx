"use client";

import { Suspense, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { AssistantMarkdown } from "@/components/chat/assistant-markdown";
import { useDashboardAgent } from "@/components/layout/dashboard-agent-context";
import { backendFetch } from "@/lib/backend-api";
import { cn } from "@/lib/utils";

const POLL_INTERVAL_MS = 5000;

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
};

type ConversationMessage = {
  id: string;
  role: string;
  content: string;
  created_at: string;
};

function ConversationsPageContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const conversationFromUrl = searchParams.get("conversation");
  const agentFromUrl = searchParams.get("agent");
  const trainingTopicFromUrl = searchParams.get("training_topic");
  const { selectedAgentId } = useDashboardAgent();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [reply, setReply] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [trainingTopicFilter, setTrainingTopicFilter] = useState("");
  const selectedConversationIdRef = useRef<string | null>(null);
  useLayoutEffect(() => {
    selectedConversationIdRef.current = selectedConversationId;
  }, [selectedConversationId]);

  const selectedConversation = useMemo(
    () => conversations.find((item) => item.id === selectedConversationId) ?? null,
    [conversations, selectedConversationId]
  );

  const activeFilterCount = useMemo(() => {
    let n = 0;
    if (statusFilter) n += 1;
    if (dateFrom) n += 1;
    if (dateTo) n += 1;
    if (trainingTopicFilter.trim()) n += 1;
    return n;
  }, [statusFilter, dateFrom, dateTo, trainingTopicFilter]);

  useEffect(() => {
    setTrainingTopicFilter((trainingTopicFromUrl ?? "").trim());
  }, [trainingTopicFromUrl]);

  const loadConversations = useCallback(async (opts?: { silent?: boolean }) => {
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
      const path =
        qs.toString().length > 0 ? `/api/v1/conversations?${qs.toString()}` : "/api/v1/conversations";
      const data = await backendFetch<{ conversations: Conversation[] }>(path);
      setConversations(data.conversations);
      const currentId = selectedConversationIdRef.current;
      if (!currentId && data.conversations[0]) {
        setSelectedConversationId(data.conversations[0].id);
      }
      if (
        currentId &&
        data.conversations.length > 0 &&
        !data.conversations.some((c) => c.id === currentId)
      ) {
        setSelectedConversationId(data.conversations[0].id);
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
  }, [agentFromUrl, selectedAgentId, statusFilter, dateFrom, dateTo, trainingTopicFilter]);

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

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadConversations();
    }, 0);
    return () => clearTimeout(timer);
  }, [loadConversations]);

  useEffect(() => {
    const id = conversationFromUrl?.trim();
    if (!id) return;
    queueMicrotask(() => setSelectedConversationId(id));
  }, [conversationFromUrl]);

  const refreshMessages = useCallback(
    async (conversationId: string, opts?: { silent?: boolean }) => {
      const silent = Boolean(opts?.silent);
      if (!silent) {
        setError(null);
      }
      try {
        const data = await backendFetch<{ messages: ConversationMessage[] }>(
          `/api/v1/conversations/${conversationId}`
        );
        const visible = data.messages.filter((m) => m.role === "user" || m.role === "assistant");
        if (selectedConversationIdRef.current === conversationId) {
          setMessages(visible);
        }
      } catch (e) {
        if (!silent && selectedConversationIdRef.current === conversationId) {
          setError(e instanceof Error ? e.message : "Failed to load conversation");
        }
      }
    },
    []
  );

  useEffect(() => {
    if (!selectedConversationId) {
      return;
    }
    const id = selectedConversationId;
    queueMicrotask(() => {
      void refreshMessages(id, { silent: false });
    });
  }, [selectedConversationId, refreshMessages]);

  useEffect(() => {
    const tick = () => {
      void loadConversations({ silent: true });
      const id = selectedConversationIdRef.current;
      if (id) void refreshMessages(id, { silent: true });
    };
    const interval = window.setInterval(tick, POLL_INTERVAL_MS);
    const onVisibility = () => {
      if (document.visibilityState === "visible") tick();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [loadConversations, refreshMessages]);

  async function handleReply() {
    if (!selectedConversationId || !reply.trim() || sending) return;
    setSending(true);
    setError(null);
    try {
      await backendFetch(`/api/v1/conversations/${selectedConversationId}/messages`, {
        method: "POST",
        body: JSON.stringify({ role: "assistant", content: reply.trim() }),
      });
      setReply("");
      const detail = await backendFetch<{ messages: ConversationMessage[] }>(
        `/api/v1/conversations/${selectedConversationId}`
      );
      setMessages(detail.messages.filter((m) => m.role === "user" || m.role === "assistant"));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to send reply");
    } finally {
      setSending(false);
    }
  }

  async function updateStatus(status: "open" | "resolved") {
    if (!selectedConversationId) return;
    setError(null);
    try {
      await backendFetch(`/api/v1/conversations/${selectedConversationId}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      await loadConversations();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update status");
    }
  }

  return (
    <div className="ds-app-shell flex min-h-0 flex-1 flex-col overflow-hidden p-6 md:p-8">
      <div className="mx-auto flex min-h-0 w-full max-w-7xl flex-1 flex-col overflow-hidden">
        <header className="mb-6 shrink-0 md:mb-8">
          <h1 className="ds-app-page-title">Conversations</h1>
          <p className="ds-app-page-description ds-app-page-description--wide">
            Monitor threads, review context, and jump in when needed.
          </p>
        </header>
        {error ? <p className="mb-3 shrink-0 text-sm text-rose-600">{error}</p> : null}

        <section className="grid min-h-0 flex-1 grid-cols-1 grid-rows-[minmax(0,1fr)_minmax(0,2fr)] gap-6 overflow-hidden xl:grid-cols-[380px_1fr] xl:grid-rows-[minmax(0,1fr)]">
          <div className="border-ds-outline flex min-h-0 flex-col overflow-hidden rounded-ds-xl border bg-ds-surface shadow-sm">
            <div className="border-ds-outline bg-ds-sidebar/90 flex shrink-0 items-center justify-between border-b px-4 py-3">
              <h2 className="ds-app-kicker text-ds-on-surface font-semibold">Live queue</h2>
              <button
                type="button"
                className="text-ds-primary flex items-center gap-1.5 text-xs font-semibold hover:underline"
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
                  <span className="text-ds-on-surface-variant mb-1 block text-[11px] font-semibold uppercase tracking-wide">
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
                <div className="grid grid-cols-2 gap-3">
                  <label className="block min-w-0">
                    <span className="text-ds-on-surface-variant mb-1 block text-[11px] font-semibold uppercase tracking-wide">
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
                    <span className="text-ds-on-surface-variant mb-1 block text-[11px] font-semibold uppercase tracking-wide">
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
                <p className="text-ds-on-surface-variant text-[11px] leading-snug">
                  Date range filters by when the conversation started (your local timezone).
                </p>
                <label className="block">
                  <span className="text-ds-on-surface-variant mb-1 block text-[11px] font-semibold uppercase tracking-wide">
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
                  className="border-ds-outline text-ds-on-surface-variant hover:bg-ds-sidebar hover:text-ds-on-surface rounded-ds-md border bg-white px-3 py-2 text-xs font-semibold transition-colors disabled:pointer-events-none disabled:opacity-40"
                  onClick={() => clearFilters()}
                  disabled={activeFilterCount === 0}
                >
                  Clear filters
                </button>
              </div>
            ) : null}
            <div className="divide-ds-outline min-h-0 flex-1 divide-y overflow-y-auto overscroll-contain">
              {loading ? (
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
                    "w-full px-4 py-4 text-left transition-colors",
                    selectedConversationId === item.id ? "bg-ds-primary/8" : "hover:bg-ds-sidebar/70"
                  )}
                  onClick={() => setSelectedConversationId(item.id)}
                >
                  <div className="mb-1 flex items-start justify-between gap-2">
                    <p className="text-ds-on-surface text-sm font-semibold">{item.id.slice(0, 8)}</p>
                    <span className="text-ds-on-surface-variant shrink-0 text-[11px]">
                      {new Date(item.last_activity_at || item.updated_at).toLocaleTimeString()}
                    </span>
                  </div>
                  <p className="text-ds-on-surface-variant line-clamp-1 text-xs">
                    {item.latest_message_preview ?? "No messages yet"}
                  </p>
                  <div className="mt-2 flex items-center gap-2">
                    <span
                      className={cn(
                        "rounded-ds-md px-1.5 py-0.5 text-[10px] font-semibold tracking-wide uppercase",
                        item.status === "resolved" || item.status === "idle_closed"
                          ? "bg-emerald-100 text-emerald-800"
                          : item.status === "escalated"
                            ? "bg-rose-100 text-rose-800"
                            : "bg-ds-sidebar text-ds-primary ring-1 ring-ds-primary/25"
                      )}
                    >
                      {item.status}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="border-ds-outline flex min-h-0 flex-col overflow-hidden rounded-ds-xl border bg-ds-surface shadow-sm">
            <div className="border-ds-outline bg-ds-sidebar/90 flex shrink-0 flex-wrap items-center justify-between gap-3 border-b px-5 py-4 sm:px-6">
              <div className="min-w-0">
                <h3 className="text-ds-on-surface truncate text-sm font-semibold">
                  {selectedConversation ? selectedConversation.id : "No conversation selected"}
                </h3>
                <p className="text-ds-on-surface-variant text-xs">Live transcript</p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <button
                  type="button"
                  className="border-ds-outline text-ds-on-surface hover:bg-ds-sidebar rounded-ds-md border bg-white px-3 py-1.5 text-xs font-semibold transition-colors"
                  onClick={() => void updateStatus("open")}
                >
                  Reopen
                </button>
                <button
                  type="button"
                  className="bg-ds-primary text-ds-on-primary hover:bg-ds-secondary rounded-ds-md px-3 py-1.5 text-xs font-semibold transition-colors"
                  onClick={() => void updateStatus("resolved")}
                >
                  Resolve
                </button>
              </div>
            </div>
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-5 py-6 sm:px-6">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={cn("flex", message.role === "user" ? "justify-end" : "justify-start")}
                >
                  <div
                    className={cn(
                      "max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm",
                      message.role === "user"
                        ? "bg-ds-primary text-ds-on-primary rounded-tr-none"
                        : "border-ds-outline text-ds-on-surface rounded-tl-none border bg-white"
                    )}
                  >
                    {message.role === "assistant" ? (
                      <AssistantMarkdown>{message.content}</AssistantMarkdown>
                    ) : (
                      message.content
                    )}
                    <div
                      className={cn(
                        "mt-2 text-[10px]",
                        message.role === "user" ? "text-ds-on-primary/80" : "text-ds-on-surface-variant"
                      )}
                    >
                      {new Date(message.created_at).toLocaleTimeString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="border-ds-outline shrink-0 border-t bg-ds-surface px-5 py-4 sm:px-6">
              <div className="flex items-center gap-3">
                <input
                  className={cn("ds-app-field", "min-h-0 flex-1 rounded-ds-lg py-2.5")}
                  placeholder="Reply to customer…"
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                />
                <button
                  type="button"
                  className="bg-ds-primary text-ds-on-primary hover:bg-ds-secondary shrink-0 rounded-ds-lg px-4 py-2.5 text-sm font-semibold transition-colors disabled:pointer-events-none disabled:opacity-45"
                  onClick={() => void handleReply()}
                  disabled={!selectedConversationId || sending || !reply.trim()}
                >
                  {sending ? "Sending…" : "Send"}
                </button>
              </div>
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
        <div className="ds-app-shell text-ds-on-surface-variant flex min-h-0 flex-1 flex-col p-6 text-sm md:p-8">
          Loading…
        </div>
      }
    >
      <ConversationsPageContent />
    </Suspense>
  );
}
