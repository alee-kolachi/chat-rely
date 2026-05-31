"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  DashboardChartEmptyState,
  DashboardChartSkeleton,
} from "@/components/dashboard/dashboard-page-skeleton";
import {
  buildTimeSeriesChartModel,
  CHART_VB_H,
  nearestPlotPointIndex,
  type SeriesPoint,
} from "@/lib/dashboard-chart-model";

type TimeSeriesTrendChartProps = {
  series: SeriesPoint[] | undefined;
  rangeFrom?: string;
  rangeTo?: string;
  edgePadDays?: number;
  loading?: boolean;
  emptyMessage?: string;
  ariaLabel: string;
  gradientId: string;
  lineColor?: string;
  areaGradientFrom?: string;
  showAxisTitles?: boolean;
  plotHeight?: number;
};

export function TimeSeriesTrendChart({
  series,
  rangeFrom,
  rangeTo,
  edgePadDays = 0,
  loading = false,
  emptyMessage = "No chart data for this range",
  ariaLabel,
  gradientId,
  lineColor = "var(--ds-chart-line)",
  areaGradientFrom = "var(--ds-chart-line)",
  showAxisTitles = false,
  plotHeight = 280,
}: TimeSeriesTrendChartProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [viewWidth, setViewWidth] = useState(900);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const update = () => {
      setViewWidth(Math.max(480, Math.round(el.clientWidth)));
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const chart = useMemo(
    () =>
      buildTimeSeriesChartModel(series, {
        viewWidth,
        rangeFrom,
        rangeTo,
        edgePadDays,
      }),
    [series, viewWidth, rangeFrom, rangeTo, edgePadDays],
  );

  const activePoint = hoverIndex != null && chart ? chart.points[hoverIndex] : null;

  const updateHoverFromClientX = useCallback(
    (clientX: number) => {
      const svg = svgRef.current;
      if (!svg || !chart) return;
      const rect = svg.getBoundingClientRect();
      if (rect.width <= 0) return;
      const svgX = ((clientX - rect.left) / rect.width) * chart.viewW;
      setHoverIndex(nearestPlotPointIndex(chart, svgX));
    },
    [chart],
  );

  const clearHover = useCallback(() => {
    setHoverIndex(null);
  }, []);

  return (
    <div
      ref={wrapRef}
      className="text-ds-on-surface-variant relative w-full text-[var(--ds-chart-grid)]"
      style={{ height: plotHeight }}
    >
      {loading ? (
        <DashboardChartSkeleton maxPlotHeight={plotHeight} minPlotHeight={Math.min(plotHeight, 200)} />
      ) : chart ? (
        <svg
          ref={svgRef}
          className="block h-full w-full cursor-crosshair font-sans"
          viewBox={`0 0 ${chart.viewW} ${CHART_VB_H}`}
          preserveAspectRatio="none"
          role="img"
          aria-label={ariaLabel}
          onMouseMove={(e) => updateHoverFromClientX(e.clientX)}
          onMouseLeave={clearHover}
        >
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={areaGradientFrom} stopOpacity={0.22} />
              <stop offset="100%" stopColor={areaGradientFrom} stopOpacity={0} />
            </linearGradient>
          </defs>

          <rect
            x={chart.plotLeft}
            y={chart.padT}
            width={chart.innerW}
            height={chart.innerH}
            fill="transparent"
            pointerEvents="all"
          />

          <path d={chart.areaPath} fill={`url(#${gradientId})`} stroke="none" pointerEvents="none" />

          <g opacity={0.9} pointerEvents="none">
            {chart.yTicks.map((tick) => {
              const gy = chart.yAtTick(tick);
              return (
                <line
                  key={`gy-${tick}`}
                  x1={chart.plotLeft}
                  y1={gy}
                  x2={chart.plotRight}
                  y2={gy}
                  stroke="currentColor"
                  strokeWidth={1}
                  opacity={0.22}
                />
              );
            })}
            <line
              x1={chart.plotLeft}
              y1={chart.padT}
              x2={chart.plotLeft}
              y2={chart.xAxisY}
              stroke="currentColor"
              strokeWidth={1}
              opacity={0.35}
            />
            <line
              x1={chart.plotLeft}
              y1={chart.xAxisY}
              x2={chart.plotRight}
              y2={chart.xAxisY}
              stroke="currentColor"
              strokeWidth={1}
              opacity={0.4}
            />
          </g>

          {chart.xAxisTicks.map(({ x, major }) => (
            <line
              key={`xt-${x}`}
              x1={x}
              y1={chart.xAxisY}
              x2={x}
              y2={chart.xAxisY + (major ? 7 : 4)}
              stroke="currentColor"
              strokeWidth={1}
              opacity={major ? 0.55 : 0.38}
              pointerEvents="none"
            />
          ))}

          {chart.yTicks.map((tick) => {
            const gy = chart.yAtTick(tick);
            return (
              <text
                key={`yl-${tick}`}
                x={chart.plotLeft - 8}
                y={gy}
                textAnchor="end"
                dominantBaseline="middle"
                fill="currentColor"
                fontSize={11}
                opacity={0.88}
                style={{ fontVariantNumeric: "tabular-nums" }}
                pointerEvents="none"
              >
                {tick}
              </text>
            );
          })}

          {chart.xLabels.map((item, j) => (
            <text
              key={`xl-${item.label}-${j}`}
              x={item.x}
              y={chart.xTickY}
              textAnchor="middle"
              dominantBaseline="hanging"
              fill="currentColor"
              fontSize={11}
              opacity={0.88}
              pointerEvents="none"
            >
              {item.label}
            </text>
          ))}

          {showAxisTitles ? (
            <>
              <text
                x={18}
                y={chart.midY}
                textAnchor="middle"
                dominantBaseline="middle"
                fill="currentColor"
                fontSize={12}
                fontWeight={600}
                opacity={0.58}
                letterSpacing="0.02em"
                transform={`rotate(-90 18 ${chart.midY})`}
                pointerEvents="none"
              >
                Conversations
              </text>
              <text
                x={chart.plotLeft + chart.innerW / 2}
                y={CHART_VB_H - 10}
                textAnchor="middle"
                dominantBaseline="auto"
                fill="currentColor"
                fontSize={12}
                fontWeight={600}
                opacity={0.58}
                letterSpacing="0.05em"
                pointerEvents="none"
              >
                Day
              </text>
            </>
          ) : null}

          <path
            d={chart.path}
            fill="none"
            stroke={lineColor}
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            pointerEvents="none"
          />

          {activePoint ? (
            <g pointerEvents="none">
              <line
                x1={activePoint.x}
                y1={chart.padT}
                x2={activePoint.x}
                y2={chart.xAxisY}
                stroke={lineColor}
                strokeWidth={1.5}
                opacity={0.55}
              />
              <circle
                cx={activePoint.x}
                cy={activePoint.y}
                r={5}
                fill="var(--ds-surface, #fff)"
                stroke={lineColor}
                strokeWidth={2.5}
              />
              <rect
                x={Math.min(Math.max(activePoint.x - 72, chart.plotLeft), chart.plotRight - 144)}
                y={Math.max(chart.padT, activePoint.y - 44)}
                width={144}
                height={28}
                rx={6}
                fill="var(--ds-on-surface, #0f172a)"
                opacity={0.92}
              />
              <text
                x={Math.min(Math.max(activePoint.x, chart.plotLeft + 72), chart.plotRight - 72)}
                y={Math.max(chart.padT + 18, activePoint.y - 26)}
                textAnchor="middle"
                fill="var(--ds-surface, #fff)"
                fontSize={11}
                fontWeight={600}
              >
                {activePoint.label} · {activePoint.count}
              </text>
            </g>
          ) : null}
        </svg>
      ) : (
        <DashboardChartEmptyState message={emptyMessage} />
      )}
    </div>
  );
}
