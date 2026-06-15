"use client";

import type { FormEvent, ReactNode, RefObject } from "react";
import { useRef } from "react";
import { CHAT_RELY_LOGO_PATH } from "@/components/branding/chat-rely-wordmark";
import { PlaygroundComposer } from "@/components/chat/playground-composer";
import { WidgetBrandAvatar } from "@/components/chat/widget-brand-avatar";
import { WidgetEmbedThinkingDots } from "@/components/chat/widget-embed-thinking-dots";
import { parseBrandColorHex } from "@/lib/brand-chrome";
import { getWidgetPreviewContext } from "@/lib/widget-appearance";
import { cn } from "@/lib/utils";

/** Matches marketing site `--ds-primary` in `styles/design-system.css`. */
export const LANDING_DEMO_BRAND_COLOR = "#8A05FF";
export const LANDING_DEMO_AGENT_NAME = "ChatRely Support Agent";

export const LANDING_CHAT_WIDTH_CLASS = "max-w-[26rem]";
export const LANDING_CHAT_SHELL_HEIGHT_CLASS =
  "h-[min(660px,77vh)] max-h-[min(660px,77vh)] shrink-0";

export const LANDING_CHAT_MSG_IN = "animate-[mkt-msg-in_0.5s_cubic-bezier(0.22,1,0.36,1)_both]";

const landingPreview = getWidgetPreviewContext(null, LANDING_DEMO_BRAND_COLOR, "pro");
const { resolved, headerChrome, userChrome } = landingPreview;
const hasBrand = Boolean(parseBrandColorHex(LANDING_DEMO_BRAND_COLOR));

const LANDING_ASSISTANT_BUBBLE_CLASS =
  "rounded-2xl rounded-tl-none border px-4 py-3 text-sm shadow-sm sm:px-5";
const LANDING_USER_BUBBLE_CLASS =
  "max-w-[85%] rounded-2xl rounded-tr-none px-4 py-3 text-sm leading-relaxed shadow-sm sm:px-5";

const assistantBubbleStyle = {
  backgroundColor: resolved.colors.assistantBubble,
  borderColor: resolved.colors.assistantBubbleBorder,
  color: resolved.colors.textPrimary,
};

type LandingChatWidgetShellProps = {
  className?: string;
  messagesViewportRef?: RefObject<HTMLDivElement | null>;
  messagesContentRef?: RefObject<HTMLDivElement | null>;
  contentOffset?: number;
  children: ReactNode;
};

export function LandingChatWidgetShell({
  className,
  messagesViewportRef,
  messagesContentRef,
  contentOffset = 0,
  children,
}: LandingChatWidgetShellProps) {
  const composerRef = useRef<HTMLTextAreaElement>(null);

  const noopSend = (event: FormEvent) => {
    event.preventDefault();
  };

  return (
    <div
      className={cn(
        "border-ds-outline pointer-events-none flex min-h-0 w-full flex-col overflow-hidden rounded-[28px] border shadow-[0_20px_55px_rgba(15,23,42,0.06)]",
        LANDING_CHAT_WIDTH_CLASS,
        LANDING_CHAT_SHELL_HEIGHT_CLASS,
        className,
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
          hasBrand ? "border-black/10" : "border-ds-outline bg-ds-sidebar",
        )}
        style={hasBrand ? { backgroundColor: resolved.colors.header } : undefined}
      >
        <div className="flex min-w-0 items-center gap-3">
          <WidgetBrandAvatar
            logoUrl={CHAT_RELY_LOGO_PATH}
            logoPending={false}
            hasBrand={hasBrand}
            chrome={headerChrome}
            brandColorHex={LANDING_DEMO_BRAND_COLOR}
            size="header"
          />
          <div className="min-w-0">
            <h3
              className={cn(
                "truncate text-sm font-semibold tracking-tight",
                hasBrand && headerChrome ? headerChrome.titleClass : "text-ds-on-surface",
              )}
            >
              {LANDING_DEMO_AGENT_NAME}
            </h3>
          </div>
        </div>
      </div>

      <div
        ref={messagesViewportRef}
        className="min-h-0 flex-1 overflow-hidden"
        style={{ backgroundColor: resolved.colors.panelBackground }}
        aria-live="polite"
        aria-relevant="additions"
      >
        <div
          ref={messagesContentRef}
          className="space-y-3 px-4 py-5 pb-8 transition-transform duration-500 ease-out will-change-transform sm:px-5 sm:py-8"
          style={{ transform: `translateY(-${contentOffset}px)` }}
        >
          {children}
        </div>
      </div>

      <div
        className="shrink-0 px-4 pb-2.5 pt-2 sm:px-5"
        style={{ backgroundColor: resolved.colors.panelBackground }}
      >
        <PlaygroundComposer
          textareaRef={composerRef}
          value=""
          onChange={() => {}}
          onSend={noopSend}
          sendDisabled
          disabled
          placeholder="Write a message…"
          brandColorHex={LANDING_DEMO_BRAND_COLOR}
          hasBrand={hasBrand}
          chrome={headerChrome}
          shellStyle={{ backgroundColor: "#FFFFFF" }}
          submitType="button"
        />
      </div>
    </div>
  );
}

export function LandingChatUserBubble({
  children,
  animateIn = false,
}: {
  children: ReactNode;
  animateIn?: boolean;
}) {
  return (
    <div className={cn("flex justify-end", animateIn ? LANDING_CHAT_MSG_IN : undefined)}>
      <div
        className={LANDING_USER_BUBBLE_CLASS}
        style={{
          backgroundColor: resolved.colors.userBubble,
          color: userChrome.lightBg ? "#0f172a" : "#ffffff",
        }}
      >
        {children}
      </div>
    </div>
  );
}

export function LandingChatAssistantBubble({
  children,
  animateIn = false,
  trailing,
}: {
  children: ReactNode;
  animateIn?: boolean;
  trailing?: ReactNode;
}) {
  const hasTrailing = Boolean(trailing);

  if (hasTrailing) {
    return (
      <div
        className={cn(
          "flex min-w-0 w-full max-w-[min(100%,640px)] flex-col gap-2",
          animateIn ? LANDING_CHAT_MSG_IN : undefined,
        )}
      >
        <div className={LANDING_ASSISTANT_BUBBLE_CLASS} style={assistantBubbleStyle}>
          {children}
        </div>
        {trailing}
      </div>
    );
  }

  return (
    <div className={cn("flex justify-start", animateIn ? LANDING_CHAT_MSG_IN : undefined)}>
      <div className={cn("max-w-[92%]", LANDING_ASSISTANT_BUBBLE_CLASS)} style={assistantBubbleStyle}>
        {children}
      </div>
    </div>
  );
}

export function LandingChatThinkingIndicator() {
  return (
    <div className={cn("flex justify-start", LANDING_CHAT_MSG_IN)}>
      <WidgetEmbedThinkingDots accentColor={LANDING_DEMO_BRAND_COLOR} />
    </div>
  );
}
