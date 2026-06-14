"use client";

import type { CSSProperties } from "react";

type WidgetEmbedThinkingDotsProps = {
  accentColor?: string | null;
  className?: string;
};

/** Matches live embed `.cr-thinking-dots` (no bubble chrome). */
export function WidgetEmbedThinkingDots({ accentColor, className }: WidgetEmbedThinkingDotsProps) {
  const accent = accentColor?.trim() || "#831c91";

  return (
    <div
      className={className}
      role="status"
      aria-live="polite"
      aria-label="Assistant is responding"
      style={
        {
          ["--cr-accent" as string]: accent,
          ["--cr-header-bg" as string]: accent,
        } as CSSProperties
      }
    >
      <span className="widget-embed-thinking-dots" aria-hidden>
        <span className="widget-embed-thinking-dot" />
        <span className="widget-embed-thinking-dot" />
        <span className="widget-embed-thinking-dot" />
      </span>
    </div>
  );
}
