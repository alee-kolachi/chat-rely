type DataSourcesSidebarProps = {
  className?: string;
  mobile?: boolean;
};

export function DataSourcesSidebar({ className, mobile = false }: DataSourcesSidebarProps) {
  if (mobile) {
    return (
      <section
        className={`border-ds-outline fixed right-0 bottom-0 left-0 z-40 border-t bg-white/95 p-3 shadow-xl backdrop-blur ${className ?? ""}`}
      >
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-ds-on-surface text-xs font-bold tracking-wide uppercase">Data sources</p>
            <div className="text-ds-on-surface-variant mt-0.5 flex items-center gap-2 text-xs">
              <IconLanguage className="size-4" />
              <span className="truncate">2068 Links · 887 KB used</span>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button className="border-ds-outline text-ds-on-surface rounded-ds-md border bg-white px-3 py-1.5 text-xs font-semibold">
              Retrain
            </button>
            <button className="bg-ds-primary text-ds-on-primary rounded-ds-md px-3 py-1.5 text-xs font-semibold">
              Upgrade
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <aside
      className={`border-ds-outline bg-ds-sidebar sticky top-0 h-[calc(100vh-3.5rem)] w-[500px] shrink-0 overflow-y-auto border-l p-8 ${
        className ?? ""
      }`}
    >
      <h2 className="mb-6 text-base font-bold text-black">Data sources</h2>
      <div className="space-y-4">
        <div className="border-ds-outline flex items-center justify-between rounded-ds-lg border bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2">
            <IconLanguage className="text-ds-on-surface-variant size-5" />
            <span className="text-sm font-medium">2068 Links</span>
          </div>
          <span className="text-sm font-medium">887 KB</span>
        </div>

        <div className="border-ds-outline rounded-ds-lg border bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between text-sm">
            <span className="text-ds-on-surface-variant">Total size</span>
            <span className="font-bold text-black">887 KB / 400 KB</span>
          </div>
          <div className="mb-6 h-2.5 w-full overflow-hidden rounded-full bg-zinc-100">
            <div className="h-full w-full bg-zinc-400" />
          </div>
          <button className="w-full rounded-ds-lg bg-zinc-500 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-zinc-600">
            Retrain agent
          </button>
        </div>

        <div className="mt-6 space-y-3">
          <div className="flex items-start gap-2">
            <div className="mt-1.5 h-2 w-2 rounded-full bg-orange-500" />
            <div>
              <p className="text-sm font-bold text-orange-600">Limit exceeded</p>
              <p className="text-ds-on-surface-variant text-sm leading-relaxed">
                You&apos;re using 887 KB of 400 KB included in your plan
              </p>
            </div>
          </div>
          <button className="border-ds-outline hover:border-ds-primary group flex w-full items-center justify-between rounded-ds-lg border bg-white p-3 transition-colors">
            <div className="flex items-center gap-2">
              <IconArrowUp className="size-4.5" />
              <span className="text-sm font-bold">Upgrade to train on more data</span>
            </div>
            <IconChevron className="text-ds-on-surface-variant group-hover:text-ds-on-surface size-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}

function IconBase({
  className,
  children,
  fill = "none",
  strokeWidth = "1.8",
}: {
  className?: string;
  children: React.ReactNode;
  fill?: string;
  strokeWidth?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill={fill}
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      {children}
    </svg>
  );
}

function IconChevron({ className }: { className?: string }) {
  return (
    <IconBase className={className}>
      <path d="m9 18 6-6-6-6" />
    </IconBase>
  );
}

function IconLanguage({ className }: { className?: string }) {
  return (
    <IconBase className={className}>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18" />
    </IconBase>
  );
}

function IconArrowUp({ className }: { className?: string }) {
  return (
    <IconBase className={className}>
      <path d="M12 18V6" />
      <path d="m7 11 5-5 5 5" />
      <circle cx="12" cy="12" r="9" />
    </IconBase>
  );
}
