import { parseProductCards, parseProductDetail, type ProductCard, type ProductDetail } from "@/lib/product-card";

/** Shape shared by API message DTOs and UI rows when deciding transcript visibility. */
export type TranscriptMessageLike = {
  role: string;
  content?: string | null;
  tool_call_payload?: unknown;
  metadata?: unknown;
};

export function parseMessageProductMetadata(metadata: unknown): {
  products?: ProductCard[];
  productDetail?: ProductDetail;
} {
  if (!metadata || typeof metadata !== "object") return {};
  const meta = metadata as Record<string, unknown>;
  return {
    products: parseProductCards(meta.products),
    productDetail: parseProductDetail(meta.product_detail),
  };
}

export function messageHasProductCarousel(metadata: unknown): boolean {
  const { products, productDetail } = parseMessageProductMetadata(metadata);
  return Boolean(products?.length && !productDetail);
}

export function messageHasProductUi(metadata: unknown): boolean {
  const { products, productDetail } = parseMessageProductMetadata(metadata);
  return Boolean(products?.length || productDetail);
}

/**
 * Assistant rows persisted only to record tool calls (empty user-visible text).
 * These should not appear as empty bubbles in operator/customer transcripts.
 */
export function isToolOnlyAssistantMessage(message: TranscriptMessageLike): boolean {
  if (message.role !== "assistant") return false;
  if ((message.content ?? "").trim().length > 0) return false;
  const tcp = message.tool_call_payload;
  if (tcp == null || typeof tcp !== "object") return false;
  const toolCalls = (tcp as { tool_calls?: unknown }).tool_calls;
  return Array.isArray(toolCalls) && toolCalls.length > 0;
}

/** User/assistant rows shown in support/playground transcripts (excludes tool-orchestration stubs). */
export function isRenderableTranscriptMessage(message: TranscriptMessageLike): boolean {
  if (message.role !== "user" && message.role !== "assistant") return false;
  return !isToolOnlyAssistantMessage(message);
}
