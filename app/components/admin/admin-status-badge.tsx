import { cn } from "@/lib/utils";

const TONES = {
  positive: "bg-emerald-500/15 text-emerald-700",
  warning: "bg-amber-500/15 text-amber-700",
  danger: "bg-rose-500/15 text-rose-700",
  info: "bg-sky-500/15 text-sky-700",
  neutral: "bg-ds-outline/40 text-ds-on-surface-variant",
} as const;

type Tone = keyof typeof TONES;

const TONE_BY_STATUS: Record<string, Tone> = {
  // subscriptions
  active: "positive",
  trialing: "info",
  past_due: "warning",
  unpaid: "warning",
  paused: "warning",
  canceled: "neutral",
  incomplete: "warning",
  incomplete_expired: "danger",
  // conversations
  open: "info",
  idle_closed: "neutral",
  resolved: "positive",
  escalated: "danger",
  // generic
  inactive: "neutral",
  archived: "neutral",
};

export function AdminStatusBadge({
  status,
  tone,
  className,
}: {
  status: string;
  tone?: Tone;
  className?: string;
}) {
  const resolvedTone: Tone = tone ?? TONE_BY_STATUS[status] ?? "neutral";
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide",
        TONES[resolvedTone],
        className
      )}
    >
      {status.replace(/_/g, " ")}
    </span>
  );
}
