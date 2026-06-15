"use client";

import type { OnboardingIndexingSnapshot } from "@/lib/onboarding-indexing";
import { isSitemapScaleImport } from "@/lib/onboarding-indexing";
import { cn } from "@/lib/utils";

function progressPercent(snapshot: OnboardingIndexingSnapshot): number {
  if (snapshot.storageLimitReached || snapshot.succeeded) return 100;
  return Math.max(0, Math.min(100, snapshot.pct));
}

function progressDetail(snapshot: OnboardingIndexingSnapshot): string {
  if (snapshot.storageLimitReached) {
    if (snapshot.pagesProcessed > 0) {
      return `${snapshot.pagesProcessed} page${snapshot.pagesProcessed === 1 ? "" : "s"} ready for chat`;
    }
    return snapshot.storageLimitLabel ? `${snapshot.storageLimitLabel} cap reached` : "Plan storage cap reached";
  }
  if (snapshot.succeeded) return "100%";
  if (snapshot.failed) return "Needs attention";
  if (isSitemapScaleImport(snapshot.pagesProcessed, snapshot.pagesTotal)) {
    return `${snapshot.pagesProcessed} page${snapshot.pagesProcessed === 1 ? "" : "s"} imported`;
  }
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
  const running = (snapshot.running || snapshot.status === "queued") && !snapshot.storageLimitReached;
  if (!snapshot.headline) return null;

  const pct = progressPercent(snapshot);
  const detail = progressDetail(snapshot);
  const showIndeterminate = running && pct === 0;
  const title = snapshot.storageLimitReached
    ? snapshot.storageLimitLabel
      ? `${snapshot.storageLimitLabel} limit reached`
      : "Storage limit reached"
    : snapshot.succeeded
      ? "Import complete"
      : snapshot.failed
        ? "Import issue"
        : "Import progress";

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
          className={cn(
            "h-full rounded-full transition-[width] duration-500 ease-out",
            snapshot.storageLimitReached ? "bg-amber-600" : "bg-ds-primary",
          )}
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
          <span
            className={cn(
              "shrink-0 text-[11px] font-medium sm:text-xs",
              snapshot.storageLimitReached ? "text-amber-800" : "text-ds-on-surface-variant",
            )}
          >
            {title}
          </span>
          <span
            className={cn(
              "shrink-0 text-xs font-semibold tabular-nums sm:text-sm",
              snapshot.storageLimitReached ? "text-amber-900" : "text-ds-on-surface",
            )}
          >
            {detail}
          </span>
        </div>
        {running || snapshot.succeeded || snapshot.storageLimitReached ? bar : null}
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
      {(running || snapshot.succeeded || snapshot.storageLimitReached) && bar}
    </div>
  );
}
