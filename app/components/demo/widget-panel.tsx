"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type FormEvent, type RefObject } from "react";
import { DemoChatMessageBubble } from "@/components/demo/demo-chat-message-bubble";
import {
  DEMO_CHAT_PRIMARY,
  DEMO_SIGNUP_URL,
  DEMO_WIDGET_APPEARANCE,
  DEMO_CHAT_SURFACE_TOP,
  demoWelcomePanelGradient,
} from "@/lib/demo-constants";
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
import { getWidgetPreviewContext } from "@/lib/widget-appearance";
import { parseBrandColorHex } from "@/lib/brand-chrome";
import type { ProductCard } from "@/lib/product-card";
import { cn } from "@/lib/utils";

const signupLinkClass =
  "touch-manipulation rounded-md px-2 py-1 text-[11px] font-medium transition-opacity hover:opacity-80 active:opacity-70";

export function WidgetPanel({
  displayName,
  logoUrl,
  welcomeScreen,
  suggestedPrompts,
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
  welcomeScreen: DemoWelcomeScreen;
  suggestedPrompts: string[];
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
  const hasBrand = Boolean(parseBrandColorHex(DEMO_CHAT_PRIMARY));
  const { resolved, headerChrome } = getWidgetPreviewContext(null, DEMO_CHAT_PRIMARY, DEMO_WIDGET_APPEARANCE);
  const stickToBottomRef = useRef(true);
  const prevMessageCountRef = useRef(messages.length);
  const welcomeEnabled = welcomeScreen.enabled;
  const [chatOpen, setChatOpen] = useState(() => !welcomeEnabled || messages.length > 0);

  useEffect(() => {
    if (messages.length > 0) setChatOpen(true);
  }, [messages.length]);

  const showWelcome = welcomeEnabled && !chatOpen;

  const openChat = useCallback(() => {
    setChatOpen(true);
    requestAnimationFrame(() => messageInputRef.current?.focus());
  }, [messageInputRef]);

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
    <a
      href={DEMO_SIGNUP_URL}
      className={signupLinkClass}
      style={{ color: DEMO_CHAT_PRIMARY }}
    >
      Get started →
    </a>
  );

  const shellHeightClass = welcomeEnabled
    ? "h-full w-full"
    : "h-[min(640px,calc(100dvh-96px))] w-full";

  const chatShell = (
    <WidgetChatShell
      agentName={displayName}
      brandColorHex={DEMO_CHAT_PRIMARY}
      widgetAppearance={DEMO_WIDGET_APPEARANCE}
      chatSurfaceTopColor={DEMO_CHAT_SURFACE_TOP}
      websiteLogoUrl={null}
      headerLogoSlot={
        <DemoStoreLogo
          displayName={displayName}
          logoUrl={logoUrl}
          brandColorHex={DEMO_CHAT_PRIMARY}
          size="header"
        />
      }
      shellHeightClass={shellHeightClass}
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
                brandColorHex={DEMO_CHAT_PRIMARY}
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
              accentColorHex={DEMO_CHAT_PRIMARY}
            />
          ))}
        </div>
      </div>
    </WidgetChatShell>
  );

  if (!welcomeEnabled) {
    return <div className={cn("w-full max-w-[400px]", className)}>{chatShell}</div>;
  }

  return (
    <div
      className={cn(
        "relative h-[min(640px,calc(100dvh-96px))] w-full max-w-[400px] overflow-hidden rounded-[28px] shadow-[0_20px_55px_rgba(15,23,42,0.08)]",
        className,
      )}
    >
      <div
        className={cn("absolute inset-0 flex flex-col", showWelcome && "invisible")}
        aria-hidden={showWelcome}
      >
        {chatShell}
      </div>
      <div
        className={cn(
          "absolute inset-0 flex flex-col",
          !showWelcome && "pointer-events-none invisible",
        )}
        aria-hidden={!showWelcome}
      >
        <WidgetWelcomeScreen
          agentName={displayName}
          brandColorHex={DEMO_CHAT_PRIMARY}
          panelGradient={demoWelcomePanelGradient()}
          headline={welcomeScreen.headline}
          headlineColor={welcomeScreen.headlineColor}
          description={welcomeScreen.description}
          buttonLabel={welcomeScreen.buttonLabel}
          socialLinks={welcomeScreen.socialLinks}
          websiteLogoUrl={logoUrl}
          className="min-h-0 flex-1"
          onChatClick={openChat}
        />
      </div>
    </div>
  );
}
