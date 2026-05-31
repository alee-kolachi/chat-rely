"use client";

import type { CSSProperties, ReactNode } from "react";
import { useEffect } from "react";
import { brandChromeClasses, parseBrandColorHex } from "@/lib/brand-chrome";
import { WidgetBrandAvatar } from "@/components/chat/widget-brand-avatar";
import {
  resolveWidgetAppearance,
  type ResolvedWidgetAppearance,
  type WidgetAppearanceSettings,
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
  children,
  footer,
  className,
  shellHeightClass = "h-full max-h-full xl:h-[min(37.5rem,85vh)]",
  footerBorderless = false,
  previewUserBubble,
}: WidgetChatShellProps) {
  const brand = parseBrandColorHex(brandColorHex) ?? "#831C91";
  const resolved = resolveWidgetAppearance(widgetAppearance, brand);
  const headerChrome = brandChromeClasses(resolved.colors.header);
  const hasBrand = Boolean(parseBrandColorHex(brandColorHex));
  const displayName = agentName.trim() || "Support";

  useWidgetPreviewFont(resolved.fontFamily);

  const shellStyle: CSSProperties = {
    fontFamily: widgetFontFamilyCss(resolved.fontFamily),
    backgroundColor: resolved.colors.panelBackground,
    borderColor: resolved.colors.assistantBubbleBorder,
    color: resolved.colors.textPrimary,
  };

  const headerStyle: CSSProperties | undefined = hasBrand
    ? { backgroundColor: resolved.colors.header }
    : resolved.themeMode === "dark"
      ? { backgroundColor: resolved.colors.composerBackground }
      : undefined;

  const footerStyle: CSSProperties = {
    backgroundColor: resolved.colors.composerBackground,
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
      <div
        className={cn(
          "flex shrink-0 items-center justify-between border-b px-5 py-3.5 sm:px-6",
          hasBrand ? "border-black/10" : "border-ds-outline bg-ds-sidebar"
        )}
        style={headerStyle}
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
                headerChrome.titleClass
              )}
            >
              {displayName}
            </h3>
            {statusLine ? (
              <p
                className={cn(
                  "mt-0.5 truncate text-[11px]",
                  headerChrome.lightBg ? "text-ds-on-surface-variant" : "text-white/85"
                )}
              >
                {statusLine}
              </p>
            ) : null}
          </div>
        </div>
        {headerActions ? <div className="flex shrink-0 items-center gap-0.5">{headerActions}</div> : null}
      </div>

      <div
        className="min-h-0 flex-1 overflow-hidden"
        style={{ backgroundColor: resolved.colors.panelBackground }}
      >
        {children}
        {previewUserBubble}
      </div>

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
      className="max-w-[92%] rounded-2xl rounded-tl-sm border px-3 py-2.5 text-xs leading-relaxed sm:text-sm"
      style={{
        backgroundColor: resolved.colors.assistantBubble,
        borderColor: resolved.colors.assistantBubbleBorder,
        color: resolved.colors.textPrimary,
      }}
    >
      {children}
    </div>
  );
}

/** First assistant message: left-aligned row with avatar, same layout as live chat. */
export function WidgetWelcomeMessageRow({
  message,
  resolved,
  brandColorHex,
  websiteLogoUrl,
  websiteLogoPending = false,
}: {
  message: string;
  resolved: ResolvedWidgetAppearance;
  brandColorHex?: string | null;
  websiteLogoUrl?: string | null;
  websiteLogoPending?: boolean;
}) {
  const brand = parseBrandColorHex(brandColorHex) ?? "#831C91";
  const chrome = brandChromeClasses(resolved.colors.header);
  const hasBrand = Boolean(parseBrandColorHex(brandColorHex));

  return (
    <div className="flex justify-start">
      <div className="flex max-w-[90%] gap-3">
        <WidgetBrandAvatar
          logoUrl={websiteLogoUrl ?? null}
          logoPending={websiteLogoPending}
          hasBrand={hasBrand}
          chrome={chrome}
          brandColorHex={brand}
          size="bubble"
        />
        <div
          className="rounded-2xl rounded-tl-none border px-4 py-3 text-sm leading-relaxed shadow-sm"
          style={{
            backgroundColor: resolved.colors.assistantBubble,
            borderColor: resolved.colors.assistantBubbleBorder,
            color: resolved.colors.textPrimary,
          }}
        >
          {message}
        </div>
      </div>
    </div>
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
      className="max-w-[85%] rounded-2xl rounded-tr-sm px-3 py-2.5 text-xs leading-relaxed sm:text-sm"
      style={{
        backgroundColor: resolved.colors.userBubble,
        color: userChrome.lightBg ? "#0f172a" : "#ffffff",
      }}
    >
      {children}
    </div>
  );
}
