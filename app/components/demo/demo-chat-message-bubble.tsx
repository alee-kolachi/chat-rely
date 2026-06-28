"use client";

import {
  StreamingAssistantMessage,
  type AssistantStreamPhase,
} from "@/components/chat/StreamingAssistantMessage";
import { WidgetEmbedThinkingDots } from "@/components/chat/widget-embed-thinking-dots";
import type { DemoChatMessage } from "@/lib/demo-chat-message";
import { sanitizeDemoAssistantMarkdown } from "@/lib/demo-assistant-text";
import { DEMO_ACCENT_HEX } from "@/lib/demo-constants";
import type { ProductCard } from "@/lib/product-card";
import { getWidgetPreviewContext, userBubbleGradient } from "@/lib/widget-appearance";
import { cn } from "@/lib/utils";

export function DemoChatMessageBubble({
  message,
  isSending,
  isLast,
  onShowProductDetails,
  onShowSimilarProducts,
  compact = false,
  accentColorHex,
}: {
  message: DemoChatMessage;
  isSending: boolean;
  isLast: boolean;
  onShowProductDetails?: (product: ProductCard) => void;
  onShowSimilarProducts?: (product: ProductCard) => void;
  compact?: boolean;
  accentColorHex?: string;
}) {
  const accent = accentColorHex?.trim() || DEMO_ACCENT_HEX;
  const { resolved, userChrome } = getWidgetPreviewContext(null, accentColorHex ?? accent, null);
  const assistantText =
    message.from === "assistant" ? sanitizeDemoAssistantMarkdown(message.text) : message.text;

  const assistantBubbleClass = cn(
    "max-w-full rounded-2xl rounded-tl-sm border px-3 py-2.5 leading-snug",
    compact ? "text-[13px]" : "text-[13px]",
  );
  const assistantBubbleStyle = {
    backgroundColor: resolved.colors.assistantBubble,
    borderColor: "rgba(15, 23, 42, 0.05)",
    color: resolved.colors.textPrimary,
  };

  if (message.from === "user") {
    return (
      <div className="flex justify-end">
        <div
          className={cn(
            "max-w-[85%] rounded-2xl rounded-tr-sm px-3 py-2.5 leading-snug",
            compact ? "text-[13px]" : "text-[13px]",
          )}
          style={{
            background: userBubbleGradient(resolved.colors.userBubble),
            color: userChrome.lightBg ? "#0f172a" : "#ffffff",
          }}
        >
          {message.text}
        </div>
      </div>
    );
  }

  const phase: AssistantStreamPhase =
    message.streamPhase ??
    (isLast && isSending ? "thinking" : assistantText.trim() ? "done" : "thinking");
  const hasCarousel = Boolean(message.products?.length && !message.productDetail);

  return (
    <div className="flex justify-start">
      <div
        className={cn(
          "flex min-w-0 flex-col gap-1",
          hasCarousel ? "max-w-[min(100%,640px)]" : "max-w-[92%]",
        )}
      >
        {hasCarousel ? (
          <StreamingAssistantMessage
            text={assistantText}
            phase={phase}
            errorMessage={message.errorMessage}
            statusLine={message.statusLine}
            brandColorHex={accent}
            products={message.products}
            productDetail={message.productDetail}
            productActionsDisabled={isSending}
            introBubbleClassName={assistantBubbleClass}
            introBubbleStyle={assistantBubbleStyle}
            onShowProductDetails={onShowProductDetails}
            onShowSimilarProducts={onShowSimilarProducts}
          />
        ) : phase === "thinking" && !assistantText.trim() ? (
          <WidgetEmbedThinkingDots accentColor={accent} />
        ) : (
          <div className={assistantBubbleClass} style={assistantBubbleStyle}>
            <StreamingAssistantMessage
              text={assistantText}
              phase={phase}
              errorMessage={message.errorMessage}
              statusLine={message.statusLine}
              brandColorHex={accent}
              products={message.products}
              productDetail={message.productDetail}
              productActionsDisabled={isSending}
              onShowProductDetails={onShowProductDetails}
              onShowSimilarProducts={onShowSimilarProducts}
            />
          </div>
        )}
      </div>
    </div>
  );
}
