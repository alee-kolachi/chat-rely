"use client";

import type { FormEvent, ReactNode, RefObject } from "react";
import { StreamingAssistantMessage, type AssistantStreamPhase } from "@/components/chat/StreamingAssistantMessage";
import { MessageTimestamp, UserBubbleBody } from "@/components/chat/message-timestamp";
import { WidgetBrandAvatar } from "@/components/chat/widget-brand-avatar";
import { parseBrandColorHex } from "@/lib/brand-chrome";
import { PlaygroundComposer } from "@/components/chat/playground-composer";
import { getWidgetPreviewContext } from "@/lib/widget-appearance";
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
}) {
  const { resolved, headerChrome, userChrome } = getWidgetPreviewContext(
    behaviorSettings,
    brandColorHex,
    planSlug
  );
  const hasBrand = Boolean(parseBrandColorHex(brandColorHex));
  const displayName = (agentName?.trim() || "Assistant preview").trim();

  const assistantBubbleClass = "rounded-2xl rounded-tl-none border px-4 py-3 text-sm shadow-sm sm:px-5";
  const assistantBubbleStyle = {
    backgroundColor: resolved.colors.assistantBubble,
    borderColor: resolved.colors.assistantBubbleBorder,
    color: resolved.colors.textPrimary,
  };

  return (
    <div
      className={cn(
        "border-ds-outline flex min-h-0 w-full max-w-[26rem] flex-col overflow-hidden rounded-[28px] border shadow-[0_20px_55px_rgba(15,23,42,0.06)]",
        shellHeightClass ?? "h-[min(37.5rem,85vh)] max-h-full shrink-0"
      )}
      style={{
        backgroundColor: resolved.colors.panelBackground,
        borderColor: resolved.colors.assistantBubbleBorder,
        color: resolved.colors.textPrimary,
      }}
    >
      <div
        className={cn(
          "flex shrink-0 items-center justify-between border-b px-5 py-3.5 sm:px-6",
          hasBrand ? "border-black/10" : "border-ds-outline bg-ds-sidebar"
        )}
        style={
          hasBrand
            ? { backgroundColor: resolved.colors.header }
            : resolved.themeMode === "dark"
              ? { backgroundColor: resolved.colors.composerBackground }
              : undefined
        }
      >
        <div className="flex min-w-0 items-center gap-3">
          <WidgetBrandAvatar
            logoUrl={websiteLogoUrl ?? null}
            logoPending={websiteLogoPending}
            hasBrand={hasBrand}
            chrome={headerChrome}
            size="header"
          />
          <div className="min-w-0">
            <h3
              className={cn(
                "truncate text-sm font-semibold tracking-tight",
                hasBrand && headerChrome ? headerChrome.titleClass : "text-ds-on-surface"
              )}
            >
              {displayName}
            </h3>
          </div>
        </div>
        {headerExtra ? <div className="shrink-0">{headerExtra}</div> : null}
      </div>

      <div
        ref={messagesScrollRef}
        onScroll={onMessagesScroll}
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain"
        style={{ backgroundColor: resolved.colors.panelBackground }}
      >
        <div className="space-y-5 px-4 py-5 sm:px-5 sm:py-8">
          {messages.map((msg, index) => {
            const isLastAssistant = msg.from === "assistant" && index === messages.length - 1;
            const phase: AssistantStreamPhase =
              msg.streamPhase ??
              (isLastAssistant && isSending ? "thinking" : msg.text.trim() ? "done" : "thinking");
            const hasCarousel =
              msg.from === "assistant" && Boolean(msg.products?.length && !msg.productDetail);
            const assistantTimeFooter =
              msg.createdAt && (phase === "done" || phase === "error") ? (
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
                      "flex gap-3",
                      hasCarousel ? "max-w-[min(100%,640px)]" : "max-w-[90%]"
                    )}
                  >
                    <WidgetBrandAvatar
                      logoUrl={websiteLogoUrl ?? null}
                      logoPending={websiteLogoPending}
                      hasBrand={hasBrand}
                      chrome={headerChrome}
                      size="bubble"
                    />
                    <div className="flex min-w-0 flex-1 flex-col gap-1">
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
                  </div>
                ) : (
                  <div
                    className="max-w-[85%] rounded-2xl rounded-tr-none px-4 py-3 text-sm leading-relaxed shadow-sm sm:px-5"
                    style={{
                      backgroundColor: resolved.colors.userBubble,
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

      <div
        className="shrink-0 px-4 pb-2.5 pt-2 sm:px-5"
        style={{ backgroundColor: resolved.colors.panelBackground }}
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
            shellStyle={{
              backgroundColor: "#FFFFFF",
            }}
            submitType="submit"
          />
          {composerError ? <p className="text-rose-600 text-sm">{composerError}</p> : null}
        </div>
      </div>
    </div>
  );
}
