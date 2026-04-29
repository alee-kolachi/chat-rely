"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { backendFetch } from "@/lib/backend-api";
import { cn } from "@/lib/utils";

type Conversation = {
  id: string;
  status: string;
  latest_message_preview: string | null;
  updated_at: string;
};

type ConversationMessage = {
  id: string;
  role: "assistant" | "user";
  content: string;
  created_at: string;
};

export default function ConversationsPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [reply, setReply] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedConversation = useMemo(
    () => conversations.find((item) => item.id === selectedConversationId) ?? null,
    [conversations, selectedConversationId]
  );

  const loadConversations = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await backendFetch<{ conversations: Conversation[] }>("/api/v1/conversations");
      setConversations(data.conversations);
      if (!selectedConversationId && data.conversations[0]) {
        setSelectedConversationId(data.conversations[0].id);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load conversations");
    } finally {
      setLoading(false);
    }
  }, [selectedConversationId]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadConversations();
    }, 0);
    return () => clearTimeout(timer);
  }, [loadConversations]);

  useEffect(() => {
    if (!selectedConversationId) {
      return;
    }
    let cancelled = false;
    async function loadDetail() {
      try {
        const data = await backendFetch<{ messages: ConversationMessage[] }>(
          `/api/v1/conversations/${selectedConversationId}`
        );
        if (!cancelled) setMessages(data.messages);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load conversation");
      }
    }
    void loadDetail();
    return () => {
      cancelled = true;
    };
  }, [selectedConversationId]);

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
      setMessages(detail.messages);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to send reply");
    } finally {
      setSending(false);
    }
  }

  async function updateStatus(status: "open" | "closed") {
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
    <div className="ds-app-shell p-6 md:p-8">
      <div className="mx-auto w-full max-w-7xl">
        <header className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="ds-app-page-title">Conversations</h1>
            <p className="ds-app-page-description ds-app-page-description--wide">
              Monitor threads, review context, and jump in when needed.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="border-ds-outline text-ds-on-surface hover:bg-ds-sidebar rounded-ds-md border bg-white px-4 py-2.5 text-sm font-semibold shadow-sm transition-colors"
              onClick={() => void loadConversations()}
            >
              Refresh
            </button>
          </div>
        </header>
        {error ? <p className="mb-3 text-sm text-rose-600">{error}</p> : null}

        <section className="grid grid-cols-1 gap-6 xl:grid-cols-[380px_1fr]">
          <div className="border-ds-outline rounded-ds-xl border bg-ds-surface shadow-sm">
            <div className="border-ds-outline bg-ds-sidebar/90 flex items-center justify-between border-b px-4 py-3">
              <h2 className="ds-app-kicker text-ds-on-surface font-semibold">Live queue</h2>
              <button type="button" className="text-ds-primary text-xs font-semibold hover:underline">
                Filters
              </button>
            </div>
            <div className="divide-ds-outline divide-y">
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
                      {new Date(item.updated_at).toLocaleTimeString()}
                    </span>
                  </div>
                  <p className="text-ds-on-surface-variant line-clamp-1 text-xs">
                    {item.latest_message_preview ?? "No messages yet"}
                  </p>
                  <div className="mt-2 flex items-center gap-2">
                    <span
                      className={cn(
                        "rounded-ds-md px-1.5 py-0.5 text-[10px] font-semibold tracking-wide uppercase",
                        item.status === "closed" ? "bg-emerald-100 text-emerald-800" : "bg-ds-sidebar text-ds-primary ring-1 ring-ds-primary/25"
                      )}
                    >
                      {item.status}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="border-ds-outline flex min-h-[420px] flex-col overflow-hidden rounded-ds-xl border bg-ds-surface shadow-sm">
            <div className="border-ds-outline bg-ds-sidebar/90 flex flex-wrap items-center justify-between gap-3 border-b px-5 py-4 sm:px-6">
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
                  onClick={() => void updateStatus("closed")}
                >
                  Resolve
                </button>
              </div>
            </div>
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-6 sm:px-6">
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
                    {message.content}
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
            <div className="border-ds-outline border-t bg-ds-surface px-5 py-4 sm:px-6">
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
