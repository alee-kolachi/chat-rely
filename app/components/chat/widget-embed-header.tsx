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
  /** When set, replaces the default header logo avatar (demo pages). */
  logoSlot?: ReactNode;
  actions?: ReactNode;
  className?: string;
  style?: CSSProperties;
  titleClassName?: string;
  hideBorder?: boolean;
};

/** Header chrome aligned with live embed `.cr-panel--chat-surface` header. */
export function WidgetEmbedHeader({
  agentName,
  statusLine,
  hasBrand,
  brandColorHex,
  websiteLogoUrl,
  websiteLogoPending = false,
  chatSurface = false,
  headerColor,
  themeMode = "light",
  leading,
  logoSlot,
  actions,
  className,
  style,
  titleClassName,
  hideBorder = false,
}: WidgetEmbedHeaderProps) {
  const accent = headerColor ?? brandColorHex ?? "#831C91";
  const chrome = brandChromeClasses(accent);
  const displayName = agentName.trim() || "Support";
  const showStatus = Boolean(statusLine?.trim());

  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-between gap-3 px-4 pb-[11px] pt-2",
        !hideBorder && "border-b",
        chatSurface
          ? "border-[rgba(15,23,42,0.06)] bg-transparent"
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
        <div className="ml-0.5 flex h-9 shrink-0 items-center">
          {logoSlot ?? (
            <WidgetBrandAvatar
              logoUrl={websiteLogoUrl ?? null}
              logoPending={websiteLogoPending}
              hasBrand={hasBrand}
              chrome={chrome}
              brandColorHex={brandColorHex}
              size="header"
            />
          )}
        </div>
        <div className="relative flex h-9 min-w-0 items-center pl-0.5">
          <div
            className={cn(
              "truncate text-[14px] font-normal leading-none tracking-[-0.02em]",
              chatSurface ? "text-slate-900" : chrome.titleClass,
              titleClassName,
            )}
          >
            {displayName}
          </div>
          {showStatus && chatSurface ? (
            <p className="absolute left-0 top-[calc(100%-1px)] max-w-full truncate text-[11px] font-[450] leading-[1.3] tracking-[0.005em] text-slate-500">
              {statusLine}
            </p>
          ) : showStatus ? (
            <p
              className={cn(
                "absolute left-0 top-[calc(100%-1px)] max-w-full truncate text-[11px] font-[450] leading-[1.3] tracking-[0.005em]",
                chrome.lightBg ? "text-ds-on-surface-variant" : "text-white/85"
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
