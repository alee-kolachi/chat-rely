const usageBars = [
  10, 15, 8, 12, 45, 20, 30, 25, 18, 10, 12, 75, 40, 35, 22, 15, 90, 50, 38,
];

const highlightedBarIndexes = new Set([0, 4, 11, 16]);

export default function UsagePage() {
  return (
    <div className="-m-6 min-h-[calc(100vh-3.5rem)] bg-ds-surface p-8">
      <div className="mx-auto w-full max-w-6xl">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-ds-on-surface text-3xl font-black tracking-tight">Usage</h2>
            <p className="text-ds-on-surface-variant mt-1">
              Track your resource consumption across all active agents.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button className="border-ds-outline bg-white hover:border-zinc-400 rounded-ds-lg flex items-center gap-2 border px-4 py-2 text-sm font-medium shadow-sm transition-colors">
              <span>All agents</span>
              <IconChevron className="size-4" />
            </button>
            <button className="border-ds-outline rounded-ds-lg flex items-center gap-2 border bg-white px-4 py-2 text-sm font-medium shadow-sm">
              <IconCalendar className="text-ds-on-surface-variant size-4" />
              <span>Apr 01, 2026 - Apr 19, 2026</span>
            </button>
          </div>
        </div>

        <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-2">
          <UsageStatCard
            valueText="1/50"
            title="Credits used"
            description="Credits used during the selected period. Your plan resets on the 1st of every month."
            actionText="Upgrade Plan"
            actionIcon={<IconArrowRight className="size-3.5" />}
            progressPercent={2}
          />
          <UsageStatCard
            valueText="1/1"
            title="Agents used"
            description="Agents used in your workspace. You are currently utilizing your full seat allocation."
            actionText="Add Seats"
            actionIcon={<IconPersonAdd className="size-3.5" />}
            progressPercent={100}
          />
        </div>

        <div className="border-ds-outline rounded-ds-xl border bg-white p-8 shadow-sm">
          <div className="mb-8 flex items-center justify-between">
            <h3 className="text-xl font-bold text-zinc-950">Usage history</h3>
            <div className="text-ds-on-surface-variant flex items-center gap-2 text-xs font-semibold tracking-wider uppercase">
              <div className="h-3 w-3 rounded-sm bg-blue-600" />
              <span>Active Invocations</span>
            </div>
          </div>

          <div className="relative mt-4 flex h-64 items-end justify-between gap-1">
            <div className="text-ds-on-surface-variant absolute -left-12 inset-y-0 flex flex-col justify-between text-[10px] font-medium">
              <span>1,000</span>
              <span>750</span>
              <span>500</span>
              <span>250</span>
              <span>0</span>
            </div>
            <div className="flex h-full flex-1 items-end justify-between gap-2 px-2">
              {usageBars.map((height, index) => {
                const highlighted = highlightedBarIndexes.has(index);
                return (
                  <div
                    key={`${index}-${height}`}
                    className={`group relative h-[${height}%] w-full rounded-t-sm transition-colors ${
                      highlighted ? "bg-blue-600 hover:bg-blue-700" : "bg-zinc-100 hover:bg-zinc-200"
                    }`}
                    style={{ height: `${height}%` }}
                  >
                    {highlighted ? (
                      <div className="absolute -top-8 left-1/2 -translate-x-1/2 rounded bg-zinc-900 px-2 py-1 text-[10px] text-white opacity-0 transition-opacity group-hover:opacity-100">
                        {Math.round(height * 10)}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="text-ds-on-surface-variant mt-6 flex justify-between px-2 text-[10px] font-semibold">
            <span>APR 01</span>
            <span>APR 04</span>
            <span>APR 07</span>
            <span>APR 10</span>
            <span>APR 13</span>
            <span>APR 16</span>
            <span>APR 19</span>
          </div>

          <div className="border-ds-outline mt-8 flex flex-col gap-3 rounded-ds-lg border bg-zinc-100 p-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-3">
              <IconInfo className="text-ds-on-surface-variant mt-0.5 size-4.5 shrink-0" />
              <p className="text-sm text-zinc-600">
                Calculated usage may take up to 30 minutes to synchronize with the main database.
              </p>
            </div>
            <button className="border-ds-outline rounded-ds-md bg-white px-4 py-2 text-xs font-bold shadow-xs transition-colors hover:bg-zinc-50">
              Download Report
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function UsageStatCard({
  valueText,
  title,
  description,
  actionText,
  actionIcon,
  progressPercent,
}: {
  valueText: string;
  title: string;
  description: string;
  actionText: string;
  actionIcon: React.ReactNode;
  progressPercent: number;
}) {
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - progressPercent / 100);

  return (
    <div className="border-ds-outline flex items-center gap-6 rounded-ds-xl border bg-white p-6 shadow-sm">
      <div className="relative h-24 w-24 shrink-0">
        <svg className="h-full w-full -rotate-90">
          <circle cx="48" cy="48" r={radius} fill="transparent" stroke="#f4f4f5" strokeWidth="8" />
          <circle
            cx="48"
            cy="48"
            r={radius}
            fill="transparent"
            stroke="#2563eb"
            strokeWidth="8"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xl font-bold">{valueText}</span>
        </div>
      </div>
      <div>
        <h3 className="text-ds-on-surface text-lg font-bold">{title}</h3>
        <p className="text-ds-on-surface-variant mt-1 text-sm leading-relaxed">{description}</p>
        <button className="mt-3 flex items-center gap-1 text-xs font-bold text-blue-600 hover:underline">
          {actionText}
          {actionIcon}
        </button>
      </div>
    </div>
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
      <path d="m6 9 6 6 6-6" />
    </IconBase>
  );
}

function IconCalendar({ className }: { className?: string }) {
  return (
    <IconBase className={className}>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M8 3v4M16 3v4M3 10h18" />
    </IconBase>
  );
}

function IconArrowRight({ className }: { className?: string }) {
  return (
    <IconBase className={className}>
      <path d="M5 12h14" />
      <path d="m13 6 6 6-6 6" />
    </IconBase>
  );
}

function IconPersonAdd({ className }: { className?: string }) {
  return (
    <IconBase className={className}>
      <circle cx="10" cy="8" r="3" />
      <path d="M4 19c0-3.2 2.7-5 6-5s6 1.8 6 5" />
      <path d="M19 8v6M16 11h6" />
    </IconBase>
  );
}

function IconInfo({ className }: { className?: string }) {
  return (
    <IconBase className={className}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 10v6M12 7.5h.01" />
    </IconBase>
  );
}
