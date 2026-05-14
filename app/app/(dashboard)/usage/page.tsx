"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useMeContext } from "@/components/layout/me-context-provider";

type UsageSnapshot = {
  period_start: string;
  period_end: string;
  included_conversations: number;
  conversations_used: number;
  overage_conversations: number;
  estimated_overage_cents: number;
  throttle_tier: string;
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
  const used = snap?.conversations_used ?? 0;
  const paidOver = snap?.overage_conversations ?? 0;
  const overageUsd = ((snap?.estimated_overage_cents ?? 0) / 100).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  const segments = useMemo(() => {
    if (!included && !used) {
      return { includedPct: 0, overPct: 0 };
    }
    const denom = Math.max(included, used, 1);
    const usedIncluded = Math.min(used, included);
    const usedOver = Math.max(0, used - included);
    return {
      includedPct: Math.min(100, (usedIncluded / denom) * 100),
      overPct: Math.min(100, (usedOver / denom) * 100),
    };
  }, [used, included]);

  return (
    <div className="ds-app-shell px-6 pt-6 pb-16 md:px-8 md:pt-8 md:pb-20">
      <div className="mx-auto w-full max-w-6xl">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="ds-app-page-title">Usage</h1>
            <p className="ds-app-page-description ds-app-page-description--wide">
              Conversation usage for <strong>{ctx?.plan.name ?? "your plan"}</strong>
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
            className="border-ds-outline text-ds-on-surface hover:border-black/30 inline-flex shrink-0 items-center justify-center rounded-ds-lg border bg-white px-4 py-2 text-sm font-medium shadow-sm transition-colors"
          >
            Change plan
          </Link>
        </div>

        {error ? <p className="mb-6 text-sm text-rose-600">{error}</p> : null}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <section className="border-ds-outline rounded-ds-xl border bg-ds-surface p-6 shadow-sm md:p-8">
            <h2 className="ds-app-section-title">Conversations</h2>
            <p className="text-ds-on-surface-variant mt-1 text-sm leading-relaxed">
              Included conversations are covered by your subscription. Counts include closed chats with any visitor
              message, assistant reply, or tool activity. We do not charge per extra conversation today; usage beyond
              included may switch responses to a lighter model.
            </p>

            <div className="mt-6">
              <div className="text-ds-on-surface flex flex-wrap items-baseline justify-between gap-2 text-2xl font-semibold tabular-nums">
                {loading ? (
                  <>
                    <span className="bg-ds-sidebar inline-block h-8 w-20 animate-pulse rounded-md" />
                    <span className="bg-ds-sidebar inline-block h-6 w-36 animate-pulse rounded-md" />
                  </>
                ) : (
                  <>
                    <span>{used.toLocaleString()}</span>
                    <span className="text-ds-on-surface-variant text-base font-normal">
                      / {included.toLocaleString()} included
                    </span>
                  </>
                )}
              </div>
              <div className="mt-4 flex h-3 w-full overflow-hidden rounded-full bg-ds-sidebar ring-1 ring-ds-outline">
                <div
                  className="h-full bg-ds-primary transition-[width]"
                  style={{ width: loading ? "0%" : `${segments.includedPct}%` }}
                  title="Included band usage"
                />
                <div
                  className="h-full bg-rose-500 transition-[width]"
                  style={{ width: loading ? "0%" : `${segments.overPct}%` }}
                  title="Beyond included (not charged per conversation today)"
                />
              </div>
              <div className="text-ds-on-surface-variant mt-2 flex flex-wrap gap-4 text-[11px] font-medium">
                <span className="inline-flex items-center gap-1.5">
                  <span className="bg-ds-primary inline-block size-2.5 rounded-full" aria-hidden />
                  Included
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="inline-block size-2.5 rounded-full bg-rose-500" aria-hidden />
                  Beyond included
                </span>
              </div>
            </div>

            <dl className="border-ds-outline mt-8 grid gap-3 border-t pt-6 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-ds-on-surface-variant">Throttle tier</dt>
                <dd className="font-medium capitalize">
                  {loading ? <span className="bg-ds-sidebar inline-block h-4 w-24 animate-pulse rounded-md" /> : (snap?.throttle_tier ?? "—")}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-ds-on-surface-variant">Beyond included (count)</dt>
                <dd className="font-medium tabular-nums">
                  {loading ? <span className="bg-ds-sidebar inline-block h-4 w-14 animate-pulse rounded-md" /> : paidOver.toLocaleString()}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-ds-on-surface-variant">Est. overage this period</dt>
                <dd className="font-medium tabular-nums">
                  {loading ? <span className="bg-ds-sidebar inline-block h-4 w-20 animate-pulse rounded-md" /> : `$${overageUsd}`}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-ds-on-surface-variant">Overage rate</dt>
                <dd className="font-medium">
                  {loading ? (
                    <span className="bg-ds-sidebar inline-block h-4 w-32 animate-pulse rounded-md" />
                  ) : ctx?.plan.overage_conversation_cents ? (
                    `$${(ctx.plan.overage_conversation_cents / 100).toFixed(2)} / conversation`
                  ) : (
                    "—"
                  )}
                </dd>
              </div>
            </dl>
          </section>

          <section className="border-ds-outline rounded-ds-xl border bg-ds-surface p-6 shadow-sm md:p-8">
            <h2 className="ds-app-section-title">Workspace</h2>
            <p className="text-ds-on-surface-variant mt-1 text-sm leading-relaxed">
              Per-agent analytics (volume over time and team queue) live on the agent <Link href="/dashboard">Dashboard</Link>.
            </p>
            <div className="border-ds-outline mt-6 rounded-ds-lg border bg-ds-sidebar/50 p-4">
              <p className="text-ds-on-surface-variant text-xs leading-relaxed">
                Usage totals refresh when you open this page. The bar reflects conversations used toward your included
                allowance for the current subscription period.
              </p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
