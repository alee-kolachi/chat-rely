const conversationKpis = [
  { label: "Open now", value: "48", delta: "+6" },
  { label: "Avg first response", value: "42s", delta: "-8s" },
  { label: "Resolved today", value: "312", delta: "+18%" },
];

const conversations = [
  {
    id: "conv-8842",
    customer: "Ava Johnson",
    channel: "Website",
    status: "Open",
    lastMessage: "Can you check where order #8842 is?",
    time: "2m ago",
    priority: "high",
  },
  {
    id: "conv-8835",
    customer: "Mason Cole",
    channel: "Instagram",
    status: "Open",
    lastMessage: "Is the navy hoodie available in XL?",
    time: "7m ago",
    priority: "normal",
  },
  {
    id: "conv-8821",
    customer: "Sofia Davis",
    channel: "WhatsApp",
    status: "Waiting",
    lastMessage: "I need to update my shipping address.",
    time: "14m ago",
    priority: "normal",
  },
  {
    id: "conv-8799",
    customer: "Liam Brown",
    channel: "Email",
    status: "Resolved",
    lastMessage: "Thanks, that solved the issue.",
    time: "36m ago",
    priority: "low",
  },
];

const transcript = [
  { from: "customer", text: "Hi, can you check where order #8842 is?", at: "3:12 PM" },
  {
    from: "assistant",
    text: "Absolutely — I looked it up and it was shipped via FedEx yesterday. Current status is in transit with delivery expected tomorrow by 5 PM.",
    at: "3:12 PM",
  },
  {
    from: "customer",
    text: "Perfect. Can you also confirm if signature is required?",
    at: "3:13 PM",
  },
  {
    from: "assistant",
    text: "Yes, this shipment is marked as signature required.",
    at: "3:13 PM",
  },
];

export default function ConversationsPage() {
  return (
    <div className="-m-6 min-h-[calc(100vh-3.5rem)] bg-ds-surface p-8">
      <div className="mx-auto w-full max-w-7xl">
        <header className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-ds-on-surface text-3xl font-black tracking-tight">Conversations</h1>
            <p className="text-ds-on-surface-variant mt-1 text-sm">
              Monitor live threads, review context, and jump in when needed.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button className="border-ds-outline bg-white hover:bg-ds-sidebar rounded-ds-md border px-4 py-2 text-sm font-semibold transition-colors">
              Export
            </button>
            <button className="bg-ds-primary text-ds-on-primary rounded-ds-md px-4 py-2 text-sm font-semibold transition-opacity hover:opacity-90">
              New conversation
            </button>
          </div>
        </header>

        <section className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
          {conversationKpis.map((kpi) => (
            <article key={kpi.label} className="border-ds-outline rounded-ds-xl border bg-white p-5 shadow-sm">
              <p className="text-ds-on-surface-variant text-sm">{kpi.label}</p>
              <div className="mt-2 flex items-end justify-between">
                <p className="text-ds-on-surface text-3xl font-black">{kpi.value}</p>
                <span className="rounded bg-emerald-100 px-2 py-1 text-xs font-bold text-emerald-700">
                  {kpi.delta}
                </span>
              </div>
            </article>
          ))}
        </section>

        <section className="grid grid-cols-1 gap-6 xl:grid-cols-[380px_1fr]">
          <div className="border-ds-outline rounded-ds-xl border bg-white shadow-sm">
            <div className="border-ds-outline flex items-center justify-between border-b px-4 py-3">
              <h2 className="text-ds-on-surface text-sm font-bold tracking-wide uppercase">Live queue</h2>
              <button className="text-ds-on-surface-variant hover:text-ds-on-surface text-xs font-medium">
                Filters
              </button>
            </div>
            <div className="divide-ds-outline divide-y">
              {conversations.map((item, index) => (
                <button
                  type="button"
                  key={item.id}
                  className={`w-full px-4 py-4 text-left transition-colors ${
                    index === 0 ? "bg-ds-sidebar/50" : "hover:bg-ds-sidebar/60"
                  }`}
                >
                  <div className="mb-1 flex items-start justify-between gap-2">
                    <p className="text-ds-on-surface text-sm font-semibold">{item.customer}</p>
                    <span className="text-ds-on-surface-variant text-[11px]">{item.time}</span>
                  </div>
                  <p className="text-ds-on-surface-variant line-clamp-1 text-xs">{item.lastMessage}</p>
                  <div className="mt-2 flex items-center gap-2">
                    <span className="border-ds-outline rounded px-1.5 py-0.5 text-[10px] font-bold uppercase">
                      {item.channel}
                    </span>
                    <span
                      className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${
                        item.status === "Resolved"
                          ? "bg-emerald-100 text-emerald-700"
                          : item.status === "Waiting"
                            ? "bg-amber-100 text-amber-700"
                            : "bg-blue-100 text-blue-700"
                      }`}
                    >
                      {item.status}
                    </span>
                    {item.priority === "high" ? (
                      <span className="rounded bg-rose-100 px-1.5 py-0.5 text-[10px] font-bold text-rose-700 uppercase">
                        High priority
                      </span>
                    ) : null}
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="border-ds-outline rounded-ds-xl border bg-white shadow-sm">
            <div className="border-ds-outline flex flex-wrap items-center justify-between gap-3 border-b px-6 py-4">
              <div>
                <h3 className="text-ds-on-surface text-sm font-bold">Ava Johnson</h3>
                <p className="text-ds-on-surface-variant text-xs">Order #8842 · Website widget</p>
              </div>
              <div className="flex items-center gap-2">
                <button className="border-ds-outline rounded-ds-md border bg-white px-3 py-1.5 text-xs font-semibold">
                  Assign
                </button>
                <button className="bg-ds-primary text-ds-on-primary rounded-ds-md px-3 py-1.5 text-xs font-semibold">
                  Resolve
                </button>
              </div>
            </div>
            <div className="space-y-4 px-6 py-6">
              {transcript.map((message) => (
                <div
                  key={`${message.from}-${message.text}`}
                  className={`flex ${message.from === "customer" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                      message.from === "customer"
                        ? "bg-ds-primary text-ds-on-primary rounded-tr-none"
                        : "border-ds-outline text-ds-on-surface rounded-tl-none border bg-white"
                    }`}
                  >
                    {message.text}
                    <div
                      className={`mt-2 text-[10px] ${
                        message.from === "customer"
                          ? "text-ds-on-primary/80"
                          : "text-ds-on-surface-variant"
                      }`}
                    >
                      {message.at}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="border-ds-outline border-t px-6 py-4">
              <div className="flex items-center gap-3">
                <input
                  className="border-ds-outline bg-ds-sidebar focus:border-ds-primary w-full rounded-xl border px-4 py-2.5 text-sm outline-none"
                  placeholder="Reply to customer..."
                />
                <button className="bg-ds-primary text-ds-on-primary rounded-xl px-4 py-2.5 text-sm font-semibold">
                  Send
                </button>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
