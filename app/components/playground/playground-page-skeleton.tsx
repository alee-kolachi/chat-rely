/** Loading placeholders for Playground settings column — matches spacing of real controls. */

export function PlaygroundSettingsColumnSkeleton() {
  return (
    <div className="space-y-10" aria-busy aria-label="Loading playground settings">
      <div className="space-y-2">
        <div className="ds-skeleton h-3 w-24" />
        <div className="ds-skeleton h-10 w-full max-w-md" />
      </div>
      <div className="space-y-3">
        <div className="ds-skeleton h-3 w-28" />
        <div className="ds-skeleton h-2 w-full max-w-md" />
        <div className="ds-skeleton h-3 w-full max-w-xs mx-auto" />
      </div>
      <div className="space-y-4">
        <div className="ds-skeleton h-3 w-36" />
        <div className="border-ds-outline overflow-hidden rounded-ds-lg border bg-ds-surface shadow-sm">
          <div className="bg-ds-sidebar flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="ds-skeleton size-4 shrink-0" />
              <div className="ds-skeleton h-4 w-36" />
            </div>
            <div className="ds-skeleton size-4" />
          </div>
          <div className="border-ds-outline border-t p-4">
            <PlaygroundShopifyActionsSkeleton rows={4} />
          </div>
        </div>
      </div>
      <div className="border-ds-outline flex items-center justify-between rounded-ds-lg border bg-ds-surface p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="ds-skeleton size-4 shrink-0" />
          <div className="ds-skeleton h-4 w-40" />
        </div>
        <div className="ds-skeleton h-5 w-9 shrink-0" />
      </div>
      <div className="space-y-2">
        <div className="ds-skeleton h-3 w-24" />
        <div className="ds-skeleton h-10 w-full max-w-md" />
      </div>
      <div className="space-y-2">
        <div className="ds-skeleton h-3 w-28" />
        <div className="ds-skeleton min-h-[8rem] w-full" />
      </div>
    </div>
  );
}

export function PlaygroundShopifyActionsSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-4" aria-hidden>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1 space-y-2">
            <div className="ds-skeleton h-4 w-[min(85%,14rem)]" />
            <div className="ds-skeleton h-3 w-full max-w-sm" />
          </div>
          <div className="ds-skeleton h-5 w-9 shrink-0" />
        </div>
      ))}
    </div>
  );
}

export function PlaygroundConnectionCheckSkeleton() {
  return (
    <div className="space-y-3" aria-hidden>
      <div className="ds-skeleton h-3 w-full max-w-md" />
      <div className="ds-skeleton h-3 w-36" />
    </div>
  );
}

export function PlaygroundHistoryListSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <ul className="flex flex-col gap-2" aria-hidden>
      {Array.from({ length: rows }).map((_, i) => (
        <li key={i} className="border-ds-outline rounded-2xl border bg-white p-3.5 shadow-sm">
          <div className="ds-skeleton h-4 w-[min(90%,18rem)]" />
          <div className="ds-skeleton mt-2 h-3 w-32" />
        </li>
      ))}
    </ul>
  );
}
