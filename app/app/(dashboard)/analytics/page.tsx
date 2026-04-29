import { cn } from "@/lib/utils";

const kpis = [
  { label: "Total chats", value: "48,216", delta: "+12.4%", positive: true },
  { label: "Resolved by AI", value: "87.1%", delta: "+3.2%", positive: true },
  { label: "Escalations", value: "5.8%", delta: "-1.1%", positive: true },
  { label: "Avg response time", value: "58s", delta: "-9s", positive: true },
];

const channels = [
  { label: "Website Widget", value: 58, color: "bg-ds-secondary" },
  { label: "WhatsApp", value: 21, color: "bg-ds-accent-pink" },
  { label: "Instagram", value: 13, color: "bg-ds-tertiary" },
  { label: "Email", value: 8, color: "bg-ds-outline" },
];

const topIntents = [
  { name: "Order Tracking", volume: "13,420", change: "+8%" },
  { name: "Refund Policy", volume: "9,188", change: "+4%" },
  { name: "Product Sizing", volume: "6,731", change: "+2%" },
  { name: "Payment Failure", volume: "4,902", change: "-3%" },
  { name: "Shipping Delays", volume: "3,564", change: "+6%" },
];

const countries = [
  { code: "USA", percentage: 42, barWidth: "85%", color: "bg-ds-secondary" },
  { code: "UK", percentage: 15, barWidth: "35%", color: "bg-ds-accent-pink" },
  { code: "GER", percentage: 12, barWidth: "25%", color: "bg-ds-tertiary" },
  { code: "CAN", percentage: 10, barWidth: "20%", color: "bg-ds-outline" },
];

const qualitySignals: {
  label: string;
  value: string;
  hint: string;
  suffix?: string;
}[] = [
  { label: "CSAT (post-chat)", value: "4.6", suffix: "/ 5", hint: "+0.2 vs prior period" },
  { label: "First-contact resolution", value: "82%", hint: "AI-handled, no reopen" },
  { label: "Negative tone → resolved", value: "74%", hint: "Ended with positive outcome" },
];

export default function AnalyticsPage() {
  return (
    <div className="ds-app-shell p-6 md:p-8">
      <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="ds-app-page-title">Analytics</h1>
            <p className="ds-app-page-description ds-app-page-description--wide">
              Performance, volume, and quality across all channels.
            </p>
          </div>
          <div className="border-ds-outline bg-ds-surface inline-flex w-fit flex-wrap items-center gap-1 rounded-ds-lg border p-1 shadow-sm">
            {(["7 days", "30 days", "90 days"] as const).map((label, i) => (
              <button
                key={label}
                type="button"
                className={cn(
                  "rounded-ds-md px-3 py-1.5 text-sm font-medium transition-colors",
                  i === 1 ? "bg-ds-primary text-ds-on-primary shadow-sm" : "text-ds-on-surface-variant hover:text-ds-on-surface"
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {kpis.map((kpi) => (
            <article key={kpi.label} className="border-ds-outline bg-ds-surface rounded-ds-xl border p-5 shadow-sm">
              <p className="text-ds-on-surface-variant text-sm font-medium">{kpi.label}</p>
              <div className="mt-2 flex items-end justify-between gap-2">
                <p className="ds-app-metric-value">{kpi.value}</p>
                <span
                  className={cn(
                    "shrink-0 rounded-ds-md px-2 py-1 text-xs font-semibold",
                    kpi.positive ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"
                  )}
                >
                  {kpi.delta}
                </span>
              </div>
            </article>
          ))}
        </section>

        <section className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          <article className="border-ds-outline bg-ds-surface rounded-ds-xl border p-6 shadow-sm xl:col-span-2">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
              <h2 className="ds-app-section-title">Conversation trend</h2>
              <span className="text-ds-on-surface-variant text-xs">Daily volume</span>
            </div>
            <div className="h-64 text-[var(--ds-chart-grid)]">
              <svg className="h-full w-full" viewBox="0 0 900 260" preserveAspectRatio="none" aria-hidden>
                <line x1="0" y1="20" x2="900" y2="20" stroke="currentColor" strokeWidth="1" />
                <line x1="0" y1="80" x2="900" y2="80" stroke="currentColor" strokeWidth="1" />
                <line x1="0" y1="140" x2="900" y2="140" stroke="currentColor" strokeWidth="1" />
                <line x1="0" y1="200" x2="900" y2="200" stroke="currentColor" strokeWidth="1" />
                <line x1="0" y1="250" x2="900" y2="250" stroke="currentColor" strokeWidth="1" />
                <defs>
                  <linearGradient id="analyticsTrendFill" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="var(--ds-primary)" stopOpacity="0.2" />
                    <stop offset="100%" stopColor="var(--ds-primary)" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path
                  d="M0,210 C70,195 130,205 190,180 C250,155 320,170 380,130 C440,90 510,120 570,95 C630,70 700,85 760,60 C820,45 860,55 900,40 V250 H0 Z"
                  fill="url(#analyticsTrendFill)"
                />
                <path
                  d="M0,210 C70,195 130,205 190,180 C250,155 320,170 380,130 C440,90 510,120 570,95 C630,70 700,85 760,60 C820,45 860,55 900,40"
                  fill="none"
                  stroke="var(--ds-chart-line)"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
              </svg>
            </div>
            <div className="text-ds-on-surface-variant mt-3 flex justify-between text-[11px] font-semibold tracking-wide uppercase">
              <span>Day 1</span>
              <span>Day 10</span>
              <span>Day 20</span>
              <span>Day 30</span>
            </div>
          </article>

          <article className="border-ds-outline bg-ds-surface rounded-ds-xl border p-6 shadow-sm">
            <h2 className="ds-app-section-title mb-5">Channel split</h2>
            <div className="space-y-4">
              {channels.map((channel) => (
                <div key={channel.label}>
                  <div className="mb-2 flex items-center justify-between text-sm">
                    <span className="text-ds-on-surface font-medium">{channel.label}</span>
                    <span className="text-ds-on-surface font-semibold">{channel.value}%</span>
                  </div>
                  <div className="bg-ds-outline/60 h-2 overflow-hidden rounded-full">
                    <div className={cn("h-full rounded-full", channel.color)} style={{ width: `${channel.value}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </article>
        </section>

        <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <article className="border-ds-outline bg-ds-surface rounded-ds-xl border p-6 shadow-sm">
            <h2 className="ds-app-section-title mb-5">Top intents</h2>
            <div className="space-y-3">
              {topIntents.map((intent) => (
                <div
                  key={intent.name}
                  className="border-ds-outline flex items-center justify-between rounded-ds-lg border bg-ds-sidebar/60 px-4 py-3"
                >
                  <div>
                    <p className="text-ds-on-surface text-sm font-semibold">{intent.name}</p>
                    <p className="text-ds-on-surface-variant text-xs">{intent.volume} conversations</p>
                  </div>
                  <span
                    className={cn(
                      "text-xs font-semibold",
                      intent.change.startsWith("-") ? "text-rose-600" : "text-emerald-700"
                    )}
                  >
                    {intent.change}
                  </span>
                </div>
              ))}
            </div>
          </article>

          <article className="border-ds-outline bg-ds-surface rounded-ds-xl border p-6 shadow-sm">
            <h2 className="ds-app-section-title mb-5">Country usage</h2>
            <div className="space-y-4">
              {countries.map((country) => (
                <div key={country.code} className="flex items-center gap-4">
                  <span className="text-ds-on-surface-variant w-10 text-xs font-semibold">{country.code}</span>
                  <div className="bg-ds-outline/60 h-2.5 flex-1 overflow-hidden rounded-full">
                    <div className={cn("h-full rounded-full", country.color)} style={{ width: country.barWidth }} />
                  </div>
                  <span className="text-ds-on-surface w-12 text-right text-xs font-semibold">{country.percentage}%</span>
                </div>
              ))}
            </div>
            <p className="text-ds-on-surface-variant mt-4 text-xs leading-relaxed">
              Share of conversations grouped by detected customer country.
            </p>
          </article>
        </section>

        <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <article className="border-ds-outline bg-ds-surface rounded-ds-xl border p-6 shadow-sm">
            <h2 className="ds-app-section-title mb-5">Customer sentiment</h2>
            <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start sm:justify-center xl:justify-start">
              <div className="relative h-44 w-44 shrink-0">
                <svg className="h-full w-full" viewBox="0 0 100 100" aria-hidden>
                  <circle cx="50" cy="50" r="40" fill="transparent" stroke="var(--ds-outline)" strokeWidth="10" />
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    fill="transparent"
                    stroke="var(--ds-secondary)"
                    strokeWidth="10"
                    strokeDasharray="175 251"
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    fill="transparent"
                    stroke="#f59e0b"
                    strokeWidth="10"
                    strokeDasharray="45 251"
                    strokeDashoffset="-175"
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    fill="transparent"
                    stroke="var(--ds-accent-pink)"
                    strokeWidth="10"
                    strokeDasharray="31 251"
                    strokeDashoffset="-220"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="ds-app-metric-value text-2xl">69%</span>
                  <span className="ds-app-kicker">Positive</span>
                </div>
              </div>
              <div className="w-full min-w-0 flex-1 space-y-3 sm:max-w-md">
                <LegendItem color="bg-ds-secondary" label="Positive" value="69%" />
                <LegendItem color="bg-amber-500" label="Neutral" value="18%" />
                <LegendItem color="bg-ds-accent-pink" label="Negative" value="13%" />
              </div>
            </div>
          </article>

          <article className="border-ds-outline bg-ds-surface rounded-ds-xl border p-6 shadow-sm">
            <h2 className="ds-app-section-title mb-5">Conversation quality</h2>
            <div className="space-y-3">
              {qualitySignals.map((row) => (
                <div
                  key={row.label}
                  className="border-ds-outline flex flex-col gap-1 rounded-ds-lg border bg-ds-sidebar/60 px-4 py-3"
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="text-ds-on-surface text-sm font-semibold">{row.label}</p>
                    <p className="text-ds-on-surface shrink-0 text-sm font-semibold tabular-nums">
                      {row.value}
                      {row.suffix ? (
                        <span className="text-ds-on-surface-variant font-medium">{row.suffix}</span>
                      ) : null}
                    </p>
                  </div>
                  <p className="text-ds-on-surface-variant text-xs">{row.hint}</p>
                </div>
              ))}
            </div>
            <p className="text-ds-on-surface-variant mt-4 text-xs leading-relaxed">
              Quality metrics alongside sentiment help spot gaps between tone and outcomes.
            </p>
          </article>
        </section>
      </div>
    </div>
  );
}

function LegendItem({ color, label, value }: { color: string; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className={cn("size-3 shrink-0 rounded-full", color)} />
      <span className="text-ds-on-surface flex-1 text-sm font-medium">{label}</span>
      <span className="text-ds-on-surface text-sm font-semibold">{value}</span>
    </div>
  );
}
