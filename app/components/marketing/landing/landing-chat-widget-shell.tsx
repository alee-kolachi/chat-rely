"use client";

import type { ReactNode, RefObject } from "react";
import { CHAT_RELY_LOGO_PATH } from "@/components/branding/chat-rely-wordmark";
import {
  PoweredByChatRely,
  WIDGET_POWERED_BY_STRIP_CLASS,
} from "@/components/branding/powered-by-chatrely";
import {
  WidgetChatShell,
  WidgetComposerPreview,
  WidgetPreviewAssistantBubble,
  WidgetPreviewUserBubble,
} from "@/components/chat/widget-chat-shell";
import { WidgetEmbedThinkingDots } from "@/components/chat/widget-embed-thinking-dots";
import { resolveWidgetAppearance } from "@/lib/widget-appearance";
import { cn } from "@/lib/utils";

/** Matches marketing site `--ds-primary` in `styles/design-system.css`. */
export const LANDING_DEMO_BRAND_COLOR = "#8A05FF";
export const LANDING_DEMO_AGENT_NAME = "ChatRely Support Agent";

export const LANDING_CHAT_WIDTH_CLASS = "max-w-[28rem]";
export const LANDING_CHAT_SHELL_HEIGHT_CLASS =
  "h-[min(660px,77vh)] max-h-[min(660px,77vh)] shrink-0";

export const LANDING_CHAT_MSG_IN = "animate-[mkt-msg-in_0.5s_cubic-bezier(0.22,1,0.36,1)_both]";

const LANDING_CHAT_TEXT_CLASS = "text-[14px]";

/** Lighter marketing-demo gradient: soft purple at bottom, near-white purple at top. */
const LANDING_CHAT_SURFACE_TOP = "#fefcff";
const LANDING_CHAT_SURFACE_BOTTOM = `color-mix(in srgb, ${LANDING_DEMO_BRAND_COLOR} 5%, #faf9ff)`;

const landingWidgetAppearance = {
  colors: {
    user_bubble: LANDING_DEMO_BRAND_COLOR,
    panel_background: LANDING_CHAT_SURFACE_BOTTOM,
    assistant_bubble: "#FFFFFF",
  },
} as const;

const landingResolved = resolveWidgetAppearance(landingWidgetAppearance, LANDING_DEMO_BRAND_COLOR);

function LandingHeaderStatusDot() {
  return (
    <span
      className="size-2.5 shrink-0 rounded-full"
      style={{ backgroundColor: LANDING_DEMO_BRAND_COLOR }}
      aria-hidden
    />
  );
}

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
  return (
    <WidgetChatShell
      agentName={LANDING_DEMO_AGENT_NAME}
      brandColorHex={LANDING_DEMO_BRAND_COLOR}
      widgetAppearance={landingWidgetAppearance}
      websiteLogoUrl={CHAT_RELY_LOGO_PATH}
      headerActions={<LandingHeaderStatusDot />}
      shellHeightClass={LANDING_CHAT_SHELL_HEIGHT_CLASS}
      chatSurfaceTopColor={LANDING_CHAT_SURFACE_TOP}
      headerTitleClassName="text-[15px]"
      footerBorderless
      className={cn("pointer-events-none w-full", LANDING_CHAT_WIDTH_CLASS, className)}
      footer={
        <div>
          <WidgetComposerPreview
            brandColorHex={LANDING_DEMO_BRAND_COLOR}
            accentColor={landingResolved.colors.userBubble}
            placeholderClassName="text-[15px]"
          />
          <PoweredByChatRely
            compact
            className={cn(WIDGET_POWERED_BY_STRIP_CLASS, "[&_span]:text-[11px]")}
          />
        </div>
      }
    >
      <div
        ref={messagesViewportRef}
        className={cn("h-full min-h-0 overflow-hidden", LANDING_CHAT_TEXT_CLASS)}
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
    </WidgetChatShell>
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
      <WidgetPreviewUserBubble resolved={landingResolved} className={LANDING_CHAT_TEXT_CLASS}>
        {children}
      </WidgetPreviewUserBubble>
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
          "flex w-full max-w-[min(100%,640px)] flex-col gap-2",
          animateIn ? LANDING_CHAT_MSG_IN : undefined,
        )}
      >
        <WidgetPreviewAssistantBubble resolved={landingResolved} className={LANDING_CHAT_TEXT_CLASS}>
          {children}
        </WidgetPreviewAssistantBubble>
        {trailing}
      </div>
    );
  }

  return (
    <div className={cn("flex justify-start", animateIn ? LANDING_CHAT_MSG_IN : undefined)}>
      <WidgetPreviewAssistantBubble resolved={landingResolved} className={LANDING_CHAT_TEXT_CLASS}>
        {children}
      </WidgetPreviewAssistantBubble>
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
