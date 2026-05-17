"use client";

import { AssistantMarkdown } from "@/components/chat/assistant-markdown";
import { AssistantThinkingDots } from "@/components/chat/assistant-thinking-dots";
import { ToolActivityLine } from "@/components/chat/tool-activity-line";
import { cn } from "@/lib/utils";

export type AssistantStreamPhase = "thinking" | "streaming" | "done" | "error";

const EMPTY_REPLY_FALLBACK =
  "I couldn't put together an answer just now. Try again, or check that your website finished importing.";

export function StreamingAssistantMessage({
  text,
  phase,
  errorMessage,
  statusLine,
  onRetry,
  brandColorHex,
  className,
}: {
  text: string;
  phase: AssistantStreamPhase;
  errorMessage?: string | null;
  statusLine?: string | null;
  onRetry?: () => void;
  brandColorHex?: string | null;
  className?: string;
}) {
  if (phase === "error") {
    return (
      <div className={cn("text-ds-on-surface text-sm leading-relaxed", className)}>
        <p>{errorMessage ?? "Something went wrong. Try again."}</p>
        {onRetry ? (
          <button
            type="button"
            className="text-ds-primary mt-2 text-sm font-medium underline"
            onClick={onRetry}
          >
            Retry
          </button>
        ) : null}
      </div>
    );
  }

  const showDots = phase === "thinking";
  const trimmed = text.trim();
  const showText = trimmed.length > 0 && (phase === "streaming" || phase === "done");
  const showEmptyDone = phase === "done" && !trimmed.length;

  return (
    <div className={cn("min-h-[1.25rem]", className)}>
      {showDots ? <AssistantThinkingDots brandColorHex={brandColorHex} /> : null}
      {statusLine && (phase === "thinking" || phase === "streaming") ? (
        <ToolActivityLine message={statusLine} />
      ) : null}
      {showText ? (
        <div className="text-ds-on-surface text-sm leading-relaxed">
          <AssistantMarkdown>{text}</AssistantMarkdown>
        </div>
      ) : null}
      {showEmptyDone ? (
        <p className="text-ds-on-surface-variant text-sm leading-relaxed">{EMPTY_REPLY_FALLBACK}</p>
      ) : null}
    </div>
  );
}
