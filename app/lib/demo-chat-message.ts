import type { AssistantStreamPhase } from "@/components/chat/StreamingAssistantMessage";
import type { ProductCard, ProductDetail } from "@/lib/product-card";

/** Demo page message — product cards render inline below assistant text. */
export type DemoChatMessage = {
  from: "user" | "assistant";
  text: string;
  streamPhase?: AssistantStreamPhase;
  errorMessage?: string | null;
  statusLine?: string | null;
  products?: ProductCard[] | null;
  productDetail?: ProductDetail | null;
};
