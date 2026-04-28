 "use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { backendFetch } from "@/lib/backend-api";

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
    <div className="-m-6 min-h-[calc(100vh-3.5rem)] bg-ds-surface p-8">
      <div className="mx-auto w-full max-w-7xl">
        <header className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-ds-on-surface text-3xl font-black tracking-tight">Conversations</h1>
            <p className="text-ds-on-surface-variant mt-1 text-sm">
              Monitor live threads, review context, and jump in when needed.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              className="border-ds-outline bg-white hover:bg-ds-sidebar rounded-ds-md border px-4 py-2 text-sm font-semibold transition-colors"
              onClick={() => void loadConversations()}
            >
              Refresh
            </button>
          </div>
        </header>
        {error ? <p className="mb-3 text-sm text-rose-600">{error}</p> : null}

        <section className="grid grid-cols-1 gap-6 xl:grid-cols-[380px_1fr]">
          <div className="border-ds-outline rounded-ds-xl border bg-white shadow-sm">
            <div className="border-ds-outline flex items-center justify-between border-b px-4 py-3">
              <h2 className="text-ds-on-surface text-sm font-bold tracking-wide uppercase">Live queue</h2>
              <button className="text-ds-on-surface-variant hover:text-ds-on-surface text-xs font-medium">
                Filters
              </button>
            </div>
            <div className="divide-ds-outline divide-y">
              {loading ? <p className="p-4 text-sm text-ds-on-surface-variant">Loading conversations...</p> : null}
              {!loading && conversations.length === 0 ? (
                <p className="p-4 text-sm text-ds-on-surface-variant">No conversations yet.</p>
              ) : null}
              {conversations.map((item) => (
                <button
                  type="button"
                  key={item.id}
                  className={`w-full px-4 py-4 text-left transition-colors ${
                    selectedConversationId === item.id ? "bg-ds-sidebar/50" : "hover:bg-ds-sidebar/60"
                  }`}
                  onClick={() => setSelectedConversationId(item.id)}
                >
                  <div className="mb-1 flex items-start justify-between gap-2">
                    <p className="text-ds-on-surface text-sm font-semibold">{item.id.slice(0, 8)}</p>
                    <span className="text-ds-on-surface-variant text-[11px]">
                      {new Date(item.updated_at).toLocaleTimeString()}
                    </span>
                  </div>
                  <p className="text-ds-on-surface-variant line-clamp-1 text-xs">
                    {item.latest_message_preview ?? "No messages yet"}
                  </p>
                  <div className="mt-2 flex items-center gap-2">
                    <span
                      className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${
                        item.status === "closed"
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-blue-100 text-blue-700"
                      }`}
                    >
                      {item.status}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="border-ds-outline rounded-ds-xl border bg-white shadow-sm">
            <div className="border-ds-outline flex flex-wrap items-center justify-between gap-3 border-b px-6 py-4">
              <div>
                <h3 className="text-ds-on-surface text-sm font-bold">
                  {selectedConversation ? selectedConversation.id : "No conversation selected"}
                </h3>
                <p className="text-ds-on-surface-variant text-xs">Live transcript</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  className="border-ds-outline rounded-ds-md border bg-white px-3 py-1.5 text-xs font-semibold"
                  onClick={() => void updateStatus("open")}
                >
                  Reopen
                </button>
                <button
                  className="bg-ds-primary text-ds-on-primary rounded-ds-md px-3 py-1.5 text-xs font-semibold"
                  onClick={() => void updateStatus("closed")}
                >
                  Resolve
                </button>
              </div>
            </div>
            <div className="space-y-4 px-6 py-6">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                      message.role === "user"
                        ? "bg-ds-primary text-ds-on-primary rounded-tr-none"
                        : "border-ds-outline text-ds-on-surface rounded-tl-none border bg-white"
                    }`}
                  >
                    {message.content}
                    <div
                      className={`mt-2 text-[10px] ${
                        message.role === "user"
                          ? "text-ds-on-primary/80"
                          : "text-ds-on-surface-variant"
                      }`}
                    >
                      {new Date(message.created_at).toLocaleTimeString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="border-ds-outline border-t px-6 py-4">
              <div className="flex items-center gap-3">
                <input
                  className="border-ds-outline bg-ds-sidebar focus:border-ds-primary w-full rounded-xl border px-4 py-2.5 text-sm outline-none"
                  placeholder="Reply to customer..."
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                />
                <button
                  className="bg-ds-primary text-ds-on-primary rounded-xl px-4 py-2.5 text-sm font-semibold disabled:opacity-50"
                  onClick={() => void handleReply()}
                  disabled={!selectedConversationId || sending || !reply.trim()}
                >
                  {sending ? "Sending..." : "Send"}
                </button>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
