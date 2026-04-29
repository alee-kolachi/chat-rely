import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

const usageBars = [
  10, 15, 8, 12, 45, 20, 30, 25, 18, 10, 12, 75, 40, 35, 22, 15, 90, 50, 38,
];

const highlightedBarIndexes = new Set([0, 4, 11, 16]);

export default function UsagePage() {
  return (
    <div className="ds-app-shell p-6 md:p-8">
      <div className="mx-auto w-full max-w-6xl">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="ds-app-page-title">Usage</h1>
            <p className="ds-app-page-description ds-app-page-description--wide">
              Resource consumption across all active agents.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              className="border-ds-outline text-ds-on-surface hover:border-ds-primary/30 flex items-center gap-2 rounded-ds-lg border bg-white px-4 py-2 text-sm font-medium shadow-sm transition-colors"
            >
              <span>All agents</span>
              <IconChevron className="size-4 shrink-0" aria-hidden />
            </button>
            <button
              type="button"
              className="border-ds-outline text-ds-on-surface hover:bg-ds-sidebar flex items-center gap-2 rounded-ds-lg border bg-white px-4 py-2 text-sm font-medium shadow-sm transition-colors"
            >
              <IconCalendar className="text-ds-on-surface-variant size-4 shrink-0" aria-hidden />
              <span>Apr 01, 2026 – Apr 19, 2026</span>
            </button>
          </div>
        </div>

        <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-2">
          <UsageStatCard
            valueText="1/50"
            title="Credits used"
            description="Credits used during the selected period. Your plan resets on the 1st of every month."
            actionText="Upgrade plan"
            actionIcon={<IconArrowRight className="size-3.5" />}
            progressPercent={2}
          />
          <UsageStatCard
            valueText="1/1"
            title="Agents used"
            description="Agents in your workspace. You are using your full seat allocation."
            actionText="Add seats"
            actionIcon={<IconPersonAdd className="size-3.5" />}
            progressPercent={100}
          />
        </div>

        <div className="border-ds-outline rounded-ds-xl border bg-ds-surface p-6 shadow-sm md:p-8">
          <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
            <h2 className="ds-app-section-title">Usage history</h2>
            <div className="text-ds-on-surface-variant flex items-center gap-2 text-[11px] font-semibold tracking-wide uppercase">
              <div className="bg-ds-primary size-3 shrink-0 rounded-sm" aria-hidden />
              <span>Active invocations</span>
            </div>
          </div>

          <div className="relative mt-4 flex h-64 items-end justify-between gap-1 pl-10 md:pl-12">
            <div className="text-ds-on-surface-variant absolute inset-y-0 left-0 flex w-9 flex-col justify-between py-1 text-[10px] font-medium md:w-10">
              <span>1,000</span>
              <span>750</span>
              <span>500</span>
              <span>250</span>
              <span>0</span>
            </div>
            <div className="flex h-full min-h-0 flex-1 items-end justify-between gap-1.5 px-1 sm:gap-2 sm:px-2">
              {usageBars.map((height, index) => {
                const highlighted = highlightedBarIndexes.has(index);
                return (
                  <div
                    key={`${index}-${height}`}
                    className="group relative flex w-full max-w-[2.5rem] flex-1 flex-col justify-end"
                  >
                    {highlighted ? (
                      <div className="bg-ds-on-surface absolute bottom-full left-1/2 z-10 mb-1 -translate-x-1/2 rounded-ds-md px-2 py-1 text-[10px] text-ds-on-primary opacity-0 shadow-sm transition-opacity group-hover:opacity-100">
                        {Math.round(height * 10)}
                      </div>
                    ) : null}
                    <div
                      className={cn(
                        "w-full rounded-t-sm transition-colors",
                        highlighted ? "bg-ds-primary hover:opacity-90" : "bg-ds-outline/70 hover:bg-ds-outline"
                      )}
                      style={{ height: `${height}%` }}
                    />
                  </div>
                );
              })}
            </div>
          </div>

          <div className="text-ds-on-surface-variant mt-6 flex flex-wrap justify-between gap-x-2 gap-y-1 px-1 text-[10px] font-semibold sm:px-2">
            <span>APR 01</span>
            <span>APR 04</span>
            <span>APR 07</span>
            <span>APR 10</span>
            <span>APR 13</span>
            <span>APR 16</span>
            <span>APR 19</span>
          </div>

          <div className="border-ds-outline mt-8 flex flex-col gap-3 rounded-ds-lg border bg-ds-sidebar/60 p-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-3">
              <IconInfo className="text-ds-primary mt-0.5 size-4.5 shrink-0" aria-hidden />
              <p className="text-ds-on-surface-variant text-sm leading-relaxed">
                Calculated usage may take up to 30 minutes to synchronize with the main database.
              </p>
            </div>
            <button
              type="button"
              className="border-ds-outline text-ds-on-surface hover:bg-ds-sidebar shrink-0 rounded-ds-md border bg-white px-4 py-2 text-xs font-semibold shadow-sm transition-colors"
            >
              Download report
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function UsageStatCard({
  valueText,
  title,
  description,
  actionText,
  actionIcon,
  progressPercent,
}: {
  valueText: string;
  title: string;
  description: string;
  actionText: string;
  actionIcon: ReactNode;
  progressPercent: number;
}) {
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - progressPercent / 100);

  return (
    <div className="border-ds-outline flex items-center gap-6 rounded-ds-xl border bg-ds-surface p-6 shadow-sm">
      <div className="relative h-24 w-24 shrink-0">
        <svg className="h-full w-full -rotate-90" viewBox="0 0 96 96" aria-hidden>
          <circle cx="48" cy="48" r={radius} fill="transparent" stroke="var(--ds-outline)" strokeWidth="8" />
          <circle
            cx="48"
            cy="48"
            r={radius}
            fill="transparent"
            stroke="var(--ds-primary)"
            strokeWidth="8"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-ds-on-surface text-lg font-semibold">{valueText}</span>
        </div>
      </div>
      <div className="min-w-0">
        <h3 className="ds-app-section-title text-base">{title}</h3>
        <p className="text-ds-on-surface-variant mt-1 text-sm leading-relaxed">{description}</p>
        <button
          type="button"
          className="text-ds-primary mt-3 inline-flex items-center gap-1 text-xs font-semibold hover:underline"
        >
          {actionText}
          {actionIcon}
        </button>
      </div>
    </div>
  );
}

function IconBase({
  className,
  children,
  fill = "none",
  strokeWidth = "1.8",
}: {
  className?: string;
  children: ReactNode;
  fill?: string;
  strokeWidth?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill={fill}
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      {children}
    </svg>
  );
}

function IconChevron({ className }: { className?: string }) {
  return (
    <IconBase className={className}>
      <path d="m6 9 6 6 6-6" />
    </IconBase>
  );
}

function IconCalendar({ className }: { className?: string }) {
  return (
    <IconBase className={className}>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M8 3v4M16 3v4M3 10h18" />
    </IconBase>
  );
}

function IconArrowRight({ className }: { className?: string }) {
  return (
    <IconBase className={className}>
      <path d="M5 12h14" />
      <path d="m13 6 6 6-6 6" />
    </IconBase>
  );
}

function IconPersonAdd({ className }: { className?: string }) {
  return (
    <IconBase className={className}>
      <circle cx="10" cy="8" r="3" />
      <path d="M4 19c0-3.2 2.7-5 6-5s6 1.8 6 5" />
      <path d="M19 8v6M16 11h6" />
    </IconBase>
  );
}

function IconInfo({ className }: { className?: string }) {
  return (
    <IconBase className={className}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 10v6M12 7.5h.01" />
    </IconBase>
  );
}
