"use client";

import Link from "next/link";
import { Fragment } from "react";

import {
  PRICING_DETAIL_SECTIONS,
  PRICING_MODEL_FOOTNOTES,
  PRICING_TEASER_BULLETS,
  PRICING_TIER_CARDS,
  PRICING_TIER_SLUGS,
  type DetailCell,
  type PricingTierSlug,
} from "@/lib/marketing/pricing-catalog";
import { formatMonthlyPrice } from "@/hooks/use-public-plans";

export type PricingCardsVariant = "teaser" | "onboarding" | "pricing";

function planCta(slug: string, isAuthenticated: boolean): { href: string; label: string } {
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

function DetailCellIcon({ cell, highlighted }: { cell: DetailCell; highlighted: boolean }) {
  const muted = highlighted ? "text-white/70" : "text-ds-on-surface-variant";
  const tickClass = highlighted ? "text-ds-on-primary bg-white/20" : "text-emerald-700 bg-emerald-500/12";

  switch (cell.kind) {
    case "tick":
      return (
        <span
          className={`inline-flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${tickClass}`}
          aria-label="Included"
        >
          ✓
        </span>
      );
    case "dash":
      return (
        <span
          className={`inline-flex min-h-6 min-w-6 items-center justify-center text-sm font-medium ${muted}`}
          aria-label="Not included"
        >
          —
        </span>
      );
    case "comingSoon":
      return (
        <span className={`text-xs font-medium ${muted}`} title="Coming soon">
          Soon
        </span>
      );
    case "text":
      return (
        <span className={`text-sm leading-snug ${highlighted ? "text-white/90" : "text-ds-on-surface"}`}>
          {cell.value}
        </span>
      );
    default:
      return null;
  }
}

function TeaserBulletList({ planSlug, highlighted }: { planSlug: PricingTierSlug; highlighted: boolean }) {
  const bullets = PRICING_TEASER_BULLETS[planSlug];
  const lineCls = highlighted ? "text-white/90" : "text-ds-on-surface";
  const tickCls = highlighted ? "text-emerald-200" : "text-emerald-600";

  return (
    <ul className="mt-4 min-h-0 flex-1 space-y-2.5 text-xs leading-snug sm:text-[13px]">
      {bullets.map((line) => (
        <li key={line} className={`flex gap-2.5 ${lineCls}`}>
          <span className={`mt-0.5 shrink-0 font-bold ${tickCls}`} aria-hidden>
            ✓
          </span>
          <span className="min-w-0">{line}</span>
        </li>
      ))}
    </ul>
  );
}

/** Full comparison for /pricing: every tier × every row + model footnotes. */
export function PricingFeatureMatrix() {
  return (
    <div className="border-ds-outline overflow-hidden rounded-xl border bg-white">
      <div className="border-ds-outline border-b bg-ds-muted px-4 py-3 sm:px-5">
        <h2 className="text-sm font-bold tracking-tight text-ds-on-surface sm:text-base">Compare all features</h2>
        <p className="text-ds-on-surface-variant mt-1 text-xs">
          Full tier-by-tier breakdown. The marketing home and onboarding flows show a short summary; every limit and
          feature is listed here.
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] border-collapse text-left">
          <thead>
            <tr className="border-b border-ds-outline bg-ds-muted/80">
              <th className="sticky left-0 z-[1] bg-ds-muted/95 p-3 text-xs font-bold uppercase tracking-wider text-ds-on-surface-variant sm:p-4">
                Feature
              </th>
              {PRICING_TIER_SLUGS.map((slug) => {
                const card = PRICING_TIER_CARDS.find((c) => c.slug === slug);
                return (
                  <th key={slug} className="p-3 text-center text-sm font-semibold text-ds-on-surface sm:p-4">
                    {card?.name ?? slug}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {PRICING_DETAIL_SECTIONS.map((section) => (
              <Fragment key={section.title}>
                <tr className="bg-ds-sidebar/60">
                  <td
                    colSpan={1 + PRICING_TIER_SLUGS.length}
                    className="text-ds-primary sticky left-0 px-3 py-2 text-[11px] font-bold uppercase tracking-widest sm:px-4"
                  >
                    {section.title}
                  </td>
                </tr>
                {section.rows.map((row) => (
                  <tr key={`${section.title}-${row.label}`} className="border-b border-ds-outline/60 last:border-0">
                    <td className="text-ds-on-surface-variant sticky left-0 z-[1] max-w-[12rem] bg-ds-surface p-3 text-xs font-medium sm:max-w-none sm:p-4 sm:text-sm">
                      {row.label}
                    </td>
                    {PRICING_TIER_SLUGS.map((slug) => (
                      <td key={slug} className="p-3 text-center align-middle sm:p-4">
                        <div className="flex justify-center">
                          {row.label === "Shopify" && slug === "free" ? (
                            <span
                              className="inline-flex min-h-6 min-w-6"
                              aria-label="Shopify is not included on the Free plan"
                            />
                          ) : (
                            <DetailCellIcon cell={row.cells[slug]} highlighted={false} />
                          )}
                        </div>
                      </td>
                    ))}
                  </tr>
                ))}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
      <div className="border-t border-ds-outline bg-ds-sidebar/40 px-4 py-4 sm:px-5">
        <h3 className="text-ds-primary text-[11px] font-bold uppercase tracking-widest">Model lists</h3>
        <div className="mt-3 grid gap-4 sm:grid-cols-3">
          {PRICING_MODEL_FOOTNOTES.map((block) => (
            <div key={block.title}>
              <p className="text-ds-on-surface text-xs font-semibold">{block.title}</p>
              <ul className="text-ds-on-surface-variant mt-1 list-inside list-disc space-y-0.5 text-[11px] leading-relaxed">
                {block.lines.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

type PricingCardsProps = {
  /** `teaser` / `onboarding`: name, price, short bullets, CTA. `pricing`: headline + CTA only. */
  variant?: PricingCardsVariant;
  loadError?: string | null;
  isAuthenticated?: boolean;
};

export function PricingCards({ variant = "teaser", loadError, isAuthenticated = false }: PricingCardsProps) {
  const isOnboarding = variant === "onboarding";
  const isPricingPage = variant === "pricing";
  const showTeaserBullets = variant === "teaser" || variant === "onboarding";

  if (loadError) {
    return (
      <div className="border-ds-outline text-ds-on-surface-variant rounded-ds-xl border bg-ds-surface p-6 text-center text-sm">
        {loadError}
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
      {PRICING_TIER_CARDS.map((plan) => {
        const highlighted = plan.slug === "standard";
        const { price, period } = formatMonthlyPrice(plan.monthlyPriceCents);
        const cta = planCta(plan.slug, isAuthenticated);
        return (
          <article
            key={plan.slug}
            className={
              isOnboarding
                ? `relative flex min-h-0 flex-col rounded-2xl p-5 sm:p-6 lg:h-full lg:min-h-[14rem] ${
                    highlighted
                      ? "relative isolate z-0 bg-ds-primary text-ds-on-primary shadow-[0_12px_40px_rgba(99,102,241,0.28)] ring-2 ring-ds-primary/60"
                      : "relative z-0 border border-ds-outline/45 bg-white text-ds-on-surface shadow-[0_6px_28px_rgba(15,23,42,0.06)] ring-1 ring-zinc-900/[0.05]"
                  }`
                : `relative flex flex-col rounded-xl border p-5 sm:p-6 lg:p-8 ${
                    highlighted
                      ? "border-ds-primary bg-ds-primary text-ds-on-primary shadow-xl sm:scale-[1.02] sm:shadow-2xl"
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
            <div className={isOnboarding ? "mb-1 shrink-0" : "mb-1 sm:mb-2"}>
              <h3
                className={
                  isOnboarding
                    ? `text-lg font-semibold tracking-tight sm:text-xl ${highlighted ? "text-ds-on-primary" : "text-ds-on-surface"}`
                    : "text-lg font-bold"
                }
              >
                {plan.name}
              </h3>
              {!isPricingPage ? (
                <p
                  className={`mt-1.5 line-clamp-2 text-xs leading-snug ${
                    highlighted ? "text-white/85" : "text-ds-on-surface-variant"
                  }`}
                >
                  {plan.tagline}
                </p>
              ) : null}
              <div className={`mt-3 flex flex-wrap items-baseline gap-x-2 gap-y-1 ${isOnboarding ? "gap-1" : ""}`}>
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
                    className={`font-medium ${isOnboarding ? "text-[15px]" : "text-base"} ${highlighted ? "text-white/80" : "text-ds-on-surface-variant"}`}
                  >
                    {period}
                  </span>
                ) : null}
              </div>
              {isPricingPage ? (
                <p
                  className={`mt-2 text-xs tabular-nums ${highlighted ? "text-white/75" : "text-ds-on-surface-variant"}`}
                >
                  {plan.includedConversations.toLocaleString()} conversations / mo · {plan.displayCostPerConversation}{" "}
                  / conv (est.)
                </p>
              ) : null}
            </div>

            {showTeaserBullets ? <TeaserBulletList planSlug={plan.slug} highlighted={highlighted} /> : null}

            <Link
              href={cta.href}
              className={
                isOnboarding
                  ? `mx-auto mt-4 w-full max-w-none shrink-0 rounded-ds-md py-3 text-center text-sm font-semibold transition ${
                      highlighted
                        ? "bg-white text-ds-primary shadow-md hover:bg-ds-primary-hover hover:text-ds-on-primary hover:shadow-lg"
                        : "border-2 border-ds-primary bg-transparent text-ds-primary hover:bg-ds-primary-hover hover:text-ds-on-primary"
                    }`
                  : `mx-auto mt-4 w-full max-w-[17rem] rounded-lg py-3 text-center text-sm font-semibold transition ${
                      highlighted
                        ? "bg-white text-ds-primary hover:bg-ds-primary-hover hover:text-ds-on-primary"
                        : "border-2 border-ds-primary text-ds-primary hover:bg-ds-primary-hover hover:text-ds-on-primary"
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
