"use client";

import type { OnboardingIndexingSnapshot } from "@/lib/onboarding-indexing";
import { cn } from "@/lib/utils";

export function OnboardingIndexingBanner({
  snapshot,
  compact = false,
  className,
}: {
  snapshot: OnboardingIndexingSnapshot;
  compact?: boolean;
  className?: string;
}) {
  if (!snapshot.headline) return null;

  const tone = snapshot.failed
    ? "border-amber-300/80 bg-amber-50"
    : snapshot.succeeded
      ? "border-emerald-300/80 bg-emerald-50"
      : "border-ds-primary/25 bg-ds-primary/10";

  return (
    <div
      className={cn(
        "border-b px-4 py-3 sm:px-6",
        tone,
        compact ? "py-2.5" : "",
        className,
      )}
      role="status"
      aria-live="polite"
    >
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-2">
        <div className="flex items-start gap-2.5">
          {snapshot.running ? (
            <span
              className="bg-ds-primary mt-1.5 size-2 shrink-0 animate-pulse rounded-full"
              aria-hidden
            />
          ) : null}
          <div className="min-w-0 flex-1">
            <p className="text-ds-on-surface text-sm font-semibold">{snapshot.headline}</p>
            {snapshot.detail ? (
              <p className="text-ds-on-surface-variant mt-0.5 text-xs leading-relaxed">{snapshot.detail}</p>
            ) : null}
          </div>
          {snapshot.pct > 0 ? (
            <span className="text-ds-on-surface shrink-0 text-xs font-semibold tabular-nums">
              {snapshot.pct}%
            </span>
          ) : null}
        </div>
        {snapshot.running && snapshot.pct > 0 ? (
          <div className="bg-ds-outline/70 h-1.5 overflow-hidden rounded-full">
            <div
              className="bg-ds-primary h-full rounded-full transition-[width] duration-500 ease-out"
              style={{ width: `${snapshot.pct}%` }}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}
