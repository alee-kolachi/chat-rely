"use client";

import { useEffect, useMemo, useState } from "react";

type LandingStat = {
  value: number;
  label: string;
  suffix?: string;
  prefix?: string;
};

const STATS: LandingStat[] = [
  { value: 60_000, label: "Pages crawled", suffix: "+" },
  { value: 13_000, label: "Knowledge documents indexed", suffix: "+" },
  { value: 8_500, label: "AI conversations resolved", suffix: "+" },
  { value: 98.7, label: "Average assistant accuracy", suffix: "%", prefix: "" },
];

const ANIMATION_DURATION_MS = 1800;

function useAnimatedValue(targetValue: number): number {
  const [value, setValue] = useState(0);

  useEffect(() => {
    const startAt = window.performance.now();
    let animationFrame = 0;

    const update = (timestamp: number) => {
      const progress = Math.min((timestamp - startAt) / ANIMATION_DURATION_MS, 1);
      setValue(targetValue * progress);

      if (progress < 1) {
        animationFrame = window.requestAnimationFrame(update);
      }
    };

    animationFrame = window.requestAnimationFrame(update);

    return () => {
      window.cancelAnimationFrame(animationFrame);
    };
  }, [targetValue]);

  return value;
}

function AnimatedStat({ value, label, suffix = "", prefix = "" }: LandingStat) {
  const animatedValue = useAnimatedValue(value);
  const displayValue = useMemo(() => {
    if (!Number.isFinite(value)) {
      return "0";
    }

    if (value % 1 !== 0) {
      return animatedValue.toFixed(1);
    }

    return Math.floor(animatedValue).toLocaleString();
  }, [animatedValue, value]);

  return (
    <article className="rounded-2xl border border-zinc-200 bg-white p-6 text-center shadow-sm">
      <p className="text-3xl font-semibold tracking-tight text-ds-on-surface sm:text-4xl">
        {prefix}
        {displayValue}
        {suffix}
      </p>
      <p className="mt-2 text-sm text-ds-on-surface-variant">{label}</p>
    </article>
  );
}

export function LandingStatsSection() {
  return (
    <section className="border-y border-zinc-200 bg-[#f8f9fa] px-6 py-20">
      <div className="mx-auto max-w-[1200px]">
        <p className="mb-10 text-center text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
          Proven performance at scale
        </p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STATS.map((stat) => (
            <AnimatedStat key={stat.label} {...stat} />
          ))}
        </div>
      </div>
    </section>
  );
}
