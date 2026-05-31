export default function TicketsLoading() {
  return (
    <div className="ds-app-shell">
      <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div className="space-y-3">
            <div className="bg-ds-sidebar h-8 w-32 animate-pulse rounded-md" />
            <div className="bg-ds-sidebar h-4 w-[34rem] max-w-full animate-pulse rounded-md" />
          </div>
          <div className="bg-ds-sidebar h-10 w-24 animate-pulse rounded-ds-md" />
        </div>

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <article className="border-ds-outline bg-ds-surface rounded-ds-xl border p-5 shadow-sm sm:p-6">
            <div className="bg-ds-sidebar h-4 w-16 animate-pulse rounded-md" />
            <div className="bg-ds-sidebar mt-3 h-8 w-12 animate-pulse rounded-md" />
          </article>
          <article className="border-ds-outline bg-ds-surface rounded-ds-xl border p-5 shadow-sm sm:p-6">
            <div className="bg-ds-sidebar h-4 w-14 animate-pulse rounded-md" />
            <div className="bg-ds-sidebar mt-3 h-8 w-12 animate-pulse rounded-md" />
          </article>
          <article className="border-ds-outline bg-ds-surface rounded-ds-xl border p-5 shadow-sm sm:p-6">
            <div className="bg-ds-sidebar h-4 w-32 animate-pulse rounded-md" />
            <div className="bg-ds-sidebar mt-3 h-8 w-12 animate-pulse rounded-md" />
          </article>
        </section>

        <section className="border-ds-outline bg-ds-surface overflow-hidden rounded-ds-xl border shadow-sm">
          <div className="border-ds-outline bg-ds-sidebar/90 border-b px-4 py-3">
            <div className="bg-ds-sidebar h-4 w-16 animate-pulse rounded-md" />
          </div>
          <div className="space-y-2 p-3">
            <div className="bg-ds-sidebar h-14 animate-pulse rounded-lg" />
            <div className="bg-ds-sidebar h-14 animate-pulse rounded-lg" />
            <div className="bg-ds-sidebar h-14 animate-pulse rounded-lg" />
            <div className="bg-ds-sidebar h-14 animate-pulse rounded-lg" />
          </div>
        </section>
      </div>
    </div>
  );
}
