export default function UsageLoading() {
  return (
    <div className="ds-app-shell px-6 pt-6 pb-16 md:px-8 md:pt-8 md:pb-20">
      <div className="mx-auto w-full max-w-6xl">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="space-y-3">
            <div className="bg-ds-sidebar h-8 w-28 animate-pulse rounded-md" />
            <div className="bg-ds-sidebar h-4 w-[30rem] max-w-full animate-pulse rounded-md" />
          </div>
          <div className="bg-ds-sidebar h-10 w-28 animate-pulse rounded-ds-lg" />
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <section className="border-ds-outline rounded-ds-xl border bg-ds-surface p-6 shadow-sm md:p-8">
            <div className="bg-ds-sidebar h-6 w-40 animate-pulse rounded-md" />
            <div className="bg-ds-sidebar mt-3 h-4 w-full animate-pulse rounded-md" />
            <div className="bg-ds-sidebar mt-2 h-4 w-11/12 animate-pulse rounded-md" />

            <div className="mt-6">
              <div className="flex items-center justify-between">
                <div className="bg-ds-sidebar h-8 w-24 animate-pulse rounded-md" />
                <div className="bg-ds-sidebar h-6 w-32 animate-pulse rounded-md" />
              </div>
              <div className="bg-ds-sidebar mt-4 h-3 w-full animate-pulse rounded-full" />
              <div className="mt-2 flex gap-4">
                <div className="bg-ds-sidebar h-3 w-20 animate-pulse rounded-md" />
                <div className="bg-ds-sidebar h-3 w-28 animate-pulse rounded-md" />
              </div>
            </div>

            <div className="border-ds-outline mt-8 space-y-4 border-t pt-6">
              <div className="flex items-center justify-between">
                <div className="bg-ds-sidebar h-4 w-24 animate-pulse rounded-md" />
                <div className="bg-ds-sidebar h-4 w-20 animate-pulse rounded-md" />
              </div>
              <div className="flex items-center justify-between">
                <div className="bg-ds-sidebar h-4 w-40 animate-pulse rounded-md" />
                <div className="bg-ds-sidebar h-4 w-14 animate-pulse rounded-md" />
              </div>
              <div className="flex items-center justify-between">
                <div className="bg-ds-sidebar h-4 w-32 animate-pulse rounded-md" />
                <div className="bg-ds-sidebar h-4 w-20 animate-pulse rounded-md" />
              </div>
              <div className="flex items-center justify-between">
                <div className="bg-ds-sidebar h-4 w-24 animate-pulse rounded-md" />
                <div className="bg-ds-sidebar h-4 w-32 animate-pulse rounded-md" />
              </div>
            </div>
          </section>

          <section className="border-ds-outline rounded-ds-xl border bg-ds-surface p-6 shadow-sm md:p-8">
            <div className="bg-ds-sidebar h-6 w-32 animate-pulse rounded-md" />
            <div className="bg-ds-sidebar mt-3 h-4 w-full animate-pulse rounded-md" />
            <div className="bg-ds-sidebar mt-2 h-4 w-10/12 animate-pulse rounded-md" />
            <div className="border-ds-outline mt-6 rounded-ds-lg border bg-ds-sidebar/50 p-4">
              <div className="bg-ds-sidebar h-3 w-full animate-pulse rounded-md" />
              <div className="bg-ds-sidebar mt-2 h-3 w-11/12 animate-pulse rounded-md" />
              <div className="bg-ds-sidebar mt-2 h-3 w-9/12 animate-pulse rounded-md" />
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
