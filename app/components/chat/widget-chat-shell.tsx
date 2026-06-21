"use client";

import type { CSSProperties, ReactNode } from "react";
import { useEffect } from "react";
import { ChevronLeft } from "lucide-react";
import { brandChromeClasses, parseBrandColorHex } from "@/lib/brand-chrome";
import { WidgetEmbedHeader } from "@/components/chat/widget-embed-header";
import {
  widgetComposerAccentColor,
  widgetComposerFieldClass,
  widgetComposerFieldStyle,
  widgetComposerPlaceholderClass,
  widgetComposerSendButtonClass,
  widgetComposerSendStyle,
} from "@/components/chat/playground-composer";
import { WidgetSendIcon } from "@/components/chat/widget-send-icon";
import {
  PoweredByChatRely,
} from "@/components/branding/powered-by-chatrely";
import {
  chatSurfaceShellStyle,
  resolveWidgetAppearance,
  WIDGET_EMBED_CHAT_SURFACE_CLASS,
  type ResolvedWidgetAppearance,
  type WidgetAppearanceSettings,
  userBubbleGradient,
  widgetFontFamilyCss,
  widgetGoogleFontUrl,
} from "@/lib/widget-appearance";
import { cn } from "@/lib/utils";

export type WidgetChatShellProps = {
  agentName: string;
  brandColorHex?: string | null;
  widgetAppearance?: WidgetAppearanceSettings | null;
  websiteLogoUrl?: string | null;
  websiteLogoPending?: boolean;
  statusLine?: string;
  headerActions?: ReactNode;
  /** Optional header logo override (demo outreach pages). */
  headerLogoSlot?: ReactNode;
  /** Appearance preview: return to welcome screen from chat preview. */
  onHeaderBack?: () => void;
  headerBackLabel?: string;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
  /** Playground-style fixed height; omit for flex parent sizing. */
  shellHeightClass?: string;
  /** Playground-style composer has no divider above the input. */
  footerBorderless?: boolean;
  /** Chat-surface previews: drop outer border (avoids top hairline on marketing demos). */
  shellBorderless?: boolean;
  /** Optional override for embed header title size/class. */
  headerTitleClassName?: string;
  /** Chat-surface previews: hide divider under the header row. */
  hideHeaderBorder?: boolean;
  /** Optional lighter/darker chat-surface gradient top stop (marketing demos). */
  chatSurfaceTopColor?: string;
  /** Optional sample user bubble for appearance preview. */
  previewUserBubble?: ReactNode;
};

function useWidgetPreviewFont(fontFamily: ResolvedWidgetAppearance["fontFamily"]) {
  useEffect(() => {
    const url = widgetGoogleFontUrl(fontFamily);
    if (!url || document.querySelector(`link[data-cr-preview-font="${fontFamily}"]`)) return;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = url;
    link.setAttribute("data-cr-preview-font", fontFamily);
    document.head.appendChild(link);
  }, [fontFamily]);
}

/**
 * Shared embed-style chat chrome (playground, onboarding, conversations preview).
 */
export function WidgetChatShell({
  agentName,
  brandColorHex,
  widgetAppearance,
  websiteLogoUrl,
  websiteLogoPending = false,
  statusLine,
  headerActions,
  headerLogoSlot,
  onHeaderBack,
  headerBackLabel = "Back to welcome screen",
  children,
  footer,
  className,
  shellHeightClass = "h-full max-h-full xl:h-[min(37.5rem,85vh)]",
  footerBorderless = false,
  shellBorderless = false,
  headerTitleClassName,
  hideHeaderBorder = false,
  chatSurfaceTopColor,
  previewUserBubble,
}: WidgetChatShellProps) {
  const brand = parseBrandColorHex(brandColorHex) ?? "#831C91";
  const resolved = resolveWidgetAppearance(widgetAppearance, brand);
  const hasBrand = Boolean(parseBrandColorHex(brandColorHex));
  const displayName = agentName.trim() || "Support";
  const chatSurface = hasBrand && resolved.themeMode === "light";

  useWidgetPreviewFont(resolved.fontFamily);

  const footerStyle: CSSProperties = chatSurface
    ? { background: "transparent", borderColor: "transparent" }
    : {
        backgroundColor: resolved.colors.panelBackground,
        borderColor: resolved.colors.assistantBubbleBorder,
      };

  const shellContent = (
    <>
      <WidgetEmbedHeader
        agentName={displayName}
        statusLine={statusLine}
        hasBrand={hasBrand}
        brandColorHex={brandColorHex}
        websiteLogoUrl={websiteLogoUrl}
        websiteLogoPending={websiteLogoPending}
        chatSurface={chatSurface}
        headerColor={resolved.colors.header}
        themeMode={resolved.themeMode}
        titleClassName={headerTitleClassName}
        hideBorder={hideHeaderBorder}
        logoSlot={headerLogoSlot}
        leading={
          onHeaderBack ? (
            <button
              type="button"
              onClick={onHeaderBack}
              aria-label={headerBackLabel}
              title={headerBackLabel}
              className={cn(
                "inline-flex size-10 shrink-0 items-center justify-center rounded-lg transition-colors",
                chatSurface
                  ? "text-slate-600 hover:bg-slate-900/6 hover:text-slate-900"
                  : brandChromeClasses(resolved.colors.header).lightBg
                    ? "text-ds-on-surface-variant hover:bg-black/6 hover:text-ds-on-surface"
                    : "text-white/80 hover:bg-white/12 hover:text-white"
              )}
            >
              <ChevronLeft className="size-5" strokeWidth={2} aria-hidden />
            </button>
          ) : undefined
        }
        actions={headerActions}
      />

      <div
        className={cn("min-h-0 flex-1 overflow-hidden", chatSurface && "bg-transparent")}
        style={chatSurface ? { background: "transparent" } : undefined}
      >
        {children}
      </div>

      {previewUserBubble}

      {footer ? (
        <div
          className={cn("shrink-0", !footerBorderless && "border-t", chatSurface && "bg-transparent")}
          style={footerStyle}
        >
          {footer}
        </div>
      ) : null}
    </>
  );

  if (chatSurface) {
    const gradientStyle: CSSProperties = {
      fontFamily: widgetFontFamilyCss(resolved.fontFamily),
      color: resolved.colors.textPrimary,
      ...chatSurfaceShellStyle(
        resolved.colors.header,
        resolved.colors.panelBackground,
        chatSurfaceTopColor,
      ),
    };

    return (
      <div
        className={cn(
          "flex min-h-0 w-full max-w-[26rem] flex-col overflow-hidden rounded-[28px]",
          !shellBorderless && "border border-black/5 shadow-[0_20px_55px_rgba(15,23,42,0.06)]",
          shellHeightClass,
          className,
        )}
        style={shellBorderless ? undefined : { borderColor: "rgba(15, 23, 42, 0.06)" }}
      >
        <div
          className={cn(
            "flex min-h-0 flex-1 flex-col overflow-hidden",
            WIDGET_EMBED_CHAT_SURFACE_CLASS,
          )}
          style={gradientStyle}
        >
          {shellContent}
        </div>
      </div>
    );
  }

  const shellStyle: CSSProperties = {
    fontFamily: widgetFontFamilyCss(resolved.fontFamily),
    color: resolved.colors.textPrimary,
    backgroundColor: resolved.colors.panelBackground,
    borderColor: resolved.colors.assistantBubbleBorder,
  };

  return (
    <div
      className={cn(
        "flex min-h-0 w-full max-w-[26rem] flex-col overflow-hidden rounded-[28px] shadow-[0_20px_55px_rgba(15,23,42,0.06)]",
        shellBorderless ? "border-0" : "border border-ds-outline",
        shellHeightClass,
        className,
      )}
      style={shellStyle}
    >
      {shellContent}
    </div>
  );
}

export function WidgetPreviewAssistantBubble({
  children,
  resolved,
  className,
}: {
  children: ReactNode;
  resolved: ResolvedWidgetAppearance;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "max-w-[92%] rounded-2xl rounded-tl-sm border px-3 py-2.5 text-[13px] leading-snug",
        className,
      )}
      style={{
        backgroundColor: resolved.colors.assistantBubble,
        borderColor: "rgba(15, 23, 42, 0.05)",
        color: resolved.colors.textPrimary,
      }}
    >
      {children}
    </div>
  );
}

export function WidgetWelcomeMessageRow({
  message,
  resolved,
}: {
  message: string;
  resolved: ResolvedWidgetAppearance;
}) {
  return (
    <div className="flex justify-start">
      <WidgetPreviewAssistantBubble resolved={resolved}>{message}</WidgetPreviewAssistantBubble>
    </div>
  );
}

export function WidgetWelcomeMessages({
  messages,
  resolved,
}: {
  messages: string[];
  resolved: ResolvedWidgetAppearance;
  brandColorHex?: string | null;
  websiteLogoUrl?: string | null;
  websiteLogoPending?: boolean;
}) {
  return (
    <>
      {messages.map((message, index) => (
        <WidgetWelcomeMessageRow
          key={`${index}-${message.slice(0, 24)}`}
          message={message}
          resolved={resolved}
        />
      ))}
    </>
  );
}

export function WidgetPreviewUserBubble({
  children,
  resolved,
  className,
}: {
  children: ReactNode;
  resolved: ResolvedWidgetAppearance;
  className?: string;
}) {
  const userChrome = brandChromeClasses(resolved.colors.userBubble);
  return (
    <div
      className={cn(
        "max-w-[85%] rounded-2xl rounded-tr-sm px-3 py-2.5 text-[13px] leading-snug",
        className,
      )}
      style={{
        background: userBubbleGradient(resolved.colors.userBubble),
        color: userChrome.lightBg ? "#0f172a" : "#ffffff",
      }}
    >
      {children}
    </div>
  );
}

/** Powered-by strip below the composer (onboarding / previews; matches live embed order). */
export function WidgetChatPreviewFooter({
  showPoweredBy = true,
  children,
  className,
}: {
  showPoweredBy?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col", className)}>
      {children}
      {showPoweredBy ? (
        <div className="flex items-center justify-center px-5 pt-1 pb-[max(10px,env(safe-area-inset-bottom,0px))]">
          <PoweredByChatRely compact className="px-0 pb-0 pt-0" />
        </div>
      ) : null}
    </div>
  );
}

/** Static composer row for appearance preview; matches live widget field + send chrome. */
export function WidgetComposerPreview({
  placeholder = "Message…",
  brandColorHex,
  accentColor,
  composerBackground,
  className,
  placeholderClassName,
}: {
  placeholder?: string;
  brandColorHex?: string | null;
  /** Header/accent color for the send button (live widget uses header, not user bubble). */
  accentColor: string;
  composerBackground?: string;
  className?: string;
  placeholderClassName?: string;
}) {
  const accent = accentColor.trim() || widgetComposerAccentColor(brandColorHex);

  return (
    <div className={cn("px-4 pt-1 pb-1.5", className)}>
      <div
        className={cn(widgetComposerFieldClass, "pointer-events-none")}
        style={widgetComposerFieldStyle(accent, composerBackground)}
      >
        <span className={cn(widgetComposerPlaceholderClass, placeholderClassName)}>{placeholder}</span>
        <span className={widgetComposerSendButtonClass} style={widgetComposerSendStyle(accent)} aria-hidden>
          <WidgetSendIcon className="size-[18px]" />
        </span>
      </div>
    </div>
  );
}
