"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";

import { useMeContext } from "@/components/layout/me-context-provider";
import { BackendApiError, backendFetch } from "@/lib/backend-api";

type UsageSnapshot = {
  period_start: string;
  period_end: string;
  included_conversations: number;
  billable_conversations: number;
  overage_conversations: number;
  estimated_overage_cents: number;
  throttle_tier: string;
};

const PAID_SLUGS = ["starter", "growth", "pro", "scale"] as const;

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
  const [changeBusy, setChangeBusy] = useState(false);

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

  const changePlan = async (planSlug: string) => {
    setChangeBusy(true);
    setLoadError(null);
    try {
      await backendFetch("/api/v1/billing/subscription/change", {
        method: "POST",
        body: JSON.stringify({ plan_slug: planSlug, proration_behavior: "create_prorations" }),
      });
      await refresh();
    } catch (e) {
      const msg = e instanceof BackendApiError ? e.message : e instanceof Error ? e.message : "Plan change failed";
      setLoadError(msg);
    } finally {
      setChangeBusy(false);
    }
  };

  const upgradeTargets = PAID_SLUGS.filter((s) => s !== ctx?.plan.slug);

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

              <aside className="border-ds-outline rounded-ds-xl border bg-ds-surface p-6 shadow-sm">
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

                {ctx.plan.slug === "free" && upgradeTargets.length > 0 ? (
                  <div className="mt-5 space-y-2">
                    <p className="text-ds-on-surface-variant text-xs font-medium uppercase tracking-wide">Upgrade</p>
                    {upgradeTargets.map((slug) => (
                      <button
                        key={slug}
                        type="button"
                        disabled={busySlug !== null}
                        onClick={() => void startCheckout(slug)}
                        className="bg-ds-primary text-ds-on-primary hover:bg-ds-secondary w-full rounded-ds-lg px-4 py-2.5 text-sm font-semibold capitalize transition-colors disabled:opacity-50"
                      >
                        {busySlug === slug ? "Redirecting…" : `Subscribe to ${slug}`}
                      </button>
                    ))}
                  </div>
                ) : null}

                {ctx.subscription.provider_subscription_id && upgradeTargets.length > 0 ? (
                  <div className="mt-5 border-t border-ds-outline pt-5">
                    <p className="text-ds-on-surface-variant mb-2 text-xs font-medium uppercase tracking-wide">
                      Change plan (Stripe proration)
                    </p>
                    <select
                      className="border-ds-outline text-ds-on-surface mb-2 w-full rounded-ds-md border bg-white px-3 py-2 text-sm"
                      defaultValue=""
                      disabled={changeBusy}
                      onChange={(ev) => {
                        const v = ev.target.value;
                        ev.target.value = "";
                        if (v) void changePlan(v);
                      }}
                    >
                      <option value="" disabled>
                        Select new plan…
                      </option>
                      {upgradeTargets
                        .filter((s) => s !== ctx.plan.slug)
                        .map((slug) => (
                          <option key={slug} value={slug}>
                            {slug.charAt(0).toUpperCase() + slug.slice(1)}
                          </option>
                        ))}
                    </select>
                    <p className="text-ds-on-surface-variant text-[11px] leading-relaxed">
                      Upgrades charge prorated amounts immediately per Stripe. Downgrades can be added later via the
                      billing portal or scheduled price changes.
                    </p>
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
