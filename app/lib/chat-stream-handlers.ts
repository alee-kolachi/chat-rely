import type { ChatSseEvent } from "@/lib/chat-sse";
import type { AssistantStreamPhase } from "@/components/chat/StreamingAssistantMessage";
import type { ProductCard, ProductDetail } from "@/lib/product-card";
import { parseProductCards, parseProductDetail } from "@/lib/product-card";
import { stripProductListDump } from "@/lib/product-intro";

export type StreamingAssistantPatch = {
  text?: string;
  streamPhase?: AssistantStreamPhase;
  errorMessage?: string | null;
  assistantMessageId?: string | null;
  conversationId?: string | null;
  statusLine?: string | null;
  products?: ProductCard[] | null;
  productDetail?: ProductDetail | null;
  /** Commit the current assistant bubble and start a fresh one for the rest of the turn. */
  splitAfterCommit?: boolean;
};

/** Stream is far enough along to re-enable the composer (before DB persist finishes). */
export function chatStreamComposerReadyEvent(ev: ChatSseEvent): boolean {
  return ev.type === "ready" || ev.type === "error";
}

/** Stream fully finished (after persist / final metadata). */
export function chatStreamTerminalEvent(ev: ChatSseEvent): boolean {
  return ev.type === "done" || ev.type === "error";
}

export function applyChatSseEvent(
  ev: ChatSseEvent,
  current: {
    text: string;
    streamPhase: AssistantStreamPhase;
  }
): StreamingAssistantPatch | null {
  if (ev.type === "preamble") {
    const line = ev.text.trim();
    if (!line) return null;
    return {
      text: line,
      streamPhase: "done",
      statusLine: null,
      splitAfterCommit: true,
    };
  }
  if (ev.type === "status") {
    const line = ev.text.trim();
    if (!line) return null;
    return {
      streamPhase: current.streamPhase === "done" ? "done" : "streaming",
      statusLine: line,
    };
  }
  if (ev.type === "token") {
    return {
      text: current.text + ev.text,
      streamPhase: "streaming",
    };
  }
  if (ev.type === "products") {
    const nextText = stripProductListDump(current.text) || current.text;
    return {
      products: ev.products,
      productDetail: null,
      ...(nextText !== current.text ? { text: nextText } : {}),
      streamPhase: current.streamPhase === "done" ? "done" : "streaming",
    };
  }
  if (ev.type === "product_detail") {
    const nextText = stripProductListDump(current.text) || current.text;
    return {
      productDetail: ev.product,
      products: null,
      ...(nextText !== current.text ? { text: nextText } : {}),
      streamPhase: current.streamPhase === "done" ? "done" : "streaming",
    };
  }
  if (ev.type === "done") {
    const reply = typeof ev.response === "string" ? ev.response : "";
    const merged = reply.trim() || current.text.trim();
    const products = parseProductCards(ev.products);
    const productDetail = parseProductDetail(ev.product_detail);
    const hasRich = Boolean(products?.length || productDetail);
    const stripped = stripProductListDump(merged);
    const text = hasRich ? stripped || merged : merged;
    return {
      text,
      streamPhase: "done",
      statusLine: null,
      assistantMessageId:
        typeof ev.assistant_message_id === "string" ? ev.assistant_message_id : null,
      conversationId:
        typeof ev.conversation_id === "string" ? ev.conversation_id : null,
      ...(products ? { products, productDetail: null } : {}),
      ...(productDetail ? { productDetail, products: null } : {}),
    };
  }
  if (ev.type === "error") {
    return {
      streamPhase: "error",
      errorMessage: ev.message,
    };
  }
  return null;
}

/** Apply one SSE event to the trailing assistant message; may append a new assistant bubble. */
export function applyChatSseEventToAssistantMessages<
  T extends {
    from: string;
    text: string;
    streamPhase?: AssistantStreamPhase;
    statusLine?: string | null;
  },
>(
  messages: T[],
  ev: ChatSseEvent,
  createFollowUpAssistant: () => T
): T[] | null {
  if (messages.length === 0) return null;
  const last = messages[messages.length - 1];
  if (last.from !== "assistant") return null;
  const patch = applyChatSseEvent(ev, {
    text: last.text,
    streamPhase: last.streamPhase ?? "thinking",
  });
  if (!patch) return null;
  const { splitAfterCommit, ...rest } = patch;
  const next = [...messages];
  next[next.length - 1] = {
    ...last,
    ...rest,
    ...(rest.assistantMessageId !== undefined
      ? { assistantMessageId: rest.assistantMessageId }
      : {}),
  } as T;
  if (splitAfterCommit) {
    next.push(createFollowUpAssistant());
  }
  return next;
}
