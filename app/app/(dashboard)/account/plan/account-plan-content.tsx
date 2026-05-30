"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import { useDashboardAgent } from "@/components/layout/dashboard-agent-context";
import type { MeContextPayload } from "@/components/layout/me-context-provider";
import { useMeContext } from "@/components/layout/me-context-provider";
import { getAppSiteOrigin } from "@/lib/app-site-origin";
import { BackendApiError, backendFetch } from "@/lib/backend-api";
import {
  formatLocaleCurrency,
  formatLocaleDate,
  formatLocaleNumber,
} from "@/lib/format-locale-datetime";
import { buildPlanEntitlementSections } from "@/lib/plan-entitlements";
import { appButtonClassName } from "@/lib/button-styles";
import { useClientMounted } from "@/lib/use-client-mounted";

/** Tier order used for upgrade vs downgrade (matches billing price map). */
const PAID_ORDER = ["hobby", "standard", "pro"] as const;

function paidTierIndex(slug: string): number | null {
  const i = PAID_ORDER.indexOf(slug as (typeof PAID_ORDER)[number]);
  return i >= 0 ? i : null;
}

function formatPlanLabel(slug: string): string {
  return slug.charAt(0).toUpperCase() + slug.slice(1);
}

function formatThrottleTier(tier: string): string {
  return tier.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

type PlanEntitlementRow = ReturnType<typeof buildPlanEntitlementSections>[number]["rows"][number];

function PlanResourceMetricCard({
  label,
  used,
  included,
  loading,
  localeReady,
}: {
  label: string;
  used: number;
  included: number;
  loading: boolean;
  localeReady: boolean;
}) {
  const pct = included ? Math.min(100, (used / included) * 100) : 0;
  const overIncluded = included > 0 && used > included;

  return (
    <div className="border-ds-outline rounded-ds-lg border bg-ds-sidebar/50 p-4">
      <p className="ds-app-body-muted text-sm font-medium">{label}</p>
      <div className="mt-3 flex flex-wrap items-baseline justify-between gap-2">
        {loading ? (
          <>
            <span className="bg-ds-sidebar inline-block h-8 w-16 animate-pulse rounded-md" />
            <span className="bg-ds-sidebar inline-block h-5 w-28 animate-pulse rounded-md" />
          </>
        ) : (
          <>
            <span className="text-ds-on-surface text-2xl font-semibold tabular-nums">
              {formatLocaleNumber(used, localeReady)}
            </span>
            <span className="text-ds-on-surface-variant text-sm">
              / {formatLocaleNumber(included, localeReady)} included
            </span>
          </>
        )}
      </div>
      <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-ds-sidebar">
        <div
          className={`h-full transition-[width] ${overIncluded ? "bg-amber-500" : "bg-ds-primary"}`}
          style={{ width: loading ? "0%" : `${pct}%` }}
        />
      </div>
    </div>
  );
}

function PlanFeatureStatusBadge({ row }: { row: PlanEntitlementRow }) {
  if (row.value === "Coming soon") {
    return (
      <span className="inline-flex shrink-0 items-center rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
        Coming soon
      </span>
    );
  }
  if (!row.included || row.value === "Not included") {
    return (
      <span className="inline-flex shrink-0 items-center rounded-full border border-ds-outline bg-ds-sidebar px-2 py-0.5 text-[11px] font-semibold text-ds-on-surface-variant">
        Not included
      </span>
    );
  }
  if (row.value === "Included") {
    return (
      <span className="inline-flex shrink-0 items-center rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
        Included
      </span>
    );
  }
  return (
    <span className="text-ds-on-surface shrink-0 text-sm font-semibold tabular-nums">{row.value}</span>
  );
}

export function AccountPlanContent() {
  const searchParams = useSearchParams();
  const localeReady = useClientMounted();
  const { data: ctx, error, loading, refresh } = useMeContext();
  const { agents, agentsLoading } = useDashboardAgent();
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busySlug, setBusySlug] = useState<string | null>(null);
  const [planChangeBanner, setPlanChangeBanner] = useState<string | null>(null);
  const planActionsRef = useRef<HTMLDivElement | null>(null);
  const didStartCheckoutPollRef = useRef(false);
  const didStartPortalSyncRef = useRef(false);
  const didStripeMountSyncRef = useRef(false);

  const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

  async function getCurrentPlanSlugFromApi(): Promise<string | null> {
    const me = await backendFetch<MeContextPayload>("/api/v1/me/context");
    return me?.plan?.slug ?? null;
  }

  /**
   * Polls `/api/v1/me/context` until:
   * - if `expectedPlanSlug` is provided: the plan slug matches it
   * - otherwise: the plan slug differs from `startPlanSlug`
   */
  async function pollUntilPlanApplied(opts: {
    expectedPlanSlug?: string;
    startPlanSlug: string | null;
    timeoutMs?: number;
    intervalMs?: number;
  }): Promise<{ applied: boolean; latestPlanSlug: string | null }> {
    const timeoutMs = opts.timeoutMs ?? 120_000; // ~2 minutes
    const intervalMs = opts.intervalMs ?? 10_000;
    const start = Date.now();

    let latestPlanSlug: string | null = null;

    while (Date.now() - start < timeoutMs) {
      try {
        latestPlanSlug = await getCurrentPlanSlugFromApi();
        const expected = (opts.expectedPlanSlug ?? "").trim().toLowerCase();

        if (expected) {
          if (latestPlanSlug === expected) {
            await refresh(); // sync ctx.plan + ctx.usage_snapshot for UI
            return { applied: true, latestPlanSlug };
          }
        } else if (opts.startPlanSlug && latestPlanSlug && latestPlanSlug !== opts.startPlanSlug) {
          await refresh();
          return { applied: true, latestPlanSlug };
        }
      } catch {
        // Retry on transient errors while Stripe/webhook is settling.
      }

      await delay(intervalMs);
    }

    await refresh();
    return { applied: false, latestPlanSlug };
  }

  const checkoutBanner = useMemo(() => {
    const q = searchParams.get("checkout");
    if (q === "success")
      return {
        tone: "ok" as const,
        text: "Checkout completed. Your plan updates when Stripe finishes processing (usually within a minute).",
      };
    if (q === "cancel")
      return {
        tone: "neutral" as const,
        text: "Checkout was canceled. You are still on your previous plan.",
      };
    return null;
  }, [searchParams]);

  const startCheckout = async (planSlug: string) => {
    setBusySlug(planSlug);
    setPlanChangeBanner(null);
    try {
      const res = await backendFetch<{ url: string }>("/api/v1/billing/checkout", {
        method: "POST",
        body: JSON.stringify({
          plan_slug: planSlug,
          interval: "month",
          return_origin: getAppSiteOrigin(),
        }),
      });
      window.location.href = res.url;
    } catch (e) {
      const msg = e instanceof BackendApiError ? e.message : e instanceof Error ? e.message : "Checkout failed";
      setLoadError(msg);
      setBusySlug(null);
    }
  };

  const changePlan = async (planSlug: string, direction: "upgrade" | "downgrade") => {
    if (direction === "downgrade") {
      const ok = window.confirm(
        `Switch to the ${formatPlanLabel(planSlug)} plan? Stripe applies proration immediately (you may receive a credit on your next invoice).`,
      );
      if (!ok) return;
    }
    setBusySlug(planSlug);
    setLoadError(null);
    setPlanChangeBanner(null);
    try {
      await backendFetch("/api/v1/billing/subscription/change", {
        method: "POST",
        body: JSON.stringify({ plan_slug: planSlug, proration_behavior: "create_prorations" }),
      });

      try {
        await backendFetch("/api/v1/billing/sync", { method: "POST" });
        await refresh();
      } catch {
        // Webhook may still apply; polling below covers lag.
      }

      setPlanChangeBanner(`Updating to ${formatPlanLabel(planSlug)}… Stripe usually finishes within a minute.`);

      const startPlanSlug = ctx?.plan.slug ?? null;
      const res = await pollUntilPlanApplied({ expectedPlanSlug: planSlug, startPlanSlug });
      if (res.applied) {
        setPlanChangeBanner(`Your plan is now ${formatPlanLabel(res.latestPlanSlug ?? planSlug)}.`);
      } else {
        setPlanChangeBanner(
          `Stripe is still processing your plan change. If it doesn’t update within a few minutes, refresh this page.`,
        );
      }
    } catch (e) {
      const msg = e instanceof BackendApiError ? e.message : e instanceof Error ? e.message : "Plan change failed";
      setLoadError(msg);
    } finally {
      setBusySlug(null);
    }
  };

  const openBillingPortal = async () => {
    setBusySlug("portal");
    setLoadError(null);
    try {
      const res = await backendFetch<{ url: string }>("/api/v1/billing/portal", {
        method: "POST",
        body: JSON.stringify({ return_context: "plan", return_origin: getAppSiteOrigin() }),
      });
      window.location.href = res.url;
    } catch (e) {
      const msg =
        e instanceof BackendApiError ? e.message : e instanceof Error ? e.message : "Could not open billing portal";
      setLoadError(msg);
      setBusySlug(null);
    }
  };

  const currentTier = ctx ? paidTierIndex(ctx.plan.slug) : null;
  const catalogPaidTier = ctx && ctx.plan.slug !== "free" && currentTier !== null;

  const paidUpgradeSlugs =
    currentTier !== null ? PAID_ORDER.filter((_, idx) => idx > currentTier) : [];
  const paidDowngradeSlugs =
    currentTier !== null ? PAID_ORDER.filter((_, idx) => idx < currentTier) : [];

  const subscribeTargets: readonly (typeof PAID_ORDER)[number][] =
    ctx?.plan.slug === "free" ? [...PAID_ORDER] : [];

  const hasStripeSubscription = Boolean(ctx?.subscription.provider_subscription_id?.trim());
  const canChangePaidPlan = Boolean(ctx && catalogPaidTier && hasStripeSubscription);

  const planFeatureSections = useMemo(
    () => (ctx ? buildPlanEntitlementSections(ctx.plan, ctx.usage_snapshot) : []),
    [ctx]
  );

  useEffect(() => {
    const raw = searchParams.get("plan");
    if (!raw || !ctx) return;
    const slug = raw.trim().toLowerCase();
    const paidHit = PAID_ORDER.includes(slug as (typeof PAID_ORDER)[number]);
    if (!paidHit) return;
    planActionsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [searchParams, ctx]);

  // After Stripe checkout redirects back with `?checkout=success`, poll until the upgraded plan applies.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    const q = searchParams.get("checkout");
    if (q !== "success") return;
    if (!ctx) return;
    if (didStartCheckoutPollRef.current) return;

    didStartCheckoutPollRef.current = true;
    const startPlanSlug = ctx.plan.slug;
    const checkoutSessionId = searchParams.get("checkout_session_id")?.trim() ?? "";

    setPlanChangeBanner("Finalizing your subscription… checking for updated limits.");

    let cancelled = false;
    void (async () => {
      if (checkoutSessionId.startsWith("cs_")) {
        try {
          await backendFetch("/api/v1/billing/checkout/complete", {
            method: "POST",
            body: JSON.stringify({ checkout_session_id: checkoutSessionId }),
          });
          await refresh();
        } catch (e) {
          if (!cancelled) {
            const msg =
              e instanceof BackendApiError ? e.message : e instanceof Error ? e.message : "Could not finalize checkout";
            setLoadError(msg);
          }
        }
      }

      if (cancelled) return;

      const res = await pollUntilPlanApplied({ startPlanSlug });
      if (cancelled) return;

      if (res.applied && res.latestPlanSlug) {
        setPlanChangeBanner(`Your plan is now ${formatPlanLabel(res.latestPlanSlug)}.`);
      } else {
        setPlanChangeBanner(
          "Stripe is still processing. If your plan limits haven’t updated, refresh this page in a couple minutes.",
        );
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [searchParams, ctx]);

  // Pull Stripe subscription state when opening Plan (covers missed portal return / webhooks).
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!ctx?.subscription.provider_subscription_id?.trim()) return;
    if (didStripeMountSyncRef.current) return;
    didStripeMountSyncRef.current = true;

    void (async () => {
      try {
        await backendFetch("/api/v1/billing/sync", { method: "POST" });
        await refresh();
      } catch {
        // Non-fatal; user can use Refresh or return from portal.
      }
    })();
  }, [ctx?.subscription.provider_subscription_id]);

  // After Stripe Customer Portal (cancel / payment methods), sync subscription and refresh UI.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    const q = searchParams.get("portal");
    if (q !== "return") return;
    if (!ctx) return;
    if (didStartPortalSyncRef.current) return;

    didStartPortalSyncRef.current = true;
    const startPlanSlug = ctx.plan.slug;

    setPlanChangeBanner("Syncing your subscription from Stripe…");

    let cancelled = false;
    void (async () => {
      try {
        await backendFetch("/api/v1/billing/sync", { method: "POST" });
        await refresh();
      } catch (e) {
        if (!cancelled) {
          const msg =
            e instanceof BackendApiError ? e.message : e instanceof Error ? e.message : "Could not sync subscription";
          setLoadError(msg);
        }
      }

      if (cancelled) return;

      await pollUntilPlanApplied({ startPlanSlug, timeoutMs: 60_000, intervalMs: 3_000 });
      if (cancelled) return;

      let latest: MeContextPayload | null = null;
      try {
        latest = await backendFetch<MeContextPayload>("/api/v1/me/context");
        await refresh();
      } catch {
        latest = null;
      }

      if (latest?.plan.slug === "free") {
        setPlanChangeBanner("Your workspace is on the Free plan.");
      } else if (latest && latest.plan.slug !== startPlanSlug) {
        setPlanChangeBanner(`Your plan is now ${formatPlanLabel(latest.plan.slug)}.`);
      } else if (latest?.subscription.cancel_at_period_end) {
        setPlanChangeBanner(
          `Cancellation is scheduled. You keep ${latest.plan.name} until ${formatLocaleDate(latest.subscription.current_period_end, true)}, then move to Free.`,
        );
      } else {
        setPlanChangeBanner("Billing updated. Refresh if plan details still look out of date.");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [searchParams, ctx]);

  return (
    <div className="ds-app-shell p-6 pb-16 md:p-8 md:pb-20">
      <div className="mx-auto w-full max-w-5xl">
        <header className="mb-8 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <h1 className="ds-app-page-title">Plan</h1>
            <p className="ds-app-body-muted mt-1 max-w-2xl">
              Manage your subscription, included resources, and plan changes for this workspace.
            </p>
          </div>
          {ctx ? (
            <div className="flex flex-col items-start gap-1 md:items-end">
              <span className="text-ds-on-surface inline-flex w-fit items-center rounded-ds-md bg-ds-sidebar px-3 py-1.5 text-sm font-semibold">
                {ctx.plan.name}
              </span>
              {ctx.plan.slug === "standard" && hasStripeSubscription ? (
                <span className="text-ds-on-surface-variant max-w-[14rem] text-right text-xs leading-snug">
                  Stripe may label this plan &quot;Growth&quot; (legacy name). Same tier.
                </span>
              ) : null}
            </div>
          ) : null}
        </header>

        {checkoutBanner ? (
          <div
            className={`mt-4 rounded-ds-lg border px-4 py-3 text-sm ${
              checkoutBanner.tone === "ok"
                ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                : "border-ds-outline bg-ds-sidebar/80 text-ds-on-surface"
            }`}
          >
            {checkoutBanner.text}
          </div>
        ) : null}

        {planChangeBanner ? (
          <div className="mt-4 rounded-ds-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
            {planChangeBanner}
          </div>
        ) : null}

        {(loadError || error) ? (
          <div className="border-ds-outline mt-4 rounded-ds-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
            {loadError || error}
          </div>
        ) : null}

        {!ctx && (loading || !(loadError || error)) ? (
          <p className="text-ds-on-surface-variant mt-6 text-sm">Loading…</p>
        ) : null}

        {ctx ? (
          <>
            <div className="mt-2 grid grid-cols-1 gap-10 lg:grid-cols-3">
              <div className="space-y-10 lg:col-span-2">
              <section>
                <h2 className="ds-app-section-title mb-1">Included resources</h2>
                <p className="ds-app-body-muted mb-4 text-sm">
                  Usage for this billing cycle. See{" "}
                  <Link href="/usage" className="text-ds-primary font-semibold hover:underline">
                    Usage
                  </Link>{" "}
                  for a full breakdown.
                </p>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <PlanResourceMetricCard
                    label="AI agents"
                    used={agents.length}
                    included={ctx.plan.max_agents}
                    loading={agentsLoading}
                    localeReady={localeReady}
                  />
                  <PlanResourceMetricCard
                    label="Conversations"
                    used={ctx.usage_snapshot?.conversations_used ?? 0}
                    included={ctx.plan.included_conversations}
                    loading={false}
                    localeReady={localeReady}
                  />
                </div>
                {ctx.usage_snapshot ? (
                  <div
                    className={`border-ds-outline mt-3 rounded-ds-lg border px-4 py-3 ${
                      ctx.usage_snapshot.throttle_tier === "strong"
                        ? "border-amber-200 bg-amber-50"
                        : "bg-ds-sidebar/50"
                    }`}
                  >
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <p className="ds-app-card-title">Throttle tier</p>
                      <span
                        className={`inline-flex w-fit items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${
                          ctx.usage_snapshot.throttle_tier === "strong"
                            ? "border-amber-300 bg-white text-amber-800"
                            : ctx.usage_snapshot.throttle_tier === "light"
                              ? "border-ds-outline bg-white text-ds-on-surface-variant"
                              : "border-emerald-200 bg-emerald-50 text-emerald-700"
                        }`}
                      >
                        {formatThrottleTier(ctx.usage_snapshot.throttle_tier)}
                      </span>
                    </div>
                    {ctx.usage_snapshot.throttle_tier === "strong" ? (
                      <p className="ds-app-body-muted mt-2 text-sm leading-relaxed text-amber-900">
                        You have passed your included conversations for this cycle. Chat stays on, but replies may be
                        slower until the cycle resets or you upgrade.
                      </p>
                    ) : (
                      <p className="ds-app-body-muted mt-2 text-sm leading-relaxed">
                        Replies stay at full speed while you are within your included conversations.
                      </p>
                    )}
                  </div>
                ) : null}
              </section>

              <section>
                <h2 className="ds-app-section-title mb-1">Plan features</h2>
                <p className="ds-app-body-muted mb-4 text-sm">
                  What&apos;s included on {ctx.plan.name} and what unlocks on higher tiers.
                </p>
                <div className="space-y-4">
                  {planFeatureSections.map((section) => (
                    <div
                      key={section.title}
                      className="border-ds-outline rounded-ds-xl border bg-ds-surface p-4 shadow-sm sm:p-5"
                    >
                      <p className="ds-app-body-muted mb-3 text-xs font-semibold uppercase tracking-wide">
                        {section.title}
                      </p>
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        {section.rows.map((row) => (
                          <div
                            key={row.label}
                            className="border-ds-outline flex min-h-[4.5rem] flex-col justify-between gap-2 rounded-ds-lg border bg-ds-sidebar/40 px-4 py-3"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <p className="ds-app-card-title min-w-0 leading-snug">{row.label}</p>
                              <PlanFeatureStatusBadge row={row} />
                            </div>
                            {!row.included && row.upgradeNote ? (
                              <p className="ds-app-body-muted text-xs leading-snug">
                                Unlocks on {row.upgradeNote}
                              </p>
                            ) : null}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
              </div>

              <aside ref={planActionsRef} id="plan-actions" className="scroll-mt-24 lg:border-l lg:border-ds-outline/60 lg:pl-8">
                <h2 className="ds-app-section-title mb-3 text-base">Current cycle</h2>
                <p className="text-ds-on-surface-variant text-sm">
                  {formatLocaleDate(ctx.subscription.current_period_start, localeReady)} –{" "}
                  {formatLocaleDate(ctx.subscription.current_period_end, localeReady)}
                </p>
                {ctx.subscription.cancel_at_period_end ? (
                  <p className="mt-2 rounded-ds-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                    Cancellation scheduled. You keep {ctx.plan.name} until{" "}
                    {formatLocaleDate(ctx.subscription.current_period_end, localeReady)}, then your workspace moves to Free.
                  </p>
                ) : null}
                <div className="mt-5 space-y-4">
                  <div>
                    <p className="ds-app-body-muted font-medium">Plan price</p>
                    <p className="ds-app-metric-value mt-1 text-xl">
                      {formatLocaleCurrency(ctx.plan.monthly_price_cents, localeReady)}/mo
                    </p>
                  </div>
                  {ctx.usage_snapshot && ctx.usage_snapshot.estimated_overage_cents > 0 ? (
                    <div>
                      <p className="ds-app-body-muted font-medium">Estimated conversation overage</p>
                      <p className="ds-app-metric-value mt-1 text-xl">
                        {formatLocaleCurrency(ctx.usage_snapshot.estimated_overage_cents, localeReady)}
                      </p>
                    </div>
                  ) : null}
                </div>

                {ctx.plan.slug === "free" && subscribeTargets.length > 0 ? (
                  <div className="mt-5 space-y-2">
                    <p className="ds-app-body-muted font-medium uppercase tracking-wide">
                      Upgrade (checkout)
                    </p>
                    {subscribeTargets.map((slug) => (
                      <button
                        key={slug}
                        type="button"
                        disabled={busySlug !== null}
                        onClick={() => void startCheckout(slug)}
                        className={appButtonClassName("default", { className: "w-full capitalize" })}
                      >
                        {busySlug === slug ? "Redirecting…" : `Subscribe to ${formatPlanLabel(slug)}`}
                      </button>
                    ))}
                  </div>
                ) : null}

                {canChangePaidPlan && (paidUpgradeSlugs.length > 0 || paidDowngradeSlugs.length > 0) ? (
                  <div className="mt-8 space-y-6 border-t border-ds-outline/60 pt-6">
                    <div>
                      <p className="ds-app-body-muted mb-2 font-medium uppercase tracking-wide">
                        Upgrade plan
                      </p>
                      {paidUpgradeSlugs.length === 0 ? (
                        <p className="ds-app-body-muted">
                          You are already on the highest self-serve tier.
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {paidUpgradeSlugs.map((slug) => (
                            <button
                              key={slug}
                              type="button"
                              disabled={busySlug !== null}
                              onClick={() => void changePlan(slug, "upgrade")}
                              className={appButtonClassName("default", { className: "w-full" })}
                            >
                              {busySlug === slug ? "Updating…" : `Upgrade to ${formatPlanLabel(slug)}`}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    <div>
                      <p className="ds-app-body-muted mb-2 font-medium uppercase tracking-wide">
                        Downgrade plan
                      </p>
                      {paidDowngradeSlugs.length === 0 ? (
                        <p className="ds-app-body-muted">
                          You are already on the lowest paid tier. To move to Free, cancel in billing (below).
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {paidDowngradeSlugs.map((slug) => (
                            <button
                              key={slug}
                              type="button"
                              disabled={busySlug !== null}
                              onClick={() => void changePlan(slug, "downgrade")}
                              className={appButtonClassName("default", { className: "w-full" })}
                            >
                              {busySlug === slug ? "Updating…" : `Downgrade to ${formatPlanLabel(slug)}`}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    <p className="text-ds-on-surface-variant text-[11px] leading-relaxed">
                      Plan switches use Stripe proration immediately (charges or credits on your next invoice).
                    </p>
                  </div>
                ) : null}

                {ctx.plan.slug !== "free" && !catalogPaidTier ? (
                  <div className="mt-5 border-t border-ds-outline pt-5">
                    <p className="ds-app-body-muted">
                      Self-serve upgrades and downgrades apply to Hobby–Pro. Legacy Scale or custom plans: use billing
                      or contact support.
                    </p>
                    <button
                      type="button"
                      disabled={busySlug !== null}
                      onClick={() => void openBillingPortal()}
                      className={appButtonClassName("default", { className: "mt-3 w-full" })}
                    >
                      {busySlug === "portal" ? "Opening…" : "Open Stripe billing portal"}
                    </button>
                  </div>
                ) : null}

                {catalogPaidTier && !hasStripeSubscription ? (
                  <div className="mt-5 border-t border-ds-outline pt-5">
                    <p className="ds-app-body-muted">
                      We couldn&apos;t find an active Stripe subscription for this workspace. Use the portal to resolve
                      billing or sync your subscription.
                    </p>
                    <button
                      type="button"
                      disabled={busySlug !== null}
                      onClick={() => void openBillingPortal()}
                      className={appButtonClassName("default", { className: "mt-3 w-full" })}
                    >
                      {busySlug === "portal" ? "Opening…" : "Open Stripe billing portal"}
                    </button>
                  </div>
                ) : null}

                {canChangePaidPlan ? (
                  <div className="mt-5 border-t border-ds-outline pt-5">
                    <p className="ds-app-body-muted mb-2 font-medium uppercase tracking-wide">
                      Cancel / switch to Free
                    </p>
                    <p className="ds-app-body-muted mb-3">
                      Cancelling in Stripe moves this workspace to the Free plan. When you are done, use the
                      &quot;Return to …&quot; link at the top of Stripe to come back here (we sync automatically).
                    </p>
                    <button
                      type="button"
                      disabled={busySlug !== null}
                      onClick={() => void openBillingPortal()}
                      className={appButtonClassName("default", { className: "w-full" })}
                    >
                      {busySlug === "portal" ? "Opening…" : "Manage cancellation in Stripe"}
                    </button>
                  </div>
                ) : null}
              </aside>
            </div>

          </>
        ) : null}
      </div>
    </div>
  );
}
