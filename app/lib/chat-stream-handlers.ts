import type { ChatSseEvent } from "@/lib/chat-sse";
import type { AssistantStreamPhase } from "@/components/chat/StreamingAssistantMessage";
import type { ProductCard, ProductDetail } from "@/lib/product-card";
import { parseProductCards, parseProductDetail } from "@/lib/product-card";
import { introTextForProductCards } from "@/lib/product-intro";

export type StreamingAssistantPatch = {
  text?: string;
  streamPhase?: AssistantStreamPhase;
  errorMessage?: string | null;
  assistantMessageId?: string | null;
  conversationId?: string | null;
  statusLine?: string | null;
  products?: ProductCard[] | null;
  productDetail?: ProductDetail | null;
};

/** Stream finished from the client's perspective; safe to re-enable the composer. */
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
    return {
      products: ev.products,
      productDetail: null,
      text: introTextForProductCards(current.text),
      streamPhase: current.streamPhase === "done" ? "done" : "streaming",
    };
  }
  if (ev.type === "product_detail") {
    return {
      productDetail: ev.product,
      products: null,
      text: introTextForProductCards(current.text),
      streamPhase: current.streamPhase === "done" ? "done" : "streaming",
    };
  }
  if (ev.type === "done") {
    const reply = typeof ev.response === "string" ? ev.response : "";
    const merged = reply.trim() || current.text.trim();
    const products = parseProductCards(ev.products);
    const productDetail = parseProductDetail(ev.product_detail);
    const hasRich = Boolean(products?.length || productDetail);
    const text = hasRich ? introTextForProductCards(merged) : merged;
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
