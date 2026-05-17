"use client";

import { cn } from "@/lib/utils";

/** Cursor-style gray status while a tool runs (e.g. "Checking order details…"). */
export function ToolActivityLine({
  message,
  className,
}: {
  message: string;
  className?: string;
}) {
  return (
    <p
      className={cn(
        "ds-app-body-muted mt-1.5 flex items-center gap-1.5 pl-0.5",
        className
      )}
      role="status"
      aria-live="polite"
    >
      <span className="bg-ds-on-surface-variant/70 inline-block size-1 shrink-0 animate-pulse rounded-full" />
      <span className="cr-tool-status-text animate-pulse">{message}</span>
    </p>
  );
}
