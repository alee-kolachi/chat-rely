"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { DemoStoreView } from "@/components/demo/demo-store-view";
import { chatSseStream } from "@/lib/chat-sse";
import { applyChatSseEventToAssistantMessages } from "@/lib/chat-stream-handlers";
import { BackendApiError, backendFetch } from "@/lib/backend-api";
import type { DemoChatMessage } from "@/lib/demo-chat-message";
import { demoConfigToStoreMeta, type DemoPublicConfigResponse } from "@/lib/demo-store-meta";
import {
  productActionUserMessage,
  type ProductActionRequest,
  type ProductCard,
} from "@/lib/product-card";

function newVisitorId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `visitor-${Date.now()}`;
}

export default function DemoStorePage() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;
  const [config, setConfig] = useState<DemoPublicConfigResponse | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [messages, setMessages] = useState<DemoChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [composerError, setComposerError] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const visitorIdRef = useRef(newVisitorId());
  const chatAbortRef = useRef<AbortController | null>(null);
  const messagesScrollRef = useRef<HTMLDivElement | null>(null);
  const messageInputRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await backendFetch<DemoPublicConfigResponse>(
          `/api/v1/demo/${encodeURIComponent(slug)}`,
        );
        if (!cancelled) setConfig(data);
      } catch (e) {
        if (!cancelled) {
          setLoadError(e instanceof BackendApiError ? e.message : "Demo not found");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  const chatDisabled = !config?.chat_available || Boolean(config?.limit_message);

  const sendText = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || isSending || chatDisabled || !config) return;

      chatAbortRef.current?.abort();
      const abort = new AbortController();
      chatAbortRef.current = abort;

      setMessages((prev) => [...prev, { from: "user", text: trimmed }]);
      setInput("");
      setComposerError(null);
      setIsSending(true);

      setMessages((prev) => [...prev, { from: "assistant", text: "", streamPhase: "streaming" }]);

      try {
        for await (const ev of chatSseStream(`/api/v1/demo/${encodeURIComponent(slug)}/stream`, {
          method: "POST",
          body: JSON.stringify({
            message: trimmed,
            conversation_id: conversationId,
            visitor_id: visitorIdRef.current,
          }),
          signal: abort.signal,
        })) {
          if (ev.type === "ready" || ev.type === "done") {
            const cid = typeof ev.conversation_id === "string" ? ev.conversation_id : null;
            if (cid) setConversationId(cid);
          }
          setMessages((prev) => {
            const next = applyChatSseEventToAssistantMessages(prev, ev, () => ({
              from: "assistant" as const,
              text: "",
              streamPhase: "streaming" as const,
            }));
            return (next ?? prev) as DemoChatMessage[];
          });
        }
      } catch (e) {
        if (abort.signal.aborted) return;
        const msg = e instanceof BackendApiError ? e.message : "Could not send message";
        setComposerError(msg);
        setMessages((prev) => {
          const lastIndex = prev.length - 1;
          if (lastIndex < 0 || prev[lastIndex]?.from !== "assistant") return prev;
          return prev.map((m, i) =>
            i === lastIndex
              ? { ...m, streamPhase: "error", errorMessage: msg, text: m.text || msg }
              : m,
          );
        });
      } finally {
        setIsSending(false);
      }
    },
    [chatDisabled, config, conversationId, isSending, slug],
  );

  async function onSend(event: FormEvent) {
    event.preventDefault();
    await sendText(input);
  }

  const onProductSelect = useCallback(
    async (product: ProductCard) => {
      const action: ProductActionRequest = {
        type: "details",
        handle: product.handle,
        title: product.title,
      };
      await sendText(productActionUserMessage(action));
    },
    [sendText],
  );

  if (loadError) {
    return (
      <main className="mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center px-6 text-center sm:max-w-3xl">
        <p className="text-lg text-neutral-700">{loadError}</p>
      </main>
    );
  }

  if (!config) {
    return (
      <main className="mx-auto flex min-h-screen max-w-2xl items-center justify-center px-6 sm:max-w-3xl">
        <p className="text-neutral-500">Loading demo…</p>
      </main>
    );
  }

  return (
    <DemoStoreView
      store={demoConfigToStoreMeta(config)}
      messages={messages}
      isSending={isSending}
      input={input}
      onInputChange={setInput}
      onSend={onSend}
      onPromptSelect={(prompt) => void sendText(prompt)}
      sendDisabled={isSending || chatDisabled}
      composerDisabled={chatDisabled}
      composerPlaceholder={config.limit_message || "Ask about products, shipping, or returns…"}
      composerError={composerError}
      messageInputRef={messageInputRef}
      messagesScrollRef={messagesScrollRef}
      onProductSelect={onProductSelect}
    />
  );
}
