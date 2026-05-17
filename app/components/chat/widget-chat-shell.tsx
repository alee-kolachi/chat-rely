"use client";

import type { CSSProperties, ReactNode } from "react";
import { brandChromeClasses, parseBrandColorHex } from "@/lib/brand-chrome";
import { WidgetBrandAvatar } from "@/components/chat/widget-brand-avatar";
import { cn } from "@/lib/utils";

export type WidgetChatShellProps = {
  agentName: string;
  brandColorHex?: string | null;
  websiteLogoUrl?: string | null;
  websiteLogoPending?: boolean;
  statusLine?: string;
  headerActions?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
  /** Playground-style fixed height; omit for flex parent sizing. */
  shellHeightClass?: string;
};

/**
 * Shared embed-style chat chrome (playground, onboarding, conversations preview).
 */
export function WidgetChatShell({
  agentName,
  brandColorHex,
  websiteLogoUrl,
  websiteLogoPending = false,
  statusLine,
  headerActions,
  children,
  footer,
  className,
  shellHeightClass = "h-full max-h-full xl:h-[min(37.5rem,85vh)]",
}: WidgetChatShellProps) {
  const hex = parseBrandColorHex(brandColorHex) ?? "#831C91";
  const chrome = brandChromeClasses(hex);
  const hasBrand = Boolean(hex);
  const displayName = agentName.trim() || "Support";

  return (
    <div
      className={cn(
        "border-ds-outline flex min-h-0 w-full max-w-[26rem] flex-col overflow-hidden rounded-[28px] border bg-white shadow-[0_20px_55px_rgba(15,23,42,0.06)]",
        shellHeightClass,
        className
      )}
    >
      <div
        className={cn(
          "flex shrink-0 items-center justify-between border-b px-5 py-3.5 sm:px-6",
          hasBrand ? "border-black/10" : "border-ds-outline bg-ds-sidebar"
        )}
        style={hasBrand ? ({ backgroundColor: hex } as CSSProperties) : undefined}
      >
        <div className="flex min-w-0 items-center gap-3">
          <WidgetBrandAvatar
            logoUrl={websiteLogoUrl ?? null}
            logoPending={websiteLogoPending}
            hasBrand={hasBrand}
            chrome={chrome}
            size="header"
          />
          <div className="min-w-0">
            <h3
              className={cn(
                "truncate text-sm font-semibold tracking-tight",
                chrome.titleClass
              )}
            >
              {displayName}
            </h3>
            {statusLine ? (
              <p className={cn("mt-0.5 truncate text-[11px]", chrome.lightBg ? "text-ds-on-surface-variant" : "text-white/85")}>
                {statusLine}
              </p>
            ) : null}
          </div>
        </div>
        {headerActions ? <div className="flex shrink-0 items-center gap-0.5">{headerActions}</div> : null}
      </div>

      <div className="min-h-0 flex-1 overflow-hidden">{children}</div>

      {footer ? <div className="border-ds-outline shrink-0 border-t bg-white">{footer}</div> : null}
    </div>
  );
}
