"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useMeContext } from "@/components/layout/me-context-provider";

type UsageSnapshot = {
  period_start: string;
  period_end: string;
  included_conversations: number;
  billable_conversations: number;
  overage_conversations: number;
  estimated_overage_cents: number;
  throttle_tier: string;
  cushion_limit_conversations: number;
  conversations_in_free_cushion: number;
};

function formatPeriod(s: string, e: string): string {
  try {
    const a = new Date(s);
    const b = new Date(e);
    return `${a.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })} – ${b.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}`;
  } catch {
    return `${s} – ${e}`;
  }
}

export default function UsagePage() {
  const { data: ctx, error, loading } = useMeContext();

  const snap = ctx?.usage_snapshot;
  const included = snap?.included_conversations ?? ctx?.plan.included_conversations ?? 0;
  const billable = snap?.billable_conversations ?? 0;
  const cushionLimit = snap?.cushion_limit_conversations ?? 0;
  const inCushion = snap?.conversations_in_free_cushion ?? 0;
  const paidOver = snap?.overage_conversations ?? 0;
  const overageUsd = ((snap?.estimated_overage_cents ?? 0) / 100).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  const segments = useMemo(() => {
    if (!included && !cushionLimit) {
      return { includedPct: 0, cushionPct: 0, overPct: 0 };
    }
    const cap = Math.max(cushionLimit + paidOver, included, 1);
    const usedIncluded = Math.min(billable, included);
    const usedCushion = inCushion;
    const usedOver = paidOver > 0 ? Math.max(0, billable - cushionLimit) : 0;
    return {
      includedPct: Math.min(100, (usedIncluded / cap) * 100),
      cushionPct: Math.min(100, (usedCushion / cap) * 100),
      overPct: Math.min(100, (usedOver / cap) * 100),
    };
  }, [billable, cushionLimit, included, inCushion, paidOver]);

  return (
    <div className="ds-app-shell p-6 md:p-8">
      <div className="mx-auto w-full max-w-6xl">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="ds-app-page-title">Usage</h1>
            <p className="ds-app-page-description ds-app-page-description--wide">
              Billable conversations for <strong>{ctx?.plan.name ?? "your plan"}</strong>
              {snap ? (
                <>
                  {" "}
                  · Current period: {formatPeriod(snap.period_start, snap.period_end)}
                </>
              ) : null}
            </p>
          </div>
          <Link
            href="/account/plan"
            className="border-ds-outline text-ds-on-surface hover:border-ds-primary/30 inline-flex shrink-0 items-center justify-center rounded-ds-lg border bg-white px-4 py-2 text-sm font-medium shadow-sm transition-colors"
          >
            Change plan
          </Link>
        </div>

        {error ? <p className="mb-6 text-sm text-rose-600">{error}</p> : null}

        {loading ? (
          <p className="text-ds-on-surface-variant text-sm">Loading usage…</p>
        ) : (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <section className="border-ds-outline rounded-ds-xl border bg-ds-surface p-6 shadow-sm md:p-8">
              <h2 className="ds-app-section-title">Conversations</h2>
              <p className="text-ds-on-surface-variant mt-1 text-sm leading-relaxed">
                Included conversations are covered by your subscription. From 100% to ~120% you are in the{" "}
                <strong>free cushion</strong> (same bill, we may slow responses).{" "}
                <strong>Paid overage</strong> applies only above that cushion.
              </p>

              <div className="mt-6">
                <div className="text-ds-on-surface flex flex-wrap items-baseline justify-between gap-2 text-2xl font-semibold tabular-nums">
                  <span>{billable.toLocaleString()}</span>
                  <span className="text-ds-on-surface-variant text-base font-normal">
                    / {included.toLocaleString()} included
                  </span>
                </div>
                <p className="text-ds-on-surface-variant mt-1 text-xs">
                  Cushion cap ~{cushionLimit.toLocaleString()} · Free cushion in use:{" "}
                  {inCushion.toLocaleString()}
                </p>

                <div className="mt-4 flex h-3 w-full overflow-hidden rounded-full bg-ds-sidebar ring-1 ring-ds-outline">
                  <div
                    className="h-full bg-ds-primary transition-[width]"
                    style={{ width: `${segments.includedPct}%` }}
                    title="Included band usage"
                  />
                  <div
                    className="h-full bg-amber-400 transition-[width]"
                    style={{ width: `${segments.cushionPct}%` }}
                    title="Free cushion"
                  />
                  <div
                    className="h-full bg-rose-500 transition-[width]"
                    style={{ width: `${segments.overPct}%` }}
                    title="Paid overage"
                  />
                </div>
                <div className="text-ds-on-surface-variant mt-2 flex flex-wrap gap-4 text-[11px] font-medium">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="bg-ds-primary inline-block size-2.5 rounded-full" aria-hidden />
                    Included
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="inline-block size-2.5 rounded-full bg-amber-400" aria-hidden />
                    Free cushion
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="inline-block size-2.5 rounded-full bg-rose-500" aria-hidden />
                    Paid overage
                  </span>
                </div>
              </div>

              <dl className="border-ds-outline mt-8 grid gap-3 border-t pt-6 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-ds-on-surface-variant">Throttle tier</dt>
                  <dd className="font-medium capitalize">{snap?.throttle_tier ?? "—"}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-ds-on-surface-variant">Paid overage conversations</dt>
                  <dd className="font-medium tabular-nums">{paidOver.toLocaleString()}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-ds-on-surface-variant">Est. overage this period</dt>
                  <dd className="font-medium tabular-nums">${overageUsd}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-ds-on-surface-variant">Overage rate</dt>
                  <dd className="font-medium">
                    {ctx?.plan.overage_conversation_cents
                      ? `$${(ctx.plan.overage_conversation_cents / 100).toFixed(2)} / conversation`
                      : "—"}
                  </dd>
                </div>
              </dl>
            </section>

            <section className="border-ds-outline rounded-ds-xl border bg-ds-surface p-6 shadow-sm md:p-8">
              <h2 className="ds-app-section-title">Workspace</h2>
              <p className="text-ds-on-surface-variant mt-1 text-sm leading-relaxed">
                Per-agent analytics (sessions started vs billable) live on the agent <Link href="/dashboard">Dashboard</Link>.
              </p>
              <div className="border-ds-outline mt-6 rounded-ds-lg border bg-ds-sidebar/50 p-4">
                <p className="text-ds-on-surface-variant text-xs leading-relaxed">
                  Usage totals refresh when you open this page. Overage is estimated from billable conversations above
                  your cushion cap for the current subscription period.
                </p>
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
