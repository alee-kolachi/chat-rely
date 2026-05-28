"use client";

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

const resourceMetricRowClass =
  "border-ds-outline flex flex-col gap-2 rounded-ds-lg border bg-ds-sidebar/50 p-4 sm:flex-row sm:items-center sm:justify-between";

const resourceMetricValueClass = "text-ds-on-surface text-sm font-semibold tabular-nums sm:text-right";

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
        <section className="border-ds-outline rounded-ds-xl border bg-ds-surface p-6 shadow-sm md:p-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <h1 className="ds-app-page-title">Plan</h1>
              <p className="text-ds-on-surface-variant ds-app-page-description ds-app-page-description--wide mt-2">
                Manage your subscription, included resources, and plan changes for this workspace.
              </p>
            </div>
            {ctx ? (
              <div className="flex flex-col items-end gap-1">
                <span className="ds-app-kicker border-ds-primary/35 text-ds-primary inline-flex w-fit items-center rounded-full border bg-white px-3 py-1.5 font-semibold shadow-sm">
                  {ctx.plan.name}
                </span>
                {ctx.plan.slug === "standard" && hasStripeSubscription ? (
                  <span className="text-ds-on-surface-variant max-w-[14rem] text-right text-[11px] leading-snug">
                    Stripe may label this plan &quot;Growth&quot; (legacy name) — same tier.
                  </span>
                ) : null}
              </div>
            ) : null}
          </div>
        </section>

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
            <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
              <div className="space-y-6 lg:col-span-2">
              <section className="border-ds-outline rounded-ds-xl border bg-ds-surface p-6 shadow-sm">
                <h2 className="ds-app-section-title mb-4">Included resources</h2>
                <div className="space-y-3">
                  <div className={resourceMetricRowClass}>
                    <p className="ds-app-card-title">AI agents</p>
                    <p className={resourceMetricValueClass}>
                      {agentsLoading ? "…" : formatLocaleNumber(agents.length, localeReady)} /{" "}
                      {formatLocaleNumber(ctx.plan.max_agents, localeReady)}
                    </p>
                  </div>
                  <div className={resourceMetricRowClass}>
                    <p className="ds-app-card-title">Conversations (this cycle)</p>
                    <p className={resourceMetricValueClass}>
                      {formatLocaleNumber(ctx.usage_snapshot?.conversations_used ?? 0, localeReady)} /{" "}
                      {formatLocaleNumber(ctx.plan.included_conversations, localeReady)}
                    </p>
                  </div>
                  {ctx.usage_snapshot ? (
                    <div className={`${resourceMetricRowClass} flex-col`}>
                      <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <p className="ds-app-card-title">Throttle tier</p>
                        <p className={resourceMetricValueClass}>
                          {formatThrottleTier(ctx.usage_snapshot.throttle_tier)}
                        </p>
                      </div>
                      {ctx.usage_snapshot.throttle_tier === "strong" ? (
                        <p className="ds-app-body-muted w-full text-sm leading-relaxed">
                          You have passed your included conversations for this cycle. Chat stays on, but replies may be
                          slower until the cycle resets or you upgrade.
                        </p>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              </section>

              <section className="border-ds-outline rounded-ds-xl border bg-ds-surface p-6 shadow-sm">
                <h2 className="ds-app-section-title mb-1">Plan features</h2>
                <p className="ds-app-body-muted mb-4 text-sm">
                  What&apos;s included on {ctx.plan.name} and what unlocks on higher tiers.
                </p>
                <div className="space-y-6">
                  {planFeatureSections.map((section) => (
                    <div key={section.title}>
                      <p className="ds-app-body-muted mb-2 text-xs font-semibold uppercase tracking-wide">
                        {section.title}
                      </p>
                      <div className="space-y-3">
                        {section.rows.map((row) => (
                          <div key={row.label} className={resourceMetricRowClass}>
                            <div>
                              <p className="ds-app-card-title">{row.label}</p>
                              {!row.included && row.upgradeNote ? (
                                <p className="ds-app-body-muted mt-0.5 text-xs">Upgrade: {row.upgradeNote}</p>
                              ) : null}
                            </div>
                            <p
                              className={
                                row.included
                                  ? resourceMetricValueClass
                                  : "text-ds-on-surface-variant text-sm font-medium sm:text-right"
                              }
                            >
                              {row.value}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
              </div>

              <aside
                ref={planActionsRef}
                id="plan-actions"
                className="border-ds-outline rounded-ds-xl border bg-ds-surface p-6 shadow-sm scroll-mt-24"
              >
                <h2 className="ds-app-section-title mb-3 text-base">Current cycle</h2>
                <p className="text-ds-on-surface-variant text-sm">
                  {formatLocaleDate(ctx.subscription.current_period_start, localeReady)} –{" "}
                  {formatLocaleDate(ctx.subscription.current_period_end, localeReady)}
                </p>
                {ctx.subscription.cancel_at_period_end ? (
                  <p className="mt-2 rounded-ds-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                    Cancellation scheduled — you keep {ctx.plan.name} until{" "}
                    {formatLocaleDate(ctx.subscription.current_period_end, localeReady)}, then your workspace moves to Free.
                  </p>
                ) : null}
                <div className="mt-5 space-y-3">
                  <div className="rounded-ds-lg bg-ds-sidebar/80 p-3 ring-1 ring-ds-outline/60">
                    <p className="ds-app-body-muted font-medium">Plan price</p>
                    <p className="ds-app-metric-value mt-1 text-xl">
                      {formatLocaleCurrency(ctx.plan.monthly_price_cents, localeReady)}/mo
                    </p>
                  </div>
                  {ctx.usage_snapshot && ctx.usage_snapshot.estimated_overage_cents > 0 ? (
                    <div className="rounded-ds-lg bg-ds-sidebar/80 p-3 ring-1 ring-ds-outline/60">
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
                        className="bg-ds-primary text-ds-on-primary hover:bg-ds-primary-hover w-full rounded-ds-lg px-4 py-2.5 text-sm font-semibold capitalize transition-colors disabled:opacity-50"
                      >
                        {busySlug === slug ? "Redirecting…" : `Subscribe to ${formatPlanLabel(slug)}`}
                      </button>
                    ))}
                  </div>
                ) : null}

                {canChangePaidPlan && (paidUpgradeSlugs.length > 0 || paidDowngradeSlugs.length > 0) ? (
                  <div className="mt-5 border-t border-ds-outline pt-5 space-y-4">
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
                              className="bg-ds-primary text-ds-on-primary hover:bg-ds-primary-hover w-full rounded-ds-lg px-4 py-2.5 text-sm font-semibold transition-colors disabled:opacity-50"
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
                              className="border-ds-outline text-ds-on-surface hover:bg-ds-sidebar/80 w-full rounded-ds-lg border bg-white px-4 py-2.5 text-sm font-semibold transition-colors disabled:opacity-50"
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
                      className="border-ds-outline text-ds-on-surface hover:bg-ds-sidebar/80 mt-3 w-full rounded-ds-lg border bg-white px-4 py-2.5 text-sm font-semibold transition-colors disabled:opacity-50"
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
                      className="border-ds-outline text-ds-on-surface hover:bg-ds-sidebar/80 mt-3 w-full rounded-ds-lg border bg-white px-4 py-2.5 text-sm font-semibold transition-colors disabled:opacity-50"
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
                      className="border-ds-outline text-ds-on-surface hover:bg-ds-sidebar/80 w-full rounded-ds-lg border bg-white px-4 py-2.5 text-sm font-semibold transition-colors disabled:opacity-50"
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
