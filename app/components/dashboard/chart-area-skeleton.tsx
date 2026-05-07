"use client";

import { cn } from "@/lib/utils";

/** Relative bar heights for a plausible volume chart silhouette (market-standard bar preview). */
const BAR_HEIGHT_FRACS = [0.38, 0.55, 0.44, 0.72, 0.51, 0.63, 0.41, 0.58, 0.49, 0.68, 0.54, 0.42];

export type ChartAreaSkeletonProps = {
  className?: string;
  minPlotHeight?: number;
  maxPlotHeight?: number;
};

export function ChartAreaSkeleton({
  className,
  minPlotHeight = 200,
  maxPlotHeight = 320,
}: ChartAreaSkeletonProps) {
  return (
    <div className={cn("px-3 pb-3 pt-2 sm:px-4", className)}>
      <div
        role="status"
        aria-label="Loading chart"
        className="mx-auto flex w-full gap-2 sm:gap-3"
        style={{ maxHeight: maxPlotHeight }}
      >
        <div
          className="flex w-7 shrink-0 flex-col justify-between pb-9 pt-1 sm:w-8"
          style={{ minHeight: minPlotHeight }}
          aria-hidden
        >
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="ds-skeleton h-2 w-5 self-end sm:w-6" />
          ))}
        </div>
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <div
            className="relative flex flex-1 flex-col overflow-hidden"
            style={{ minHeight: minPlotHeight, maxHeight: maxPlotHeight }}
          >
            <div
              className="pointer-events-none absolute inset-x-0 top-3 bottom-11 flex flex-col justify-between"
              aria-hidden
            >
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="h-px w-full bg-ds-outline/25" />
              ))}
            </div>
            <div className="relative flex flex-1 items-end gap-px px-0 pb-10 pt-5 sm:gap-0.5">
              {BAR_HEIGHT_FRACS.map((frac, i) => (
                <div key={i} className="flex h-full min-h-0 flex-1 flex-col justify-end">
                  <div
                    className="ds-skeleton w-full min-h-[6px]"
                    style={{ height: `${Math.round(frac * 88)}%` }}
                  />
                </div>
              ))}
            </div>
            <div className="absolute right-0 bottom-10 left-0 h-px bg-ds-outline/35" aria-hidden />
          </div>
          <div className="flex gap-px pt-1 sm:gap-0.5" aria-hidden>
            {BAR_HEIGHT_FRACS.map((_, i) => (
              <div key={i} className="ds-skeleton h-2 flex-1" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
