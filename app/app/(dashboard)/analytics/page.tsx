const kpis = [
  { label: "Total chats", value: "48,216", delta: "+12.4%", positive: true },
  { label: "Resolved by AI", value: "87.1%", delta: "+3.2%", positive: true },
  { label: "Escalations", value: "5.8%", delta: "-1.1%", positive: true },
  { label: "Avg response time", value: "58s", delta: "-9s", positive: true },
];

const channels = [
  { label: "Website Widget", value: 58, color: "bg-teal-500" },
  { label: "WhatsApp", value: 21, color: "bg-pink-500" },
  { label: "Instagram", value: 13, color: "bg-orange-500" },
  { label: "Email", value: 8, color: "bg-zinc-400" },
];

const topIntents = [
  { name: "Order Tracking", volume: "13,420", change: "+8%" },
  { name: "Refund Policy", volume: "9,188", change: "+4%" },
  { name: "Product Sizing", volume: "6,731", change: "+2%" },
  { name: "Payment Failure", volume: "4,902", change: "-3%" },
  { name: "Shipping Delays", volume: "3,564", change: "+6%" },
];

const countries = [
  { code: "USA", percentage: 42, barWidth: "85%", color: "bg-teal-500" },
  { code: "UK", percentage: 15, barWidth: "35%", color: "bg-pink-500" },
  { code: "GER", percentage: 12, barWidth: "25%", color: "bg-orange-500" },
  { code: "CAN", percentage: 10, barWidth: "20%", color: "bg-zinc-500" },
];

export default function AnalyticsPage() {
  return (
    <div className="-m-6 min-h-[calc(100vh-3.5rem)] bg-ds-surface p-6 md:p-8">
      <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-ds-on-surface text-3xl font-black tracking-tight">Analytics</h1>
            <p className="text-ds-on-surface-variant mt-1 text-sm">
              Monitor performance, volume, and quality across all channels.
            </p>
          </div>
          <div className="bg-ds-sidebar border-ds-outline inline-flex w-fit items-center gap-1 rounded-ds-lg border p-1">
            <button className="text-ds-on-surface-variant rounded-ds-md px-3 py-1.5 text-sm font-medium">
              7 days
            </button>
            <button className="bg-ds-primary text-ds-on-primary rounded-ds-md px-3 py-1.5 text-sm font-bold">
              30 days
            </button>
            <button className="text-ds-on-surface-variant rounded-ds-md px-3 py-1.5 text-sm font-medium">
              90 days
            </button>
          </div>
        </div>

        <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {kpis.map((kpi) => (
            <article
              key={kpi.label}
              className="border-ds-outline rounded-ds-xl border bg-white p-5 shadow-sm"
            >
              <p className="text-ds-on-surface-variant text-sm font-medium">{kpi.label}</p>
              <div className="mt-2 flex items-end justify-between">
                <p className="text-ds-on-surface text-3xl font-black">{kpi.value}</p>
                <span
                  className={`rounded px-2 py-1 text-xs font-bold ${
                    kpi.positive ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
                  }`}
                >
                  {kpi.delta}
                </span>
              </div>
            </article>
          ))}
        </section>

        <section className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          <article className="border-ds-outline rounded-ds-xl border bg-white p-6 shadow-sm xl:col-span-2">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-ds-on-surface text-lg font-bold">Conversation Trend</h2>
              <span className="text-ds-on-surface-variant text-xs">Daily volume</span>
            </div>
            <div className="h-64">
              <svg className="h-full w-full" viewBox="0 0 900 260" preserveAspectRatio="none">
                <line x1="0" y1="20" x2="900" y2="20" stroke="#ececec" strokeWidth="1" />
                <line x1="0" y1="80" x2="900" y2="80" stroke="#ececec" strokeWidth="1" />
                <line x1="0" y1="140" x2="900" y2="140" stroke="#ececec" strokeWidth="1" />
                <line x1="0" y1="200" x2="900" y2="200" stroke="#ececec" strokeWidth="1" />
                <line x1="0" y1="250" x2="900" y2="250" stroke="#ececec" strokeWidth="1" />
                <path
                  d="M0,210 C70,195 130,205 190,180 C250,155 320,170 380,130 C440,90 510,120 570,95 C630,70 700,85 760,60 C820,45 860,55 900,40"
                  fill="none"
                  stroke="#000000"
                  strokeWidth="3"
                  strokeLinecap="round"
                />
                <path
                  d="M0,210 C70,195 130,205 190,180 C250,155 320,170 380,130 C440,90 510,120 570,95 C630,70 700,85 760,60 C820,45 860,55 900,40 V250 H0 Z"
                  fill="url(#trendFill)"
                />
                <defs>
                  <linearGradient id="trendFill" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#000000" stopOpacity="0.18" />
                    <stop offset="100%" stopColor="#000000" stopOpacity="0" />
                  </linearGradient>
                </defs>
              </svg>
            </div>
            <div className="text-ds-on-surface-variant mt-3 flex justify-between text-[10px] font-bold uppercase">
              <span>Day 1</span>
              <span>Day 5</span>
              <span>Day 10</span>
              <span>Day 15</span>
              <span>Day 20</span>
              <span>Day 25</span>
              <span>Day 30</span>
            </div>
          </article>

          <article className="border-ds-outline rounded-ds-xl border bg-white p-6 shadow-sm">
            <h2 className="text-ds-on-surface mb-5 text-lg font-bold">Channel Split</h2>
            <div className="space-y-4">
              {channels.map((channel) => (
                <div key={channel.label}>
                  <div className="mb-2 flex items-center justify-between text-sm">
                    <span className="font-medium">{channel.label}</span>
                    <span className="font-bold">{channel.value}%</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-zinc-200">
                    <div className={`h-full ${channel.color}`} style={{ width: `${channel.value}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </article>
        </section>

        <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <article className="border-ds-outline rounded-ds-xl border bg-white p-6 shadow-sm">
            <h2 className="text-ds-on-surface mb-5 text-lg font-bold">Top Intents</h2>
            <div className="space-y-3">
              {topIntents.map((intent) => (
                <div
                  key={intent.name}
                  className="border-ds-outline/70 flex items-center justify-between rounded-ds-lg border bg-zinc-50 px-4 py-3"
                >
                  <div>
                    <p className="text-sm font-semibold">{intent.name}</p>
                    <p className="text-ds-on-surface-variant text-xs">{intent.volume} conversations</p>
                  </div>
                  <span
                    className={`text-xs font-bold ${
                      intent.change.startsWith("-") ? "text-red-600" : "text-emerald-600"
                    }`}
                  >
                    {intent.change}
                  </span>
                </div>
              ))}
            </div>
          </article>

          <article className="border-ds-outline rounded-ds-xl border bg-white p-6 shadow-sm">
            <h2 className="text-ds-on-surface mb-5 text-lg font-bold">Country-wise usage</h2>
            <div className="space-y-4">
              {countries.map((country) => (
                <div key={country.code} className="flex items-center gap-4">
                  <span className="text-ds-on-surface-variant w-10 text-xs font-bold">{country.code}</span>
                  <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-zinc-200/70">
                    <div className={`h-full ${country.color}`} style={{ width: country.barWidth }} />
                  </div>
                  <span className="w-12 text-right text-xs font-black">{country.percentage}%</span>
                </div>
              ))}
            </div>
            <p className="text-ds-on-surface-variant mt-4 text-xs">
              Share of conversations grouped by detected customer country.
            </p>
          </article>
        </section>

        <section className="grid grid-cols-1 gap-6 xl:grid-cols-1">
          <article className="border-ds-outline rounded-ds-xl border bg-white p-6 shadow-sm">
            <h2 className="text-ds-on-surface mb-5 text-lg font-bold">Customer Sentiment</h2>
            <div className="flex flex-col items-center gap-6 md:flex-row">
              <div className="relative h-44 w-44">
                <svg className="h-full w-full" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="40" fill="transparent" stroke="#e4e4e7" strokeWidth="10" />
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    fill="transparent"
                    stroke="#14b8a6"
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
                    stroke="#ec4899"
                    strokeWidth="10"
                    strokeDasharray="31 251"
                    strokeDashoffset="-220"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-2xl font-black">69%</span>
                  <span className="text-ds-on-surface-variant text-[10px] font-bold uppercase">
                    Positive
                  </span>
                </div>
              </div>
              <div className="w-full space-y-3">
                <LegendItem color="bg-teal-500" label="Positive" value="69%" />
                <LegendItem color="bg-amber-500" label="Neutral" value="18%" />
                <LegendItem color="bg-pink-500" label="Negative" value="13%" />
              </div>
            </div>
          </article>
        </section>
      </div>
    </div>
  );
}

function LegendItem({ color, label, value }: { color: string; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className={`h-3 w-3 rounded-full ${color}`} />
      <span className="flex-1 text-sm font-medium">{label}</span>
      <span className="text-sm font-bold">{value}</span>
    </div>
  );
}
