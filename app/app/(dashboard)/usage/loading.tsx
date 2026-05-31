export default function UsageLoading() {
  return (
    <div className="ds-app-shell">
      <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div className="space-y-3">
            <div className="bg-ds-sidebar h-8 w-28 animate-pulse rounded-md" />
            <div className="bg-ds-sidebar h-4 w-full max-w-xl animate-pulse rounded-md" />
            <div className="bg-ds-sidebar h-4 w-56 animate-pulse rounded-md" />
          </div>
          <div className="bg-ds-sidebar h-10 w-32 animate-pulse rounded-ds-lg" />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="border-ds-outline bg-ds-surface rounded-ds-xl border p-5 shadow-sm sm:p-6"
            >
              <div className="bg-ds-sidebar h-4 w-28 animate-pulse rounded-md" />
              <div className="mt-4 flex items-end justify-between gap-2">
                <div className="bg-ds-sidebar h-9 w-16 animate-pulse rounded-md" />
                <div className="bg-ds-sidebar h-4 w-24 animate-pulse rounded-md" />
              </div>
              <div className="bg-ds-sidebar mt-4 h-2 w-full animate-pulse rounded-full" />
              <div className="bg-ds-sidebar mt-4 h-4 w-full animate-pulse rounded-md" />
            </div>
          ))}
        </div>

        <div className="border-ds-outline bg-ds-surface rounded-ds-xl border p-6 shadow-sm">
          <div className="bg-ds-sidebar h-5 w-40 animate-pulse rounded-md" />
          <div className="bg-ds-sidebar mt-2 h-4 w-96 max-w-full animate-pulse rounded-md" />
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div className="border-ds-outline bg-ds-sidebar/40 h-20 animate-pulse rounded-ds-lg border" />
            <div className="border-ds-outline bg-ds-sidebar/40 h-20 animate-pulse rounded-ds-lg border" />
          </div>
        </div>
      </div>
    </div>
  );
}
