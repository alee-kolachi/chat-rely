"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  DashboardMetricValueSkeleton,
  DashboardQueueAsideSkeleton,
  DashboardRecentConversationsEmptyState,
  DashboardRecentTableSkeleton,
  DashboardSelectAgentEmptyState,
  DashboardSourceSuggestionsPlanGate,
  DashboardTrainingTopicsEmptyState,
  DashboardTrainingTopicsSkeleton,
} from "@/components/dashboard/dashboard-page-skeleton";
import { TimeSeriesTrendChart } from "@/components/dashboard/time-series-trend-chart";
import { UsagePlanBanner } from "@/components/dashboard/usage-plan-banner";
import { DashboardRangePicker, type RangePreset } from "@/components/dashboard/dashboard-range-picker";
import { useDashboardAgent } from "@/components/layout/dashboard-agent-context";
import { useMeContext } from "@/components/layout/me-context-provider";
import { backendFetch } from "@/lib/backend-api";
import { planAllowsAnalyticsPage } from "@/lib/analytics-plan-access";
import { cn } from "@/lib/utils";
import { appButtonClassName } from "@/lib/button-styles";

type DashboardPayload = {
  range_from: string;
  range_to: string;
  conversations_started: number;
  active_conversations: number;
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
  /** Omitted by older API responses; when absent, client treats suggestions as enabled. */
  sources_suggestions_enabled?: boolean;
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

function conversationDetailHref(conversationId: string, agentId: string | null | undefined): string {
  const qs = new URLSearchParams({ conversation: conversationId });
  const agent = (agentId ?? "").trim();
  if (agent) qs.set("agent", agent);
  return `/conversations?${qs.toString()}`;
}

const SOURCE_SUGGESTIONS_PAGE_SIZE = 4;

export default function DashboardPage() {
  const router = useRouter();
  const { selectedAgentId, agentsLoading } = useDashboardAgent();
  const { data: meData, loading: meLoading } = useMeContext();
  const showAnalyticsNav = !meLoading && planAllowsAnalyticsPage(meData?.plan.slug);
  const [preset, setPreset] = useState<RangePreset>("30d");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [data, setData] = useState<DashboardPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggestionsPage, setSuggestionsPage] = useState(0);

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
      setLoading(false);
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
    void load();
  }, [load]);

  const started = data?.conversations_started ?? 0;
  const hasConversationData = Boolean(data && data.conversations_started > 0);

  const activeNow = data?.active_conversations ?? 0;
  /** Dashboard HTTP payload not ready yet (valid agent URL + fetch pending or refetch). */
  const dashboardPayloadBusy = Boolean(
    selectedAgentId && dashboardUrl && error === null && (loading || data === null)
  );
  const awaitingInitialAgentSelection = agentsLoading && !selectedAgentId;
  /** Agents list loading OR dashboard metrics fetching — panels stay mounted so layout doesn’t collapse to blank. */
  const showPanelSkeleton = awaitingInitialAgentSelection || dashboardPayloadBusy;
  /** Panels visible whenever there’s real analytics data or we’re still loading either workspace or dashboard JSON. */
  const showAnalyticsPanels = hasConversationData || showPanelSkeleton;

  const primaryMetrics = [
    {
      label: "Conversations",
      value: data ? String(started) : "-",
      hint: "New sessions in this date range.",
    },
    {
      label: "Active chats",
      value: data ? String(activeNow) : "-",
      hint: "Open chats right now.",
    },
    {
      label: "Resolved by agent",
      value: data?.resolved_by_agent_pct != null ? `${data.resolved_by_agent_pct}%` : "-",
      hint: "Closed without escalation in this period.",
    },
    {
      label: "Needs human help",
      value: data?.needs_human_pct != null ? `${data.needs_human_pct}%` : "-",
      hint: "Escalated to your team in this period.",
    },
  ];

  const conversationsHref =
    selectedAgentId != null
      ? `/conversations?agent=${encodeURIComponent(selectedAgentId)}`
      : "/conversations";

  const ticketsHref = (status: "open" | "pending_customer") =>
    `/tickets?status=${encodeURIComponent(status)}`;

  const trainingTopics = data?.training_topics ?? [];
  const suggestionPageCount = Math.max(1, Math.ceil(trainingTopics.length / SOURCE_SUGGESTIONS_PAGE_SIZE));
  const visibleSuggestions = trainingTopics.slice(
    suggestionsPage * SOURCE_SUGGESTIONS_PAGE_SIZE,
    (suggestionsPage + 1) * SOURCE_SUGGESTIONS_PAGE_SIZE
  );
  const showSuggestionPagination =
    !showPanelSkeleton &&
    data?.sources_suggestions_enabled !== false &&
    trainingTopics.length > SOURCE_SUGGESTIONS_PAGE_SIZE;

  useEffect(() => {
    setSuggestionsPage(0);
  }, [selectedAgentId, preset, customFrom, customTo, trainingTopics.length]);

  useEffect(() => {
    if (suggestionsPage >= suggestionPageCount) {
      setSuggestionsPage(Math.max(0, suggestionPageCount - 1));
    }
  }, [suggestionsPage, suggestionPageCount]);

  return (
    <div className="ds-app-shell">
      <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
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

        {!agentsLoading && !selectedAgentId ? <DashboardSelectAgentEmptyState /> : null}
        {error ? <p className="text-sm text-rose-600">{error}</p> : null}

        <UsagePlanBanner />

        <section
          className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4"
          aria-busy={showPanelSkeleton}
        >
          {primaryMetrics.map((metric) => (
            <article
              key={metric.label}
              className="border-ds-outline bg-ds-surface flex min-h-0 min-w-0 flex-col rounded-ds-xl border p-5 shadow-sm sm:p-6"
            >
              <h2 className="text-ds-on-surface-variant text-sm font-semibold leading-snug">{metric.label}</h2>
              {showPanelSkeleton ? (
                <DashboardMetricValueSkeleton />
              ) : (
                <p className="ds-app-metric-value mt-2 min-w-0 break-words">{metric.value}</p>
              )}
              <p className="ds-app-body-muted mt-auto pt-3 text-pretty break-words">
                {metric.hint}
              </p>
            </article>
          ))}
        </section>

        {!agentsLoading && selectedAgentId && data !== null && !hasConversationData ? (
          <section className="border-ds-outline bg-ds-surface rounded-ds-xl border p-6 shadow-sm md:p-10">
            <div className="mx-auto flex max-w-3xl flex-col items-center text-center">
              <div className="mb-5 flex size-16 items-center justify-center rounded-full bg-ds-sidebar ring-1 ring-ds-outline">
                <span className="text-ds-on-surface text-2xl font-semibold">0</span>
              </div>
              <h3 className="ds-app-section-title text-xl md:text-2xl">Your agent is live</h3>
              <p className="text-ds-on-surface-variant mt-2 max-w-2xl text-sm leading-relaxed md:text-base">
                Share your widget to start collecting chats. Metrics appear here as conversations come in.
              </p>
              <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                <a href="/deploy" className={appButtonClassName()}>
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

        {showAnalyticsPanels ? (
          <>
            <section className="grid grid-cols-1 gap-6 xl:grid-cols-[1.6fr_1fr]">
              <article className="border-ds-outline bg-ds-surface flex min-h-0 flex-col overflow-hidden rounded-ds-xl border shadow-sm">
                <div className="border-ds-outline flex flex-col gap-1 border-b px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <h3 className="ds-app-section-title">Conversations over time</h3>
                    <p className="ds-app-body-muted mt-1">
                      Daily volume for the selected period
                    </p>
                  </div>
                  {showAnalyticsNav ? (
                    <Link
                      href="/analytics"
                      className="text-ds-primary hover:text-ds-secondary shrink-0 text-sm font-semibold"
                    >
                      Analytics →
                    </Link>
                  ) : null}
                </div>

                <div className="from-ds-sidebar/20 relative min-h-0 flex-1 bg-gradient-to-b to-transparent px-3 pb-3 pt-2 sm:px-4">
                  <TimeSeriesTrendChart
                    series={data?.series}
                    rangeFrom={data?.range_from}
                    rangeTo={data?.range_to}
                    loading={showPanelSkeleton}
                    ariaLabel="Conversations over time: daily count by day"
                    gradientId="dashChartAreaFill"
                    showAxisTitles
                    plotHeight={280}
                  />
                </div>
              </article>
              <aside className="border-ds-outline bg-ds-surface flex min-h-0 flex-col overflow-hidden rounded-ds-xl border shadow-sm">
                <div className="border-ds-outline border-b px-5 py-4">
                  <h3 className="ds-app-section-title">Team queue snapshot</h3>
                  <p className="ds-app-body-muted mt-1">
                    Escalations and threads waiting on the customer.
                  </p>
                </div>
                <div className="flex min-h-0 flex-1 flex-col px-5 py-4">
                  {showPanelSkeleton ? (
                    <DashboardQueueAsideSkeleton />
                  ) : (
                    <ul className="divide-ds-outline divide-y">
                      <QueueItem
                        href={ticketsHref("open")}
                        label="Open human escalations"
                        value={String(data?.open_escalations ?? 0)}
                        tone="warning"
                      />
                      <QueueItem
                        href={ticketsHref("pending_customer")}
                        label="Awaiting customer reply"
                        value={String(data?.awaiting_customer_reply ?? 0)}
                        tone="neutral"
                      />
                    </ul>
                  )}
                  <Link
                    href={conversationsHref}
                    className={appButtonClassName("default", { className: "mt-4 block w-full text-center" })}
                  >
                    Open conversations
                  </Link>
                </div>
              </aside>
            </section>

            <section className="grid grid-cols-1 gap-6 xl:grid-cols-[1.6fr_1fr]">
              <article className="border-ds-outline bg-ds-surface rounded-ds-xl border p-6 shadow-sm">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <h3 className="ds-app-section-title">Recent conversations</h3>
                  <Link href={conversationsHref} className="text-ds-primary shrink-0 text-sm font-semibold hover:underline">
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
                      {showPanelSkeleton ? <DashboardRecentTableSkeleton /> : null}
                      {!showPanelSkeleton &&
                        (data?.recent ?? []).map((item) => {
                          const sp = statusPresentation(item.status);
                          const href = conversationDetailHref(item.conversation_id, selectedAgentId);
                          const label = visitorLabel(item.visitor_id);
                          return (
                            <tr
                              key={item.conversation_id}
                              role="link"
                              tabIndex={0}
                              aria-label={`Open conversation with ${label}`}
                              className="hover:bg-ds-sidebar/50 focus-visible:bg-ds-sidebar/50 cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ds-primary"
                              onClick={() => router.push(href)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" || e.key === " ") {
                                  e.preventDefault();
                                  router.push(href);
                                }
                              }}
                            >
                              <td className="text-ds-on-surface py-3 text-sm font-semibold">{label}</td>
                              <td className="text-ds-on-surface-variant max-w-[200px] truncate py-3 text-sm">
                                {item.topic_preview ?? "-"}
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
                              <td className="ds-app-body-muted py-3 text-right">
                                {formatRelative(item.last_activity_at)}
                              </td>
                            </tr>
                          );
                        })}
                      {!showPanelSkeleton && !data?.recent?.length ? (
                        <DashboardRecentConversationsEmptyState />
                      ) : null}
                    </tbody>
                  </table>
                </div>
              </article>

              <article className="border-ds-outline bg-ds-surface flex min-h-0 flex-col overflow-hidden rounded-ds-xl border shadow-sm">
                <div className="border-ds-outline flex items-start justify-between gap-3 border-b px-5 py-4">
                  <div className="min-w-0">
                    <h3 className="ds-app-section-title">Source suggestions</h3>
                    <p className="ds-app-body-muted mt-1">
                      Topics where extra knowledge would help. Open a conversation or add content in Knowledge.
                    </p>
                  </div>
                  {showSuggestionPagination ? (
                    <div className="flex shrink-0 items-center gap-1 pt-0.5">
                      <button
                        type="button"
                        className="border-ds-outline text-ds-on-surface hover:bg-ds-sidebar/60 focus-visible:ring-ds-primary flex size-8 items-center justify-center rounded-ds-md border transition-colors focus-visible:ring-2 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-40"
                        aria-label="Previous suggestions"
                        disabled={suggestionsPage <= 0}
                        onClick={() => setSuggestionsPage((page) => Math.max(0, page - 1))}
                      >
                        <ChevronLeft className="size-4" aria-hidden />
                      </button>
                      <span className="text-ds-on-surface-variant min-w-[2.75rem] text-center text-xs font-medium tabular-nums">
                        {suggestionsPage + 1}/{suggestionPageCount}
                      </span>
                      <button
                        type="button"
                        className="border-ds-outline text-ds-on-surface hover:bg-ds-sidebar/60 focus-visible:ring-ds-primary flex size-8 items-center justify-center rounded-ds-md border transition-colors focus-visible:ring-2 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-40"
                        aria-label="Next suggestions"
                        disabled={suggestionsPage >= suggestionPageCount - 1}
                        onClick={() =>
                          setSuggestionsPage((page) => Math.min(suggestionPageCount - 1, page + 1))
                        }
                      >
                        <ChevronRight className="size-4" aria-hidden />
                      </button>
                    </div>
                  ) : null}
                </div>
                <div className="flex min-h-0 flex-1 flex-col px-5 py-4">
                  <div className="min-h-[11.5rem]">
                    {showPanelSkeleton ? <DashboardTrainingTopicsSkeleton /> : null}
                    {!showPanelSkeleton && data?.sources_suggestions_enabled === false ? (
                      <DashboardSourceSuggestionsPlanGate />
                    ) : null}
                    {!showPanelSkeleton && data?.sources_suggestions_enabled !== false && visibleSuggestions.length ? (
                      <ul className="divide-ds-outline divide-y">
                        {visibleSuggestions.map((topic) => (
                          <li key={topic.slug}>
                            <Link
                              href={`/conversations?agent=${encodeURIComponent(selectedAgentId ?? "")}&training_topic=${encodeURIComponent(topic.slug)}`}
                              className="hover:bg-ds-sidebar/40 focus-visible:ring-ds-primary -mx-1 flex items-center justify-between gap-3 rounded-ds-md px-1 py-2.5 transition-colors focus-visible:ring-2 focus-visible:outline-none"
                            >
                              <span className="text-ds-on-surface min-w-0 truncate text-sm font-medium">
                                {topic.label}
                              </span>
                              <span className="text-ds-on-surface-variant shrink-0 text-xs tabular-nums">
                                {topic.count} in period
                              </span>
                            </Link>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                    {!showPanelSkeleton &&
                    data?.sources_suggestions_enabled !== false &&
                    !trainingTopics.length ? (
                      <DashboardTrainingTopicsEmptyState />
                    ) : null}
                  </div>
                  <Link
                    href="/knowledge/text-snippet"
                    className={appButtonClassName("default", { className: "mt-4 inline-flex w-fit" })}
                  >
                    Improve knowledge base
                  </Link>
                </div>
              </article>
            </section>
          </>
        ) : null}
      </div>
    </div>
  );
}

function QueueItem({
  href,
  label,
  value,
  tone,
}: {
  href: string;
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
    <li>
      <Link
        href={href}
        className="hover:bg-ds-sidebar/40 focus-visible:ring-ds-primary -mx-1 flex items-center justify-between gap-3 rounded-ds-md px-1 py-3 transition-colors focus-visible:ring-2 focus-visible:outline-none"
      >
        <span className="text-ds-on-surface text-sm font-medium">{label}</span>
        <span className={cn("rounded-ds-md px-2 py-0.5 text-xs font-semibold tabular-nums", toneClass)}>
          {value}
        </span>
      </Link>
    </li>
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
      <p className="ds-app-body-muted mt-1">{description}</p>
      <a href={href} className="text-ds-primary mt-3 inline-block text-sm font-semibold hover:underline">
        {cta}
      </a>
    </article>
  );
}
