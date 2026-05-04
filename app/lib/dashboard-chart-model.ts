export const CHART_VB_W = 900;
export const CHART_VB_H = 340;

export type SeriesPoint = { bucket_date: string; count: number };

export function formatBucketDateLabel(bucketDate: string): string {
  const iso = bucketDate.includes("T") ? bucketDate : `${bucketDate}T12:00:00.000Z`;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return bucketDate;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
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

export type TimeSeriesChartModel = {
  path: string;
  areaPath: string;
  yTicks: number[];
  xLabels: { x: number; label: string }[];
  padL: number;
  padR: number;
  padT: number;
  padB: number;
  innerW: number;
  innerH: number;
  yAtTick: (tick: number) => number;
  xAxisY: number;
  xTickY: number;
  midY: number;
};

const padL = 54;
const padR = 16;
const padT = 10;
const padB = 52;

export function buildTimeSeriesChartModel(series: SeriesPoint[] | undefined): TimeSeriesChartModel | null {
  if (!series?.length) return null;
  const maxCount = Math.max(...series.map((s) => s.count));
  const yTicks = computeYTicks(maxCount);
  const yMax = Math.max(1, yTicks[yTicks.length - 1] ?? 1);
  const innerW = CHART_VB_W - padL - padR;
  const innerH = CHART_VB_H - padT - padB;
  const n = series.length;
  const xAt = (i: number) =>
    n <= 1 ? padL + innerW / 2 : padL + (i / Math.max(1, n - 1)) * innerW;
  const yAt = (count: number) => padT + innerH - (count / yMax) * innerH;
  const path = series
    .map((s, i) => {
      const x = xAt(i);
      const y = yAt(s.count);
      return `${i === 0 ? "M" : "L"} ${x},${y}`;
    })
    .join(" ");
  const xAxisY = padT + innerH;
  let areaPath = "";
  if (n === 1) {
    const x = xAt(0);
    const y = yAt(series[0].count);
    const half = Math.min(48, innerW / 8);
    areaPath = `M ${x - half} ${xAxisY} L ${x - half} ${y} L ${x + half} ${y} L ${x + half} ${xAxisY} Z`;
  } else {
    const seg: string[] = [`M ${xAt(0)} ${xAxisY} L ${xAt(0)} ${yAt(series[0].count)}`];
    for (let i = 1; i < n; i++) {
      seg.push(`L ${xAt(i)} ${yAt(series[i].count)}`);
    }
    seg.push(`L ${xAt(n - 1)} ${xAxisY} Z`);
    areaPath = seg.join(" ");
  }
  const xIdx = pickXLabelIndices(n);
  const xLabels = xIdx.map((i) => ({
    x: xAt(i),
    label: formatBucketDateLabel(series[i].bucket_date),
  }));
  const yAtTick = (tick: number) => padT + innerH - (tick / yMax) * innerH;
  const midY = padT + innerH / 2;
  const xTickY = xAxisY + 22;
  return {
    path,
    areaPath,
    yTicks,
    xLabels,
    padL,
    padR,
    padT,
    padB,
    innerW,
    innerH,
    yAtTick,
    xAxisY,
    xTickY,
    midY,
  };
}
