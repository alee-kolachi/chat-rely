const ticketKpis = [
  { label: "Open", value: "126", trend: "+9" },
  { label: "SLA at risk", value: "14", trend: "-3" },
  { label: "Resolved today", value: "89", trend: "+11%" },
  { label: "Median resolution", value: "2h 18m", trend: "-12m" },
];

const tickets = [
  {
    id: "TKT-2084",
    subject: "Refund pending for over 7 days",
    customer: "Noah Carter",
    channel: "Email",
    priority: "high",
    assignee: "A. Stone",
    status: "Open",
    updatedAt: "5m ago",
  },
  {
    id: "TKT-2081",
    subject: "Address update after shipment",
    customer: "Emma Walker",
    channel: "Widget",
    priority: "medium",
    assignee: "M. Khan",
    status: "In progress",
    updatedAt: "18m ago",
  },
  {
    id: "TKT-2077",
    subject: "Discount code not applying at checkout",
    customer: "Logan White",
    channel: "WhatsApp",
    priority: "medium",
    assignee: "R. Ali",
    status: "Open",
    updatedAt: "31m ago",
  },
  {
    id: "TKT-2069",
    subject: "Order marked delivered but not received",
    customer: "Mia Lewis",
    channel: "Instagram",
    priority: "high",
    assignee: "A. Stone",
    status: "Escalated",
    updatedAt: "52m ago",
  },
  {
    id: "TKT-2061",
    subject: "Need VAT invoice for last order",
    customer: "Ethan Hall",
    channel: "Email",
    priority: "low",
    assignee: "M. Khan",
    status: "Waiting",
    updatedAt: "1h ago",
  },
];

export default function TicketsPage() {
  return (
    <div className="-m-6 min-h-[calc(100vh-3.5rem)] bg-ds-surface p-8">
      <div className="mx-auto w-full max-w-7xl">
        <header className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-ds-on-surface text-3xl font-black tracking-tight">Tickets</h1>
            <p className="text-ds-on-surface-variant mt-1 text-sm">
              Track support workload, priorities, and SLA health across your team.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button className="border-ds-outline bg-white hover:bg-ds-sidebar rounded-ds-md border px-4 py-2 text-sm font-semibold transition-colors">
              All queues
            </button>
            <button className="bg-ds-primary text-ds-on-primary rounded-ds-md px-4 py-2 text-sm font-semibold transition-opacity hover:opacity-90">
              Create ticket
            </button>
          </div>
        </header>

        <section className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {ticketKpis.map((kpi) => (
            <article key={kpi.label} className="border-ds-outline rounded-ds-xl border bg-white p-5 shadow-sm">
              <p className="text-ds-on-surface-variant text-sm">{kpi.label}</p>
              <div className="mt-2 flex items-end justify-between">
                <p className="text-ds-on-surface text-3xl font-black">{kpi.value}</p>
                <span className="rounded bg-emerald-100 px-2 py-1 text-xs font-bold text-emerald-700">
                  {kpi.trend}
                </span>
              </div>
            </article>
          ))}
        </section>

        <section className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_320px]">
          <div className="border-ds-outline overflow-hidden rounded-ds-xl border bg-white shadow-sm">
            <div className="border-ds-outline bg-ds-sidebar/40 grid grid-cols-[120px_1.3fr_120px_95px_130px_120px_95px] gap-3 border-b px-4 py-3 text-[10px] font-bold tracking-widest text-zinc-500 uppercase">
              <span>Ticket</span>
              <span>Subject</span>
              <span>Customer</span>
              <span>Channel</span>
              <span>Assignee</span>
              <span>Status</span>
              <span>Updated</span>
            </div>

            <div className="divide-ds-outline divide-y">
              {tickets.map((ticket, index) => (
                <button
                  key={ticket.id}
                  type="button"
                  className={`grid w-full grid-cols-[120px_1.3fr_120px_95px_130px_120px_95px] gap-3 px-4 py-3 text-left transition-colors ${
                    index === 0 ? "bg-ds-sidebar/60" : "hover:bg-ds-sidebar/40"
                  }`}
                >
                  <div>
                    <p className="text-ds-on-surface text-xs font-semibold">{ticket.id}</p>
                    <span
                      className={`mt-1 inline-flex rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${
                        ticket.priority === "high"
                          ? "bg-rose-100 text-rose-700"
                          : ticket.priority === "medium"
                            ? "bg-amber-100 text-amber-700"
                            : "bg-zinc-100 text-zinc-700"
                      }`}
                    >
                      {ticket.priority}
                    </span>
                  </div>
                  <p className="text-ds-on-surface line-clamp-2 text-xs">{ticket.subject}</p>
                  <p className="text-ds-on-surface text-xs">{ticket.customer}</p>
                  <p className="text-ds-on-surface-variant text-xs">{ticket.channel}</p>
                  <p className="text-ds-on-surface-variant text-xs">{ticket.assignee}</p>
                  <span
                    className={`w-fit rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${
                      ticket.status === "Escalated"
                        ? "bg-red-100 text-red-700"
                        : ticket.status === "Waiting"
                          ? "bg-amber-100 text-amber-700"
                          : ticket.status === "In progress"
                            ? "bg-blue-100 text-blue-700"
                            : "bg-zinc-100 text-zinc-700"
                    }`}
                  >
                    {ticket.status}
                  </span>
                  <p className="text-ds-on-surface-variant text-xs">{ticket.updatedAt}</p>
                </button>
              ))}
            </div>
          </div>

          <aside className="border-ds-outline rounded-ds-xl h-fit border bg-white p-5 shadow-sm">
            <h2 className="text-ds-on-surface text-sm font-bold tracking-wide uppercase">Ticket details</h2>
            <div className="mt-4 space-y-4 text-sm">
              <div>
                <p className="text-ds-on-surface-variant text-xs">Selected ticket</p>
                <p className="text-ds-on-surface mt-0.5 font-semibold">TKT-2084</p>
              </div>
              <div>
                <p className="text-ds-on-surface-variant text-xs">Issue</p>
                <p className="text-ds-on-surface mt-0.5 leading-relaxed">
                  Customer says refund has not arrived after 7 business days.
                </p>
              </div>
              <div className="border-ds-outline rounded-ds-md border bg-zinc-50 p-3">
                <p className="text-ds-on-surface-variant text-[10px] font-bold tracking-widest uppercase">
                  AI suggestion
                </p>
                <p className="text-ds-on-surface mt-1 text-xs leading-relaxed">
                  Verify refund transaction ID in Shopify, then share bank settlement timeline and
                  escalate to billing if not posted within 24h.
                </p>
              </div>
            </div>
            <div className="mt-5 space-y-2">
              <button className="bg-ds-primary text-ds-on-primary w-full rounded-ds-md px-3 py-2 text-sm font-semibold">
                Assign to me
              </button>
              <button className="border-ds-outline text-ds-on-surface hover:bg-ds-sidebar w-full rounded-ds-md border bg-white px-3 py-2 text-sm font-semibold transition-colors">
                Escalate
              </button>
              <button className="border-ds-outline text-ds-on-surface hover:bg-ds-sidebar w-full rounded-ds-md border bg-white px-3 py-2 text-sm font-semibold transition-colors">
                Mark resolved
              </button>
            </div>
          </aside>
        </section>
      </div>
    </div>
  );
}
