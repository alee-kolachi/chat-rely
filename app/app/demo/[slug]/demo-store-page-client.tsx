"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { DemoStoreView } from "@/components/demo/demo-store-view";
import { chatSseStream } from "@/lib/chat-sse";
import { applyChatSseEventToAssistantMessages } from "@/lib/chat-stream-handlers";
import { BackendApiError, backendFetch } from "@/lib/backend-api";
import type { DemoChatMessage } from "@/lib/demo-chat-message";
import {
  demoConfigToStoreMeta,
  mergeCatalogIntoStoreMeta,
  type DemoCatalogLoadResponse,
  type DemoPublicConfigResponse,
} from "@/lib/demo-store-meta";
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

type DemoStorePageClientProps = {
  slug: string;
  initialConfig: DemoPublicConfigResponse;
};

export function DemoStorePageClient({ slug, initialConfig }: DemoStorePageClientProps) {
  const router = useRouter();
  const [config] = useState(initialConfig);
  const [storeMeta, setStoreMeta] = useState(() => demoConfigToStoreMeta(initialConfig));
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogError, setCatalogError] = useState<string | null>(null);
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
    router.prefetch("/signup");
  }, [router]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const catalog = await backendFetch<DemoCatalogLoadResponse>(
          `/api/v1/demo/${encodeURIComponent(slug)}/catalog`,
          { method: "POST", skipAuth: true },
        );
        if (!cancelled) {
          setStoreMeta((prev) => mergeCatalogIntoStoreMeta(prev, catalog));
          setCatalogError(null);
        }
      } catch (e) {
        if (!cancelled) {
          setCatalogError(e instanceof BackendApiError ? e.message : "Could not load catalog");
        }
      } finally {
        if (!cancelled) setCatalogLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  const chatDisabled =
    catalogLoading ||
    Boolean(catalogError) ||
    !config.chat_available ||
    Boolean(config.limit_message);

  const sendText = useCallback(
    async (text: string, productAction?: ProductActionRequest) => {
      const trimmed = text.trim();
      if (!trimmed || isSending || chatDisabled) return;

      chatAbortRef.current?.abort();
      const abort = new AbortController();
      chatAbortRef.current = abort;

      setMessages((prev) => [...prev, { from: "user", text: trimmed }]);
      setInput("");
      setComposerError(null);
      setIsSending(true);

      setMessages((prev) => [...prev, { from: "assistant", text: "", streamPhase: "thinking" }]);

      try {
        for await (const ev of chatSseStream(`/api/v1/demo/${encodeURIComponent(slug)}/stream`, {
          method: "POST",
          body: JSON.stringify({
            message: trimmed,
            conversation_id: conversationId,
            visitor_id: visitorIdRef.current,
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
          signal: abort.signal,
          skipAuth: true,
        })) {
          if (ev.type === "ready" || ev.type === "done") {
            const cid = typeof ev.conversation_id === "string" ? ev.conversation_id : null;
            if (cid) setConversationId(cid);
          }
          setMessages((prev) => {
            const next = applyChatSseEventToAssistantMessages(prev, ev, () => ({
              from: "assistant" as const,
              text: "",
              streamPhase: "thinking" as const,
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
    [chatDisabled, conversationId, isSending, slug],
  );

  async function onSend(event: FormEvent) {
    event.preventDefault();
    await sendText(input);
  }

  const runProductAction = useCallback(
    async (action: ProductActionRequest) => {
      await sendText(productActionUserMessage(action), action);
    },
    [sendText],
  );

  const onShowProductDetails = useCallback(
    (product: ProductCard) => {
      void runProductAction({
        type: "details",
        handle: product.handle,
        title: product.title,
      });
    },
    [runProductAction],
  );

  const onShowSimilarProducts = useCallback(
    (product: ProductCard) => {
      void runProductAction({
        type: "similar",
        handle: product.handle,
        title: product.title,
      });
    },
    [runProductAction],
  );

  const composerPlaceholder = catalogLoading
    ? "Loading store catalog…"
    : catalogError || config.limit_message || "Ask about products, shipping, or returns…";

  return (
    <DemoStoreView
      store={storeMeta}
      messages={messages}
      isSending={isSending}
      input={input}
      onInputChange={setInput}
      onSend={onSend}
      onPromptSelect={(prompt) => void sendText(prompt)}
      sendDisabled={isSending || chatDisabled}
      composerDisabled={chatDisabled}
      composerPlaceholder={composerPlaceholder}
      composerError={composerError ?? catalogError}
      messageInputRef={messageInputRef}
      messagesScrollRef={messagesScrollRef}
      onShowProductDetails={onShowProductDetails}
      onShowSimilarProducts={onShowSimilarProducts}
    />
  );
}
