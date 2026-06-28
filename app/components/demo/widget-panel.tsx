"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type FormEvent, type RefObject } from "react";
import Link from "next/link";
import { DemoChatMessageBubble } from "@/components/demo/demo-chat-message-bubble";
import { DemoPromptChips } from "@/components/demo/demo-prompt-chips";
import { DemoStoreLogo } from "@/components/demo/demo-store-logo";
import { PlaygroundComposer } from "@/components/chat/playground-composer";
import { WidgetWelcomeScreen } from "@/components/chat/widget-welcome-screen";
import {
  WidgetChatPreviewFooter,
  WidgetChatShell,
} from "@/components/chat/widget-chat-shell";
import { WIDGET_FOOTER_PADDING_WITHOUT_POWERED } from "@/components/branding/powered-by-chatrely";
import type { DemoChatMessage } from "@/lib/demo-chat-message";
import type { DemoWelcomeScreen } from "@/lib/demo-store-meta";
import { DEMO_WIDGET_FRAME_CLASS } from "@/lib/demo-constants";
import { getWidgetPreviewContext } from "@/lib/widget-appearance";
import { parseBrandColorHex } from "@/lib/brand-chrome";
import type { ProductCard } from "@/lib/product-card";
import { cn } from "@/lib/utils";

export function WidgetPanel({
  displayName,
  logoUrl,
  brandColorHex,
  welcomeScreen,
  suggestedPrompts,
  installUrl,
  messages,
  isSending,
  input,
  onInputChange,
  onSend,
  onPromptSelect,
  sendDisabled,
  composerDisabled,
  composerPlaceholder,
  composerError,
  messageInputRef,
  messagesScrollRef,
  onShowProductDetails,
  onShowSimilarProducts,
  className,
}: {
  displayName: string;
  logoUrl: string | null;
  brandColorHex: string;
  welcomeScreen: DemoWelcomeScreen;
  suggestedPrompts: string[];
  installUrl: string;
  messages: DemoChatMessage[];
  isSending: boolean;
  input: string;
  onInputChange: (value: string) => void;
  onSend: (event: FormEvent) => void;
  onPromptSelect: (prompt: string) => void;
  sendDisabled: boolean;
  composerDisabled?: boolean;
  composerPlaceholder: string;
  composerError?: string | null;
  messageInputRef: RefObject<HTMLTextAreaElement | null>;
  messagesScrollRef: RefObject<HTMLDivElement | null>;
  onShowProductDetails?: (product: ProductCard) => void;
  onShowSimilarProducts?: (product: ProductCard) => void;
  className?: string;
}) {
  const hasBrand = Boolean(parseBrandColorHex(brandColorHex));
  const { resolved, headerChrome } = getWidgetPreviewContext(null, brandColorHex, null);
  const stickToBottomRef = useRef(true);
  const prevMessageCountRef = useRef(messages.length);
  const welcomeEnabled = welcomeScreen.enabled;
  const [chatOpen, setChatOpen] = useState(() => !welcomeEnabled || messages.length > 0);

  useEffect(() => {
    if (messages.length > 0) setChatOpen(true);
  }, [messages.length]);

  const showWelcome = welcomeEnabled && !chatOpen;

  const onMessagesScroll = useCallback(() => {
    const el = messagesScrollRef.current;
    if (!el) return;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight <= 80;
    stickToBottomRef.current = nearBottom;
  }, [messagesScrollRef]);

  useLayoutEffect(() => {
    if (messages.length > prevMessageCountRef.current) {
      const last = messages[messages.length - 1];
      if (last?.from === "user") stickToBottomRef.current = true;
    }
    prevMessageCountRef.current = messages.length;
  }, [messages]);

  useLayoutEffect(() => {
    const el = messagesScrollRef.current;
    if (!el || !stickToBottomRef.current) return;
    el.scrollTop = el.scrollHeight;
  }, [messages, isSending, messagesScrollRef]);

  const headerActions = (
    <Link
      href={installUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="rounded-md px-2 py-1 text-[11px] font-medium transition-colors hover:bg-black/[0.04]"
      style={{ color: brandColorHex }}
    >
      Install →
    </Link>
  );

  if (showWelcome) {
    return (
      <div
        className={cn(
          DEMO_WIDGET_FRAME_CLASS,
          "flex h-[min(640px,calc(100dvh-96px))] flex-col",
          className,
        )}
      >
        <WidgetWelcomeScreen
          agentName={displayName}
          brandColorHex={brandColorHex}
          panelBackgroundHex={resolved.colors.panelBackground}
          headline={welcomeScreen.headline}
          headlineColor={welcomeScreen.headlineColor}
          description={welcomeScreen.description}
          buttonLabel={welcomeScreen.buttonLabel}
          socialLinks={welcomeScreen.socialLinks}
          websiteLogoUrl={logoUrl}
          className="min-h-0 flex-1"
          onChatClick={() => setChatOpen(true)}
        />
      </div>
    );
  }

  return (
    <div className={cn(DEMO_WIDGET_FRAME_CLASS, className)}>
      <WidgetChatShell
        agentName={displayName}
        brandColorHex={brandColorHex}
        websiteLogoUrl={null}
        headerLogoSlot={
          <DemoStoreLogo
            displayName={displayName}
            logoUrl={logoUrl}
            brandColorHex={brandColorHex}
            size="header"
          />
        }
        shellHeightClass="h-[min(640px,calc(100dvh-96px))] w-full"
        shellBorderless
        hideHeaderBorder
        headerActions={headerActions}
        onHeaderBack={welcomeEnabled ? () => setChatOpen(false) : undefined}
        headerBackLabel="Back to welcome screen"
        footerBorderless
        footer={
          <WidgetChatPreviewFooter showPoweredBy={false}>
            <div className={cn("px-4 pt-0", WIDGET_FOOTER_PADDING_WITHOUT_POWERED)}>
              <div className="flex flex-col gap-1.5">
                <PlaygroundComposer
                  textareaRef={messageInputRef}
                  value={input}
                  onChange={onInputChange}
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
          className="h-full min-h-0 overflow-y-auto overscroll-contain"
        >
          <div className="space-y-3 px-4 pb-4 pt-3">
            {suggestedPrompts.length > 0 ? (
              <div className="pb-1">
                <DemoPromptChips
                  prompts={suggestedPrompts}
                  disabled={isSending || composerDisabled}
                  onSelect={onPromptSelect}
                />
              </div>
            ) : null}
            {messages.map((message, index) => (
              <DemoChatMessageBubble
                key={`${message.from}-${index}`}
                message={message}
                isSending={isSending}
                isLast={index === messages.length - 1}
                onShowProductDetails={onShowProductDetails}
                onShowSimilarProducts={onShowSimilarProducts}
                compact
                accentColorHex={brandColorHex}
              />
            ))}
          </div>
        </div>
      </WidgetChatShell>
    </div>
  );
}
