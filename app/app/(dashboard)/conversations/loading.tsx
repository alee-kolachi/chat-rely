export default function ConversationsLoading() {
  return (
    <div className="ds-app-shell ds-app-shell--flush flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="ds-flush-page-pad mx-auto flex min-h-0 w-full max-w-[1200px] flex-1 flex-col gap-4 overflow-hidden sm:gap-6">
        <header className="shrink-0">
          <div className="bg-ds-sidebar h-8 w-48 animate-pulse rounded-md" />
          <div className="bg-ds-sidebar mt-3 h-4 w-96 max-w-full animate-pulse rounded-md" />
        </header>

        <section className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden sm:gap-6 xl:grid xl:grid-cols-[380px_1fr] xl:grid-rows-[minmax(0,1fr)]">
          <div className="border-ds-outline bg-ds-surface flex min-h-0 flex-1 flex-col overflow-hidden rounded-ds-xl border shadow-sm">
            <div className="border-ds-outline bg-ds-sidebar/90 flex shrink-0 items-center justify-between border-b px-4 py-3">
              <div className="bg-ds-sidebar h-4 w-24 animate-pulse rounded-md" />
              <div className="bg-ds-sidebar h-4 w-16 animate-pulse rounded-md" />
            </div>
            <div className="space-y-3 p-4">
              <div className="bg-ds-sidebar h-14 animate-pulse rounded-lg" />
              <div className="bg-ds-sidebar h-14 animate-pulse rounded-lg" />
              <div className="bg-ds-sidebar h-14 animate-pulse rounded-lg" />
              <div className="bg-ds-sidebar h-14 animate-pulse rounded-lg" />
            </div>
          </div>

          <div className="border-ds-outline bg-ds-surface hidden min-h-0 flex-col overflow-hidden rounded-ds-xl border shadow-sm xl:flex">
            <div className="border-ds-outline bg-ds-sidebar/90 flex shrink-0 items-center justify-between border-b px-5 py-4 sm:px-6">
              <div className="space-y-2">
                <div className="bg-ds-sidebar h-4 w-56 animate-pulse rounded-md" />
                <div className="bg-ds-sidebar h-3 w-24 animate-pulse rounded-md" />
              </div>
              <div className="flex items-center gap-2">
                <div className="bg-ds-sidebar h-8 w-20 animate-pulse rounded-md" />
                <div className="bg-ds-sidebar h-8 w-20 animate-pulse rounded-md" />
              </div>
            </div>
            <div className="space-y-3 px-5 py-6 sm:px-6">
              <div className="bg-ds-sidebar h-16 w-3/4 animate-pulse rounded-2xl" />
              <div className="bg-ds-sidebar ml-auto h-16 w-2/3 animate-pulse rounded-2xl" />
              <div className="bg-ds-sidebar h-16 w-4/5 animate-pulse rounded-2xl" />
            </div>
            <div className="border-ds-outline shrink-0 border-t px-5 py-4 sm:px-6">
              <div className="bg-ds-sidebar h-11 w-full animate-pulse rounded-ds-lg" />
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
