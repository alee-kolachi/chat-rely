"use client";

import { ThumbsDown, ThumbsUp } from "lucide-react";
import { useCallback, useState, type CSSProperties } from "react";

import { cn } from "@/lib/utils";

type FeedbackVote = 1 | -1 | null;

type MessageFeedbackButtonsProps = {
  vote: FeedbackVote;
  onVote: (clicked: 1 | -1) => void;
  className?: string;
  /** Merchant brand hex for thumbs-up when selected (widget preview). */
  accentColor?: string | null;
};

function feedbackSelectedStyle(color: string): CSSProperties {
  return {
    "--feedback-selected-color": color,
    "--feedback-selected-bg": `color-mix(in srgb, ${color} 16%, transparent)`,
  } as CSSProperties;
}

const FEEDBACK_DOWN_COLOR = "var(--ds-warning, #f59e0b)";
const FEEDBACK_UP_FALLBACK = "var(--ds-success, #10b981)";

export function MessageFeedbackButtons({
  vote,
  onVote,
  className,
  accentColor,
}: MessageFeedbackButtonsProps) {
  const [pop, setPop] = useState<1 | -1 | null>(null);

  const upActiveColor =
    accentColor != null && accentColor.trim().length > 0 ? accentColor.trim() : FEEDBACK_UP_FALLBACK;

  const handleClick = useCallback(
    (which: 1 | -1) => {
      setPop(which);
      onVote(which);
      window.setTimeout(() => setPop(null), 380);
    },
    [onVote]
  );

  const btnBase =
    "inline-flex size-9 shrink-0 items-center justify-center rounded-lg transition-[color,background-color,transform,opacity,width,margin] duration-200 ease-out";
  const btnIdle =
    "text-ds-on-surface-variant hover:text-ds-on-surface hover:bg-ds-sidebar/80";
  const btnSelected =
    "text-[var(--feedback-selected-color)] bg-[var(--feedback-selected-bg)]";

  const upVisible = vote !== -1;
  const downVisible = vote !== 1;

  return (
    <div className={cn("flex items-center gap-0 pl-0.5", className)} role="group" aria-label="Rate response">
      <button
        type="button"
        className={cn(
          btnBase,
          vote === 1 ? btnSelected : btnIdle,
          pop === 1 && "animate-ds-feedback-select",
          !upVisible && "pointer-events-none m-0 w-0 min-w-0 scale-75 p-0 opacity-0"
        )}
        style={feedbackSelectedStyle(upActiveColor)}
        aria-label="Good response"
        aria-pressed={vote === 1}
        tabIndex={upVisible ? 0 : -1}
        onClick={() => handleClick(1)}
      >
        <ThumbsUp
          className={cn("size-4 transition-[fill] duration-200", vote === 1 && "fill-current")}
          strokeWidth={vote === 1 ? 2.25 : 2}
          aria-hidden
        />
      </button>
      <button
        type="button"
        className={cn(
          btnBase,
          "-ml-1",
          vote === -1 ? btnSelected : btnIdle,
          pop === -1 && "animate-ds-feedback-select",
          !downVisible && "pointer-events-none m-0 w-0 min-w-0 scale-75 p-0 opacity-0"
        )}
        style={feedbackSelectedStyle(FEEDBACK_DOWN_COLOR)}
        aria-label="Bad response"
        aria-pressed={vote === -1}
        tabIndex={downVisible ? 0 : -1}
        onClick={() => handleClick(-1)}
      >
        <ThumbsDown
          className={cn("size-4 transition-[fill] duration-200", vote === -1 && "fill-current")}
          strokeWidth={vote === -1 ? 2.25 : 2}
          aria-hidden
        />
      </button>
    </div>
  );
}
