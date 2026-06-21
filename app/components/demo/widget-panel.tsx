"use client";

import { useEffect, type FormEvent, type RefObject } from "react";
import Link from "next/link";
import { X } from "lucide-react";
import { DemoChatMessageBubble } from "@/components/demo/demo-chat-message-bubble";
import { DemoPromptChips } from "@/components/demo/demo-prompt-chips";
import { DemoStoreLogo } from "@/components/demo/demo-store-logo";
import { PlaygroundComposer } from "@/components/chat/playground-composer";
import {
  WidgetChatPreviewFooter,
  WidgetChatShell,
} from "@/components/chat/widget-chat-shell";
import { WIDGET_FOOTER_PADDING_WITHOUT_POWERED } from "@/components/branding/powered-by-chatrely";
import type { DemoChatMessage } from "@/lib/demo-chat-message";
import { getWidgetPreviewContext } from "@/lib/widget-appearance";
import { parseBrandColorHex } from "@/lib/brand-chrome";
import type { ProductCard } from "@/lib/product-card";
import { cn } from "@/lib/utils";

export function WidgetPanel({
  displayName,
  logoUrl,
  brandColorHex,
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
  onProductSelect,
  onClose,
  className,
}: {
  displayName: string;
  logoUrl: string | null;
  brandColorHex: string;
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
  onProductSelect?: (product: ProductCard) => void;
  onClose?: () => void;
  className?: string;
}) {
  const hasBrand = Boolean(parseBrandColorHex(brandColorHex));
  const { resolved, headerChrome } = getWidgetPreviewContext(null, brandColorHex, null);

  useEffect(() => {
    const el = messagesScrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages, isSending, messagesScrollRef]);

  const headerActions = (
    <>
      <Link
        href={installUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="rounded-md px-2 py-1 text-[11px] font-medium transition-colors hover:bg-black/[0.04]"
        style={{ color: brandColorHex }}
      >
        Install →
      </Link>
      {onClose ? (
        <button
          type="button"
          onClick={onClose}
          aria-label="Close chat preview"
          className="inline-flex size-9 items-center justify-center rounded-lg text-slate-600 transition-colors hover:bg-slate-900/6 hover:text-slate-900"
        >
          <X className="size-4" strokeWidth={2} aria-hidden />
        </button>
      ) : null}
    </>
  );

  return (
    <div className={cn("w-full max-w-[400px]", className)}>
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
        hideHeaderBorder
        headerActions={headerActions}
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
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          {suggestedPrompts.length > 0 ? (
            <div className="shrink-0 px-4 pb-2 pt-1">
              <DemoPromptChips
                prompts={suggestedPrompts}
                disabled={isSending || composerDisabled}
                onSelect={onPromptSelect}
              />
            </div>
          ) : null}
          <div
            ref={messagesScrollRef}
            className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-4 pt-1"
          >
            <div className="space-y-3">
              {messages.map((message, index) => (
                <DemoChatMessageBubble
                  key={`${message.from}-${index}`}
                  message={message}
                  isSending={isSending}
                  isLast={index === messages.length - 1}
                  onProductSelect={onProductSelect}
                  compact
                  accentColorHex={brandColorHex}
                />
              ))}
            </div>
          </div>
        </div>
      </WidgetChatShell>
    </div>
  );
}
