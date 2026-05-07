"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import { useMeContext } from "@/components/layout/me-context-provider";
import { BackendApiError, backendFetch } from "@/lib/backend-api";

/** Tier order used for upgrade vs downgrade (matches billing price map). */
const PAID_ORDER = ["starter", "growth", "pro", "scale"] as const;

function paidTierIndex(slug: string): number | null {
  const i = PAID_ORDER.indexOf(slug as (typeof PAID_ORDER)[number]);
  return i >= 0 ? i : null;
}

function formatPlanLabel(slug: string): string {
  return slug.charAt(0).toUpperCase() + slug.slice(1);
}

function formatMoney(cents: number): string {
  return new Intl.NumberFormat(undefined, { style: "currency", currency: "USD" }).format(cents / 100);
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, { dateStyle: "medium" });
  } catch {
    return iso;
  }
}

export function AccountPlanContent() {
  const searchParams = useSearchParams();
  const { data: ctx, error, refresh } = useMeContext();
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busySlug, setBusySlug] = useState<string | null>(null);
  const [planChangeBanner, setPlanChangeBanner] = useState<string | null>(null);
  const planActionsRef = useRef<HTMLDivElement | null>(null);

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
        body: JSON.stringify({ plan_slug: planSlug, interval: "month" }),
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
      await refresh();
      setPlanChangeBanner(`Your plan is switching to ${formatPlanLabel(planSlug)}. Stripe usually finishes within a minute.`);
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
      const res = await backendFetch<{ url: string }>("/api/v1/billing/portal", { method: "POST" });
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

  useEffect(() => {
    const raw = searchParams.get("plan");
    if (!raw || !ctx) return;
    const slug = raw.trim().toLowerCase();
    const paidHit = PAID_ORDER.includes(slug as (typeof PAID_ORDER)[number]);
    if (!paidHit) return;
    planActionsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [searchParams, ctx]);

  return (
    <div className="ds-app-shell p-6 pb-16 md:p-8 md:pb-20">
      <div className="mx-auto w-full max-w-5xl">
        <section className="border-ds-outline rounded-ds-xl border bg-ds-surface p-6 shadow-sm md:p-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <h1 className="ds-app-page-title">Plan</h1>
              <p className="text-ds-on-surface-variant ds-app-page-description ds-app-page-description--wide mt-2">
                Subscription, limits, and usage for this workspace. Billing is per workspace (Supabase user), not per
                Shopify store.
              </p>
            </div>
            {ctx ? (
              <span className="ds-app-kicker border-ds-primary/35 text-ds-primary inline-flex w-fit items-center rounded-full border bg-white px-3 py-1.5 font-semibold shadow-sm">
                {ctx.plan.name}
              </span>
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

        {!ctx && !(loadError || error) ? (
          <p className="text-ds-on-surface-variant mt-6 text-sm">Loading…</p>
        ) : null}

        {ctx ? (
          <>
            <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
              <section className="border-ds-outline rounded-ds-xl border bg-ds-surface p-6 shadow-sm lg:col-span-2">
                <h2 className="ds-app-section-title mb-4">Included resources</h2>
                <div className="space-y-3">
                  <div className="border-ds-outline flex flex-col gap-2 rounded-ds-lg border bg-ds-sidebar/50 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-ds-on-surface text-sm font-semibold">AI agents</p>
                      <p className="text-ds-on-surface-variant text-xs">Up to {ctx.plan.max_agents} agents on this plan</p>
                    </div>
                  </div>
                  <div className="border-ds-outline flex flex-col gap-2 rounded-ds-lg border bg-ds-sidebar/50 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-ds-on-surface text-sm font-semibold">Billable conversations (this cycle)</p>
                      <p className="text-ds-on-surface-variant text-xs">
                        Up to {ctx.plan.included_conversations.toLocaleString()} billable conversations included per
                        cycle
                      </p>
                    </div>
                    <p className="text-ds-on-surface text-sm font-semibold tabular-nums">
                      {(ctx.usage_snapshot?.billable_conversations ?? 0).toLocaleString()} /{" "}
                      {ctx.plan.included_conversations.toLocaleString()}
                    </p>
                  </div>
                  {ctx.usage_snapshot ? (
                    <div className="border-ds-outline rounded-ds-lg border bg-ds-sidebar/50 p-4 text-xs text-ds-on-surface-variant">
                      Throttle tier:{" "}
                      <span className="font-semibold text-ds-on-surface">{ctx.usage_snapshot.throttle_tier}</span>
                      {ctx.usage_snapshot.throttle_tier === "strong" ? (
                        <span className="block pt-1">
                          New AI replies are blocked until you upgrade or the cycle resets (included conversations
                          exceeded).
                        </span>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              </section>

              <aside
                ref={planActionsRef}
                id="plan-actions"
                className="border-ds-outline rounded-ds-xl border bg-ds-surface p-6 shadow-sm scroll-mt-24"
              >
                <h2 className="ds-app-section-title mb-3 text-base">Current cycle</h2>
                <p className="text-ds-on-surface-variant text-sm">
                  {formatDate(ctx.subscription.current_period_start)} – {formatDate(ctx.subscription.current_period_end)}
                </p>
                <div className="mt-5 space-y-3">
                  <div className="rounded-ds-lg bg-ds-sidebar/80 p-3 ring-1 ring-ds-outline/60">
                    <p className="text-ds-on-surface-variant text-xs font-medium">Plan price</p>
                    <p className="ds-app-metric-value mt-1 text-xl">{formatMoney(ctx.plan.monthly_price_cents)}/mo</p>
                  </div>
                  {ctx.usage_snapshot && ctx.usage_snapshot.estimated_overage_cents > 0 ? (
                    <div className="rounded-ds-lg bg-ds-sidebar/80 p-3 ring-1 ring-ds-outline/60">
                      <p className="text-ds-on-surface-variant text-xs font-medium">Estimated conversation overage</p>
                      <p className="ds-app-metric-value mt-1 text-xl">
                        {formatMoney(ctx.usage_snapshot.estimated_overage_cents)}
                      </p>
                    </div>
                  ) : null}
                </div>

                {ctx.plan.slug === "free" && subscribeTargets.length > 0 ? (
                  <div className="mt-5 space-y-2">
                    <p className="text-ds-on-surface-variant text-xs font-medium uppercase tracking-wide">
                      Upgrade (checkout)
                    </p>
                    {subscribeTargets.map((slug) => (
                      <button
                        key={slug}
                        type="button"
                        disabled={busySlug !== null}
                        onClick={() => void startCheckout(slug)}
                        className="bg-ds-primary text-ds-on-primary hover:bg-ds-secondary w-full rounded-ds-lg px-4 py-2.5 text-sm font-semibold capitalize transition-colors disabled:opacity-50"
                      >
                        {busySlug === slug ? "Redirecting…" : `Subscribe to ${formatPlanLabel(slug)}`}
                      </button>
                    ))}
                  </div>
                ) : null}

                {canChangePaidPlan && (paidUpgradeSlugs.length > 0 || paidDowngradeSlugs.length > 0) ? (
                  <div className="mt-5 border-t border-ds-outline pt-5 space-y-4">
                    <div>
                      <p className="text-ds-on-surface-variant mb-2 text-xs font-medium uppercase tracking-wide">
                        Upgrade plan
                      </p>
                      {paidUpgradeSlugs.length === 0 ? (
                        <p className="text-ds-on-surface-variant text-xs leading-relaxed">
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
                              className="bg-ds-primary text-ds-on-primary hover:bg-ds-secondary w-full rounded-ds-lg px-4 py-2.5 text-sm font-semibold transition-colors disabled:opacity-50"
                            >
                              {busySlug === slug ? "Updating…" : `Upgrade to ${formatPlanLabel(slug)}`}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    <div>
                      <p className="text-ds-on-surface-variant mb-2 text-xs font-medium uppercase tracking-wide">
                        Downgrade plan
                      </p>
                      {paidDowngradeSlugs.length === 0 ? (
                        <p className="text-ds-on-surface-variant text-xs leading-relaxed">
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
                    <p className="text-ds-on-surface-variant text-xs leading-relaxed">
                      Self-serve upgrades and downgrades apply to Starter–Scale. For custom or legacy plans, use billing
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
                    <p className="text-ds-on-surface-variant text-xs leading-relaxed">
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
                    <p className="text-ds-on-surface-variant mb-2 text-xs font-medium uppercase tracking-wide">
                      Cancel / switch to Free
                    </p>
                    <p className="text-ds-on-surface-variant mb-3 text-xs leading-relaxed">
                      Cancelling moves you to the Free plan after this billing period ends (manage in Stripe&apos;s
                      portal).
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

            <section className="border-ds-outline mt-6 rounded-ds-xl border bg-ds-surface p-6 shadow-sm">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <h2 className="ds-app-section-title text-base">Billing details</h2>
                <Link href="/pricing" className="text-ds-primary text-sm font-semibold hover:underline">
                  Compare all plans
                </Link>
              </div>
              <p className="text-ds-on-surface-variant max-w-2xl text-sm leading-relaxed">
                Stripe customer: {ctx.subscription.provider_customer_id ?? "—"} · Subscription:{" "}
                {ctx.subscription.provider_subscription_id ?? "—"}
              </p>
            </section>
          </>
        ) : null}
      </div>
    </div>
  );
}
