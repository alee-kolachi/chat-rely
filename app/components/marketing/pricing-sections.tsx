"use client";

import Link from "next/link";
import type { PublicPlanFromApi } from "@/hooks/use-public-plans";
import { formatMonthlyPrice } from "@/hooks/use-public-plans";

function planBullets(features: Record<string, unknown>): Array<{ label: string; included: boolean }> {
  const raw = features.pricing_card_bullets;
  if (Array.isArray(raw)) {
    return raw.filter((x): x is string => typeof x === "string").map((label) => ({ label, included: true }));
  }
  return [{ label: "See plan details in dashboard", included: true }];
}

function planCta(slug: string, isAuthenticated: boolean): { href: string; label: string } {
  if (slug === "scale") {
    return isAuthenticated
      ? { href: "/account/plan", label: "Contact sales" }
      : { href: "/login", label: "Contact sales" };
  }
  if (slug === "free") {
    return isAuthenticated
      ? { href: "/dashboard", label: "Open dashboard" }
      : { href: "/signup", label: "Get started" };
  }
  if (isAuthenticated) {
    return { href: `/account/plan?plan=${encodeURIComponent(slug)}`, label: "Choose plan" };
  }
  return { href: "/signup", label: "Choose plan" };
}

type PricingCardsProps = {
  variant?: "default" | "onboarding";
  plans: PublicPlanFromApi[] | null;
  loading?: boolean;
  loadError?: string | null;
  /** When true, paid plan CTAs go to the in-app billing page instead of signup. */
  isAuthenticated?: boolean;
};

export function PricingCards({
  variant = "default",
  plans,
  loading,
  loadError,
  isAuthenticated = false,
}: PricingCardsProps) {
  const isOnboarding = variant === "onboarding";

  if (loadError) {
    return (
      <div className="border-ds-outline text-ds-on-surface-variant rounded-ds-xl border bg-ds-surface p-6 text-center text-sm">
        {loadError}
      </div>
    );
  }

  if (loading || !plans?.length) {
    return (
      <div className="text-ds-on-surface-variant grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="border-ds-outline h-64 animate-pulse rounded-xl border bg-ds-sidebar/40"
            aria-hidden
          />
        ))}
      </div>
    );
  }

  return (
    <div
      className={
        isOnboarding
          ? "mx-auto grid w-full max-w-6xl grid-cols-1 items-stretch gap-x-5 gap-y-8 px-0.5 sm:grid-cols-2 sm:gap-x-5 sm:gap-y-10 sm:px-1 lg:grid-cols-4 lg:gap-x-6 lg:gap-y-6 lg:px-1"
          : "grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6 lg:grid-cols-4"
      }
    >
      {plans.map((plan) => {
        const highlighted = plan.slug === "growth";
        const { price, period } = formatMonthlyPrice(plan.monthly_price_cents);
        const bullets = planBullets(plan.features);
        const cta = planCta(plan.slug, isAuthenticated);
        return (
          <article
            key={plan.slug}
            className={
              isOnboarding
                ? `flex min-h-0 flex-col rounded-2xl p-5 sm:p-6 lg:h-full lg:min-h-[17rem] ${
                    highlighted
                      ? "relative isolate z-0 bg-ds-primary text-ds-on-primary shadow-[0_12px_40px_rgba(99,102,241,0.28)] ring-2 ring-ds-primary/60"
                      : "relative z-0 border border-ds-outline/45 bg-white text-ds-on-surface shadow-[0_6px_28px_rgba(15,23,42,0.06)] ring-1 ring-zinc-900/[0.05]"
                  }`
                : `flex flex-col rounded-xl border p-5 sm:p-6 lg:p-8 ${
                    highlighted
                      ? "relative z-10 border-ds-primary bg-ds-primary text-ds-on-primary shadow-xl sm:scale-[1.02] sm:shadow-2xl"
                      : "border-ds-outline bg-white"
                  }`
            }
          >
            {highlighted ? (
              <span
                className={`absolute -top-3 left-1/2 -translate-x-1/2 rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider ${
                  isOnboarding ? "bg-ds-tertiary text-white shadow-md" : "bg-ds-tertiary text-white"
                }`}
              >
                Popular
              </span>
            ) : null}
            <div className={isOnboarding ? "mb-5 shrink-0" : "mb-5 sm:mb-6"}>
              <h3
                className={
                  isOnboarding
                    ? `text-lg font-semibold tracking-tight sm:text-xl ${highlighted ? "text-ds-on-primary" : "text-ds-on-surface"}`
                    : "text-lg font-bold"
                }
              >
                {plan.name}
              </h3>
              <p
                className={`${isOnboarding ? "mt-2 text-sm leading-relaxed" : "mt-2 text-sm"} ${
                  highlighted ? "text-white/85" : "text-ds-on-surface-variant"
                }`}
              >
                {plan.slug === "free"
                  ? "Try the product on a generous free tier."
                  : plan.slug === "growth"
                    ? "Best for growing support teams."
                    : `Included ${plan.included_conversations.toLocaleString()} billable conversations / month.`}
              </p>
              <div className={`flex items-baseline ${isOnboarding ? "mt-5 gap-1" : "mt-4"}`}>
                <span
                  className={
                    isOnboarding
                      ? `font-bold tabular-nums tracking-tight ${highlighted ? "text-4xl text-ds-on-primary sm:text-[2.5rem]" : "text-3xl text-ds-on-surface sm:text-4xl"}`
                      : "text-3xl font-black sm:text-4xl"
                  }
                >
                  {price}
                </span>
                {period ? (
                  <span
                    className={`ml-1 font-medium ${isOnboarding ? "text-[15px]" : "text-base"} ${highlighted ? "text-white/80" : "text-ds-on-surface-variant"}`}
                  >
                    {period}
                  </span>
                ) : null}
              </div>
            </div>
            <div
              className={
                isOnboarding
                  ? "mb-5 flex flex-col gap-2.5"
                  : "mb-8 flex min-h-0 flex-1 flex-col gap-2.5 sm:gap-3"
              }
            >
              {bullets.map((feature) => (
                <p
                  key={feature.label}
                  className={`flex items-start gap-2.5 text-sm leading-snug ${
                    feature.included ? "" : highlighted ? "text-white/75" : "text-ds-on-surface-variant"
                  } ${isOnboarding && feature.included && !highlighted ? "text-ds-on-surface" : ""}`}
                >
                  <span
                    className={`mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
                      highlighted
                        ? feature.included
                          ? "bg-white/20 text-ds-on-primary"
                          : "bg-white/10 text-white/60"
                        : feature.included
                          ? "bg-emerald-500/12 text-emerald-700"
                          : "bg-ds-sidebar text-ds-on-surface-variant"
                    }`}
                  >
                    {feature.included ? "✓" : "✕"}
                  </span>
                  {feature.label}
                </p>
              ))}
            </div>
            <Link
              href={cta.href}
              className={
                isOnboarding
                  ? `mx-auto mt-auto w-full max-w-none shrink-0 rounded-ds-md py-3 text-center text-sm font-semibold transition ${
                      highlighted
                        ? "bg-white text-ds-primary shadow-md hover:bg-ds-tertiary hover:text-white hover:shadow-lg"
                        : "border-2 border-ds-primary bg-transparent text-ds-primary hover:bg-ds-primary hover:text-ds-on-primary"
                    }`
                  : `mx-auto w-full max-w-[17rem] rounded-lg py-3 text-center text-sm font-semibold transition ${
                      highlighted
                        ? "bg-white text-ds-primary hover:bg-ds-tertiary hover:text-white"
                        : "border-2 border-ds-primary text-ds-primary hover:bg-ds-primary hover:text-ds-on-primary"
                    }`
              }
            >
              {cta.label}
            </Link>
          </article>
        );
      })}
    </div>
  );
}

type PricingComparisonProps = {
  plans: PublicPlanFromApi[] | null;
  loading?: boolean;
  loadError?: string | null;
};

export function PricingComparison({ plans, loading, loadError }: PricingComparisonProps) {
  if (loadError || loading || !plans?.length) {
    return null;
  }

  const growthIdx = plans.findIndex((p) => p.slug === "growth");

  const knowledgeMb = (f: Record<string, unknown>) => {
    const v = f.max_total_knowledge_mb;
    return typeof v === "number" ? `${v} MB total` : "—";
  };

  const overageLabel = (cents: number) => {
    if (cents <= 0) {
      return "No paid overage";
    }
    const d = cents / 100;
    const s = Number.isInteger(d) ? String(d) : d.toFixed(2);
    return `$${s} / conversation beyond included`;
  };

  const rows: { label: string; values: string[] }[] = [
    {
      label: "Billable conversations / month",
      values: plans.map((p) => p.included_conversations.toLocaleString()),
    },
    {
      label: "Agents included",
      values: plans.map((p) => String(p.max_agents)),
    },
    {
      label: "Total knowledge storage",
      values: plans.map((p) => knowledgeMb(p.features)),
    },
    {
      label: "Shopify integrations",
      values: plans.map((p) => (p.features.shopify_enabled === true ? "Yes" : "—")),
    },
    {
      label: "Paid overage (beyond included)",
      values: plans.map((p) => overageLabel(p.overage_conversation_cents)),
    },
  ];

  return (
    <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
      <table className="w-full border-collapse text-left">
        <thead>
          <tr className="bg-ds-sidebar">
            <th className="p-5 text-xs font-bold uppercase tracking-widest">Feature comparison</th>
            {plans.map((p) => (
              <th key={p.slug} className="p-5 text-sm font-semibold">
                {p.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100">
          {rows.map((row) => (
            <tr key={row.label}>
              <td className="p-5 text-sm font-medium">{row.label}</td>
              {row.values.map((cell, i) => (
                <td
                  key={`${row.label}-${plans[i]?.slug ?? i}`}
                  className={`p-5 text-sm ${growthIdx === i ? "font-semibold" : ""}`}
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
