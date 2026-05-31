"use client";

import type { OnboardingIndexingSnapshot } from "@/lib/onboarding-indexing";
import { cn } from "@/lib/utils";

function progressPercent(snapshot: OnboardingIndexingSnapshot): number {
  if (snapshot.succeeded) return 100;
  return Math.max(0, Math.min(100, snapshot.pct));
}

function progressDetail(snapshot: OnboardingIndexingSnapshot): string {
  if (snapshot.succeeded) return "100%";
  if (snapshot.failed) return "Needs attention";
  if (snapshot.pagesTotal > 0 && snapshot.pct > 0) {
    return `${snapshot.pct}% · ${snapshot.pagesProcessed} / ${snapshot.pagesTotal} pages`;
  }
  if (snapshot.pagesTotal > 0) {
    return `${snapshot.pagesProcessed} / ${snapshot.pagesTotal} pages`;
  }
  if (snapshot.pct > 0) {
    return `${snapshot.pct}%`;
  }
  if (snapshot.pagesProcessed > 0) {
    return `${snapshot.pagesProcessed} page${snapshot.pagesProcessed === 1 ? "" : "s"} found`;
  }
  return "Starting…";
}

export function OnboardingIndexingProgress({
  snapshot,
  variant = "header",
  className,
}: {
  snapshot: OnboardingIndexingSnapshot;
  variant?: "header" | "card";
  className?: string;
}) {
  const running = snapshot.running || snapshot.status === "queued";
  if (!snapshot.headline) return null;

  const pct = progressPercent(snapshot);
  const detail = progressDetail(snapshot);
  const showIndeterminate = running && pct === 0;
  const title = snapshot.succeeded
    ? "Indexing complete"
    : snapshot.failed
      ? "Indexing issue"
      : "Indexing progress";

  const bar = (
    <div
      className={cn(
        "bg-ds-outline/70 overflow-hidden rounded-full",
        variant === "header" ? "h-1 w-full min-w-[5.5rem] sm:min-w-[7rem]" : "mt-2 h-1.5 w-full",
      )}
      aria-hidden
    >
      {showIndeterminate ? (
        <div className="onboarding-index-progress-indeterminate bg-ds-primary h-full w-1/3 rounded-full" />
      ) : (
        <div
          className="bg-ds-primary h-full rounded-full transition-[width] duration-500 ease-out"
          style={{ width: `${pct}%` }}
        />
      )}
    </div>
  );

  if (variant === "header") {
    return (
      <div
        className={cn("flex min-w-0 max-w-[min(100%,14rem)] flex-col items-end gap-1 sm:max-w-[16rem]", className)}
        role="status"
        aria-live="polite"
        aria-label={`${title}, ${detail}`}
      >
        <div className="flex w-full items-center justify-between gap-2">
          <span className="text-ds-on-surface-variant shrink-0 text-[11px] font-medium sm:text-xs">
            {title}
          </span>
          <span className="text-ds-on-surface shrink-0 text-xs font-semibold tabular-nums sm:text-sm">
            {detail}
          </span>
        </div>
        {running || snapshot.succeeded ? bar : null}
      </div>
    );
  }

  return (
    <div
      className={cn("border-ds-outline mt-3 border-t pt-3", className)}
      role="status"
      aria-live="polite"
      aria-label={`${title}, ${detail}`}
    >
      <div className="flex items-center gap-2">
        {running ? (
          <span className="bg-ds-primary size-2 shrink-0 animate-pulse rounded-full" aria-hidden />
        ) : null}
        <span className="text-ds-on-surface text-sm font-medium">{title}</span>
        <span className="text-ds-on-surface ml-auto text-xs font-semibold tabular-nums sm:text-sm">
          {detail}
        </span>
      </div>
      {(running || snapshot.succeeded) && bar}
    </div>
  );
}
