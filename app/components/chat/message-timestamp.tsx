"use client";

import type { CSSProperties } from "react";
import { formatMessageTimestamp } from "@/lib/format-locale-datetime";
import { useClientMounted } from "@/lib/use-client-mounted";
import { cn } from "@/lib/utils";

export function MessageTimestamp({
  value,
  align = "start",
  variant = "bubble",
  tone = "muted",
  className,
  style,
}: {
  value: string | null | undefined;
  align?: "start" | "end";
  /** `bubble` = bottom-right inside a chat bubble (WhatsApp style). */
  variant?: "below" | "bubble";
  tone?: "muted" | "on-primary" | "on-surface";
  className?: string;
  style?: CSSProperties;
}) {
  const localeReady = useClientMounted();
  const label = formatMessageTimestamp(value, localeReady);
  if (!label) return null;

  return (
    <time
      dateTime={value ?? undefined}
      className={cn(
        variant === "bubble"
          ? cn(
              "shrink-0 text-[10px] leading-none tabular-nums",
              tone === "on-primary"
                ? "text-ds-on-primary/70"
                : tone === "on-surface"
                  ? "opacity-80"
                  : "text-ds-on-surface-variant"
            )
          : cn(
              "text-ds-on-surface-variant block text-[11px] leading-snug tabular-nums",
              align === "end" ? "pr-2.5 text-right" : "pl-2.5 text-left"
            ),
        className
      )}
      style={style}
    >
      {label}
    </time>
  );
}

/** Wrap user bubble text + timestamp WhatsApp-style (timestamp at bottom-right inside bubble). */
export function UserBubbleBody({
  children,
  timestamp,
}: {
  children: React.ReactNode;
  timestamp?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-end gap-x-2 gap-y-0.5">
      <div className="min-w-0 flex-1 text-left whitespace-pre-wrap">{children}</div>
      {timestamp}
    </div>
  );
}
