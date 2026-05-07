/** Loading placeholders for `/analytics` — flat rects, matches dashboard skeleton style. */

export function AnalyticsIntentListSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3" aria-hidden>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="bg-ds-sidebar/80 px-4 py-3">
          <div className="ds-skeleton h-4 w-[min(70%,14rem)]" />
          <div className="ds-skeleton mt-2 h-3 w-28" />
        </div>
      ))}
    </div>
  );
}

export function AnalyticsCountryListSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-4" aria-hidden>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4">
          <div className="ds-skeleton h-3 w-12 shrink-0" />
          <div className="ds-skeleton h-2.5 min-w-0 flex-1" />
          <div className="ds-skeleton h-3 w-8 shrink-0" />
        </div>
      ))}
    </div>
  );
}

export function AnalyticsSentimentSkeleton() {
  return (
    <div
      className="flex flex-col items-center gap-6 sm:flex-row sm:items-start sm:justify-center xl:justify-start"
      aria-hidden
    >
      <div className="ds-skeleton size-[11rem] shrink-0" />
      <div className="w-full min-w-0 flex-1 space-y-3 sm:max-w-md">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="ds-skeleton size-3 shrink-0" />
            <div className="ds-skeleton h-4 flex-1 max-w-[10rem]" />
            <div className="ds-skeleton h-4 w-10 shrink-0" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function AnalyticsQualityListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-3" aria-hidden>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="bg-ds-sidebar/60 px-4 py-3">
          <div className="flex items-baseline justify-between gap-2">
            <div className="ds-skeleton h-4 w-[min(60%,12rem)]" />
            <div className="ds-skeleton h-4 w-14 shrink-0" />
          </div>
          <div className="ds-skeleton mt-2 h-3 w-full max-w-md" />
        </div>
      ))}
    </div>
  );
}

export function AnalyticsChannelSplitSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-4" aria-hidden>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i}>
          <div className="mb-2 flex items-center justify-between gap-2">
            <div className="ds-skeleton h-4 w-32 max-w-[55%]" />
            <div className="ds-skeleton h-4 w-8 shrink-0" />
          </div>
          <div className="ds-skeleton h-2 w-full" />
        </div>
      ))}
    </div>
  );
}

export function AnalyticsKpiDeltaSkeleton() {
  return <span className="ds-skeleton inline-block h-7 w-10 shrink-0" aria-hidden />;
}
