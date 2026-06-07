"use client";

import Link from "next/link";
import { Fragment, useMemo } from "react";

import { InfoHint } from "@/components/ui/info-hint";
import {
  PRICING_AI_FOOTNOTES,
  PRICING_CARD_BULLETS,
  PRICING_DETAIL_SECTIONS,
  PRICING_TEASER_BULLETS,
  PRICING_TIER_CARDS,
  PRICING_TIER_SLUGS,
  buildLandingTierFeatureRows,
  pricingRowTooltip,
  type DetailCell,
  type PricingTierSlug,
} from "@/lib/marketing/pricing-catalog";
import { formatMonthlyPrice } from "@/hooks/use-public-plans";

export type PricingCardsVariant = "teaser" | "onboarding";

function pricingCardCtaLabel(
  plan: (typeof PRICING_TIER_CARDS)[number],
  context: PricingCardsVariant | "pricing",
  isAuthenticated: boolean,
  checkoutBusy: boolean,
  onPlanCheckout?: (slug: PricingTierSlug) => void,
): string {
  if (checkoutBusy) {
    return plan.slug === "free" && context === "onboarding" ? "Continuing…" : "Opening checkout…";
  }
  if (context === "onboarding" && plan.slug === "free") {
    return "Continue with Free";
  }
  if (onPlanCheckout) {
    return plan.slug === "free" && isAuthenticated ? "Open dashboard" : "Get started";
  }
  const { label } = planCta(plan.slug, isAuthenticated);
  return label === "Choose plan" ? "Get started" : label;
}

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

/** Matrix cell: compact check / dash / text (Chatbase-style ticks). */
function MatrixCellDisplay({ cell }: { cell: DetailCell }) {
  const muted = "text-ds-on-surface-variant";

  switch (cell.kind) {
    case "tick":
      return (
        <span
          className="inline-flex size-8 items-center justify-center rounded-full bg-emerald-500/[0.12] text-emerald-700"
          aria-label="Included"
        >
          <svg viewBox="0 0 16 16" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.5 8.5 6.5 11.5 12.5 4.5" />
          </svg>
        </span>
      );
    case "dash":
      return (
        <span className={`inline-flex min-h-8 min-w-8 items-center justify-center text-sm font-medium ${muted}`} aria-label="Not included">
          -
        </span>
      );
    case "comingSoon":
      return (
        <span className={`text-xs font-semibold ${muted}`} title="Coming soon">
          Soon
        </span>
      );
    case "text":
      if (cell.value.includes(" · ")) {
        const [primary, secondary] = cell.value.split(" · ");
        return (
          <span className="text-ds-on-surface text-xs font-medium leading-snug sm:text-sm">
            <span className="tabular-nums">{primary}</span>
            <span className="text-ds-on-surface-variant font-normal"> · {secondary}</span>
          </span>
        );
      }
      return <span className="text-ds-on-surface text-xs font-medium leading-snug sm:text-sm">{cell.value}</span>;
    default:
      return null;
  }
}

type PricingPlanFeatureRowsProps = {
  slug: PricingTierSlug;
  highlighted?: boolean;
  dense?: boolean;
  rowLimit?: number;
  className?: string;
};

export function PricingPlanFeatureRows({
  slug,
  highlighted = false,
  dense = false,
  rowLimit,
  className = "",
}: PricingPlanFeatureRowsProps) {
  const rows = useMemo(() => buildLandingTierFeatureRows(slug), [slug]);
  const visibleRows = useMemo(() => {
    if (rowLimit == null || rows.length <= rowLimit) return rows;
    return rows.slice(0, rowLimit);
  }, [rows, rowLimit]);

  const labelCls = highlighted ? "text-white/90" : "text-ds-on-surface-variant";
  const valueCls = highlighted ? "text-white" : "text-ds-on-surface";
  const mutedCls = highlighted ? "text-white/55" : "text-ds-on-surface-variant";
  const rowText = dense ? "text-sm leading-snug" : "text-xs sm:text-sm";
  const gap = dense ? "gap-2 py-1.5" : "gap-2.5 py-2 sm:py-2.5";

  return (
    <ul className={`min-h-0 min-w-0 flex-1 divide-y divide-ds-outline/50 ${dense ? "" : "mt-1"} ${className}`}>
      {visibleRows.map((row) =>
        row.rowKind === "inherit" ? (
          <li key={row.key} className={`${gap} first:pt-0`}>
            <p className={`font-semibold leading-snug ${highlighted ? "text-white/85" : "text-ds-on-surface-variant"} ${rowText}`}>
              {row.displayLabel}
            </p>
          </li>
        ) : (
          <li key={row.key} className={`flex min-w-0 items-start justify-between gap-2 ${gap} first:pt-0`}>
            <span className={`flex min-w-0 flex-1 items-center gap-0.5 pr-1 font-medium ${labelCls} ${rowText}`}>
              <span className="min-w-0 break-words">{row.displayLabel}</span>
              {row.tooltip ? (
                <InfoHint text={row.tooltip} labelFor={row.displayLabel} highlighted={highlighted} placement="top" />
              ) : null}
            </span>
            <span className={`min-w-0 max-w-[58%] shrink-0 text-right font-semibold tabular-nums ${valueCls} ${rowText}`}>
              <span className="inline-flex flex-wrap items-baseline justify-end gap-x-1.5 gap-y-0.5">
                <span>{row.value}</span>
                {row.mutedSuffix ? (
                  <span className={`text-xs font-normal normal-case ${mutedCls}`}>{row.mutedSuffix}</span>
                ) : null}
              </span>
            </span>
          </li>
        ),
      )}
    </ul>
  );
}

function PricingTableColgroup() {
  return (
    <colgroup>
      <col style={{ width: "26%" }} />
      {PRICING_TIER_SLUGS.map((slug) => (
        <col key={slug} style={{ width: "18.5%" }} />
      ))}
    </colgroup>
  );
}

const UNITED_PLAN_SHELL = "min-w-0 overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm";
const UNITED_PLAN_GRID =
  "grid grid-cols-1 divide-y divide-zinc-200 lg:grid-cols-4 lg:divide-y-0";
const PLAN_COLUMN_DIVIDER = "border-l border-zinc-200";

function UnitedPlanPopularBadge() {
  return (
    <span className="inline-flex rounded-full border border-white/20 bg-black px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white shadow-md [background-image:linear-gradient(rgba(255,255,255,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.06)_1px,transparent_1px)] [background-size:10px_10px,10px_10px]">
      Popular
    </span>
  );
}

function unitedPlanCtaClassName(highlighted: boolean) {
  return highlighted
    ? "bg-white text-ds-primary hover:bg-zinc-100"
    : "border-2 border-ds-primary text-ds-primary hover:bg-ds-primary hover:text-white";
}

type UnitedPlanColumnDensity = "landing" | "pricing" | "onboarding";

function unitedPlanColumnTypography(density: UnitedPlanColumnDensity) {
  if (density === "onboarding") {
    return {
      column: "px-6 py-8 text-center sm:px-7 lg:py-9",
      name: "text-lg font-semibold tracking-tight sm:text-xl",
      tagline: "mt-2 text-sm leading-relaxed",
      price: "text-3xl font-bold tabular-nums tracking-tight",
      period: "text-sm font-medium",
      cta: "mx-auto mt-8 w-full rounded-ds-lg py-3 text-center text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ds-primary focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-70",
    };
  }
  if (density === "landing") {
    return {
      column: "px-5 py-7 sm:px-6 lg:py-8",
      name: "text-xl font-semibold tracking-tight",
      tagline: "mt-2 line-clamp-2 text-sm leading-relaxed",
      price: "text-3xl font-bold tabular-nums tracking-tight sm:text-4xl",
      period: "text-sm font-medium",
      cta: "mx-auto mt-6 w-full rounded-xl py-3 text-center text-sm font-semibold transition",
    };
  }
  return {
    column: "px-4 py-6 text-center sm:px-5 sm:py-7",
    name: "text-lg font-bold tracking-tight sm:text-xl",
    tagline: "mt-1.5 line-clamp-2 text-sm leading-snug",
    price: "text-2xl font-bold tabular-nums tracking-tight sm:text-3xl",
    period: "text-sm font-medium",
    cta: "mx-auto mt-5 inline-flex min-w-[9.5rem] max-w-full items-center justify-center rounded-xl px-5 py-2.5 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ds-primary focus-visible:ring-offset-2",
  };
}

function OnboardingPopularBadge() {
  return (
    <span className="inline-flex rounded-full border border-white/25 bg-white/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
      Popular
    </span>
  );
}

type UnitedPlanColumnContentProps = {
  plan: (typeof PRICING_TIER_CARDS)[number];
  highlighted: boolean;
  density: UnitedPlanColumnDensity;
  isAuthenticated: boolean;
  showTagline?: boolean;
  showFeatureRows?: boolean;
  showTeaserBullets?: boolean;
  onPlanCheckout?: (slug: PricingTierSlug) => void;
  checkoutBusySlug?: string | null;
};

function UnitedPlanColumnContent({
  plan,
  highlighted,
  density,
  isAuthenticated,
  showTagline = false,
  showFeatureRows = false,
  showTeaserBullets = false,
  onPlanCheckout,
  checkoutBusySlug = null,
}: UnitedPlanColumnContentProps) {
  const typography = unitedPlanColumnTypography(density);
  const { price, period } = formatMonthlyPrice(plan.monthlyPriceCents);
  const cta = planCta(plan.slug, isAuthenticated);
  const isOnboarding = density === "onboarding";
  const popularBadge = isOnboarding ? <OnboardingPopularBadge /> : <UnitedPlanPopularBadge />;
  const checkoutBusy = checkoutBusySlug === plan.slug;

  return (
    <>
      <div className="mb-3 flex min-h-[1.75rem] items-center justify-center">
        {highlighted ? (
          popularBadge
        ) : (
          <span className="invisible inline-flex" aria-hidden>
            {popularBadge}
          </span>
        )}
      </div>
      <h3 className={`${typography.name} ${highlighted ? "text-white" : "text-ds-on-surface"}`}>{plan.name}</h3>
      {showTagline ? (
        <p className={`${typography.tagline} ${highlighted ? "text-white/85" : "text-ds-on-surface-variant"}`}>
          {plan.tagline}
        </p>
      ) : null}
      <div
        className={`flex flex-wrap items-baseline gap-x-2 gap-y-1 ${
          density === "pricing" ? "justify-center" : ""
        } ${showTagline ? "mt-4" : "mt-3"}`}
      >
        <span className={`${typography.price} ${highlighted ? "text-white" : "text-ds-on-surface"}`}>{price}</span>
        {period ? (
          <span className={`${typography.period} ${highlighted ? "text-white/75" : "text-ds-on-surface-variant"}`}>
            {period}
          </span>
        ) : null}
      </div>
      {showFeatureRows ? (
        <div className="mt-5 min-w-0 flex-1 text-left">
          <PricingPlanFeatureRows slug={plan.slug} highlighted={highlighted} dense />
        </div>
      ) : null}
      {showTeaserBullets ? (
        <div className="mt-5 min-w-0 flex-1 text-left">
          <TeaserBulletList planSlug={plan.slug} highlighted={highlighted} onboarding />
        </div>
      ) : null}
      {onPlanCheckout ? (
        <button
          type="button"
          disabled={checkoutBusy}
          onClick={() => onPlanCheckout(plan.slug)}
          className={`${typography.cta} ${unitedPlanCtaClassName(highlighted)} disabled:cursor-wait disabled:opacity-70`}
        >
          {checkoutBusy
            ? "Opening checkout…"
            : plan.slug === "free"
              ? "Continue with Free"
              : cta.label}
        </button>
      ) : (
        <Link href={cta.href} className={`${typography.cta} ${unitedPlanCtaClassName(highlighted)}`}>
          {plan.slug === "free" && isAuthenticated ? "Stay on Free" : cta.label}
        </Link>
      )}
    </>
  );
}

type PricingUnitedPlanColumnsProps = {
  density: UnitedPlanColumnDensity;
  isAuthenticated: boolean;
  showTagline?: boolean;
  showFeatureRows?: boolean;
  showTeaserBullets?: boolean;
  onPlanCheckout?: (slug: PricingTierSlug) => void;
  checkoutBusySlug?: string | null;
  variant?: PricingCardsVariant;
};

function unitedPlanChrome(variant: PricingCardsVariant = "teaser") {
  const isOnboarding = variant === "onboarding";
  return {
    shell: isOnboarding
      ? "min-w-0 overflow-hidden rounded-ds-xl border border-ds-outline bg-ds-surface shadow-sm"
      : UNITED_PLAN_SHELL,
    grid: isOnboarding
      ? "grid grid-cols-1 divide-y divide-ds-outline lg:grid-cols-4 lg:divide-y-0"
      : UNITED_PLAN_GRID,
    columnDivider: isOnboarding ? "border-l border-ds-outline" : PLAN_COLUMN_DIVIDER,
  };
}

function PricingUnitedPlanColumns({
  density,
  isAuthenticated,
  showTagline = false,
  showFeatureRows = false,
  showTeaserBullets = false,
  onPlanCheckout,
  checkoutBusySlug = null,
  variant = "teaser",
}: PricingUnitedPlanColumnsProps) {
  const typography = unitedPlanColumnTypography(density);
  const { grid, columnDivider } = unitedPlanChrome(variant);

  return (
    <div className={grid}>
      {PRICING_TIER_CARDS.map((plan, planIndex) => {
        const highlighted = plan.slug === "standard";

        return (
          <div
            key={plan.slug}
            className={`flex min-w-0 flex-col ${typography.column} ${
              planIndex > 0 ? columnDivider : ""
            } ${highlighted ? "bg-ds-primary text-white" : "bg-white text-ds-on-surface"}`}
          >
            <UnitedPlanColumnContent
              plan={plan}
              highlighted={highlighted}
              density={density}
              isAuthenticated={isAuthenticated}
              showTagline={showTagline}
              showFeatureRows={showFeatureRows}
              showTeaserBullets={showTeaserBullets}
              onPlanCheckout={onPlanCheckout}
              checkoutBusySlug={checkoutBusySlug}
            />
          </div>
        );
      })}
    </div>
  );
}

function PricingMatrixPlanHeader({
  isAuthenticated,
  onPlanCheckout,
  checkoutBusySlug = null,
}: {
  isAuthenticated: boolean;
  onPlanCheckout?: (slug: PricingTierSlug) => void;
  checkoutBusySlug?: string | null;
}) {
  const typography = unitedPlanColumnTypography("pricing");

  return (
    <tr>
      <td className="bg-white p-0" aria-hidden />
      {PRICING_TIER_CARDS.map((plan) => {
        const highlighted = plan.slug === "standard";

        return (
          <td
            key={plan.slug}
            className={`${PLAN_COLUMN_DIVIDER} align-top ${typography.column} ${
              highlighted ? "bg-ds-primary text-white" : "bg-white text-ds-on-surface"
            }`}
          >
            <UnitedPlanColumnContent
              plan={plan}
              highlighted={highlighted}
              density="pricing"
              isAuthenticated={isAuthenticated}
              showTagline
              onPlanCheckout={onPlanCheckout}
              checkoutBusySlug={checkoutBusySlug}
            />
          </td>
        );
      })}
    </tr>
  );
}

function PricingMatrixFeatureBody() {
  return (
    <>
      {PRICING_DETAIL_SECTIONS.map((section) => (
        <Fragment key={section.title}>
          <tr className="bg-zinc-50/90">
            <td
              colSpan={1 + PRICING_TIER_SLUGS.length}
              className="text-ds-on-surface border-b border-ds-outline px-4 py-2.5 text-xs font-bold uppercase tracking-widest sm:px-5"
            >
              {section.title}
            </td>
          </tr>
          {section.rows.map((row) => (
            <tr key={`${section.title}-${row.label}`} className="border-b border-ds-outline/70 bg-white">
              <td className="text-ds-on-surface max-w-[14rem] px-4 py-3 align-middle sm:max-w-none sm:px-5 sm:py-3.5">
                <span className="flex items-start gap-1 text-xs font-medium leading-snug sm:text-sm">
                  <span className="min-w-0">{row.label}</span>
                  {pricingRowTooltip(row.label) ? (
                    <InfoHint text={pricingRowTooltip(row.label)!} labelFor={row.label} placement="right" />
                  ) : null}
                </span>
              </td>
              {PRICING_TIER_SLUGS.map((slug) => (
                <td key={slug} className={`${PLAN_COLUMN_DIVIDER} px-3 py-3 text-center align-middle sm:px-4 sm:py-3.5`}>
                  <div className="flex justify-center">
                    <MatrixCellDisplay cell={row.cells[slug]} />
                  </div>
                </td>
              ))}
            </tr>
          ))}
        </Fragment>
      ))}
    </>
  );
}

function PricingCardCheckIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      className={`size-4 shrink-0 ${className}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.5 8.5 6.5 11.5 12.5 4.5" />
    </svg>
  );
}

function hunterCardCtaClassName(highlighted: boolean) {
  return highlighted
    ? "bg-ds-primary text-ds-on-primary hover:bg-ds-primary-hover"
    : "border-2 border-ds-primary text-ds-primary hover:bg-ds-primary hover:text-ds-on-primary";
}

type PricingPlanCardProps = {
  plan: (typeof PRICING_TIER_CARDS)[number];
  highlighted?: boolean;
  context?: PricingCardsVariant | "pricing";
  isAuthenticated: boolean;
  onPlanCheckout?: (slug: PricingTierSlug) => void;
  checkoutBusySlug?: string | null;
};

function PricingPlanCard({
  plan,
  highlighted = false,
  context = "pricing",
  isAuthenticated,
  onPlanCheckout,
  checkoutBusySlug = null,
}: PricingPlanCardProps) {
  const { price, period } = formatMonthlyPrice(plan.monthlyPriceCents);
  const cta = planCta(plan.slug, isAuthenticated);
  const checkoutBusy = checkoutBusySlug === plan.slug;
  const bullets = PRICING_CARD_BULLETS[plan.slug];
  const ctaLabel = pricingCardCtaLabel(plan, context, isAuthenticated, checkoutBusy, onPlanCheckout);

  const ctaClass = `mt-6 inline-flex w-full min-h-11 items-center justify-center rounded-xl px-5 py-3 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ds-primary focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-70 ${hunterCardCtaClassName(highlighted)}`;

  return (
    <article
      className={`flex h-full flex-col rounded-2xl border bg-white p-6 shadow-[0_1px_3px_rgba(15,23,42,0.06)] sm:p-7 ${
        highlighted
          ? "border-ds-primary/35 ring-2 ring-ds-primary/15"
          : "border-ds-outline"
      }`}
    >
      <div className="mb-1 flex min-h-[1.5rem] items-center">
        {highlighted ? (
          <span className="inline-flex rounded-full bg-ds-primary px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-ds-on-primary">
            Popular
          </span>
        ) : null}
      </div>
      <h3 className="mkt-display text-xl text-ds-on-surface">{plan.name}</h3>
      <div className="mt-4 flex flex-wrap items-baseline gap-x-1.5 gap-y-1">
        <span className="mkt-display text-4xl tabular-nums text-ds-on-surface">{price}</span>
        {period ? (
          <span className="text-sm font-medium text-ds-on-surface-variant">{period}</span>
        ) : null}
      </div>
      <p className="mt-2 text-sm leading-snug text-ds-on-surface-variant">{plan.tagline}</p>
      {onPlanCheckout ? (
        <button
          type="button"
          disabled={checkoutBusy}
          onClick={() => onPlanCheckout(plan.slug)}
          className={ctaClass}
        >
          {ctaLabel}
        </button>
      ) : (
        <Link href={cta.href} className={ctaClass}>
          {ctaLabel}
        </Link>
      )}
      <div className="border-ds-outline/70 mt-6 border-t pt-6">
        <ul className="space-y-3 text-sm leading-snug text-ds-on-surface">
          {bullets.map((line) => (
            <li key={line} className="flex gap-2.5">
              <span className="mt-0.5 inline-flex size-5 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-700">
                <PricingCardCheckIcon />
              </span>
              <span className="min-w-0">{line}</span>
            </li>
          ))}
        </ul>
      </div>
    </article>
  );
}

type PricingPlanCardsGridProps = {
  context?: PricingCardsVariant | "pricing";
  isAuthenticated?: boolean;
  onPlanCheckout?: (slug: PricingTierSlug) => void;
  checkoutBusySlug?: string | null;
};

/** Hunter-style separate plan cards in a responsive grid. */
export function PricingPlanCardsGrid({
  context = "pricing",
  isAuthenticated = false,
  onPlanCheckout,
  checkoutBusySlug = null,
}: PricingPlanCardsGridProps) {
  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4 xl:gap-4">
      {PRICING_TIER_CARDS.map((plan) => (
        <PricingPlanCard
          key={plan.slug}
          plan={plan}
          highlighted={plan.slug === "standard"}
          context={context}
          isAuthenticated={isAuthenticated}
          onPlanCheckout={onPlanCheckout}
          checkoutBusySlug={checkoutBusySlug}
        />
      ))}
    </div>
  );
}

function PricingComparisonPlanHeader({
  isAuthenticated,
  onPlanCheckout,
  checkoutBusySlug = null,
}: {
  isAuthenticated: boolean;
  onPlanCheckout?: (slug: PricingTierSlug) => void;
  checkoutBusySlug?: string | null;
}) {
  return (
    <tr className="border-b border-ds-outline bg-white">
      <th
        scope="col"
        className="sticky left-0 z-10 bg-white px-4 py-4 text-left text-sm font-semibold text-ds-on-surface sm:px-5"
      >
        <span className="sr-only">Feature</span>
      </th>
      {PRICING_TIER_CARDS.map((plan) => {
        const { price, period } = formatMonthlyPrice(plan.monthlyPriceCents);
        const cta = planCta(plan.slug, isAuthenticated);
        const checkoutBusy = checkoutBusySlug === plan.slug;
        const highlighted = plan.slug === "standard";

        return (
          <th
            key={plan.slug}
            scope="col"
            className={`min-w-[9rem] px-3 py-4 text-center align-top sm:min-w-[10rem] sm:px-4 ${
              highlighted ? "bg-ds-primary/[0.04]" : ""
            }`}
          >
            <p className="text-sm font-semibold text-ds-on-surface">{plan.name}</p>
            <p className="mt-2 text-2xl font-bold tabular-nums tracking-tight text-ds-on-surface">
              {price}
              {period ? (
                <span className="text-ds-on-surface-variant text-sm font-medium"> {period}</span>
              ) : null}
            </p>
            {onPlanCheckout ? (
              <button
                type="button"
                disabled={checkoutBusy}
                onClick={() => onPlanCheckout(plan.slug)}
                className={`mt-3 inline-flex min-h-9 w-full max-w-[9.5rem] items-center justify-center rounded-lg px-3 py-2 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ds-primary focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-70 sm:text-sm ${hunterCardCtaClassName(highlighted)}`}
              >
                {checkoutBusy ? "Opening…" : plan.slug === "free" ? "Get started" : "Get started"}
              </button>
            ) : (
              <Link
                href={cta.href}
                className={`mt-3 inline-flex min-h-9 w-full max-w-[9.5rem] items-center justify-center rounded-lg px-3 py-2 text-xs font-semibold transition sm:text-sm ${hunterCardCtaClassName(highlighted)}`}
              >
                Get started
              </Link>
            )}
          </th>
        );
      })}
    </tr>
  );
}

type PricingComparisonTableProps = {
  isAuthenticated?: boolean;
  onPlanCheckout?: (slug: PricingTierSlug) => void;
  checkoutBusySlug?: string | null;
};

/** Feature comparison table below the plan cards. */
export function PricingComparisonTable({
  isAuthenticated = false,
  onPlanCheckout,
  checkoutBusySlug = null,
}: PricingComparisonTableProps) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-ds-outline bg-white shadow-sm">
      <table className="w-full min-w-[48rem] border-collapse text-left">
        <PricingTableColgroup />
        <thead>
          <PricingComparisonPlanHeader
            isAuthenticated={isAuthenticated}
            onPlanCheckout={onPlanCheckout}
            checkoutBusySlug={checkoutBusySlug}
          />
        </thead>
        <tbody>
          <PricingMatrixFeatureBody />
        </tbody>
      </table>
    </div>
  );
}

type PricingPagePlansProps = {
  isAuthenticated?: boolean;
  onPlanCheckout?: (slug: PricingTierSlug) => void;
  checkoutBusySlug?: string | null;
};

/** Full marketing pricing page: Hunter-style cards plus comparison table. */
export function PricingPagePlans({
  isAuthenticated = false,
  onPlanCheckout,
  checkoutBusySlug = null,
}: PricingPagePlansProps) {
  return (
    <div className="space-y-16 sm:space-y-20">
      <PricingPlanCardsGrid
        context="pricing"
        isAuthenticated={isAuthenticated}
        onPlanCheckout={onPlanCheckout}
        checkoutBusySlug={checkoutBusySlug}
      />
      <section>
        <h2 className="mkt-display mb-8 text-center text-3xl sm:text-4xl">Compare plans and features</h2>
        <PricingComparisonTable
          isAuthenticated={isAuthenticated}
          onPlanCheckout={onPlanCheckout}
          checkoutBusySlug={checkoutBusySlug}
        />
        {PRICING_AI_FOOTNOTES.map((block) => (
          <div key={block.title} className="mt-8 max-w-3xl">
            <h3 className="text-sm font-semibold text-ds-on-surface">{block.title}</h3>
            <ul className="mt-3 space-y-2 text-[0.9375rem] leading-relaxed text-ds-on-surface-variant">
              {block.lines.map((line) => (
                <li key={line} className="flex gap-3">
                  <span className="mt-2 size-1.5 shrink-0 rounded-full bg-ds-primary" aria-hidden />
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </section>
    </div>
  );
}

/** Full pricing table: desktop = sticky united plan cards + scrolling feature rows; mobile = stacked plan cards. */
type PricingFeatureMatrixProps = {
  isAuthenticated?: boolean;
  onPlanCheckout?: (slug: PricingTierSlug) => void;
  checkoutBusySlug?: string | null;
};

export function PricingFeatureMatrix({
  isAuthenticated = false,
  onPlanCheckout,
  checkoutBusySlug = null,
}: PricingFeatureMatrixProps) {
  return (
    <div className={`${UNITED_PLAN_SHELL} lg:overflow-visible`}>
      <div className="lg:hidden">
        <PricingUnitedPlanColumns
          density="pricing"
          isAuthenticated={isAuthenticated}
          showTagline
          showFeatureRows
          onPlanCheckout={onPlanCheckout}
          checkoutBusySlug={checkoutBusySlug}
        />
      </div>

      <div className="hidden lg:block">
        <table className="w-full table-fixed border-collapse text-left">
          <PricingTableColgroup />
          <thead className="sticky top-16 z-40 border-b border-zinc-200 bg-white shadow-[0_6px_16px_-4px_rgba(15,23,42,0.1)]">
            <PricingMatrixPlanHeader
              isAuthenticated={isAuthenticated}
              onPlanCheckout={onPlanCheckout}
              checkoutBusySlug={checkoutBusySlug}
            />
          </thead>
          <tbody>
            <PricingMatrixFeatureBody />
          </tbody>
        </table>
      </div>
    </div>
  );
}

function TeaserBulletList({
  planSlug,
  highlighted,
  onboarding = false,
}: {
  planSlug: PricingTierSlug;
  highlighted: boolean;
  onboarding?: boolean;
}) {
  const bullets = PRICING_TEASER_BULLETS[planSlug];
  const lineCls = highlighted ? "text-white/90" : "text-ds-on-surface";
  const tickCls = highlighted ? "text-emerald-200" : "text-emerald-600";

  return (
    <ul
      className={`min-h-0 flex-1 ${onboarding ? "space-y-3 text-sm leading-relaxed" : "mt-4 space-y-2.5 text-xs leading-snug sm:text-[13px]"}`}
    >
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

type PricingCardsProps = {
  variant?: PricingCardsVariant;
  loadError?: string | null;
  isAuthenticated?: boolean;
  onPlanCheckout?: (slug: PricingTierSlug) => void;
  checkoutBusySlug?: string | null;
};

export function PricingCards({
  variant = "teaser",
  loadError,
  isAuthenticated = false,
  onPlanCheckout,
  checkoutBusySlug = null,
}: PricingCardsProps) {
  if (loadError) {
    return (
      <div className="border-ds-outline text-ds-on-surface-variant rounded-ds-xl border bg-ds-surface p-6 text-center text-sm">
        {loadError}
      </div>
    );
  }

  return (
    <PricingPlanCardsGrid
      context={variant}
      isAuthenticated={isAuthenticated}
      onPlanCheckout={variant === "onboarding" ? onPlanCheckout : undefined}
      checkoutBusySlug={checkoutBusySlug}
    />
  );
}
