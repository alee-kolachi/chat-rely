"use client";

import type { CSSProperties, ReactNode } from "react";
import { brandChromeClasses } from "@/lib/brand-chrome";
import { WidgetBrandAvatar } from "@/components/chat/widget-brand-avatar";
import { cn } from "@/lib/utils";

export type WidgetEmbedHeaderProps = {
  agentName: string;
  statusLine?: string;
  hasBrand: boolean;
  brandColorHex?: string | null;
  websiteLogoUrl?: string | null;
  websiteLogoPending?: boolean;
  chatSurface?: boolean;
  headerColor?: string;
  themeMode?: "light" | "dark";
  leading?: ReactNode;
  actions?: ReactNode;
  className?: string;
  style?: CSSProperties;
};

/** Header chrome aligned with live embed `.cr-panel--chat-surface` header. */
export function WidgetEmbedHeader({
  agentName,
  statusLine = "Typically replies instantly",
  hasBrand,
  brandColorHex,
  websiteLogoUrl,
  websiteLogoPending = false,
  chatSurface = false,
  headerColor,
  themeMode = "light",
  leading,
  actions,
  className,
  style,
}: WidgetEmbedHeaderProps) {
  const accent = headerColor ?? brandColorHex ?? "#831C91";
  const chrome = brandChromeClasses(accent);
  const displayName = agentName.trim() || "Support";

  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-between border-b px-4 pb-[11px] pt-2",
        chatSurface
          ? "border-[rgba(15,23,42,0.06)] bg-[color-mix(in_srgb,#ffffff_90%,#fcfbff)]"
          : hasBrand
            ? "border-black/10"
            : "border-ds-outline bg-ds-sidebar",
        className
      )}
      style={
        style ??
        (chatSurface
          ? undefined
          : hasBrand
            ? { backgroundColor: accent }
            : themeMode === "dark"
              ? { backgroundColor: "#1E293B" }
              : undefined)
      }
    >
      <div className="flex min-w-0 flex-1 items-center gap-1">
        {leading}
        <WidgetBrandAvatar
          logoUrl={websiteLogoUrl ?? null}
          logoPending={websiteLogoPending}
          hasBrand={hasBrand}
          chrome={chrome}
          size="header"
        />
        <div className="relative h-9 min-w-0 pl-1">
          <h3
            className={cn(
              "truncate text-[14px] font-semibold leading-none tracking-[-0.02em]",
              chatSurface ? "text-slate-900" : chrome.titleClass
            )}
          >
            {displayName}
          </h3>
          {statusLine ? (
            <p
              className={cn(
                "absolute left-0 top-[calc(100%-1px)] max-w-full truncate text-[11px] leading-[1.3]",
                chatSurface
                  ? "text-slate-500"
                  : chrome.lightBg
                    ? "text-ds-on-surface-variant"
                    : "text-white/85"
              )}
            >
              {statusLine}
            </p>
          ) : null}
        </div>
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-0.5">{actions}</div> : null}
    </div>
  );
}
