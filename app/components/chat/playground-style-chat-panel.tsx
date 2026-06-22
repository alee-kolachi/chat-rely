"use client";

import type { FormEvent, ReactNode, RefObject } from "react";
import { StreamingAssistantMessage, type AssistantStreamPhase } from "@/components/chat/StreamingAssistantMessage";
import { MessageTimestamp, UserBubbleBody } from "@/components/chat/message-timestamp";
import { PlaygroundComposer } from "@/components/chat/playground-composer";
import {
  WidgetChatPreviewFooter,
  WidgetChatShell,
} from "@/components/chat/widget-chat-shell";
import { WidgetEmbedThinkingDots } from "@/components/chat/widget-embed-thinking-dots";
import { WIDGET_FOOTER_PADDING_WITHOUT_POWERED } from "@/components/branding/powered-by-chatrely";
import { parseBrandColorHex } from "@/lib/brand-chrome";
import {
  getWidgetPreviewContext,
  readWidgetAppearance,
  userBubbleGradient,
} from "@/lib/widget-appearance";
import { cn } from "@/lib/utils";
import type { ProductCard, ProductDetail } from "@/lib/product-card";

export type PlaygroundStyleChatMessage = {
  from: "user" | "assistant";
  text: string;
  createdAt?: string;
  streamPhase?: AssistantStreamPhase;
  errorMessage?: string | null;
  statusLine?: string | null;
  products?: ProductCard[] | null;
  productDetail?: ProductDetail | null;
};

export function PlaygroundStyleChatPanel({
  agentName,
  brandColorHex,
  behaviorSettings,
  planSlug,
  websiteLogoUrl,
  websiteLogoPending = false,
  messages,
  isSending,
  messageInput,
  onMessageInputChange,
  onSend,
  sendDisabled,
  composerPlaceholder,
  composerError,
  messageInputRef,
  messagesScrollRef,
  onMessagesScroll,
  shellHeightClass,
  headerExtra,
  onShowProductDetails,
  onShowSimilarProducts,
  composerDisabled = false,
  showPoweredBy = true,
  statusLine,
}: {
  agentName: string;
  brandColorHex?: string | null;
  behaviorSettings?: Record<string, unknown> | null;
  planSlug?: string | null;
  websiteLogoUrl?: string | null;
  websiteLogoPending?: boolean;
  messages: PlaygroundStyleChatMessage[];
  isSending: boolean;
  messageInput: string;
  onMessageInputChange: (value: string) => void;
  onSend: (event: FormEvent) => void;
  sendDisabled: boolean;
  composerPlaceholder: string;
  composerError?: string | null;
  messageInputRef: RefObject<HTMLTextAreaElement | null>;
  messagesScrollRef: RefObject<HTMLDivElement | null>;
  onMessagesScroll?: () => void;
  shellHeightClass?: string;
  headerExtra?: ReactNode;
  onShowProductDetails?: (product: ProductCard) => void;
  onShowSimilarProducts?: (product: ProductCard) => void;
  /** Static preview: composer is visible but not interactive. */
  composerDisabled?: boolean;
  showPoweredBy?: boolean;
  statusLine?: string | null;
}) {
  const widgetAppearance = readWidgetAppearance(behaviorSettings);
  const { resolved, headerChrome, userChrome } = getWidgetPreviewContext(
    behaviorSettings,
    brandColorHex,
    planSlug,
  );
  const hasBrand = Boolean(parseBrandColorHex(brandColorHex));
  const displayName = (agentName?.trim() || "Assistant preview").trim();

  const assistantBubbleClass =
    "max-w-full rounded-2xl rounded-tl-sm border px-3 py-2.5 text-[13px] leading-snug";
  const assistantBubbleStyle = {
    backgroundColor: resolved.colors.assistantBubble,
    borderColor: "rgba(15, 23, 42, 0.05)",
    color: resolved.colors.textPrimary,
  };

  return (
    <WidgetChatShell
      agentName={displayName}
      brandColorHex={brandColorHex}
      widgetAppearance={widgetAppearance}
      websiteLogoUrl={websiteLogoUrl}
      websiteLogoPending={websiteLogoPending}
      statusLine={statusLine ?? undefined}
      headerActions={headerExtra}
      shellHeightClass={shellHeightClass ?? "h-[min(37.5rem,85vh)] max-h-full shrink-0"}
      footerBorderless
      footer={
        <WidgetChatPreviewFooter showPoweredBy={showPoweredBy}>
          <div
            className={cn(
              "px-4 pt-0",
              showPoweredBy ? "pb-1.5" : WIDGET_FOOTER_PADDING_WITHOUT_POWERED,
            )}
          >
            <div className="flex flex-col gap-1">
              <PlaygroundComposer
                textareaRef={messageInputRef}
                value={messageInput}
                onChange={onMessageInputChange}
                onSend={onSend}
                sendDisabled={sendDisabled}
                disabled={composerDisabled}
                placeholder={composerPlaceholder}
                brandColorHex={brandColorHex}
                hasBrand={hasBrand}
                chrome={headerChrome}
                sendAccentColor={resolved.colors.header}
                shellStyle={{
                  backgroundColor: resolved.colors.composerBackground,
                }}
                submitType="submit"
              />
              {composerError ? <p className="text-sm text-rose-600">{composerError}</p> : null}
            </div>
          </div>
        </WidgetChatPreviewFooter>
      }
    >
      <div
        ref={messagesScrollRef}
        onScroll={onMessagesScroll}
        className="h-full min-h-0 overflow-y-auto overscroll-contain bg-transparent"
      >
        <div className="space-y-3 px-4 py-4 sm:px-4">
          {messages.map((msg, index) => {
            const isLastAssistant = msg.from === "assistant" && index === messages.length - 1;
            const phase: AssistantStreamPhase =
              msg.streamPhase ??
              (isLastAssistant && isSending ? "thinking" : msg.text.trim() ? "done" : "thinking");
            const hasCarousel =
              msg.from === "assistant" && Boolean(msg.products?.length && !msg.productDetail);
            const assistantTimeFooter =
              msg.createdAt && phase !== "thinking" && (msg.text.trim() || phase === "error") ? (
                <MessageTimestamp
                  variant="bubble"
                  value={msg.createdAt}
                  style={{ color: resolved.colors.textMuted }}
                />
              ) : null;

            return (
              <div
                key={`${msg.from}-${index}`}
                className={`flex ${msg.from === "user" ? "justify-end" : "justify-start"}`}
              >
                {msg.from === "assistant" ? (
                  <div
                    className={cn(
                      "flex min-w-0 flex-col gap-1",
                      hasCarousel ? "w-full min-w-0" : "max-w-[92%]",
                    )}
                  >
                    {hasCarousel ? (
                      <StreamingAssistantMessage
                        text={msg.text}
                        phase={phase}
                        errorMessage={msg.errorMessage}
                        statusLine={msg.statusLine}
                        brandColorHex={brandColorHex}
                        products={msg.products}
                        productDetail={msg.productDetail}
                        productActionsDisabled={isSending}
                        introBubbleClassName={assistantBubbleClass}
                        introBubbleStyle={assistantBubbleStyle}
                        bubbleFooter={assistantTimeFooter}
                        onShowProductDetails={onShowProductDetails}
                        onShowSimilarProducts={onShowSimilarProducts}
                      />
                    ) : phase === "thinking" && !msg.text.trim() ? (
                      <WidgetEmbedThinkingDots accentColor={resolved.colors.header} />
                    ) : (
                      <div className={assistantBubbleClass} style={assistantBubbleStyle}>
                        <StreamingAssistantMessage
                          text={msg.text}
                          phase={phase}
                          errorMessage={msg.errorMessage}
                          statusLine={msg.statusLine}
                          brandColorHex={brandColorHex}
                          products={msg.products}
                          productDetail={msg.productDetail}
                          productActionsDisabled={isSending}
                          onShowProductDetails={onShowProductDetails}
                          onShowSimilarProducts={onShowSimilarProducts}
                          bubbleFooter={assistantTimeFooter}
                        />
                      </div>
                    )}
                  </div>
                ) : (
                  <div
                    className="max-w-[85%] rounded-2xl rounded-tr-sm px-3 py-2.5 text-[13px] leading-snug"
                    style={{
                      background: userBubbleGradient(resolved.colors.userBubble),
                      color: userChrome.lightBg ? "#0f172a" : "#ffffff",
                    }}
                  >
                    <UserBubbleBody
                      timestamp={
                        <MessageTimestamp
                          variant="bubble"
                          value={msg.createdAt}
                          tone={userChrome.lightBg ? "muted" : "on-primary"}
                        />
                      }
                    >
                      {msg.text}
                    </UserBubbleBody>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </WidgetChatShell>
  );
}
