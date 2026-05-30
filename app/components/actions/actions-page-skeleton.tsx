/** Shared loading placeholders for `/actions` (Suspense + catalog fetch). */

export function ActionsPageShellSkeleton() {
  return (
    <div className="ds-app-shell p-6 md:p-8">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
        <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div className="space-y-3">
            <div className="bg-ds-on-surface-variant/15 h-8 w-64 max-w-full animate-pulse rounded-md" />
            <div className="bg-ds-on-surface-variant/12 h-4 w-full max-w-md animate-pulse rounded-sm" />
          </div>
          <div className="bg-ds-on-surface-variant/15 h-10 w-36 animate-pulse rounded-ds-md self-start md:self-auto" />
        </header>

        <section className="border-ds-outline overflow-hidden rounded-ds-xl border bg-ds-surface shadow-sm">
          <div className="border-ds-outline border-b px-5 py-4 md:px-6">
            <div className="bg-ds-on-surface-variant/15 h-6 w-28 animate-pulse rounded-sm" />
          </div>
          <div className="px-5 py-4 md:px-6">
            <div className="bg-ds-on-surface-variant/12 h-10 w-full animate-pulse rounded-ds-md" />
          </div>
          <div className="border-ds-outline border-t px-5 py-3 md:px-6">
            <div className="bg-ds-on-surface-variant/12 h-4 w-40 animate-pulse rounded-sm" />
          </div>
          <div className="border-ds-outline border-t bg-ds-sidebar/20 px-5 py-4 md:px-6">
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="border-ds-outline h-28 animate-pulse rounded-ds-lg border bg-white"
                />
              ))}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

export function IntegrationSectionsSkeleton() {
  return (
    <>
      <section className="border-ds-outline overflow-hidden rounded-ds-xl border bg-ds-surface shadow-sm">
        <div className="border-ds-outline border-b px-5 py-4 md:px-6">
          <div className="bg-ds-on-surface-variant/15 h-6 w-36 animate-pulse rounded-sm" />
        </div>
        <div className="px-5 py-4 md:px-6">
          <div className="border-ds-outline h-24 animate-pulse rounded-ds-lg border bg-white" />
        </div>
      </section>
      <section className="border-ds-outline overflow-hidden rounded-ds-xl border bg-ds-surface shadow-sm">
        <div className="border-ds-outline border-b px-5 py-4 md:px-6">
          <div className="bg-ds-on-surface-variant/15 h-6 w-32 animate-pulse rounded-sm" />
        </div>
        <div className="grid grid-cols-1 gap-2 px-5 py-4 sm:grid-cols-2 md:px-6 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="border-ds-outline h-14 animate-pulse rounded-ds-lg border border-dashed bg-ds-sidebar/25"
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
          className="border-ds-outline overflow-hidden rounded-ds-lg border bg-white"
        >
          <div className="flex animate-pulse gap-3 p-4">
            <div className="bg-ds-on-surface-variant/15 size-9 shrink-0 rounded-ds-md" />
            <div className="min-w-0 flex-1 space-y-2">
              <div className="bg-ds-on-surface-variant/15 h-4 w-2/5 rounded-sm" />
              <div className="bg-ds-on-surface-variant/12 h-3 w-full rounded-sm" />
            </div>
          </div>
          <div className="border-ds-outline/70 flex justify-between border-t px-4 py-2.5">
            <div className="bg-ds-on-surface-variant/15 h-5 w-14 rounded-full" />
            <div className="bg-ds-on-surface-variant/12 h-3 w-12 rounded-sm" />
          </div>
        </div>
      ))}
    </>
  );
}
