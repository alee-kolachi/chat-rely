"use client";

import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";

type AssistantThinkingDotsProps = {
  /** Store website brand color (`#RRGGBB`). When omitted, dots use `--ds-primary`. */
  brandColorHex?: string | null;
  className?: string;
};

export function AssistantThinkingDots({ brandColorHex, className }: AssistantThinkingDotsProps) {
  const style = brandColorHex
    ? ({ "--thinking-dot-color": brandColorHex } as CSSProperties)
    : undefined;

  return (
    <div
      className={cn("inline-flex items-center gap-1 leading-none", className)}
      role="status"
      aria-live="polite"
      aria-label="Assistant is responding"
      style={style}
    >
      <span className="ds-thinking-dot" aria-hidden />
      <span className="ds-thinking-dot" aria-hidden />
      <span className="ds-thinking-dot" aria-hidden />
    </div>
  );
}
