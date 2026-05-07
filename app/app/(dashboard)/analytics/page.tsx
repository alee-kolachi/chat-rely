"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AnalyticsCountryListSkeleton,
  AnalyticsIntentListSkeleton,
  AnalyticsKpiDeltaSkeleton,
  AnalyticsQualityListSkeleton,
  AnalyticsSentimentSkeleton,
} from "@/components/analytics/analytics-page-skeleton";
import {
  DashboardChartEmptyState,
  DashboardChartSkeleton,
  DashboardMetricValueSkeleton,
  DashboardSelectAgentEmptyState,
} from "@/components/dashboard/dashboard-page-skeleton";
import { DashboardRangePicker, type RangePreset } from "@/components/dashboard/dashboard-range-picker";
import { useDashboardAgent } from "@/components/layout/dashboard-agent-context";
import { backendFetch } from "@/lib/backend-api";
import {
  buildTimeSeriesChartModel,
  CHART_VB_H,
  CHART_VB_W,
} from "@/lib/dashboard-chart-model";
import { cn } from "@/lib/utils";

type AnalyticsPayload = {
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
};

function formatAvgResponse(ms: number | null | undefined): string {
  if (ms == null || Number.isNaN(ms)) return "—";
  if (ms >= 1000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.round(ms)}ms`;
}

function formatKpiNumber(n: number): string {
  return n.toLocaleString();
}

const DONUT_R = 40;
const DONUT_C = 2 * Math.PI * DONUT_R;

export default function AnalyticsPage() {
  const { selectedAgentId, agentsLoading } = useDashboardAgent();
  const [preset, setPreset] = useState<RangePreset>("30d");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [data, setData] = useState<AnalyticsPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const analyticsUrl = useMemo(() => {
    if (!selectedAgentId) return null;
    const base = `/api/v1/agents/${selectedAgentId}/analytics`;
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
      setError(e instanceof Error ? e.message : "Failed to load analytics");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [analyticsUrl]);

  useEffect(() => {
    void load();
  }, [load]);

  const analyticsPayloadBusy = Boolean(
    selectedAgentId && analyticsUrl && error === null && (loading || data === null)
  );
  const awaitingInitialAgentSelection = agentsLoading && !selectedAgentId;
  const showPanelSkeleton = awaitingInitialAgentSelection || analyticsPayloadBusy;

  const timeSeriesChart = useMemo(
    () => buildTimeSeriesChartModel(data?.series),
    [data?.series]
  );

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
        value: data ? formatKpiNumber(started) : "—",
        delta: "—",
        positive: true,
      },
      {
        label: "Resolved by AI",
        value: resolved != null ? `${resolved}%` : data ? "—" : "—",
        delta: "—",
        positive: true,
      },
      {
        label: "Escalations",
        value: esc != null ? `${esc}%` : data ? "—" : "—",
        delta: "—",
        positive: true,
      },
      {
        label: "Avg response time",
        value: formatAvgResponse(avgMs ?? null),
        delta: "—",
        positive: true,
      },
    ];
  }, [data]);

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
            <article key={kpi.label} className="border-ds-outline bg-ds-surface rounded-ds-xl border p-5 shadow-sm">
              <p className="text-ds-on-surface-variant text-sm font-medium">{kpi.label}</p>
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
                      kpi.delta === "—"
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
              <span className="text-ds-on-surface-variant text-xs">Daily volume (conversations started)</span>
            </div>
            <div className="text-ds-on-surface-variant relative mx-auto aspect-[5/2] w-full min-h-[200px] max-h-[280px] text-[var(--ds-chart-grid)]">
              {showPanelSkeleton ? (
                <DashboardChartSkeleton maxPlotHeight={280} minPlotHeight={180} />
              ) : timeSeriesChart ? (
                <svg
                  className="block h-full w-full font-sans"
                  viewBox={`0 0 ${CHART_VB_W} ${CHART_VB_H}`}
                  preserveAspectRatio="xMidYMid meet"
                  role="img"
                  aria-label="Conversation trend by day"
                >
                  <defs>
                    <linearGradient id="analyticsTrendAreaFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--ds-primary)" stopOpacity={0.22} />
                      <stop offset="100%" stopColor="var(--ds-primary)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <path d={timeSeriesChart.areaPath} fill="url(#analyticsTrendAreaFill)" stroke="none" />
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
                <DashboardChartEmptyState message="No chart data for this range" />
              )}
            </div>
          </article>
        </section>

        <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <article className="border-ds-outline bg-ds-surface rounded-ds-xl border p-6 shadow-sm">
            <h2 className="ds-app-section-title mb-5">Top intents</h2>
            {showPanelSkeleton ? (
              <AnalyticsIntentListSkeleton />
            ) : (data?.top_intents ?? []).length === 0 ? (
              <div className="bg-ds-sidebar px-4 py-6 text-center">
                <p className="text-ds-on-surface text-sm font-medium">No intents for this range</p>
                <p className="text-ds-on-surface-variant mt-1 text-xs leading-relaxed">
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
                      <p className="text-ds-on-surface text-sm font-semibold">{intent.label}</p>
                      <p className="text-ds-on-surface-variant text-xs">
                        {formatKpiNumber(intent.count)} conversations
                      </p>
                    </div>
                    <span className="text-ds-on-surface-variant text-xs font-semibold">—</span>
                  </div>
                ))}
              </div>
            )}
          </article>

          <article className="border-ds-outline bg-ds-surface rounded-ds-xl border p-6 shadow-sm">
            <h2 className="ds-app-section-title mb-5">Country usage</h2>
            {showPanelSkeleton ? (
              <AnalyticsCountryListSkeleton />
            ) : (data?.countries ?? []).length === 0 ? (
              <div className="bg-ds-sidebar px-4 py-6 text-center">
                <p className="text-ds-on-surface text-sm font-medium">No country data for this range</p>
                <p className="text-ds-on-surface-variant mt-1 text-xs leading-relaxed">
                  Volume by country appears when chats include a reported country code.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {(data?.countries ?? []).map((country) => {
                  const pct = Math.round((100 * country.count) / countryMax);
                  return (
                    <div key={country.key} className="flex items-center gap-4">
                      <span className="text-ds-on-surface-variant w-12 shrink-0 text-xs font-semibold">
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
            <p className="text-ds-on-surface-variant mt-4 text-xs leading-relaxed">
              From <code className="text-ds-on-surface">country_code</code> sent with the chat widget or API. Unknown
              means the client did not report a country.
            </p>
          </article>
        </section>

        <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <article className="border-ds-outline bg-ds-surface rounded-ds-xl border p-6 shadow-sm">
            <h2 className="ds-app-section-title mb-5">Customer sentiment</h2>
            {showPanelSkeleton ? (
              <AnalyticsSentimentSkeleton />
            ) : sentimentDonut.total === 0 ? (
              <div className="bg-ds-sidebar px-4 py-6 text-center">
                <p className="text-ds-on-surface text-sm font-medium">No sentiment data for this range</p>
                <p className="text-ds-on-surface-variant mt-1 text-xs leading-relaxed">
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
            <p className="text-ds-on-surface-variant mt-4 text-xs leading-relaxed">
              Based on the last assistant-classified tone per conversation (frustrated counts as negative).
            </p>
          </article>

          <article className="border-ds-outline bg-ds-surface rounded-ds-xl border p-6 shadow-sm">
            <h2 className="ds-app-section-title mb-5">Conversation quality</h2>
            {showPanelSkeleton ? (
              <AnalyticsQualityListSkeleton />
            ) : (data?.quality ?? []).length === 0 ? (
              <div className="bg-ds-sidebar px-4 py-6 text-center">
                <p className="text-ds-on-surface text-sm font-medium">No quality metrics for this range</p>
                <p className="text-ds-on-surface-variant mt-1 text-xs leading-relaxed">
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
                      <p className="text-ds-on-surface text-sm font-semibold">{row.label}</p>
                      <p className="text-ds-on-surface shrink-0 text-sm font-semibold tabular-nums">{row.value}</p>
                    </div>
                    <p className="text-ds-on-surface-variant text-xs">{row.hint}</p>
                  </div>
                ))}
              </div>
            )}
            <p className="text-ds-on-surface-variant mt-4 text-xs leading-relaxed">
              Derived from stored outcomes and per-turn signals—no separate post-chat survey.
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
