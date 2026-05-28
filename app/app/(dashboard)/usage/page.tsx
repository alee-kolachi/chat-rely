"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useMeContext } from "@/components/layout/me-context-provider";
import { formatLocaleDate, formatLocaleNumber } from "@/lib/format-locale-datetime";
import { useClientMounted } from "@/lib/use-client-mounted";

function formatThrottleTier(tier: string): string {
  return tier.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function UsagePage() {
  const localeReady = useClientMounted();
  const { data: ctx, error, loading } = useMeContext();

  const snap = ctx?.usage_snapshot;
  const included = snap?.included_conversations ?? ctx?.plan.included_conversations ?? 0;
  const used = snap?.conversations_used ?? 0;
  const beyondIncluded = Math.max(0, used - included);

  const usagePct = useMemo(() => {
    if (!included) return 0;
    return Math.min(100, (used / included) * 100);
  }, [used, included]);

  const throttleTier = snap?.throttle_tier ?? null;

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
                  · Current period:{" "}
                  {formatLocaleDate(snap.period_start, localeReady, {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}{" "}
                  –{" "}
                  {formatLocaleDate(snap.period_end, localeReady, {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
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
            <p className="ds-app-body-muted mt-1">
              Counts include closed chats with any visitor message, assistant reply, or tool activity. Chat stays on when
              you pass your included allowance; replies may use a lighter model until the cycle resets or you upgrade.
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
                    <span>{formatLocaleNumber(used, localeReady)}</span>
                    <span className="text-ds-on-surface-variant text-base font-normal">
                      / {formatLocaleNumber(included, localeReady)} included
                    </span>
                  </>
                )}
              </div>
              <div className="mt-4 h-3 w-full overflow-hidden rounded-full bg-ds-sidebar ring-1 ring-ds-outline">
                <div
                  className={`h-full transition-[width] ${beyondIncluded > 0 ? "bg-amber-500" : "bg-ds-primary"}`}
                  style={{ width: loading ? "0%" : `${usagePct}%` }}
                  title="Included allowance used"
                />
              </div>
            </div>

            {snap ? (
              <dl className="border-ds-outline mt-8 grid gap-3 border-t pt-6 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-ds-on-surface-variant">Throttle tier</dt>
                  <dd className="font-medium tabular-nums">
                    {loading ? (
                      <span className="bg-ds-sidebar inline-block h-4 w-24 animate-pulse rounded-md" />
                    ) : throttleTier ? (
                      formatThrottleTier(throttleTier)
                    ) : (
                      "-"
                    )}
                  </dd>
                </div>
                {beyondIncluded > 0 ? (
                  <div className="flex justify-between gap-4">
                    <dt className="text-ds-on-surface-variant">Above included allowance</dt>
                    <dd className="font-medium tabular-nums">{formatLocaleNumber(beyondIncluded, localeReady)}</dd>
                  </div>
                ) : null}
              </dl>
            ) : null}

            {throttleTier === "strong" ? (
              <p className="ds-app-body-muted mt-4 text-sm leading-relaxed">
                Heavy usage this period: we never turn off chat, but responses may take longer until your cycle resets or
                you upgrade.
              </p>
            ) : null}
          </section>

          <section className="border-ds-outline rounded-ds-xl border bg-ds-surface p-6 shadow-sm md:p-8">
            <h2 className="ds-app-section-title">Workspace</h2>
            <p className="ds-app-body-muted mt-1">
              Per-agent analytics (volume over time and team queue) live on the agent{" "}
              <Link href="/dashboard" className="text-ds-primary font-semibold hover:underline">
                Dashboard
              </Link>
              .
            </p>
            <div className="border-ds-outline mt-6 rounded-ds-lg border bg-ds-sidebar/50 p-4">
              <p className="ds-app-body-muted">
                Totals refresh when you open this page. For plan limits and upgrades, see{" "}
                <Link href="/account/plan" className="text-ds-primary font-semibold hover:underline">
                  Plan
                </Link>
                .
              </p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
