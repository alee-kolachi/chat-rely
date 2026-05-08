import { cn } from "@/lib/utils";

export type AdminKpiTone = "neutral" | "good" | "warn" | "bad" | "info";

export type AdminKpiCardProps = {
  label: string;
  value: string | number;
  /** Optional second-line helper (e.g. "vs prior +$12.34"). */
  helper?: string;
  /** Optional subscript on the helper line (e.g. unit hint, time hint). */
  hint?: string;
  tone?: AdminKpiTone;
  className?: string;
};

const TONE_CLASSES: Record<AdminKpiTone, string> = {
  neutral: "text-ds-on-surface",
  good: "text-emerald-700",
  warn: "text-amber-700",
  bad: "text-rose-700",
  info: "text-sky-700",
};

/**
 * Number + label + helper card. No charts — Phase 4 keeps the home page text-only;
 * the design budget for "graphical" lives in the Costing page only.
 */
export function AdminKpiCard({
  label,
  value,
  helper,
  hint,
  tone = "neutral",
  className,
}: AdminKpiCardProps) {
  const display = typeof value === "number" ? value.toLocaleString() : value;
  return (
    <section
      className={cn(
        "border-ds-outline rounded-xl border bg-ds-surface p-4",
        className
      )}
    >
      <h3 className="text-ds-on-surface-variant text-[11px] font-medium uppercase tracking-wide">
        {label}
      </h3>
      <div className={cn("mt-2 text-2xl font-semibold", TONE_CLASSES[tone])}>
        {display}
      </div>
      {helper && (
        <p className="text-ds-on-surface-variant mt-1 text-xs">{helper}</p>
      )}
      {hint && (
        <p className="text-ds-on-surface-variant/80 mt-0.5 text-[11px]">{hint}</p>
      )}
    </section>
  );
}
