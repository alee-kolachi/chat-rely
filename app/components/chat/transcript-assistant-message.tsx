"use client";

import type { ReactNode } from "react";
import { AssistantMarkdown } from "@/components/chat/assistant-markdown";
import { StreamingAssistantMessage } from "@/components/chat/StreamingAssistantMessage";
import { parseMessageProductMetadata } from "@/lib/conversation-transcript";

const CONVERSATIONS_INTRO_BUBBLE =
  "border-ds-outline text-ds-on-surface max-w-[min(100%,28rem)] rounded-2xl rounded-tl-none border bg-white px-4 py-3 text-sm leading-relaxed shadow-sm";

/** Read-only assistant bubble for stored transcripts (playground parity for product cards). */
export function TranscriptAssistantMessage({
  content,
  metadata,
  introBubbleClassName,
  bubbleFooter,
}: {
  content: string;
  metadata?: unknown;
  introBubbleClassName?: string;
  bubbleFooter?: ReactNode;
}) {
  const { products, productDetail } = parseMessageProductMetadata(metadata);
  const hasRichUi = Boolean(products?.length || productDetail);

  if (hasRichUi) {
    return (
      <StreamingAssistantMessage
        text={content}
        phase="done"
        products={products}
        productDetail={productDetail}
        productActionsDisabled
        onShowProductDetails={() => {}}
        onShowSimilarProducts={() => {}}
        introBubbleClassName={
          introBubbleClassName ?? (products?.length ? CONVERSATIONS_INTRO_BUBBLE : undefined)
        }
        bubbleFooter={bubbleFooter}
      />
    );
  }

  return (
    <div className="text-ds-on-surface text-sm leading-relaxed">
      <AssistantMarkdown>{content}</AssistantMarkdown>
      {bubbleFooter ? <div className="mt-1 flex justify-end">{bubbleFooter}</div> : null}
    </div>
  );
}
