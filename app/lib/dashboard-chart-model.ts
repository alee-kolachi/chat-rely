export const CHART_VB_W = 900;
export const CHART_VB_H = 340;

export type SeriesPoint = { bucket_date: string; count: number };

export type ChartPlotPoint = {
  x: number;
  y: number;
  count: number;
  bucket_date: string;
  label: string;
};

export type BuildTimeSeriesChartOptions = {
  /** Match SVG viewBox width to the rendered container to avoid side letterboxing. */
  viewWidth?: number;
  rangeFrom?: string;
  rangeTo?: string;
  /** Extra zero-count days before/after the selected range. */
  edgePadDays?: number;
};

const MAX_CHART_DAYS = 400;

export function formatBucketDateLabel(bucketDate: string): string {
  const iso = bucketDate.includes("T") ? bucketDate : `${bucketDate}T12:00:00.000Z`;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return bucketDate;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function bucketDateKey(bucketDate: string): string {
  const trimmed = bucketDate.trim();
  if (trimmed.includes("T")) return trimmed.slice(0, 10);
  return trimmed.slice(0, 10);
}

function parseUtcDay(isoOrDate: string): Date {
  return new Date(`${bucketDateKey(isoOrDate)}T12:00:00.000Z`);
}

function formatUtcDayKey(day: Date): string {
  return day.toISOString().slice(0, 10);
}

function addUtcDays(day: Date, days: number): Date {
  const next = new Date(day.getTime());
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

/** One point per UTC calendar day from range start through range end (inclusive), with zeros filled in. */
export function fillSeriesToDateRange(
  series: SeriesPoint[],
  rangeFrom: string,
  rangeTo: string,
  edgePadDays = 0,
): SeriesPoint[] {
  const counts = new Map<string, number>();
  for (const point of series) {
    counts.set(bucketDateKey(point.bucket_date), point.count);
  }

  let start = parseUtcDay(rangeFrom);
  let end = parseUtcDay(rangeTo);
  if (edgePadDays > 0) {
    start = addUtcDays(start, -edgePadDays);
    end = addUtcDays(end, edgePadDays);
  }

  const out: SeriesPoint[] = [];
  let cursor = start;
  let guard = 0;
  while (cursor.getTime() <= end.getTime() && guard < MAX_CHART_DAYS) {
    const key = formatUtcDayKey(cursor);
    out.push({ bucket_date: key, count: counts.get(key) ?? 0 });
    cursor = addUtcDays(cursor, 1);
    guard += 1;
  }
  return out;
}

export function computeYTicks(maxCount: number): number[] {
  const m = Math.max(0, maxCount);
  if (m === 0) return [0, 1];
  const raw = m / 4;
  const exp = Math.floor(Math.log10(raw));
  const pow10 = 10 ** exp;
  const f = raw / pow10;
  const nf = f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10;
  const step = nf * pow10;
  const top = Math.ceil(m / step) * step;
  const ticks: number[] = [];
  for (let v = 0; v <= top + 1e-9; v += step) {
    ticks.push(Math.round(v));
    if (ticks.length > 12) break;
  }
  return [...new Set(ticks)];
}

export function pickXLabelIndices(n: number): number[] {
  if (n <= 0) return [];
  if (n <= 12) return Array.from({ length: n }, (_, i) => i);
  const want = 9;
  const out = new Set<number>();
  for (let k = 0; k < want; k++) {
    out.add(Math.round((k / (want - 1)) * (n - 1)));
  }
  out.add(0);
  out.add(n - 1);
  return Array.from(out).sort((a, b) => a - b);
}

/** Vertical day dividers: every day for short ranges, sparser when crowded. */
export function pickXGridIndices(n: number): number[] {
  if (n <= 0) return [];
  if (n <= 31) return Array.from({ length: n }, (_, i) => i);
  if (n <= 62) return Array.from({ length: n }, (_, i) => i).filter((i) => i % 2 === 0);
  if (n <= 120) return Array.from({ length: n }, (_, i) => i).filter((i) => i % 4 === 0);
  const step = Math.max(1, Math.ceil(n / 24));
  const out: number[] = [];
  for (let i = 0; i < n; i += step) out.push(i);
  if (out[out.length - 1] !== n - 1) out.push(n - 1);
  return out;
}

export type ChartAxisTick = {
  x: number;
  major: boolean;
};

export type TimeSeriesChartModel = {
  path: string;
  areaPath: string;
  points: ChartPlotPoint[];
  xAxisTicks: ChartAxisTick[];
  yTicks: number[];
  xLabels: { x: number; label: string }[];
  padL: number;
  padR: number;
  padT: number;
  padB: number;
  innerW: number;
  innerH: number;
  viewW: number;
  plotLeft: number;
  plotRight: number;
  yAtTick: (tick: number) => number;
  xAxisY: number;
  xTickY: number;
  midY: number;
};

const padL = 36;
const padR = 4;
const padT = 10;
const padB = 52;

export function buildTimeSeriesChartModel(
  series: SeriesPoint[] | undefined,
  options?: BuildTimeSeriesChartOptions,
): TimeSeriesChartModel | null {
  let points = series ?? [];
  if (options?.rangeFrom && options?.rangeTo) {
    points = fillSeriesToDateRange(
      points,
      options.rangeFrom,
      options.rangeTo,
      options.edgePadDays ?? 0,
    );
  }
  if (!points.length) return null;

  const maxCount = Math.max(...points.map((s) => s.count));
  const paddedMax = maxCount <= 0 ? 1 : Math.max(maxCount * 1.2, maxCount + 1);
  const yTicks = computeYTicks(paddedMax);
  const yMax = Math.max(1, yTicks[yTicks.length - 1] ?? 1);
  const viewW = Math.max(480, options?.viewWidth ?? CHART_VB_W);
  const plotLeft = padL;
  const plotRight = viewW - padR;
  const innerW = plotRight - plotLeft;
  const innerH = CHART_VB_H - padT - padB;
  const n = points.length;
  const xAt = (i: number) =>
    n <= 1 ? plotLeft + innerW / 2 : plotLeft + (i / Math.max(1, n - 1)) * innerW;
  const yAt = (count: number) => padT + innerH - (count / yMax) * innerH;

  const plotPoints: ChartPlotPoint[] = points.map((s, i) => ({
    x: xAt(i),
    y: yAt(s.count),
    count: s.count,
    bucket_date: s.bucket_date,
    label: formatBucketDateLabel(s.bucket_date),
  }));

  const path = plotPoints
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x},${p.y}`)
    .join(" ");

  const xAxisY = padT + innerH;
  let areaPath = "";
  if (n === 1) {
    const p = plotPoints[0];
    const half = Math.min(48, innerW / 8);
    areaPath = `M ${p.x - half} ${xAxisY} L ${p.x - half} ${p.y} L ${p.x + half} ${p.y} L ${p.x + half} ${xAxisY} Z`;
  } else {
    const seg: string[] = [`M ${plotPoints[0].x} ${xAxisY} L ${plotPoints[0].x} ${plotPoints[0].y}`];
    for (let i = 1; i < n; i++) {
      seg.push(`L ${plotPoints[i].x} ${plotPoints[i].y}`);
    }
    seg.push(`L ${plotPoints[n - 1].x} ${xAxisY} Z`);
    areaPath = seg.join(" ");
  }

  const xIdx = pickXLabelIndices(n);
  const xLabels = xIdx.map((i) => ({
    x: plotPoints[i].x,
    label: plotPoints[i].label,
  }));
  const labelXs = new Set(xLabels.map((item) => item.x));
  const xAxisTicks: ChartAxisTick[] = pickXGridIndices(n).map((i) => ({
    x: plotPoints[i].x,
    major: labelXs.has(plotPoints[i].x),
  }));
  const yAtTick = (tick: number) => padT + innerH - (tick / yMax) * innerH;
  const midY = padT + innerH / 2;
  const xTickY = xAxisY + 22;

  return {
    path,
    areaPath,
    points: plotPoints,
    xAxisTicks,
    yTicks,
    xLabels,
    padL,
    padR,
    padT,
    padB,
    innerW,
    innerH,
    viewW,
    plotLeft,
    plotRight,
    yAtTick,
    xAxisY,
    xTickY,
    midY,
  };
}

export function nearestPlotPointIndex(chart: TimeSeriesChartModel, svgX: number): number {
  if (!chart.points.length) return 0;
  let best = 0;
  let bestDist = Math.abs(chart.points[0].x - svgX);
  for (let i = 1; i < chart.points.length; i++) {
    const dist = Math.abs(chart.points[i].x - svgX);
    if (dist < bestDist) {
      best = i;
      bestDist = dist;
    }
  }
  return best;
}
