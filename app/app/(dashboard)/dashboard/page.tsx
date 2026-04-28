"use client";

import { useState } from "react";

export default function DashboardPage() {
  const [previewMode, setPreviewMode] = useState<"empty" | "data">("empty");
  const totalConversations = previewMode === "data" ? 42892 : 0;
  const hasConversationData = totalConversations > 0;
  const recentConversations = [
    { customer: "Ava Johnson", topic: "Order #8842 tracking", status: "Resolved by AI", time: "2m ago" },
    { customer: "Mason Cole", topic: "Discount code not applying", status: "Needs human", time: "8m ago" },
    { customer: "Sofia Davis", topic: "Return label request", status: "Resolved by AI", time: "14m ago" },
    { customer: "Liam Brown", topic: "Update shipping address", status: "In progress", time: "22m ago" },
  ];
  const unresolvedTopics = [
    { name: "Exchange after 30 days", count: 12 },
    { name: "Missing order confirmation email", count: 8 },
    { name: "Partial shipment ETA clarification", count: 5 },
  ];

  const primaryMetrics = [
    { label: "Conversations started", value: hasConversationData ? "42,892" : "0", hint: "Did anyone chat?" },
    { label: "Resolved by agent", value: hasConversationData ? "89.4%" : "0%", hint: "Did it solve issues?" },
    { label: "Needs human help", value: hasConversationData ? "4.2%" : "0%", hint: "Anything escalated?" },
  ];

  return (
    <div className="-m-6 min-h-full p-6 md:p-8">
      <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-ds-primary text-3xl font-black tracking-tight md:text-4xl">Dashboard</h1>
            <p className="text-ds-on-surface-variant mt-1 text-sm font-medium md:text-base">
              A quick pulse on agent activity and support outcomes.
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

        <div className="flex items-center justify-end">
          <button
            type="button"
            onClick={() => setPreviewMode((prev) => (prev === "empty" ? "data" : "empty"))}
            className="border-ds-outline text-ds-on-surface hover:bg-ds-sidebar rounded-ds-md border bg-white px-4 py-2 text-xs font-semibold transition-colors"
          >
            {previewMode === "empty" ? "Preview Dashboard With Data" : "Preview Empty-State Dashboard"}
          </button>
        </div>

        <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {primaryMetrics.map((metric) => (
            <article key={metric.label} className="bg-ds-surface border-ds-outline rounded-ds-xl border p-6 shadow-sm">
              <h2 className="text-ds-on-surface-variant text-sm font-semibold">{metric.label}</h2>
              <p className="text-3xl font-semibold">{metric.value}</p>
              <p className="text-ds-on-surface-variant mt-1 text-xs">{metric.hint}</p>
            </article>
          ))}
        </section>

        {hasConversationData ? (
          <>
            <section className="grid grid-cols-1 gap-6 xl:grid-cols-[1.6fr_1fr]">
              <article className="bg-ds-surface border-ds-outline rounded-ds-xl border p-6 md:p-8 shadow-sm">
                <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <h3 className="text-xl font-bold">Conversations over time</h3>
                    <p className="text-ds-on-surface-variant text-sm">
                      Daily volume of user interactions across all channels
                    </p>
                  </div>
                  <p className="text-ds-on-surface-variant text-xs">
                    Secondary insights are available in Analytics
                  </p>
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
                  </svg>
                </div>
              </article>

              <aside className="bg-ds-surface border-ds-outline rounded-ds-xl border p-6 shadow-sm">
                <h3 className="text-lg font-bold">Team Queue Snapshot</h3>
                <p className="text-ds-on-surface-variant mt-1 text-sm">
                  Focus on items that need manual intervention now.
                </p>
                <div className="mt-5 space-y-3">
                  <QueueItem label="Open human escalations" value="18" tone="warning" />
                  <QueueItem label="Awaiting customer reply" value="42" tone="neutral" />
                  <QueueItem label="Overdue SLA risk" value="3" tone="danger" />
                </div>
                <a
                  href="/conversations"
                  className="border-ds-outline text-ds-on-surface hover:bg-ds-sidebar mt-5 block rounded-ds-md border bg-white px-4 py-2 text-center text-sm font-semibold transition-colors"
                >
                  Open Conversations Queue
                </a>
              </aside>
            </section>

            <section className="grid grid-cols-1 gap-6 xl:grid-cols-[1.6fr_1fr]">
              <article className="bg-ds-surface border-ds-outline rounded-ds-xl border p-6 shadow-sm">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-lg font-bold">Recent customer conversations</h3>
                  <a href="/conversations" className="text-ds-on-surface-variant text-xs font-semibold hover:underline">
                    View all
                  </a>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="text-ds-on-surface-variant text-[11px] font-bold uppercase">
                        <th className="py-2">Customer</th>
                        <th className="py-2">Topic</th>
                        <th className="py-2">Status</th>
                        <th className="py-2 text-right">Time</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100">
                      {recentConversations.map((item) => (
                        <tr key={`${item.customer}-${item.time}`}>
                          <td className="py-3 text-sm font-semibold">{item.customer}</td>
                          <td className="py-3 text-sm text-ds-on-surface-variant">{item.topic}</td>
                          <td className="py-3">
                            <span
                              className={`rounded px-2 py-1 text-[10px] font-bold uppercase ${
                                item.status === "Resolved by AI"
                                  ? "bg-emerald-100 text-emerald-700"
                                  : item.status === "Needs human"
                                    ? "bg-rose-100 text-rose-700"
                                    : "bg-zinc-100 text-zinc-700"
                              }`}
                            >
                              {item.status}
                            </span>
                          </td>
                          <td className="py-3 text-right text-xs text-ds-on-surface-variant">{item.time}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </article>

              <article className="bg-ds-surface border-ds-outline rounded-ds-xl border p-6 shadow-sm">
                <h3 className="text-lg font-bold">Unresolved topics to train</h3>
                <p className="text-ds-on-surface-variant mt-1 text-sm">
                  Add these to Knowledge Base to improve resolution.
                </p>
                <div className="mt-4 space-y-3">
                  {unresolvedTopics.map((topic) => (
                    <div key={topic.name} className="border-ds-outline/60 rounded-ds-lg border bg-zinc-50 p-3">
                      <p className="text-sm font-semibold">{topic.name}</p>
                      <p className="text-ds-on-surface-variant mt-0.5 text-xs">{topic.count} misses this week</p>
                    </div>
                  ))}
                </div>
                <a
                  href="/knowledge/text-snippet"
                  className="bg-ds-primary text-ds-on-primary mt-5 inline-flex rounded-ds-md px-4 py-2 text-sm font-semibold"
                >
                  Improve Knowledge Base
                </a>
              </article>
            </section>
          </>
        ) : (
          <section className="bg-ds-surface border-ds-outline rounded-ds-xl border p-6 md:p-10 shadow-sm">
            <div className="mx-auto flex max-w-3xl flex-col items-center text-center">
              <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-zinc-100">
                <span className="text-ds-on-surface text-2xl font-bold">0</span>
              </div>
              <h3 className="text-ds-on-surface text-2xl font-bold">Your agent is live</h3>
              <p className="text-ds-on-surface-variant mt-2 max-w-2xl text-sm">
                Share it with customers to start seeing data here. Once people chat with your agent,
                this dashboard will populate with conversations, resolution rate, and escalations.
              </p>
              <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                <button className="bg-ds-primary text-ds-on-primary rounded-ds-md px-5 py-2 text-sm font-semibold transition-opacity hover:opacity-90">
                  Copy widget link
                </button>
                <a
                  href="/deploy"
                  className="border-ds-outline text-ds-on-surface hover:bg-ds-sidebar rounded-ds-md border px-5 py-2 text-sm font-semibold transition-colors"
                >
                  Open Deploy Settings
                </a>
              </div>
            </div>
            <div className="border-ds-outline mt-8 grid grid-cols-1 gap-4 border-t pt-6 md:grid-cols-3">
              <EmptyAction
                title="Install on storefront"
                description="Turn on Shopify widget so customers can start chatting."
                cta="Go to Deploy"
                href="/deploy"
              />
              <EmptyAction
                title="Enable key actions"
                description="Turn on Product Search and Order Lookup for instant value."
                cta="Open Actions"
                href="/actions"
              />
              <EmptyAction
                title="Improve response quality"
                description="Upload FAQs and policy snippets in Knowledge Base."
                cta="Open Knowledge Base"
                href="/knowledge/website"
              />
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

function QueueItem({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "neutral" | "warning" | "danger";
}) {
  const toneClass =
    tone === "danger"
      ? "bg-rose-100 text-rose-700"
      : tone === "warning"
        ? "bg-amber-100 text-amber-700"
        : "bg-zinc-100 text-zinc-700";
  return (
    <div className="flex items-center justify-between rounded-ds-md border border-zinc-200 bg-white px-3 py-2">
      <p className="text-sm text-ds-on-surface">{label}</p>
      <span className={`rounded px-2 py-1 text-xs font-bold ${toneClass}`}>{value}</span>
    </div>
  );
}

function EmptyAction({
  title,
  description,
  cta,
  href,
}: {
  title: string;
  description: string;
  cta: string;
  href: string;
}) {
  return (
    <article className="border-ds-outline rounded-ds-lg border bg-white p-4 text-left">
      <h4 className="text-sm font-semibold">{title}</h4>
      <p className="text-ds-on-surface-variant mt-1 text-xs">{description}</p>
      <a href={href} className="text-ds-on-surface mt-3 inline-block text-xs font-semibold hover:underline">
        {cta}
      </a>
    </article>
  );
}
