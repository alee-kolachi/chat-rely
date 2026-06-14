"use client";

import type { CSSProperties, ReactNode } from "react";
import { useEffect } from "react";
import { ChevronLeft } from "lucide-react";
import { brandChromeClasses, parseBrandColorHex } from "@/lib/brand-chrome";
import { WidgetEmbedHeader } from "@/components/chat/widget-embed-header";
import {
  widgetComposerFieldClass,
  widgetComposerSendButtonClass,
} from "@/components/chat/playground-composer";
import { WidgetSendIcon } from "@/components/chat/widget-send-icon";
import {
  chatSurfaceGradient,
  resolveWidgetAppearance,
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
  onHeaderBack,
  headerBackLabel = "Back to welcome screen",
  children,
  footer,
  className,
  shellHeightClass = "h-full max-h-full xl:h-[min(37.5rem,85vh)]",
  footerBorderless = false,
  previewUserBubble,
}: WidgetChatShellProps) {
  const brand = parseBrandColorHex(brandColorHex) ?? "#831C91";
  const resolved = resolveWidgetAppearance(widgetAppearance, brand);
  const hasBrand = Boolean(parseBrandColorHex(brandColorHex));
  const displayName = agentName.trim() || "Support";
  const chatSurface = hasBrand && resolved.themeMode === "light";

  useWidgetPreviewFont(resolved.fontFamily);

  const shellStyle: CSSProperties = {
    fontFamily: widgetFontFamilyCss(resolved.fontFamily),
    color: resolved.colors.textPrimary,
    ...(chatSurface
      ? {
          background: chatSurfaceGradient(resolved.colors.header, resolved.colors.panelBackground),
          borderColor: "rgba(15, 23, 42, 0.06)",
        }
      : {
          backgroundColor: resolved.colors.panelBackground,
          borderColor: resolved.colors.assistantBubbleBorder,
        }),
  };

  const footerStyle: CSSProperties = chatSurface
    ? { background: "transparent", borderColor: "transparent" }
    : {
        backgroundColor: resolved.colors.panelBackground,
        borderColor: resolved.colors.assistantBubbleBorder,
      };

  return (
    <div
      className={cn(
        "flex min-h-0 w-full max-w-[26rem] flex-col overflow-hidden rounded-[28px] border shadow-[0_20px_55px_rgba(15,23,42,0.06)]",
        shellHeightClass,
        className
      )}
      style={shellStyle}
    >
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

      <div className="min-h-0 flex-1 overflow-hidden">{children}</div>

      {previewUserBubble}

      {footer ? (
        <div className={cn("shrink-0", !footerBorderless && "border-t")} style={footerStyle}>
          {footer}
        </div>
      ) : null}
    </div>
  );
}

export function WidgetPreviewAssistantBubble({
  children,
  resolved,
}: {
  children: ReactNode;
  resolved: ResolvedWidgetAppearance;
}) {
  return (
    <div
      className="max-w-[92%] rounded-2xl rounded-tl-sm border px-3 py-2.5 text-[13px] leading-snug"
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
}: {
  children: ReactNode;
  resolved: ResolvedWidgetAppearance;
}) {
  const userChrome = brandChromeClasses(resolved.colors.userBubble);
  return (
    <div
      className="max-w-[85%] rounded-2xl rounded-tr-sm px-3 py-2.5 text-[13px] leading-snug"
      style={{
        background: userBubbleGradient(resolved.colors.userBubble),
        color: userChrome.lightBg ? "#0f172a" : "#ffffff",
      }}
    >
      {children}
    </div>
  );
}

/** Static composer row for appearance preview; matches live widget field + send chrome. */
export function WidgetComposerPreview({
  placeholder = "Write a message…",
  brandColorHex,
  accentColor,
  composerBackground,
  className,
}: {
  placeholder?: string;
  brandColorHex?: string | null;
  accentColor: string;
  composerBackground?: string;
  className?: string;
}) {
  const hasBrand = Boolean(parseBrandColorHex(brandColorHex));
  const chrome = brandChromeClasses(accentColor);

  return (
    <div className={cn("px-4 pb-1.5 pt-1", className)}>
      <div
        className={cn(widgetComposerFieldClass, "pointer-events-none")}
        style={{ backgroundColor: composerBackground ?? "#FFFFFF" }}
      >
        <span className="min-h-9 flex-1 py-2 text-sm leading-snug text-ds-on-surface-variant/70">
          {placeholder}
        </span>
        <span
          className={cn(
            widgetComposerSendButtonClass,
            hasBrand ? chrome.fabIconClass : "text-ds-on-primary"
          )}
          style={{ backgroundColor: accentColor }}
          aria-hidden
        >
          <WidgetSendIcon className="size-4" />
        </span>
      </div>
    </div>
  );
}
