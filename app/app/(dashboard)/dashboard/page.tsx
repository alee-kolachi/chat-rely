"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

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
    <div className="ds-app-shell p-6 md:p-8">
      <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="ds-app-page-title">Dashboard</h1>
            <p className="ds-app-page-description ds-app-page-description--wide">
              A quick pulse on agent activity and support outcomes.
            </p>
          </div>
          <div className="border-ds-outline bg-ds-surface inline-flex w-fit flex-wrap items-center gap-1 rounded-ds-lg border p-1 shadow-sm">
            {(["Last 7 days", "30 days", "3 months", "1 year"] as const).map((label, i) => (
              <button
                key={label}
                type="button"
                className={cn(
                  "rounded-ds-md px-3 py-1.5 text-sm font-medium transition-colors",
                  i === 1
                    ? "bg-ds-primary text-ds-on-primary shadow-sm"
                    : "text-ds-on-surface-variant hover:text-ds-on-surface"
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-end">
          <button
            type="button"
            onClick={() => setPreviewMode((prev) => (prev === "empty" ? "data" : "empty"))}
            className="border-ds-outline text-ds-on-surface hover:bg-ds-sidebar touch-manipulation min-h-11 rounded-ds-md border bg-white px-4 py-2 text-xs font-semibold transition-colors [-webkit-tap-highlight-color:transparent]"
          >
            {previewMode === "empty" ? "Preview with sample data" : "Preview empty state"}
          </button>
        </div>

        <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {primaryMetrics.map((metric) => (
            <article
              key={metric.label}
              className="border-ds-outline bg-ds-surface rounded-ds-xl border p-6 shadow-sm"
            >
              <h2 className="text-ds-on-surface-variant text-sm font-semibold">{metric.label}</h2>
              <p className="ds-app-metric-value mt-2">{metric.value}</p>
              <p className="text-ds-on-surface-variant mt-1 text-xs leading-relaxed">{metric.hint}</p>
            </article>
          ))}
        </section>

        {hasConversationData ? (
          <>
            <section className="grid grid-cols-1 gap-6 xl:grid-cols-[1.6fr_1fr]">
              <article className="border-ds-outline bg-ds-surface rounded-ds-xl border p-6 shadow-sm md:p-8">
                <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <h3 className="ds-app-section-title">Conversations over time</h3>
                    <p className="text-ds-on-surface-variant mt-1 text-sm leading-relaxed">
                      Daily volume of user interactions across all channels
                    </p>
                  </div>
                  <p className="text-ds-on-surface-variant text-xs">More detail in Analytics</p>
                </div>
                <div className="h-64 text-[var(--ds-chart-grid)]">
                  <svg className="h-full w-full" viewBox="0 0 900 260" preserveAspectRatio="none" aria-hidden>
                    <line x1="0" y1="20" x2="900" y2="20" stroke="currentColor" strokeWidth="1" />
                    <line x1="0" y1="80" x2="900" y2="80" stroke="currentColor" strokeWidth="1" />
                    <line x1="0" y1="140" x2="900" y2="140" stroke="currentColor" strokeWidth="1" />
                    <line x1="0" y1="200" x2="900" y2="200" stroke="currentColor" strokeWidth="1" />
                    <line x1="0" y1="250" x2="900" y2="250" stroke="currentColor" strokeWidth="1" />
                    <path
                      d="M0,210 C70,195 130,205 190,180 C250,155 320,170 380,130 C440,90 510,120 570,95 C630,70 700,85 760,60 C820,45 860,55 900,40"
                      fill="none"
                      stroke="var(--ds-chart-line)"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                    />
                  </svg>
                </div>
              </article>

              <aside className="border-ds-outline bg-ds-surface rounded-ds-xl border p-6 shadow-sm">
                <h3 className="ds-app-section-title">Team queue snapshot</h3>
                <p className="text-ds-on-surface-variant mt-1 text-sm leading-relaxed">
                  Items that may need manual intervention.
                </p>
                <div className="mt-5 space-y-3">
                  <QueueItem label="Open human escalations" value="18" tone="warning" />
                  <QueueItem label="Awaiting customer reply" value="42" tone="neutral" />
                  <QueueItem label="Overdue SLA risk" value="3" tone="danger" />
                </div>
                <a
                  href="/conversations"
                  className="border-ds-outline text-ds-on-surface hover:bg-ds-sidebar mt-5 block rounded-ds-md border bg-white px-4 py-2.5 text-center text-sm font-semibold transition-colors"
                >
                  Open conversations
                </a>
              </aside>
            </section>

            <section className="grid grid-cols-1 gap-6 xl:grid-cols-[1.6fr_1fr]">
              <article className="border-ds-outline bg-ds-surface rounded-ds-xl border p-6 shadow-sm">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <h3 className="ds-app-section-title">Recent conversations</h3>
                  <a
                    href="/conversations"
                    className="text-ds-primary shrink-0 text-xs font-semibold hover:underline"
                  >
                    View all
                  </a>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="ds-app-kicker">
                        <th className="py-2 pr-2 font-semibold">Customer</th>
                        <th className="py-2 pr-2 font-semibold">Topic</th>
                        <th className="py-2 pr-2 font-semibold">Status</th>
                        <th className="py-2 text-right font-semibold">Time</th>
                      </tr>
                    </thead>
                    <tbody className="divide-ds-outline divide-y">
                      {recentConversations.map((item) => (
                        <tr key={`${item.customer}-${item.time}`}>
                          <td className="text-ds-on-surface py-3 text-sm font-semibold">{item.customer}</td>
                          <td className="text-ds-on-surface-variant py-3 text-sm">{item.topic}</td>
                          <td className="py-3">
                            <span
                              className={cn(
                                "rounded-ds-md px-2 py-1 text-[11px] font-semibold tracking-wide uppercase",
                                item.status === "Resolved by AI" && "bg-emerald-100 text-emerald-800",
                                item.status === "Needs human" && "bg-rose-100 text-rose-800",
                                item.status === "In progress" && "bg-ds-sidebar text-ds-on-surface-variant ring-1 ring-ds-outline"
                              )}
                            >
                              {item.status}
                            </span>
                          </td>
                          <td className="text-ds-on-surface-variant py-3 text-right text-xs">{item.time}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </article>

              <article className="border-ds-outline bg-ds-surface rounded-ds-xl border p-6 shadow-sm">
                <h3 className="ds-app-section-title">Unresolved topics to train</h3>
                <p className="text-ds-on-surface-variant mt-1 text-sm leading-relaxed">
                  Add these to Knowledge to improve resolution.
                </p>
                <div className="mt-4 space-y-3">
                  {unresolvedTopics.map((topic) => (
                    <div
                      key={topic.name}
                      className="border-ds-outline rounded-ds-lg border bg-ds-sidebar/80 p-3 shadow-sm"
                    >
                      <p className="text-ds-on-surface text-sm font-semibold">{topic.name}</p>
                      <p className="text-ds-on-surface-variant mt-0.5 text-xs">{topic.count} misses this week</p>
                    </div>
                  ))}
                </div>
                <a
                  href="/knowledge/text-snippet"
                  className="bg-ds-primary text-ds-on-primary hover:bg-ds-secondary mt-5 inline-flex rounded-ds-md px-4 py-2.5 text-sm font-semibold transition-colors"
                >
                  Improve knowledge base
                </a>
              </article>
            </section>
          </>
        ) : (
          <section className="border-ds-outline bg-ds-surface rounded-ds-xl border p-6 shadow-sm md:p-10">
            <div className="mx-auto flex max-w-3xl flex-col items-center text-center">
              <div className="mb-5 flex size-16 items-center justify-center rounded-full bg-ds-sidebar ring-1 ring-ds-outline">
                <span className="text-ds-on-surface text-2xl font-semibold">0</span>
              </div>
              <h3 className="ds-app-section-title text-xl md:text-2xl">Your agent is live</h3>
              <p className="text-ds-on-surface-variant mt-2 max-w-2xl text-sm leading-relaxed md:text-base">
                Share it with customers to start seeing data here. Once people chat with your agent, this dashboard
                will populate with conversations, resolution rate, and escalations.
              </p>
              <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                <button
                  type="button"
                  className="bg-ds-primary text-ds-on-primary hover:bg-ds-secondary rounded-ds-md px-5 py-2.5 text-sm font-semibold transition-colors active:scale-[0.98]"
                >
                  Copy widget link
                </button>
                <a
                  href="/deploy"
                  className="border-ds-outline text-ds-on-surface hover:bg-ds-sidebar rounded-ds-md border bg-white px-5 py-2.5 text-sm font-semibold transition-colors"
                >
                  Open deploy settings
                </a>
              </div>
            </div>
            <div className="border-ds-outline mt-8 grid grid-cols-1 gap-4 border-t pt-6 md:grid-cols-3">
              <EmptyAction
                title="Install on storefront"
                description="Turn on the Shopify widget so customers can start chatting."
                cta="Go to deploy"
                href="/deploy"
              />
              <EmptyAction
                title="Enable key actions"
                description="Turn on Product Search and Order Lookup for instant value."
                cta="Open actions"
                href="/actions"
              />
              <EmptyAction
                title="Improve response quality"
                description="Upload FAQs and policy snippets in Knowledge."
                cta="Open knowledge base"
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
      ? "bg-rose-100 text-rose-800"
      : tone === "warning"
        ? "bg-amber-100 text-amber-800"
        : "bg-ds-sidebar text-ds-on-surface-variant ring-1 ring-ds-outline";
  return (
    <div className="border-ds-outline flex items-center justify-between rounded-ds-md border bg-white px-3 py-2.5 shadow-sm">
      <p className="text-ds-on-surface text-sm">{label}</p>
      <span className={cn("rounded-ds-md px-2 py-1 text-xs font-semibold", toneClass)}>{value}</span>
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
    <article className="border-ds-outline rounded-ds-lg border bg-white p-4 text-left shadow-sm">
      <h4 className="ds-app-card-title">{title}</h4>
      <p className="text-ds-on-surface-variant mt-1 text-xs leading-relaxed">{description}</p>
      <a href={href} className="text-ds-primary mt-3 inline-block text-xs font-semibold hover:underline">
        {cta}
      </a>
    </article>
  );
}
