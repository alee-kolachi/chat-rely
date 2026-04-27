export default function DashboardPage() {
  const metrics = [
    {
      label: "Total conversations",
      value: "42,892",
      icon: "●",
      iconClassName: "text-teal-500",
    },
    {
      label: "Resolution rate",
      value: "89.4%",
      icon: "●",
      iconClassName: "text-pink-500",
    },
    {
      label: "Escalation rate",
      value: "4.2%",
      icon: "●",
      iconClassName: "text-orange-500",
    },
    {
      label: "Avg. response time",
      value: "1m 12s",
      icon: "●",
      iconClassName: "text-indigo-500",
    },
  ];

  const countries = [
    { code: "USA", percentage: 42, barWidth: "85%", color: "bg-teal-500" },
    { code: "UK", percentage: 15, barWidth: "35%", color: "bg-pink-500" },
    { code: "GER", percentage: 12, barWidth: "25%", color: "bg-orange-500" },
    { code: "CAN", percentage: 10, barWidth: "20%", color: "bg-indigo-500" },
  ];

  const topics = [
    { name: "Technical Support", count: "12,430", color: "bg-teal-500" },
    { name: "Billing Issues", count: "8,522", color: "bg-pink-500" },
    { name: "Account Access", count: "4,120", color: "bg-orange-500" },
  ];

  const knowledgeGaps = [
    { title: "How to delete secondary owner?", subtitle: "Unresolved 12 times today", level: "High" },
    { title: "Legacy API endpoint transition", subtitle: "Unresolved 8 times today", level: "High" },
    { title: "Mobile landscape mode support", subtitle: "Unresolved 3 times today", level: "" },
  ];

  return (
    <div className="dot-grid -m-6 min-h-full p-6 md:p-8">
      <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-ds-primary text-3xl font-black tracking-tight md:text-4xl">Dashboard</h1>
            <p className="text-ds-on-surface-variant mt-1 text-sm font-medium md:text-base">
              Advanced Insights for Pro Users
            </p>
          </div>
          <div className="bg-ds-surface border-ds-outline inline-flex w-fit items-center gap-1 rounded-ds-lg border p-1 shadow-sm">
            <button type="button" className="text-ds-on-surface-variant rounded-ds-md px-3 py-1.5 text-sm font-medium">
              Last 7 days
            </button>
            <button type="button" className="bg-ds-primary text-ds-on-primary rounded-ds-md px-3 py-1.5 text-sm font-bold shadow-sm">
              30 days
            </button>
            <button type="button" className="text-ds-on-surface-variant rounded-ds-md px-3 py-1.5 text-sm font-medium">
              3 months
            </button>
            <button type="button" className="text-ds-on-surface-variant rounded-ds-md px-3 py-1.5 text-sm font-medium">
              1 year
            </button>
          </div>
        </div>

        <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {metrics.map((metric) => (
            <article key={metric.label} className="bg-ds-surface border-ds-outline rounded-ds-xl border p-6 shadow-sm">
              <div className="mb-2 flex items-center gap-2">
                <span className={metric.iconClassName}>{metric.icon}</span>
                <h2 className="text-ds-on-surface-variant text-sm font-semibold">{metric.label}</h2>
              </div>
              <p className="text-3xl font-semibold">{metric.value}</p>
            </article>
          ))}
        </section>

        <section className="bg-ds-surface border-ds-outline rounded-ds-xl border p-6 md:p-8 shadow-sm">
          <div className="mb-8 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h3 className="text-xl font-bold">Conversations over time</h3>
              <p className="text-ds-on-surface-variant text-sm">Daily volume of user interactions across all channels</p>
            </div>
            <div className="flex items-center gap-4 text-xs font-bold">
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-teal-500" />
                <span className="text-ds-on-surface-variant">Current</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-zinc-300" />
                <span className="text-ds-on-surface-variant">Previous</span>
              </div>
            </div>
          </div>
          <div className="flex gap-4">
            <div className="text-ds-on-surface-variant flex h-72 flex-col justify-between py-1 text-[10px] font-bold">
              <span>10k</span>
              <span>7.5k</span>
              <span>5k</span>
              <span>2.5k</span>
              <span>0</span>
            </div>
            <div className="flex-1">
              <div className="relative h-72 w-full">
                <svg className="h-full w-full overflow-hidden" viewBox="0 0 1000 300" preserveAspectRatio="none">
                  <line x1="0" y1="0" x2="1000" y2="0" stroke="#e4e4e7" strokeWidth="1" />
                  <line x1="0" y1="75" x2="1000" y2="75" stroke="#e4e4e7" strokeWidth="1" />
                  <line x1="0" y1="150" x2="1000" y2="150" stroke="#e4e4e7" strokeWidth="1" />
                  <line x1="0" y1="225" x2="1000" y2="225" stroke="#e4e4e7" strokeWidth="1" />
                  <line x1="0" y1="300" x2="1000" y2="300" stroke="#e4e4e7" strokeWidth="1" />
                  <defs>
                    <linearGradient id="chartGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="#14b8a6" stopOpacity="0.22" />
                      <stop offset="100%" stopColor="#14b8a6" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <path
                    d="M0,250 C50,240 150,260 200,260 C250,260 350,220 400,180 C450,140 550,210 600,220 C650,230 750,190 800,150 C850,110 950,170 1000,190"
                    fill="none"
                    stroke="#d4d4d8"
                    strokeWidth="2"
                    opacity="0.35"
                  />
                  <path
                    d="M0,200 C50,180 150,190 200,190 C250,190 350,140 400,80 C450,20 550,110 600,140 C650,170 750,100 800,40 C850,-20 950,60 1000,90"
                    fill="none"
                    stroke="#14b8a6"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M0,200 C50,180 150,190 200,190 C250,190 350,140 400,80 C450,20 550,110 600,140 C650,170 750,100 800,40 C850,-20 950,60 1000,90 V300 H0 Z"
                    fill="url(#chartGradient)"
                  />
                  <circle cx="800" cy="40" r="4" fill="#14b8a6" stroke="#fff" strokeWidth="2" />
                </svg>
              </div>
              <div className="text-ds-on-surface-variant mt-4 flex justify-between px-1 text-[10px] font-bold uppercase tracking-tight">
                <span>Day 01</span>
                <span>Day 05</span>
                <span>Day 10</span>
                <span>Day 15</span>
                <span>Day 20</span>
                <span>Day 25</span>
                <span>Day 30</span>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-ds-surface border-ds-outline rounded-ds-xl border p-6 md:p-8 shadow-sm">
          <div className="mb-6">
            <h3 className="text-xl font-bold">Chats per country</h3>
            <p className="text-ds-on-surface-variant text-sm">Global interaction volume based on IP detection</p>
          </div>
          <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-2">
            <div className="space-y-6">
              {countries.map((country) => (
                <div key={country.code} className="flex items-center gap-4">
                  <span className="text-ds-on-surface-variant w-8 text-xs font-bold">{country.code}</span>
                  <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-zinc-200/70">
                    <div className={`h-full ${country.color}`} style={{ width: country.barWidth }} />
                  </div>
                  <span className="w-12 text-right text-xs font-black">{country.percentage}%</span>
                </div>
              ))}
            </div>
            <div className="relative flex h-64 items-center justify-center overflow-hidden rounded-ds-xl bg-zinc-100/70 p-4">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,#99f6e4_0%,transparent_40%),radial-gradient(circle_at_70%_35%,#fbcfe8_0%,transparent_35%),radial-gradient(circle_at_40%_75%,#fed7aa_0%,transparent_45%)] opacity-80" />
              <div className="absolute top-[36%] left-[26%] h-4 w-4 animate-pulse rounded-full border-2 border-white bg-teal-500 shadow-lg" />
              <div className="absolute top-[33%] left-[49%] h-3 w-3 animate-pulse rounded-full border-2 border-white bg-pink-500 shadow-lg" />
              <div className="absolute top-[35%] left-[53%] h-3 w-3 animate-pulse rounded-full border-2 border-white bg-orange-500 shadow-lg" />
              <span className="text-ds-on-surface-variant relative text-xs font-semibold tracking-wide uppercase">
                Global Activity Map
              </span>
            </div>
          </div>
        </section>

        <section className="bg-ds-surface border-ds-outline overflow-hidden rounded-ds-xl border shadow-sm">
          <div className="border-ds-outline p-6 md:p-8 md:pb-6 border-b">
            <h3 className="mb-4 text-xl font-bold">Topic Distribution</h3>
            <div className="relative h-56 w-full">
              <svg className="h-full w-full" viewBox="0 0 400 100" preserveAspectRatio="none">
                <path
                  d="M0,60 C40,40 80,75 120,20 C160,45 200,30 240,65 C280,35 320,50 360,25 400,40"
                  fill="none"
                  stroke="#14b8a6"
                  strokeWidth="2.5"
                />
                <path
                  d="M0,80 C40,70 80,85 120,60 C160,75 200,55 240,80 C280,60 320,75 360,50 400,65"
                  fill="none"
                  stroke="#ec4899"
                  strokeWidth="2.5"
                />
                <path
                  d="M0,95 C40,90 80,98 120,85 C160,92 200,88 240,95 280,80 320,90 360,75 400,85"
                  fill="none"
                  stroke="#f97316"
                  strokeWidth="2.5"
                />
              </svg>
              <div className="text-ds-on-surface-variant mt-4 flex justify-between text-[10px] font-bold uppercase tracking-widest">
                <span>Week 1</span>
                <span>Week 2</span>
                <span>Week 3</span>
                <span>Week 4</span>
              </div>
            </div>
          </div>
          <div className="bg-zinc-50/70 p-6 md:p-8">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              {topics.map((topic) => (
                <div key={topic.name} className="bg-ds-surface border-ds-outline flex items-center justify-between rounded-ds-lg border p-4">
                  <div className="flex items-center gap-3">
                    <span className={`h-3 w-3 rounded-full ${topic.color}`} />
                    <span className="text-sm font-bold">{topic.name}</span>
                  </div>
                  <span className="text-ds-on-surface-variant text-sm font-black">{topic.count}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-8 xl:grid-cols-2">
          <article className="bg-ds-surface border-ds-outline rounded-ds-xl border p-6 md:p-8 shadow-sm">
            <div className="mb-8 flex items-center justify-between">
              <h3 className="text-xl font-bold">Knowledge Gaps</h3>
              <button type="button" className="text-xs font-bold underline underline-offset-4">
                View All
              </button>
            </div>
            <div className="space-y-4">
              {knowledgeGaps.map((gap) => (
                <div
                  key={gap.title}
                  className="border-ds-outline/60 flex items-center justify-between rounded-ds-lg border bg-zinc-50 p-4 transition-all hover:-translate-y-0.5 hover:bg-white hover:shadow-sm"
                >
                  <div className="flex items-center gap-4">
                    <div className="h-2 w-2 rounded-full bg-pink-500" />
                    <div>
                      <p className="text-sm font-bold">{gap.title}</p>
                      <p className="text-ds-on-surface-variant text-xs">{gap.subtitle}</p>
                    </div>
                  </div>
                  {gap.level ? (
                    <span className="rounded bg-zinc-200 px-2 py-1 text-[10px] font-black uppercase">{gap.level}</span>
                  ) : null}
                </div>
              ))}
            </div>
          </article>

          <article className="bg-ds-surface border-ds-outline rounded-ds-xl border p-6 md:p-8 shadow-sm">
            <h3 className="mb-8 text-xl font-bold">Sentiment Analysis</h3>
            <div className="flex flex-col items-center gap-10 md:flex-row">
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
                    strokeDasharray="163.36 251.32"
                    strokeDashoffset="0"
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    fill="transparent"
                    stroke="#f97316"
                    strokeWidth="10"
                    strokeDasharray="50.26 251.32"
                    strokeDashoffset="-163.36"
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    fill="transparent"
                    stroke="#ec4899"
                    strokeWidth="10"
                    strokeDasharray="37.7 251.32"
                    strokeDashoffset="-213.62"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-3xl font-black">65%</span>
                  <span className="text-ds-on-surface-variant text-center text-[10px] font-bold uppercase tracking-widest">
                    Positive Pulse
                  </span>
                </div>
              </div>

              <div className="w-full flex-1 space-y-4">
                <div className="flex items-center gap-4">
                  <span className="h-3 w-3 rounded-full bg-teal-500" />
                  <span className="flex-1 text-sm font-bold">Positive</span>
                  <span className="text-sm font-black">65%</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="h-3 w-3 rounded-full bg-orange-500" />
                  <span className="flex-1 text-sm font-bold">Neutral</span>
                  <span className="text-sm font-black">20%</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="h-3 w-3 rounded-full bg-pink-500" />
                  <span className="flex-1 text-sm font-bold">Negative</span>
                  <span className="text-sm font-black">15%</span>
                </div>
                <p className="text-ds-on-surface-variant border-ds-outline pt-4 text-xs italic border-t">
                  Real-time tracking active
                </p>
              </div>
            </div>
          </article>
        </section>
      </div>
    </div>
  );
}
