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
import { PlanTierBadge } from "@/components/ui/plan-tier-badge";
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

type PlanEntitlementRow = ReturnType<typeof buildPlanEntitlementSections>[number]["rows"][number];

function PlanResourceMetricCard({
  label,
  hint,
  used,
  included,
  loading,
  localeReady,
  formatUsed,
  formatIncluded,
}: {
  label: string;
  hint?: string;
  used: number;
  included: number;
  loading: boolean;
  localeReady: boolean;
  formatUsed?: (n: number) => string;
  formatIncluded?: (n: number) => string;
}) {
  const pct = included ? Math.min(100, (used / included) * 100) : 0;
  const overIncluded = included > 0 && used > included;
  const usedLabel = formatUsed ? formatUsed(used) : formatLocaleNumber(used, localeReady);
  const includedLabel = formatIncluded
    ? formatIncluded(included)
    : formatLocaleNumber(included, localeReady);

  return (
    <article className="border-ds-outline bg-ds-surface flex min-h-0 flex-col rounded-ds-xl border p-5 shadow-sm sm:p-6">
      <h2 className="text-ds-on-surface-variant text-sm font-semibold leading-snug">{label}</h2>
      <div className="mt-2 flex min-h-[2.75rem] flex-wrap items-end justify-between gap-2">
        {loading ? (
          <>
            <span className="bg-ds-sidebar inline-block h-9 w-20 animate-pulse rounded-md" />
            <span className="bg-ds-sidebar inline-block h-5 w-28 animate-pulse rounded-md" />
          </>
        ) : (
          <>
            <p className="ds-app-metric-value min-w-0 break-words">{usedLabel}</p>
            <span className="text-ds-on-surface-variant shrink-0 text-sm">/ {includedLabel} included</span>
          </>
        )}
      </div>
      <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-ds-sidebar">
        <div
          className={`h-full transition-[width] ${overIncluded ? "bg-amber-500" : "bg-ds-primary"}`}
          style={{ width: loading ? "0%" : `${pct}%` }}
        />
      </div>
      {hint ? <p className="ds-app-body-muted mt-auto pt-3 text-pretty break-words">{hint}</p> : null}
    </article>
  );
}

function PlanFeatureStatusBadge({ row }: { row: PlanEntitlementRow }) {
  if (row.value === "Coming soon") {
    return (
      <span className="text-ds-on-surface-variant shrink-0 text-sm font-medium">Coming soon</span>
    );
  }
  if (!row.included || row.value === "Not included") {
    return (
      <span className="text-ds-on-surface-variant shrink-0 text-sm font-medium">
        {row.upgradeNote ? `Upgrade · ${row.upgradeNote}` : "Not included"}
      </span>
    );
  }
  if (row.value === "Included") {
    return <span className="text-ds-on-surface shrink-0 text-sm font-semibold">Included</span>;
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
  const showHeaderBillingPortal = Boolean(ctx && ctx.plan.slug !== "free" && hasStripeSubscription);
  const showFooterBillingPortal = Boolean(
    ctx &&
      ((catalogPaidTier && !hasStripeSubscription) || (ctx.plan.slug !== "free" && !catalogPaidTier)),
  );

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

  const premiumIncluded = ctx
    ? Number(ctx.plan.features?.included_premium_turns ?? ctx.usage_snapshot?.included_premium_turns ?? 0)
    : 0;
  const premiumUsed = ctx?.usage_snapshot?.premium_turns_used ?? 0;

  return (
    <div className="ds-app-shell">
      <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="ds-app-page-title">Plan</h1>
            <p className="ds-app-page-description ds-app-page-description--wide">
              Subscription, limits, and upgrades for this workspace.
            </p>
            {ctx ? (
              <p className="ds-app-body-muted mt-2 text-sm">
                <span className="text-ds-on-surface font-semibold">{ctx.plan.name}</span>
                {" · "}
                {formatLocaleDate(ctx.subscription.current_period_start, localeReady)} –{" "}
                {formatLocaleDate(ctx.subscription.current_period_end, localeReady)}
              </p>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
            <Link href="/usage" className={appButtonClassName("default")}>
              View usage
            </Link>
            {showHeaderBillingPortal ? (
              <button
                type="button"
                disabled={busySlug !== null}
                onClick={() => void openBillingPortal()}
                className={appButtonClassName("default")}
              >
                {busySlug === "portal" ? "Opening…" : "Billing portal"}
              </button>
            ) : null}
          </div>
        </div>

        {checkoutBanner ? (
          <div
            className={`rounded-ds-xl border px-4 py-3 text-sm ${
              checkoutBanner.tone === "ok"
                ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                : "border-ds-outline bg-ds-surface text-ds-on-surface"
            }`}
          >
            {checkoutBanner.text}
          </div>
        ) : null}

        {planChangeBanner ? (
          <div className="rounded-ds-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
            {planChangeBanner}
          </div>
        ) : null}

        {(loadError || error) ? (
          <div className="rounded-ds-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
            {loadError || error}
          </div>
        ) : null}

        {!ctx && (loading || !(loadError || error)) ? (
          <p className="text-ds-on-surface-variant text-sm">Loading…</p>
        ) : null}

        {ctx ? (
          <>
            <article className="border-ds-outline bg-ds-surface rounded-ds-xl border p-6 shadow-sm">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="ds-app-section-title">{ctx.plan.name}</h2>
                    {ctx.plan.slug === "standard" ? (
                      <PlanTierBadge tier="standard" />
                    ) : ctx.plan.slug === "pro" ? (
                      <PlanTierBadge tier="pro" />
                    ) : null}
                  </div>
                  <p className="ds-app-body-muted mt-1">
                    {formatLocaleCurrency(ctx.plan.monthly_price_cents, localeReady)}/mo
                    {ctx.plan.slug === "standard" && hasStripeSubscription
                      ? " · Stripe may show “Growth” (legacy name)"
                      : null}
                  </p>
                </div>
              </div>
              {ctx.subscription.cancel_at_period_end ? (
                <p className="mt-4 rounded-ds-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                  Cancellation scheduled. You keep {ctx.plan.name} until{" "}
                  {formatLocaleDate(ctx.subscription.current_period_end, localeReady)}, then your workspace moves to
                  Free.
                </p>
              ) : null}
              {ctx.usage_snapshot?.throttle_tier === "strong" ? (
                <p className="mt-4 rounded-ds-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                  You passed your included conversations for this cycle. Chat stays on, but replies may be slower
                  until the cycle resets or you upgrade.
                </p>
              ) : null}
            </article>

            <article className="border-ds-outline bg-ds-surface rounded-ds-xl border p-6 shadow-sm">
              <div className="mb-6">
                <h2 className="ds-app-section-title">This billing cycle</h2>
                <p className="ds-app-body-muted mt-1 text-sm">
                  Live usage for your plan. See{" "}
                  <Link href="/usage" className="text-ds-primary font-semibold hover:underline">
                    Usage
                  </Link>{" "}
                  for throttle details.
                </p>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                <PlanResourceMetricCard
                  label="AI agents"
                  hint="Workspaces in this account."
                  used={agents.length}
                  included={ctx.plan.max_agents}
                  loading={agentsLoading}
                  localeReady={localeReady}
                />
                <PlanResourceMetricCard
                  label="Conversations"
                  hint="Closed chats with visitor messages, assistant replies, or tool activity."
                  used={ctx.usage_snapshot?.conversations_used ?? 0}
                  included={ctx.plan.included_conversations}
                  loading={loading}
                  localeReady={localeReady}
                />
                {premiumIncluded > 0 ? (
                  <PlanResourceMetricCard
                    label="Smart resolution turns"
                    hint="Advanced-model replies for harder questions. Most turns stay on Essential AI."
                    used={premiumUsed}
                    included={premiumIncluded}
                    loading={loading}
                    localeReady={localeReady}
                  />
                ) : null}
              </div>
            </article>

            <article className="border-ds-outline bg-ds-surface rounded-ds-xl border p-6 shadow-sm">
              <h2 className="ds-app-section-title">What&apos;s included</h2>
              <p className="ds-app-body-muted mt-1 mb-6 text-sm">
                Features on {ctx.plan.name} and what unlocks on higher tiers.
              </p>
              <div className="space-y-6">
                {planFeatureSections.map((section) => (
                  <div key={section.title}>
                    <h3 className="ds-app-kicker mb-3">{section.title}</h3>
                    <dl className="border-ds-outline divide-ds-outline/60 divide-y rounded-ds-lg border">
                      {section.rows.map((row) => (
                        <div
                          key={row.label}
                          className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
                        >
                          <dt className="text-ds-on-surface text-sm font-medium">{row.label}</dt>
                          <dd className="sm:text-right">
                            <PlanFeatureStatusBadge row={row} />
                          </dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                ))}
              </div>
            </article>

            <article
              ref={planActionsRef}
              id="plan-actions"
              className="border-ds-outline bg-ds-surface scroll-mt-24 rounded-ds-xl border p-6 shadow-sm"
            >
              <h2 className="ds-app-section-title">Change plan</h2>
              <p className="ds-app-body-muted mt-1 mb-6 text-sm">
                Upgrades and downgrades use Stripe proration. To cancel and move to Free, use the billing portal.
              </p>

              {ctx.plan.slug === "free" && subscribeTargets.length > 0 ? (
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                  {subscribeTargets.map((slug) => (
                    <button
                      key={slug}
                      type="button"
                      disabled={busySlug !== null}
                      onClick={() => void startCheckout(slug)}
                      className={appButtonClassName("default", { className: "w-full capitalize" })}
                    >
                      {busySlug === slug ? "Redirecting…" : `Subscribe · ${formatPlanLabel(slug)}`}
                    </button>
                  ))}
                </div>
              ) : null}

              {canChangePaidPlan && paidUpgradeSlugs.length > 0 ? (
                <div className="mb-4">
                  <p className="ds-app-body-muted mb-2 text-sm font-medium">Upgrade</p>
                  <div className="grid grid-cols-1 gap-2 sm:max-w-md">
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
                </div>
              ) : null}

              {canChangePaidPlan && paidDowngradeSlugs.length > 0 ? (
                <div className="mb-4">
                  <p className="ds-app-body-muted mb-2 text-sm font-medium">Downgrade</p>
                  <div className="grid grid-cols-1 gap-2 sm:max-w-md">
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
                </div>
              ) : null}

              {canChangePaidPlan && paidUpgradeSlugs.length === 0 && paidDowngradeSlugs.length === 0 ? (
                <p className="ds-app-body-muted text-sm">
                  You are on the highest self-serve tier. To cancel, use Billing portal
                  {showHeaderBillingPortal ? " above" : " below"}.
                </p>
              ) : null}

              {ctx.plan.slug !== "free" && !catalogPaidTier ? (
                <p className="ds-app-body-muted mb-4 text-sm">
                  Self-serve changes apply to Hobby through Pro. Legacy Scale or custom plans: use billing or contact
                  support.
                </p>
              ) : null}

              {catalogPaidTier && !hasStripeSubscription ? (
                <p className="ds-app-body-muted mb-4 text-sm">
                  We couldn&apos;t find an active Stripe subscription. Open the billing portal to sync or fix billing.
                </p>
              ) : null}

              {showFooterBillingPortal ? (
                <button
                  type="button"
                  disabled={busySlug !== null}
                  onClick={() => void openBillingPortal()}
                  className={appButtonClassName("default", { className: "mt-2 w-full sm:w-auto" })}
                >
                  {busySlug === "portal" ? "Opening…" : "Open Stripe billing portal"}
                </button>
              ) : null}

              {ctx.usage_snapshot && ctx.usage_snapshot.estimated_overage_cents > 0 ? (
                <p className="ds-app-body-muted mt-6 border-t border-ds-outline/60 pt-4 text-sm">
                  Estimated conversation overage this cycle:{" "}
                  <span className="text-ds-on-surface font-semibold">
                    {formatLocaleCurrency(ctx.usage_snapshot.estimated_overage_cents, localeReady)}
                  </span>
                </p>
              ) : null}
            </article>
          </>
        ) : null}
      </div>
    </div>
  );
}
