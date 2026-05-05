"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { UsagePlanBanner } from "@/components/dashboard/usage-plan-banner";
import { DashboardRangePicker, type RangePreset } from "@/components/dashboard/dashboard-range-picker";
import { useDashboardAgent } from "@/components/layout/dashboard-agent-context";
import { backendFetch } from "@/lib/backend-api";
import {
  buildTimeSeriesChartModel,
  CHART_VB_H,
  CHART_VB_W,
} from "@/lib/dashboard-chart-model";
import { cn } from "@/lib/utils";

type DashboardPayload = {
  range_from: string;
  range_to: string;
  conversations_started: number;
  billable_conversations: number;
  resolved_by_agent_pct: number | null;
  needs_human_pct: number | null;
  open_escalations: number;
  awaiting_customer_reply: number;
  series: { bucket_date: string; count: number }[];
  recent: {
    conversation_id: string;
    visitor_id: string;
    topic_preview: string | null;
    status: string;
    last_activity_at: string;
  }[];
  training_topics: { slug: string; label: string; count: number }[];
};

function formatRelative(iso: string): string {
  const then = new Date(iso).getTime();
  const diff = Math.max(0, Date.now() - then);
  const m = Math.floor(diff / 60000);
  if (m < 1) return "Just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 48) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

function visitorLabel(visitorId: string): string {
  const v = visitorId.trim();
  if (!v || v === "preview-user") return "Visitor";
  if (v.length <= 12) return v;
  return `${v.slice(0, 8)}…`;
}

function statusPresentation(status: string): { label: string; tone: "ok" | "human" | "open" } {
  if (status === "resolved" || status === "idle_closed") return { label: "Resolved", tone: "ok" };
  if (status === "escalated") return { label: "Needs human", tone: "human" };
  return { label: "In progress", tone: "open" };
}

export default function DashboardPage() {
  const { selectedAgentId, agentsLoading } = useDashboardAgent();
  const [preset, setPreset] = useState<RangePreset>("30d");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [data, setData] = useState<DashboardPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dashboardUrl = useMemo(() => {
    if (!selectedAgentId) return null;
    const base = `/api/v1/agents/${selectedAgentId}/dashboard`;
    if (preset === "custom") {
      if (!customFrom || !customTo) return null;
      const fromIso = new Date(`${customFrom}T00:00:00.000Z`).toISOString();
      const toIso = new Date(`${customTo}T23:59:59.999Z`).toISOString();
      const q = new URLSearchParams({ from: fromIso, to: toIso });
      return `${base}?${q.toString()}`;
    }
    const q = new URLSearchParams({ range_key: preset });
    return `${base}?${q.toString()}`;
  }, [selectedAgentId, preset, customFrom, customTo]);

  const load = useCallback(async () => {
    if (!dashboardUrl) {
      setData(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await backendFetch<DashboardPayload>(dashboardUrl);
      setData(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load dashboard");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [dashboardUrl]);

  useEffect(() => {
    queueMicrotask(() => {
      void load();
    });
  }, [load]);

  const started = data?.conversations_started ?? 0;
  const hasConversationData = Boolean(data && data.conversations_started > 0);

  const billable = data?.billable_conversations ?? 0;

  const primaryMetrics = [
    {
      label: "Conversations started",
      value: loading ? "…" : data ? String(started) : "—",
      hint: "All visitor sessions that began in this date range (includes short or abandoned chats).",
    },
    {
      label: "Billable conversations",
      value: loading ? "…" : data ? String(billable) : "—",
      hint: "Sessions that count toward your plan after idle-close and quality thresholds (closer to invoice usage).",
    },
    {
      label: "Resolved by agent",
      value: loading
        ? "…"
        : data?.resolved_by_agent_pct != null
          ? `${data.resolved_by_agent_pct}%`
          : data
            ? "—"
            : "—",
      hint: "From AI-analyzed closed chats (see outcomes pipeline).",
    },
    {
      label: "Needs human help",
      value: loading
        ? "…"
        : data?.needs_human_pct != null
          ? `${data.needs_human_pct}%`
          : data
            ? "—"
            : "—",
      hint: "Share of chats escalated to your team.",
    },
  ];

  const timeSeriesChart = useMemo(
    () => buildTimeSeriesChartModel(data?.series),
    [data?.series]
  );

  const conversationsHref =
    selectedAgentId != null
      ? `/conversations?agent=${encodeURIComponent(selectedAgentId)}`
      : "/conversations";

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
          <DashboardRangePicker
            preset={preset}
            onPresetChange={setPreset}
            customFrom={customFrom}
            customTo={customTo}
            onCustomFromChange={setCustomFrom}
            onCustomToChange={setCustomTo}
          />
        </div>

        {agentsLoading ? (
          <p className="text-ds-on-surface-variant text-sm">Loading workspace…</p>
        ) : null}
        {!agentsLoading && !selectedAgentId ? (
          <p className="text-ds-on-surface-variant text-sm">Select an agent from the header to view metrics.</p>
        ) : null}
        {error ? <p className="text-sm text-rose-600">{error}</p> : null}

        <UsagePlanBanner />

        <section className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          {primaryMetrics.map((metric) => (
            <article
              key={metric.label}
              className="border-ds-outline bg-ds-surface rounded-ds-xl border p-6 shadow-sm"
            >
              <h2 className="text-ds-on-surface-variant text-sm font-semibold">{metric.label}</h2>
              <p className="ds-app-metric-value mt-2">{loading ? "…" : metric.value}</p>
              <p className="text-ds-on-surface-variant mt-1 text-xs leading-relaxed">{metric.hint}</p>
            </article>
          ))}
        </section>

        {!agentsLoading && selectedAgentId && !hasConversationData && !loading ? (
          <section className="border-ds-outline bg-ds-surface rounded-ds-xl border p-6 shadow-sm md:p-10">
            <div className="mx-auto flex max-w-3xl flex-col items-center text-center">
              <div className="mb-5 flex size-16 items-center justify-center rounded-full bg-ds-sidebar ring-1 ring-ds-outline">
                <span className="text-ds-on-surface text-2xl font-semibold">0</span>
              </div>
              <h3 className="ds-app-section-title text-xl md:text-2xl">Your agent is live</h3>
              <p className="text-ds-on-surface-variant mt-2 max-w-2xl text-sm leading-relaxed md:text-base">
                Share it with customers to start seeing data here. Once people chat with your agent, this dashboard will
                populate with conversations, resolution rate, and escalations.
              </p>
              <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                <a
                  href="/deploy"
                  className="bg-ds-primary text-ds-on-primary hover:bg-ds-secondary rounded-ds-md px-5 py-2.5 text-sm font-semibold transition-colors"
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
        ) : null}

        {hasConversationData || loading ? (
          <>
            <section className="grid grid-cols-1 gap-6 xl:grid-cols-[1.6fr_1fr]">
              <article className="border-ds-outline bg-ds-surface flex min-h-0 flex-col overflow-hidden rounded-ds-xl border shadow-sm">
                <div className="border-ds-outline flex flex-col gap-1 border-b px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <h3 className="ds-app-section-title">Conversations over time</h3>
                    <p className="text-ds-on-surface-variant mt-1 text-sm leading-relaxed">
                      Daily volume for the selected period
                    </p>
                  </div>
                  <Link
                    href="/analytics"
                    className="text-ds-primary hover:text-ds-secondary shrink-0 text-sm font-semibold"
                  >
                    Analytics →
                  </Link>
                </div>

                <div className="from-ds-sidebar/20 relative min-h-0 flex-1 bg-gradient-to-b to-transparent px-3 pb-3 pt-2 sm:px-4">
                  {/* Height tracks column width (aspect) so the plot is not stuffed into a fixed slot */}
                  <div className="text-ds-on-surface-variant relative mx-auto aspect-[5/2] w-full min-h-[200px] max-h-[320px] text-[var(--ds-chart-grid)]">
                    {loading ? (
                      <div className="flex h-full min-h-[200px] w-full items-center justify-center text-sm">Loading chart…</div>
                    ) : timeSeriesChart ? (
                      <svg
                        className="block h-full w-full font-sans"
                        viewBox={`0 0 ${CHART_VB_W} ${CHART_VB_H}`}
                        preserveAspectRatio="xMidYMid meet"
                        role="img"
                        aria-label="Conversations over time: daily count by day"
                      >
                        <defs>
                          <linearGradient id="dashChartAreaFill" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="var(--ds-chart-line)" stopOpacity={0.22} />
                            <stop offset="100%" stopColor="var(--ds-chart-line)" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <path
                          d={timeSeriesChart.areaPath}
                          fill="url(#dashChartAreaFill)"
                          stroke="none"
                        />
                        <g opacity={0.9}>
                        {timeSeriesChart.yTicks.map((tick) => {
                          const gy = timeSeriesChart.yAtTick(tick);
                          return (
                            <line
                              key={`gy-${tick}`}
                              x1={timeSeriesChart.padL}
                              y1={gy}
                              x2={timeSeriesChart.padL + timeSeriesChart.innerW}
                              y2={gy}
                              stroke="currentColor"
                              strokeWidth={1}
                              opacity={0.22}
                            />
                          );
                        })}
                        <line
                          x1={timeSeriesChart.padL}
                          y1={timeSeriesChart.padT}
                          x2={timeSeriesChart.padL}
                          y2={timeSeriesChart.xAxisY}
                          stroke="currentColor"
                          strokeWidth={1}
                          opacity={0.35}
                        />
                        <line
                          x1={timeSeriesChart.padL}
                          y1={timeSeriesChart.xAxisY}
                          x2={timeSeriesChart.padL + timeSeriesChart.innerW}
                          y2={timeSeriesChart.xAxisY}
                          stroke="currentColor"
                          strokeWidth={1}
                          opacity={0.4}
                        />
                      </g>
                      {timeSeriesChart.yTicks.map((tick) => {
                        const gy = timeSeriesChart.yAtTick(tick);
                        return (
                          <text
                            key={`yl-${tick}`}
                            x={timeSeriesChart.padL - 12}
                            y={gy}
                            textAnchor="end"
                            dominantBaseline="middle"
                            fill="currentColor"
                            fontSize={12}
                            opacity={0.88}
                            style={{ fontVariantNumeric: "tabular-nums" }}
                          >
                            {tick}
                          </text>
                        );
                      })}
                      {timeSeriesChart.xLabels.map((item, j) => (
                        <text
                          key={`xl-${item.label}-${j}`}
                          x={item.x}
                          y={timeSeriesChart.xTickY}
                          textAnchor="middle"
                          dominantBaseline="hanging"
                          fill="currentColor"
                          fontSize={12}
                          opacity={0.88}
                        >
                          {item.label}
                        </text>
                      ))}
                      <text
                        x={28}
                        y={timeSeriesChart.midY}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        fill="currentColor"
                        fontSize={13}
                        fontWeight={600}
                        opacity={0.58}
                        letterSpacing="0.02em"
                        transform={`rotate(-90 28 ${timeSeriesChart.midY})`}
                      >
                        Conversations
                      </text>
                      <text
                        x={timeSeriesChart.padL + timeSeriesChart.innerW / 2}
                        y={CHART_VB_H - 10}
                        textAnchor="middle"
                        dominantBaseline="auto"
                        fill="currentColor"
                        fontSize={13}
                        fontWeight={600}
                        opacity={0.58}
                        letterSpacing="0.05em"
                      >
                        Day
                      </text>
                      <path
                        d={timeSeriesChart.path}
                        fill="none"
                        stroke="var(--ds-chart-line)"
                        strokeWidth={2.5}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-sm">
                      No data for this range.
                    </div>
                  )}
                  </div>
                </div>
              </article>
              <aside className="border-ds-outline bg-ds-surface rounded-ds-xl border p-6 shadow-sm">
                <h3 className="ds-app-section-title">Team queue snapshot</h3>
                <p className="text-ds-on-surface-variant mt-1 text-sm leading-relaxed">
                  Escalations and threads waiting on the customer.
                </p>
                <div className="mt-5 space-y-3">
                  <QueueItem
                    label="Open human escalations"
                    value={loading ? "…" : String(data?.open_escalations ?? 0)}
                    tone="warning"
                  />
                  <QueueItem
                    label="Awaiting customer reply"
                    value={loading ? "…" : String(data?.awaiting_customer_reply ?? 0)}
                    tone="neutral"
                  />
                </div>
                <Link
                  href={conversationsHref}
                  className="border-ds-outline text-ds-on-surface hover:bg-ds-sidebar mt-5 block rounded-ds-md border bg-white px-4 py-2.5 text-center text-sm font-semibold transition-colors"
                >
                  Open conversations
                </Link>
              </aside>
            </section>

            <section className="grid grid-cols-1 gap-6 xl:grid-cols-[1.6fr_1fr]">
              <article className="border-ds-outline bg-ds-surface rounded-ds-xl border p-6 shadow-sm">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <h3 className="ds-app-section-title">Recent conversations</h3>
                  <Link href={conversationsHref} className="text-ds-primary shrink-0 text-xs font-semibold hover:underline">
                    View all
                  </Link>
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
                      {loading ? (
                        <tr>
                          <td colSpan={4} className="text-ds-on-surface-variant py-4 text-sm">
                            Loading…
                          </td>
                        </tr>
                      ) : null}
                      {!loading &&
                        (data?.recent ?? []).map((item) => {
                          const sp = statusPresentation(item.status);
                          return (
                            <tr key={item.conversation_id}>
                              <td className="text-ds-on-surface py-3 text-sm font-semibold">
                                <Link
                                  href={`/conversations?conversation=${encodeURIComponent(item.conversation_id)}&agent=${encodeURIComponent(selectedAgentId ?? "")}`}
                                  className="hover:text-ds-primary hover:underline"
                                >
                                  {visitorLabel(item.visitor_id)}
                                </Link>
                              </td>
                              <td className="text-ds-on-surface-variant max-w-[200px] truncate py-3 text-sm">
                                {item.topic_preview ?? "—"}
                              </td>
                              <td className="py-3">
                                <span
                                  className={cn(
                                    "rounded-ds-md px-2 py-1 text-[11px] font-semibold tracking-wide uppercase",
                                    sp.tone === "ok" && "bg-emerald-100 text-emerald-800",
                                    sp.tone === "human" && "bg-rose-100 text-rose-800",
                                    sp.tone === "open" && "bg-ds-sidebar text-ds-on-surface-variant ring-1 ring-ds-outline"
                                  )}
                                >
                                  {sp.label}
                                </span>
                              </td>
                              <td className="text-ds-on-surface-variant py-3 text-right text-xs">
                                {formatRelative(item.last_activity_at)}
                              </td>
                            </tr>
                          );
                        })}
                      {!loading && !data?.recent?.length ? (
                        <tr>
                          <td colSpan={4} className="text-ds-on-surface-variant py-4 text-sm">
                            No conversations yet.
                          </td>
                        </tr>
                      ) : null}
                    </tbody>
                  </table>
                </div>
              </article>

              <article className="border-ds-outline bg-ds-surface flex flex-col rounded-ds-xl border p-6 shadow-sm">
                <h3 className="ds-app-section-title">Unresolved topics to train</h3>
                <p className="text-ds-on-surface-variant mt-1 text-sm leading-relaxed">
                  From AI-analyzed closures—add coverage in Knowledge.
                </p>
                <div className="mt-4 min-h-0 flex-1 space-y-3 overflow-y-auto">
                  {loading ? (
                    <p className="text-ds-on-surface-variant text-sm">Loading…</p>
                  ) : null}
                  {!loading &&
                    (data?.training_topics ?? []).map((topic) => (
                      <Link
                        key={topic.slug}
                        href={`/conversations?agent=${encodeURIComponent(selectedAgentId ?? "")}&training_topic=${encodeURIComponent(topic.slug)}`}
                        className="border-ds-outline block rounded-ds-lg border bg-ds-sidebar/80 p-3 shadow-sm transition-colors hover:bg-ds-sidebar"
                      >
                        <p className="text-ds-on-surface text-sm font-semibold">{topic.label}</p>
                        <p className="text-ds-on-surface-variant mt-0.5 text-xs">
                          {topic.count} in this period
                        </p>
                      </Link>
                    ))}
                  {!loading && !(data?.training_topics ?? []).length ? (
                    <p className="text-ds-on-surface-variant text-sm">No training gaps detected for this range.</p>
                  ) : null}
                </div>
                <Link
                  href="/knowledge/text-snippet"
                  className="bg-ds-primary text-ds-on-primary hover:bg-ds-secondary mt-5 inline-flex w-fit rounded-ds-md px-4 py-2.5 text-sm font-semibold transition-colors"
                >
                  Improve knowledge base
                </Link>
              </article>
            </section>
          </>
        ) : null}
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
