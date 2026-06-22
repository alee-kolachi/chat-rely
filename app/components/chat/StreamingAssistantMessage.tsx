"use client";

import { AssistantMarkdown } from "@/components/chat/assistant-markdown";
import { WidgetEmbedThinkingDots } from "@/components/chat/widget-embed-thinking-dots";
import { ProductCarousel } from "@/components/chat/product-carousel";
import { ProductDetailView } from "@/components/chat/product-detail-view";
import { ToolActivityLine } from "@/components/chat/tool-activity-line";
import { stripProductListDump } from "@/lib/product-intro";
import { cn } from "@/lib/utils";
import type { ProductCard, ProductDetail } from "@/lib/product-card";

export type AssistantStreamPhase = "thinking" | "streaming" | "done" | "error";

const EMPTY_REPLY_FALLBACK =
  "I'm not sure about that right now. Try asking in another way, or contact our support team if you need more help.";

export function StreamingAssistantMessage({
  text,
  phase,
  errorMessage,
  statusLine,
  onRetry,
  brandColorHex,
  className,
  products,
  productDetail,
  productActionsDisabled,
  onShowProductDetails,
  onShowSimilarProducts,
  introBubbleClassName,
  introBubbleStyle,
  bubbleFooter,
  suppressEmptyFallback = false,
}: {
  text: string;
  phase: AssistantStreamPhase;
  errorMessage?: string | null;
  statusLine?: string | null;
  onRetry?: () => void;
  brandColorHex?: string | null;
  className?: string;
  products?: ProductCard[] | null;
  productDetail?: ProductDetail | null;
  productActionsDisabled?: boolean;
  onShowProductDetails?: (product: ProductCard) => void;
  onShowSimilarProducts?: (product: ProductCard) => void;
  /** When set with a product carousel, only the intro line uses this bubble styling. */
  introBubbleClassName?: string;
  introBubbleStyle?: React.CSSProperties;
  /** Shown bottom-right inside the intro bubble or below assistant content. */
  bubbleFooter?: React.ReactNode;
  /** Hide generic empty-reply fallback during human handoff. */
  suppressEmptyFallback?: boolean;
}) {
  if (phase === "error") {
    return (
      <div className={cn("text-ds-on-surface text-sm leading-relaxed", className)}>
        <p>{errorMessage ?? "Something went wrong. Try again."}</p>
        {onRetry ? (
          <button
            type="button"
            className="text-ds-primary mt-2 text-sm font-medium underline"
            onClick={onRetry}
          >
            Retry
          </button>
        ) : null}
      </div>
    );
  }

  const showDots = phase === "thinking";
  const trimmed = text.trim();
  const showRichProducts =
    Boolean(products?.length) &&
    onShowProductDetails &&
    onShowSimilarProducts &&
    (phase === "streaming" || phase === "done");
  const showRichDetail =
    Boolean(productDetail) &&
    onShowProductDetails &&
    onShowSimilarProducts &&
    (phase === "streaming" || phase === "done");
  const hasRichUi = showRichProducts || showRichDetail;
  const introText = hasRichUi ? stripProductListDump(trimmed) : trimmed;
  const showText =
    introText.length > 0 &&
    (phase === "streaming" || phase === "done") &&
    (!hasRichUi || introText.length > 0);
  const showEmptyDone =
    phase === "done" && !introText.length && !hasRichUi && !suppressEmptyFallback;
  const detachCarousel = Boolean(showRichProducts && introBubbleClassName);

  const introLine = showText ? (
    <p className="text-ds-on-surface mb-0 text-sm leading-relaxed">{introText}</p>
  ) : null;

  if (showRichProducts && products) {
    return (
      <div className={cn("flex w-full min-w-0 flex-col gap-2", className)}>
        {showDots ? <WidgetEmbedThinkingDots accentColor={brandColorHex} /> : null}
        {statusLine && phase === "streaming" ? (
          <ToolActivityLine message={statusLine} />
        ) : null}
        {introLine && detachCarousel ? (
          <div className={introBubbleClassName} style={introBubbleStyle}>
            {introLine}
            {bubbleFooter ? <div className="mt-1 flex justify-end">{bubbleFooter}</div> : null}
          </div>
        ) : (
          introLine
        )}
        <ProductCarousel
          products={products}
          disabled={productActionsDisabled}
          onShowDetails={onShowProductDetails}
          onShowSimilar={onShowSimilarProducts}
        />
        {!introLine && bubbleFooter ? <div className="flex justify-end pr-0.5">{bubbleFooter}</div> : null}
      </div>
    );
  }

  if (hasRichUi) {
    return (
      <div className={cn("min-h-[1.25rem]", className)}>
        {showDots ? <WidgetEmbedThinkingDots accentColor={brandColorHex} /> : null}
        {statusLine && phase === "streaming" ? (
          <ToolActivityLine message={statusLine} />
        ) : null}
        {introLine}
        <div className={cn(showText ? "mt-2" : "")}>
          {showRichDetail && productDetail ? (
            <ProductDetailView
              product={productDetail}
              disabled={productActionsDisabled}
              onShowDetails={onShowProductDetails}
              onShowSimilar={onShowSimilarProducts}
              embedded
            />
          ) : null}
        </div>
        {bubbleFooter ? <div className="mt-1 flex justify-end">{bubbleFooter}</div> : null}
      </div>
    );
  }

  return (
    <div className={cn("min-h-[1.25rem]", className)}>
      {showDots ? <WidgetEmbedThinkingDots accentColor={brandColorHex} /> : null}
      {statusLine && (phase === "thinking" || phase === "streaming") ? (
        <ToolActivityLine message={statusLine} />
      ) : null}
      {showText ? (
        <div className="text-ds-on-surface text-sm leading-relaxed">
          <AssistantMarkdown>{introText}</AssistantMarkdown>
        </div>
      ) : null}
      {showEmptyDone ? (
        <p className="text-ds-on-surface-variant text-sm leading-relaxed">{EMPTY_REPLY_FALLBACK}</p>
      ) : null}
      {bubbleFooter ? <div className="mt-1 flex justify-end">{bubbleFooter}</div> : null}
    </div>
  );
}
