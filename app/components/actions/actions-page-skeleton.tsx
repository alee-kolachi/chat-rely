/** Shared loading placeholders for `/actions` (Suspense + catalog fetch). */

export function ActionsPageShellSkeleton() {
  return (
    <div className="ds-app-shell py-4 md:py-6">
      <div className="mx-auto w-full max-w-6xl">
        <header className="mb-8 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div className="space-y-3">
            <div className="bg-ds-on-surface-variant/15 h-8 w-64 max-w-full animate-pulse rounded-md" />
            <div className="bg-ds-on-surface-variant/12 h-4 w-full max-w-xl animate-pulse rounded-sm" />
            <div className="bg-ds-on-surface-variant/12 h-4 w-full max-w-lg animate-pulse rounded-sm" />
          </div>
          <div className="bg-ds-on-surface-variant/15 h-10 w-36 animate-pulse rounded-ds-md self-start md:self-auto" />
        </header>
        <div className="border-ds-outline mb-8 h-36 animate-pulse rounded-ds-xl border bg-white shadow-sm" />
        <div className="mt-10 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="border-ds-outline h-48 animate-pulse rounded-ds-xl border bg-ds-surface shadow-sm"
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export function IntegrationSectionsSkeleton() {
  return (
    <div className="mt-10 space-y-6">
      <section>
        <h2 className="ds-app-section-title mb-4 text-base md:text-lg">Human support</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
          <div className="border-ds-outline rounded-ds-xl flex flex-col gap-3 border bg-ds-surface p-5 shadow-sm">
            <div className="bg-ds-on-surface-variant/15 h-4 w-40 animate-pulse rounded-sm" />
            <div className="bg-ds-on-surface-variant/12 h-3 w-full animate-pulse rounded-sm" />
            <div className="bg-ds-on-surface-variant/12 h-3 w-[92%] animate-pulse rounded-sm" />
            <div className="mt-2 flex justify-between gap-2">
              <div className="bg-ds-on-surface-variant/12 h-3 w-24 animate-pulse rounded-sm" />
              <div className="bg-ds-on-surface-variant/12 h-3 w-16 animate-pulse rounded-sm" />
            </div>
          </div>
        </div>
      </section>
      <section>
        <h2 className="ds-app-section-title mb-4 text-base md:text-lg">More integrations</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="border-ds-outline rounded-ds-xl flex flex-col gap-3 border bg-ds-surface/80 p-5 shadow-sm"
            >
              <div className="bg-ds-on-surface-variant/15 h-4 w-32 animate-pulse rounded-sm" />
              <div className="bg-ds-on-surface-variant/12 h-3 w-full animate-pulse rounded-sm" />
              <div className="bg-ds-on-surface-variant/12 mt-2 h-3 w-20 animate-pulse rounded-sm" />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

export function ShopifyActionsGridSkeleton({ count }: { count: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="border-ds-outline rounded-ds-xl flex flex-col border bg-ds-surface p-5 shadow-sm"
        >
          <div className="flex animate-pulse items-start justify-between gap-4">
            <div className="flex flex-1 items-start gap-3">
              <div className="border-ds-outline bg-ds-on-surface-variant/15 size-10 shrink-0 rounded-ds-md border" />
              <div className="min-w-0 flex-1 space-y-2">
                <div className="bg-ds-on-surface-variant/15 h-3.5 w-3/5 max-w-[12rem] rounded-sm" />
                <div className="bg-ds-on-surface-variant/12 h-3 w-full rounded-sm" />
                <div className="bg-ds-on-surface-variant/12 h-3 w-[88%] rounded-sm" />
              </div>
            </div>
            <div className="bg-ds-on-surface-variant/15 h-5 w-9 shrink-0 rounded-full" />
          </div>
          <div className="border-ds-outline/60 mt-5 border-t pt-4">
            <div className="bg-ds-on-surface-variant/12 h-2.5 w-24 rounded-sm" />
            <div className="bg-ds-on-surface-variant/12 mt-2 h-3 w-full rounded-sm" />
          </div>
          <div className="mt-5 flex items-center justify-between">
            <div className="bg-ds-on-surface-variant/15 h-5 w-14 rounded-full" />
            <div className="bg-ds-on-surface-variant/12 h-3 w-20 rounded-sm" />
          </div>
        </div>
      ))}
    </>
  );
}
