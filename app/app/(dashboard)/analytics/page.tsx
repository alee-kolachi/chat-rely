"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Check } from "lucide-react";
import {
  AnalyticsLockedCountryPreview,
  AnalyticsLockedFeedbackPreview,
  AnalyticsLockedIntentPreview,
  AnalyticsLockedQualityPreview,
  AnalyticsLockedSentimentPreview,
} from "@/components/analytics/analytics-locked-preview";
import {
  AnalyticsCountryListSkeleton,
  AnalyticsIntentListSkeleton,
  AnalyticsKpiDeltaSkeleton,
  AnalyticsQualityListSkeleton,
  AnalyticsSentimentSkeleton,
} from "@/components/analytics/analytics-page-skeleton";
import { AnalyticsSectionCard } from "@/components/analytics/analytics-section-card";
import {
  DashboardMetricValueSkeleton,
  DashboardSelectAgentEmptyState,
} from "@/components/dashboard/dashboard-page-skeleton";
import { TimeSeriesTrendChart } from "@/components/dashboard/time-series-trend-chart";
import { DashboardRangePicker, type RangePreset } from "@/components/dashboard/dashboard-range-picker";
import { useDashboardAgent } from "@/components/layout/dashboard-agent-context";
import { useMeContext } from "@/components/layout/me-context-provider";
import { BackendApiError, backendFetch } from "@/lib/backend-api";
import { planAllowsAnalyticsPage, planHasFullAnalytics } from "@/lib/analytics-plan-access";
import { formatLocaleDateTime, formatLocaleNumber } from "@/lib/format-locale-datetime";
import { useClientMounted } from "@/lib/use-client-mounted";
import { messageFeedbackEnabledForPlanSlug } from "@/lib/widget-branding";
import { appButtonClassName } from "@/lib/button-styles";
import { cn } from "@/lib/utils";

type MessageFeedbackPayload = {
  thumbs_up_count: number;
  thumbs_down_unresolved_count: number;
  thumbs_down_resolved_count: number;
  unresolved_items: Array<{
    message_id: string;
    conversation_id: string;
    content_preview: string;
    visitor_id: string;
    feedback_at: string;
  }>;
  resolved_items: Array<{
    message_id: string;
    conversation_id: string;
    content_preview: string;
    visitor_id: string;
    feedback_at: string;
    resolved_at: string | null;
  }>;
  summary: string | null;
  topics: string[];
  latest_batch_index: number | null;
  playground_included: boolean;
};

type AnalyticsPayload = {
  analytics_tier: "basic" | "full";
  range_from: string;
  range_to: string;
  conversations_started: number;
  resolved_by_agent_pct: number | null;
  escalations_pct: number | null;
  avg_response_time_ms: number | null;
  series: { bucket_date: string; count: number }[];
  top_intents: { key: string; label: string; count: number }[];
  sentiment: { bucket: string; count: number; pct: number | null }[];
  countries: { key: string; label: string; count: number }[];
  quality: { key: string; label: string; value: string; hint: string }[];
  message_feedback?: MessageFeedbackPayload | null;
};

function formatAvgResponse(ms: number | null | undefined): string {
  if (ms == null || Number.isNaN(ms)) return "-";
  if (ms >= 1000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.round(ms)}ms`;
}

function formatKpiNumber(n: number, localeReady: boolean): string {
  return formatLocaleNumber(n, localeReady);
}

const DONUT_R = 40;
const DONUT_C = 2 * Math.PI * DONUT_R;

export default function AnalyticsPage() {
  const localeReady = useClientMounted();
  const router = useRouter();
  const { data: meData, loading: meContextLoading } = useMeContext();
  const { selectedAgentId, agentsLoading } = useDashboardAgent();
  const [preset, setPreset] = useState<RangePreset>("30d");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [data, setData] = useState<AnalyticsPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [includePlaygroundFeedback, setIncludePlaygroundFeedback] = useState(false);
  const [feedbackSectionBusy, setFeedbackSectionBusy] = useState(false);
  const [resolvingId, setResolvingId] = useState<string | null>(null);

  const accessDeniedByPlan =
    !meContextLoading && meData != null && !planAllowsAnalyticsPage(meData.plan.slug);

  useEffect(() => {
    if (accessDeniedByPlan) {
      router.replace("/dashboard");
    }
  }, [accessDeniedByPlan, router]);

  const analyticsUrl = useMemo(() => {
    if (!selectedAgentId) return null;
    const base = `/api/v1/agents/${selectedAgentId}/analytics`;
    const q = new URLSearchParams();
    if (preset === "custom") {
      if (!customFrom || !customTo) return null;
      const fromIso = new Date(`${customFrom}T00:00:00.000Z`).toISOString();
      const toIso = new Date(`${customTo}T23:59:59.999Z`).toISOString();
      q.set("from", fromIso);
      q.set("to", toIso);
    } else {
      q.set("range_key", preset);
    }
    return `${base}?${q.toString()}`;
  }, [selectedAgentId, preset, customFrom, customTo]);

  const messageFeedbackAnalyticsUrl = useMemo(() => {
    if (!selectedAgentId || !messageFeedbackEnabledForPlanSlug(meData?.plan.slug)) return null;
    const base = `/api/v1/agents/${selectedAgentId}/analytics/message-feedback`;
    const q = new URLSearchParams();
    if (preset === "custom") {
      if (!customFrom || !customTo) return null;
      const fromIso = new Date(`${customFrom}T00:00:00.000Z`).toISOString();
      const toIso = new Date(`${customTo}T23:59:59.999Z`).toISOString();
      q.set("from", fromIso);
      q.set("to", toIso);
    } else {
      q.set("range_key", preset);
    }
    if (includePlaygroundFeedback) {
      q.set("include_playground", "true");
    }
    return `${base}?${q.toString()}`;
  }, [selectedAgentId, preset, customFrom, customTo, includePlaygroundFeedback, meData?.plan.slug]);

  const load = useCallback(async () => {
    if (!analyticsUrl) {
      setData(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await backendFetch<AnalyticsPayload>(analyticsUrl);
      setData(res);
    } catch (e) {
      if (
        e instanceof BackendApiError &&
        e.status === 403 &&
        e.code === "plan.analytics_not_available"
      ) {
        router.replace("/dashboard");
        return;
      }
      setError(e instanceof Error ? e.message : "Failed to load analytics");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [analyticsUrl, router]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!messageFeedbackAnalyticsUrl || loading) return;
    let cancelled = false;
    setFeedbackSectionBusy(true);
    void (async () => {
      try {
        const mf = await backendFetch<MessageFeedbackPayload>(messageFeedbackAnalyticsUrl);
        if (cancelled) return;
        setData((prev) => (prev ? { ...prev, message_feedback: mf } : null));
      } catch {
        /* ignore */
      } finally {
        if (!cancelled) setFeedbackSectionBusy(false);
      }
    })();
    return () => {
      cancelled = true;
      setFeedbackSectionBusy(false);
    };
  }, [messageFeedbackAnalyticsUrl, loading]);

  const refreshMessageFeedback = useCallback(async () => {
    if (!messageFeedbackAnalyticsUrl) return;
    try {
      const mf = await backendFetch<MessageFeedbackPayload>(messageFeedbackAnalyticsUrl);
      setData((prev) => (prev ? { ...prev, message_feedback: mf } : null));
    } catch {
      /* ignore */
    }
  }, [messageFeedbackAnalyticsUrl]);

  const analyticsPayloadBusy = Boolean(
    selectedAgentId && analyticsUrl && error === null && (loading || data === null)
  );
  const awaitingInitialAgentSelection = agentsLoading && !selectedAgentId;
  const showPanelSkeleton = awaitingInitialAgentSelection || analyticsPayloadBusy;

  const countryMax = useMemo(() => {
    const rows = data?.countries ?? [];
    if (!rows.length) return 1;
    return Math.max(...rows.map((c) => c.count), 1);
  }, [data?.countries]);

  const sentimentDonut = useMemo(() => {
    const rows = data?.sentiment ?? [];
    const pos = rows.find((s) => s.bucket === "positive");
    const neu = rows.find((s) => s.bucket === "neutral");
    const neg = rows.find((s) => s.bucket === "negative");
    const pPos = pos?.pct ?? 0;
    const pNeu = neu?.pct ?? 0;
    const pNeg = neg?.pct ?? 0;
    const total = (pos?.count ?? 0) + (neu?.count ?? 0) + (neg?.count ?? 0);
    const arcPos = (pPos / 100) * DONUT_C;
    const arcNeu = (pNeu / 100) * DONUT_C;
    const arcNeg = (pNeg / 100) * DONUT_C;
    return {
      total,
      pPos,
      pNeu,
      pNeg,
      arcPos,
      arcNeu,
      arcNeg,
      dashPos: `${arcPos} ${DONUT_C - arcPos}`,
      dashNeu: `${arcNeu} ${DONUT_C - arcNeu}`,
      dashNeg: `${arcNeg} ${DONUT_C - arcNeg}`,
      offsetNeu: -arcPos,
      offsetNeg: -(arcPos + arcNeu),
    };
  }, [data?.sentiment]);

  const kpis = useMemo(() => {
    const started = data?.conversations_started ?? 0;
    const resolved = data?.resolved_by_agent_pct;
    const esc = data?.escalations_pct;
    const avgMs = data?.avg_response_time_ms;
    return [
      {
        label: "Total chats",
        value: data ? formatKpiNumber(started, localeReady) : "-",
        delta: "-",
        positive: true,
      },
      {
        label: "Resolved by AI",
        value: resolved != null ? `${resolved}%` : data ? "-" : "-",
        delta: "-",
        positive: true,
      },
      {
        label: "Escalations",
        value: esc != null ? `${esc}%` : data ? "-" : "-",
        delta: "-",
        positive: true,
      },
      {
        label: "Avg response time",
        value: formatAvgResponse(avgMs ?? null),
        delta: "-",
        positive: true,
      },
    ];
  }, [data, localeReady]);

  const planSlug = meData?.plan.slug;
  const hasFullAnalytics = planHasFullAnalytics(planSlug);
  const hasMessageFeedback = messageFeedbackEnabledForPlanSlug(planSlug);

  const resolveFeedback = useCallback(
    async (messageId: string) => {
      if (!selectedAgentId) return;
      setResolvingId(messageId);
      try {
        await backendFetch(
          `/api/v1/agents/${encodeURIComponent(selectedAgentId)}/message-feedback/resolve`,
          {
            method: "POST",
            body: JSON.stringify({ message_id: messageId, resolved: true }),
          }
        );
        await refreshMessageFeedback();
      } catch {
        /* ignore */
      } finally {
        setResolvingId(null);
      }
    },
    [selectedAgentId, refreshMessageFeedback]
  );

  if (accessDeniedByPlan) {
    return null;
  }

  return (
    <div className="ds-app-shell">
      <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="ds-app-page-title">Analytics</h1>
            <p className="ds-app-page-description ds-app-page-description--wide">
              Performance, volume, and quality across all channels.
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

        <section
          className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4"
          aria-busy={showPanelSkeleton}
        >
          {kpis.map((kpi) => (
            <article key={kpi.label} className="border-ds-outline bg-ds-surface flex min-h-0 flex-col rounded-ds-xl border p-5 shadow-sm sm:p-6">
              <p className="text-ds-on-surface-variant text-sm font-semibold leading-snug">{kpi.label}</p>
              <div className="mt-2 flex items-end justify-between gap-2">
                {showPanelSkeleton ? (
                  <DashboardMetricValueSkeleton className="mt-0" />
                ) : (
                  <p className="ds-app-metric-value">{kpi.value}</p>
                )}
                {showPanelSkeleton ? (
                  <AnalyticsKpiDeltaSkeleton />
                ) : (
                  <span
                    className={cn(
                      "shrink-0 rounded-ds-md px-2 py-1 text-xs font-semibold",
                      kpi.delta === "-"
                        ? "bg-ds-sidebar text-ds-on-surface-variant"
                        : kpi.positive
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-rose-100 text-rose-800"
                    )}
                  >
                    {kpi.delta}
                  </span>
                )}
              </div>
            </article>
          ))}
        </section>

        <section className="grid grid-cols-1 gap-6">
          <article className="border-ds-outline bg-ds-surface rounded-ds-xl border p-6 shadow-sm">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
              <h2 className="ds-app-section-title">Conversation trend</h2>
              <span className="ds-app-body-muted">Daily volume (conversations started)</span>
            </div>
            <div className="-mx-6">
              <TimeSeriesTrendChart
                series={data?.series}
                rangeFrom={data?.range_from}
                rangeTo={data?.range_to}
                loading={showPanelSkeleton}
                ariaLabel="Conversation trend by day"
                gradientId="analyticsTrendAreaFill"
                areaGradientFrom="var(--ds-primary)"
                plotHeight={280}
              />
            </div>
          </article>
        </section>

        <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <AnalyticsSectionCard title="Top intents" locked={!hasFullAnalytics} requiredTier="standard">
            {!hasFullAnalytics ? (
              <AnalyticsLockedIntentPreview />
            ) : showPanelSkeleton ? (
              <AnalyticsIntentListSkeleton />
            ) : (data?.top_intents ?? []).length === 0 ? (
              <div className="bg-ds-sidebar px-4 py-6 text-center">
                <p className="text-ds-on-surface text-sm font-medium">No intents for this range</p>
                <p className="ds-app-body-muted mt-1">
                  Intent labels appear after conversations close and outcomes are analyzed.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {(data?.top_intents ?? []).map((intent) => (
                  <div
                    key={intent.key}
                    className="border-ds-outline flex items-center justify-between rounded-ds-lg border bg-ds-sidebar/60 px-4 py-3"
                  >
                    <div>
                      <p className="ds-app-card-title">{intent.label}</p>
                      <p className="ds-app-body-muted">
                        {formatKpiNumber(intent.count, localeReady)} conversations
                      </p>
                    </div>
                    <span className="ds-app-body-muted font-semibold">-</span>
                  </div>
                ))}
              </div>
            )}
          </AnalyticsSectionCard>

          <AnalyticsSectionCard
            title="Country usage"
            locked={!hasFullAnalytics}
            requiredTier="standard"
            footnote={
              hasFullAnalytics
                ? "Country reported by the chat widget when available. Unknown means it was not sent."
                : undefined
            }
          >
            {!hasFullAnalytics ? (
              <AnalyticsLockedCountryPreview />
            ) : showPanelSkeleton ? (
              <AnalyticsCountryListSkeleton />
            ) : (data?.countries ?? []).length === 0 ? (
              <div className="bg-ds-sidebar px-4 py-6 text-center">
                <p className="text-ds-on-surface text-sm font-medium">No country data for this range</p>
                <p className="ds-app-body-muted mt-1">
                  Volume by country appears when chats include a reported country code.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {(data?.countries ?? []).map((country) => {
                  const pct = Math.round((100 * country.count) / countryMax);
                  return (
                    <div key={country.key} className="flex items-center gap-4">
                      <span className="ds-app-body-muted w-12 shrink-0 font-semibold">
                        {country.label}
                      </span>
                      <div className="bg-ds-outline/60 h-2.5 min-w-0 flex-1 overflow-hidden rounded-full">
                        <div
                          className="bg-ds-secondary h-full rounded-full"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-ds-on-surface w-10 shrink-0 text-right text-xs font-semibold">
                        {country.count}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </AnalyticsSectionCard>
        </section>

        <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <AnalyticsSectionCard
            title="Customer sentiment"
            locked={!hasFullAnalytics}
            requiredTier="standard"
            footnote={
              hasFullAnalytics && !showPanelSkeleton && sentimentDonut.total > 0
                ? "Based on the last assistant-classified tone per conversation (frustrated counts as negative)."
                : undefined
            }
          >
            {!hasFullAnalytics ? (
              <AnalyticsLockedSentimentPreview />
            ) : showPanelSkeleton ? (
              <AnalyticsSentimentSkeleton />
            ) : sentimentDonut.total === 0 ? (
              <div className="bg-ds-sidebar px-4 py-6 text-center">
                <p className="text-ds-on-surface text-sm font-medium">No sentiment data for this range</p>
                <p className="ds-app-body-muted mt-1">
                  Sentiment is inferred from assistant replies after each turn.
                </p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start sm:justify-center xl:justify-start">
                <div className="relative h-44 w-44 shrink-0">
                  <svg className="h-full w-full" viewBox="0 0 100 100" aria-hidden>
                    <circle cx="50" cy="50" r={DONUT_R} fill="transparent" stroke="var(--ds-outline)" strokeWidth="10" />
                    <circle
                      cx="50"
                      cy="50"
                      r={DONUT_R}
                      fill="transparent"
                      stroke="var(--ds-secondary)"
                      strokeWidth="10"
                      strokeDasharray={sentimentDonut.dashPos}
                    />
                    <circle
                      cx="50"
                      cy="50"
                      r={DONUT_R}
                      fill="transparent"
                      stroke="#f59e0b"
                      strokeWidth="10"
                      strokeDasharray={sentimentDonut.dashNeu}
                      strokeDashoffset={sentimentDonut.offsetNeu}
                    />
                    <circle
                      cx="50"
                      cy="50"
                      r={DONUT_R}
                      fill="transparent"
                      stroke="var(--ds-accent-pink)"
                      strokeWidth="10"
                      strokeDasharray={sentimentDonut.dashNeg}
                      strokeDashoffset={sentimentDonut.offsetNeg}
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="ds-app-metric-value text-2xl">{Math.round(sentimentDonut.pPos)}%</span>
                    <span className="ds-app-kicker">Positive</span>
                  </div>
                </div>
                <div className="w-full min-w-0 flex-1 space-y-3 sm:max-w-md">
                  <LegendItem color="bg-ds-secondary" label="Positive" value={`${Math.round(sentimentDonut.pPos)}%`} />
                  <LegendItem color="bg-amber-500" label="Neutral" value={`${Math.round(sentimentDonut.pNeu)}%`} />
                  <LegendItem color="bg-ds-accent-pink" label="Negative" value={`${Math.round(sentimentDonut.pNeg)}%`} />
                </div>
              </div>
            )}
          </AnalyticsSectionCard>

          <AnalyticsSectionCard
            title="Conversation quality"
            locked={!hasFullAnalytics}
            requiredTier="standard"
            footnote={
              hasFullAnalytics ? "From stored outcomes and per-turn signals. No separate survey." : undefined
            }
          >
            {!hasFullAnalytics ? (
              <AnalyticsLockedQualityPreview />
            ) : showPanelSkeleton ? (
              <AnalyticsQualityListSkeleton />
            ) : (data?.quality ?? []).length === 0 ? (
              <div className="bg-ds-sidebar px-4 py-6 text-center">
                <p className="text-ds-on-surface text-sm font-medium">No quality metrics for this range</p>
                <p className="ds-app-body-muted mt-1">
                  Quality signals appear when outcomes and per-turn data are available.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {(data?.quality ?? []).map((row) => (
                  <div
                    key={row.key}
                    className="border-ds-outline flex flex-col gap-1 rounded-ds-lg border bg-ds-sidebar/60 px-4 py-3"
                  >
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="ds-app-card-title">{row.label}</p>
                      <p className="text-ds-on-surface shrink-0 text-sm font-semibold tabular-nums">{row.value}</p>
                    </div>
                    <p className="ds-app-body-muted">{row.hint}</p>
                  </div>
                ))}
              </div>
            )}
          </AnalyticsSectionCard>
        </section>

        <AnalyticsSectionCard title="Visitor message feedback" locked={!hasMessageFeedback} requiredTier="pro">
          {!hasMessageFeedback ? (
            <AnalyticsLockedFeedbackPreview />
          ) : (
            <div
              className={cn(feedbackSectionBusy && "pointer-events-none opacity-60")}
              aria-busy={feedbackSectionBusy}
            >
              <p className="ds-app-body-muted mb-4 max-w-3xl">
                Thumbs appear on assistant replies in the widget (Pro). Use{" "}
                <span className="text-ds-on-surface font-semibold">Mark resolved</span> after you fix the issue.
                Resolved threads leave the active list and stop affecting the summary.
              </p>
              <label className="ds-app-body-muted mb-4 flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  className="accent-ds-primary"
                  checked={includePlaygroundFeedback}
                  onChange={(e) => setIncludePlaygroundFeedback(e.target.checked)}
                />
                Include playground test chats (off by default).
              </label>
              {showPanelSkeleton || !data?.message_feedback ? (
                <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="border-ds-outline rounded-ds-lg border bg-ds-sidebar/50 px-4 py-3">
                      <div className="ds-skeleton h-4 w-24" />
                      <div className="ds-skeleton mt-2 h-7 w-12" />
                    </div>
                  ))}
                </div>
              ) : (
                <>
                  <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <div className="border-ds-outline rounded-ds-lg border bg-ds-sidebar/50 px-4 py-3">
                      <p className="ds-app-body-muted font-medium">Thumbs up</p>
                      <p className="ds-app-metric-value mt-1 text-xl">
                        {formatKpiNumber(data.message_feedback.thumbs_up_count, localeReady)}
                      </p>
                    </div>
                    <div className="border-ds-outline rounded-ds-lg border bg-ds-sidebar/50 px-4 py-3">
                      <p className="ds-app-body-muted font-medium">Open thumbs down</p>
                      <p className="ds-app-metric-value mt-1 text-xl">
                        {formatKpiNumber(data.message_feedback.thumbs_down_unresolved_count, localeReady)}
                      </p>
                    </div>
                    <div className="border-ds-outline rounded-ds-lg border bg-ds-sidebar/50 px-4 py-3">
                      <p className="ds-app-body-muted font-medium">Resolved thumbs down</p>
                      <p className="ds-app-metric-value mt-1 text-xl">
                        {formatKpiNumber(data.message_feedback.thumbs_down_resolved_count, localeReady)}
                      </p>
                    </div>
                  </div>
                  {data.message_feedback.summary ? (
                    <div className="border-ds-outline mb-6 rounded-ds-lg border bg-ds-sidebar/40 px-4 py-3">
                      <p className="ds-app-body-muted font-semibold uppercase tracking-wide">
                        Summary of open issues
                      </p>
                      <p className="text-ds-on-surface mt-2 text-sm leading-relaxed">{data.message_feedback.summary}</p>
                      {(data.message_feedback.topics ?? []).length > 0 ? (
                        <ul className="ds-app-body-muted mt-3 flex flex-wrap gap-2">
                          {data.message_feedback.topics.map((t) => (
                            <li
                              key={t}
                              className="border-ds-outline rounded-full border bg-white px-2.5 py-1 font-medium text-ds-on-surface"
                            >
                              {t}
                            </li>
                          ))}
                        </ul>
                      ) : null}
                    </div>
                  ) : null}
                  <h3 className="text-ds-on-surface mb-2 text-sm font-semibold">Open thumbs-down replies</h3>
                  {(data.message_feedback.unresolved_items ?? []).length === 0 ? (
                    <p className="text-ds-on-surface-variant text-sm">No open thumbs-down in this range.</p>
                  ) : (
                    <ul className="space-y-3">
                      {data.message_feedback.unresolved_items.map((row) => (
                        <li
                          key={`${row.message_id}-${row.visitor_id}`}
                          className="border-ds-outline flex flex-col gap-2 rounded-ds-lg border bg-ds-sidebar/40 px-4 py-3 sm:flex-row sm:items-start sm:justify-between"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="text-ds-on-surface text-sm leading-snug">{row.content_preview}</p>
                            <p className="text-ds-on-surface-variant mt-1 text-[11px]">
                              {formatLocaleDateTime(row.feedback_at, localeReady)}
                            </p>
                            <Link
                              href={`/conversations?conversation=${encodeURIComponent(row.conversation_id)}`}
                              className="text-ds-primary mt-2 inline-block text-xs font-semibold hover:underline"
                            >
                              Open conversation
                            </Link>
                          </div>
                          <button
                            type="button"
                            disabled={resolvingId === row.message_id}
                            onClick={() => void resolveFeedback(row.message_id)}
                            className={appButtonClassName("default", {
                              size: "sm",
                              className: "inline-flex shrink-0 items-center gap-1.5 text-xs",
                            })}
                          >
                            <Check className="size-3.5" strokeWidth={2.5} aria-hidden />
                            Mark resolved
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                  {(data.message_feedback.resolved_items ?? []).length > 0 ? (
                    <details className="mt-6">
                      <summary className="text-ds-on-surface-variant cursor-pointer text-sm font-semibold">
                        Recently resolved ({data.message_feedback.resolved_items.length})
                      </summary>
                      <ul className="mt-3 space-y-2">
                        {data.message_feedback.resolved_items.map((row) => (
                          <li
                            key={row.message_id}
                            className="border-ds-outline rounded-ds-lg border bg-ds-sidebar/30 px-3 py-2 text-xs text-ds-on-surface-variant"
                          >
                            <span className="text-ds-on-surface line-clamp-2 text-sm">{row.content_preview}</span>
                            {row.resolved_at ? (
                              <span className="mt-1 block">
                                Resolved {formatLocaleDateTime(row.resolved_at, localeReady)}
                              </span>
                            ) : null}
                          </li>
                        ))}
                      </ul>
                    </details>
                  ) : null}
                </>
              )}
            </div>
          )}
        </AnalyticsSectionCard>
      </div>
    </div>
  );
}

function LegendItem({ color, label, value }: { color: string; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className={cn("size-3 shrink-0 rounded-full", color)} />
      <span className="text-ds-on-surface flex-1 text-sm font-medium">{label}</span>
      <span className="ds-app-card-title">{value}</span>
    </div>
  );
}
