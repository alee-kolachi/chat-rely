"use client";

import { WidgetEmbedThinkingDots } from "@/components/chat/widget-embed-thinking-dots";
import { DemoProductRow } from "@/components/demo/demo-product-row";
import type { DemoChatMessage } from "@/lib/demo-chat-message";
import { DEMO_ACCENT_HEX } from "@/lib/demo-constants";
import type { ProductCard } from "@/lib/product-card";
import { stripProductListDump } from "@/lib/product-intro";
import { cn } from "@/lib/utils";

export function DemoChatMessageBubble({
  message,
  isSending,
  isLast,
  onProductSelect,
  compact = false,
  accentColorHex,
}: {
  message: DemoChatMessage;
  isSending: boolean;
  isLast: boolean;
  onProductSelect?: (product: ProductCard) => void;
  compact?: boolean;
  accentColorHex?: string;
}) {
  const accent = accentColorHex?.trim() || DEMO_ACCENT_HEX;
  const botBubbleClass = cn(
    "max-w-full overflow-visible rounded-2xl border border-neutral-200/90 bg-white text-neutral-800 shadow-sm break-words",
    compact ? "px-3 py-2.5 text-[13px] leading-relaxed" : "px-3.5 py-2.5 text-[14px] leading-relaxed",
  );

  if (message.from === "user") {
    return (
      <div className="flex justify-end">
        <div
          className={cn(
            "max-w-[88%] rounded-2xl rounded-br-md text-white",
            compact ? "px-3 py-2 text-[13px] leading-snug" : "px-3.5 py-2.5 text-[14px] leading-relaxed",
          )}
          style={{ backgroundColor: accent }}
        >
          {message.text}
        </div>
      </div>
    );
  }

  const phase =
    message.streamPhase ??
    (isLast && isSending ? "thinking" : message.text.trim() ? "done" : "thinking");

  if (phase === "error") {
    return (
      <div className="flex justify-start">
        <div className={cn(botBubbleClass, "border-rose-200 bg-rose-50 text-rose-800")}>
          {message.errorMessage ?? message.text ?? "Something went wrong. Try again."}
        </div>
      </div>
    );
  }

  const products = message.products ?? [];
  const detailCard = message.productDetail
    ? [
        {
          handle: message.productDetail.handle,
          title: message.productDetail.title,
          url: message.productDetail.url,
          image_url: message.productDetail.image_url,
          price: message.productDetail.price,
        },
      ]
    : [];
  const rowProducts = products.length > 0 ? products : detailCard;
  const showProducts =
    rowProducts.length > 0 && (phase === "streaming" || phase === "done");
  const introText = showProducts ? stripProductListDump(message.text.trim()) : message.text.trim();
  const showThinking = phase === "thinking" && !introText;

  return (
    <div className="flex justify-start">
      <div className="flex min-w-0 max-w-full flex-col gap-2.5">
        {(showThinking || introText || message.statusLine) && (
          <div className={botBubbleClass}>
            {showThinking ? (
              <WidgetEmbedThinkingDots accentColor={accent} />
            ) : (
              <>
                {introText ? (
                  <p className="whitespace-pre-wrap break-words text-[13px] leading-relaxed text-neutral-800">
                    {introText}
                  </p>
                ) : null}
                {message.statusLine && phase === "streaming" ? (
                  <p className="mt-1 text-[12px] text-neutral-500">{message.statusLine}</p>
                ) : null}
              </>
            )}
          </div>
        )}
        {showProducts ? (
          <DemoProductRow
            products={rowProducts}
            onSelect={onProductSelect}
            disabled={isSending}
            compact={compact}
            brandColorHex={accentColorHex}
          />
        ) : null}
      </div>
    </div>
  );
}
