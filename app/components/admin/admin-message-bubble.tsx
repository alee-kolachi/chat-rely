import { cn } from "@/lib/utils";
import type { AdminMessageDTO } from "@/lib/admin/api";
import { formatCostUsd } from "@/lib/admin/cost-format";

const ROLE_STYLES: Record<string, { badge: string; container: string; label: string }> = {
  user: {
    badge: "bg-sky-500/15 text-sky-700",
    container: "border-sky-200/60 bg-sky-50/40",
    label: "User",
  },
  assistant: {
    badge: "bg-emerald-500/15 text-emerald-700",
    container: "border-emerald-200/60 bg-emerald-50/40",
    label: "Assistant",
  },
  tool: {
    badge: "bg-amber-500/15 text-amber-800",
    container: "border-amber-200/60 bg-amber-50/40",
    label: "Tool",
  },
  system: {
    badge: "bg-ds-outline/40 text-ds-on-surface-variant",
    container: "border-ds-outline/60 bg-ds-neutral",
    label: "System",
  },
};

function formatTimestamp(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString();
  } catch {
    return iso;
  }
}

function isPayloadEmpty(payload: Record<string, unknown> | null | undefined): boolean {
  if (!payload) return true;
  return Object.keys(payload).length === 0;
}

export function AdminMessageBubble({ message }: { message: AdminMessageDTO }) {
  const style = ROLE_STYLES[message.role] ?? ROLE_STYLES.system;
  const showAssistantFooter =
    message.role === "assistant" &&
    (message.model !== null || message.input_tokens > 0 || message.output_tokens > 0 || message.latency_ms !== null);
  const hasToolCallPayload = !isPayloadEmpty(message.tool_call_payload);
  const hasToolResultPayload = !isPayloadEmpty(message.tool_result_payload);

  return (
    <article
      className={cn(
        "flex flex-col gap-2 rounded-xl border px-4 py-3 text-sm",
        style.container
      )}
    >
      <header className="flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "inline-flex rounded-full px-2 py-0.5 font-semibold uppercase tracking-wide",
              style.badge
            )}
          >
            {style.label}
          </span>
          {message.tool_name && (
            <span className="text-ds-on-surface-variant font-mono text-[11px]">
              {message.tool_name}
            </span>
          )}
        </div>
        <time className="text-ds-on-surface-variant">{formatTimestamp(message.created_at)}</time>
      </header>

      {message.content && (
        <div className="text-ds-on-surface whitespace-pre-wrap break-words">{message.content}</div>
      )}

      {(hasToolCallPayload || hasToolResultPayload) && (
        <div className="flex flex-col gap-2 pt-1">
          {hasToolCallPayload && (
            <details className="border-ds-outline/60 rounded-md border bg-white/60">
              <summary className="text-ds-on-surface-variant cursor-pointer px-2 py-1 text-xs font-medium">
                tool_call_payload
              </summary>
              <pre className="text-ds-on-surface max-h-80 overflow-auto px-3 py-2 text-[11px] leading-snug">
                {JSON.stringify(message.tool_call_payload, null, 2)}
              </pre>
            </details>
          )}
          {hasToolResultPayload && (
            <details className="border-ds-outline/60 rounded-md border bg-white/60">
              <summary className="text-ds-on-surface-variant cursor-pointer px-2 py-1 text-xs font-medium">
                tool_result_payload
              </summary>
              <pre className="text-ds-on-surface max-h-80 overflow-auto px-3 py-2 text-[11px] leading-snug">
                {JSON.stringify(message.tool_result_payload, null, 2)}
              </pre>
            </details>
          )}
        </div>
      )}

      {showAssistantFooter && (
        <footer className="text-ds-on-surface-variant flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px]">
          {message.model && (
            <span>
              model: <span className="text-ds-on-surface font-mono">{message.model}</span>
            </span>
          )}
          <span>
            tokens in/out:{" "}
            <span className="text-ds-on-surface font-mono">
              {message.input_tokens}/{message.output_tokens}
            </span>
          </span>
          {message.latency_ms !== null && (
            <span>
              latency:{" "}
              <span className="text-ds-on-surface font-mono">{message.latency_ms}ms</span>
            </span>
          )}
          <span>
            cost:{" "}
            <span className="text-ds-on-surface font-mono">
              {formatCostUsd(message.cost_usd, { compact: true })}
            </span>
          </span>
        </footer>
      )}
    </article>
  );
}
