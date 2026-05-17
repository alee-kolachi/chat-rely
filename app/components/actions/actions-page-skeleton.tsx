/** Shared loading placeholders for `/actions` (Suspense + catalog fetch). */

export function ActionsPageShellSkeleton() {
  return (
    <div className="ds-app-shell p-6 md:p-8">
      <div className="w-full space-y-8">
        <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div className="space-y-3">
            <div className="bg-ds-on-surface-variant/15 h-8 w-64 max-w-full animate-pulse rounded-md" />
            <div className="bg-ds-on-surface-variant/12 h-4 w-full max-w-xl animate-pulse rounded-sm" />
          </div>
          <div className="bg-ds-on-surface-variant/15 h-10 w-36 animate-pulse rounded-ds-md self-start md:self-auto" />
        </header>

        <section className="border-ds-outline space-y-6 rounded-ds-xl border bg-white p-5 shadow-sm md:p-6">
          <div className="border-ds-outline/70 space-y-3 border-b pb-5">
            <div className="bg-ds-on-surface-variant/15 h-7 w-32 animate-pulse rounded-sm" />
            <div className="bg-ds-on-surface-variant/12 h-4 w-full max-w-xl animate-pulse rounded-sm" />
          </div>
          <div className="border-ds-outline h-36 animate-pulse rounded-ds-xl border" />
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="border-ds-outline h-44 animate-pulse rounded-ds-xl border bg-ds-surface"
              />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

export function IntegrationSectionsSkeleton() {
  return (
    <>
      <section className="border-ds-outline space-y-4 rounded-ds-xl border bg-white p-5 shadow-sm md:p-6">
        <div className="border-ds-outline/70 space-y-3 border-b pb-5">
          <div className="bg-ds-on-surface-variant/15 h-7 w-40 animate-pulse rounded-sm" />
          <div className="bg-ds-on-surface-variant/12 h-4 w-full max-w-lg animate-pulse rounded-sm" />
        </div>
        <div className="border-ds-outline h-36 animate-pulse rounded-ds-xl border bg-ds-surface" />
      </section>
      <section className="border-ds-outline space-y-4 rounded-ds-xl border bg-white p-5 shadow-sm md:p-6">
        <div className="border-ds-outline/70 space-y-3 border-b pb-5">
          <div className="bg-ds-on-surface-variant/15 h-7 w-44 animate-pulse rounded-sm" />
          <div className="bg-ds-on-surface-variant/12 h-4 w-full max-w-lg animate-pulse rounded-sm" />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="border-ds-outline h-32 animate-pulse rounded-ds-xl border border-dashed bg-ds-surface/80"
            />
          ))}
        </div>
      </section>
    </>
  );
}

export function ShopifyActionsGridSkeleton({ count }: { count: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="border-ds-outline overflow-hidden rounded-ds-xl border bg-ds-surface shadow-sm"
        >
          <div className="flex animate-pulse flex-col p-5">
            <div className="flex gap-3">
              <div className="border-ds-outline bg-ds-on-surface-variant/15 size-10 shrink-0 rounded-ds-md border" />
              <div className="min-w-0 flex-1 space-y-2">
                <div className="bg-ds-on-surface-variant/15 h-4 w-2/5 rounded-sm" />
                <div className="bg-ds-on-surface-variant/12 h-3 w-full rounded-sm" />
                <div className="bg-ds-on-surface-variant/12 h-3 w-[90%] rounded-sm" />
              </div>
            </div>
            <div className="border-ds-outline/60 mt-4 border-t pt-4">
              <div className="bg-ds-on-surface-variant/12 h-3 w-full rounded-sm" />
            </div>
          </div>
          <div className="border-ds-outline/60 bg-ds-sidebar/30 flex justify-between border-t px-5 py-3">
            <div className="bg-ds-on-surface-variant/15 h-5 w-14 rounded-full" />
            <div className="bg-ds-on-surface-variant/12 h-3 w-20 rounded-sm" />
          </div>
        </div>
      ))}
    </>
  );
}
