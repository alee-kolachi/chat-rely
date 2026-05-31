"use client";

import Link from "next/link";
import { Fragment, useMemo, useState } from "react";

import { InfoHint } from "@/components/ui/info-hint";
import {
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

function PricingMatrixMobileView({
  slug,
  isAuthenticated,
  onPlanChange,
  onPlanCheckout,
  checkoutBusySlug = null,
}: {
  slug: PricingTierSlug;
  isAuthenticated: boolean;
  onPlanChange: (next: PricingTierSlug) => void;
  onPlanCheckout?: (slug: PricingTierSlug) => void;
  checkoutBusySlug?: string | null;
}) {
  const card = PRICING_TIER_CARDS.find((c) => c.slug === slug);
  const { price, period } = card ? formatMonthlyPrice(card.monthlyPriceCents) : { price: "", period: "" };
  const cta = planCta(slug, isAuthenticated);
  const highlighted = slug === "standard";
  const typography = unitedPlanColumnTypography("pricing");
  const popularBadge = <UnitedPlanPopularBadge />;
  const checkoutBusy = checkoutBusySlug === slug;

  return (
    <div className="p-4 sm:p-5">
      <label
        htmlFor="pricing-plan-select"
        className={`font-semibold uppercase tracking-wider ${highlighted ? "text-white/80" : "ds-app-body-muted"}`}
      >
        Choose a plan
      </label>
      <select
        id="pricing-plan-select"
        value={slug}
        onChange={(e) => onPlanChange(e.target.value as PricingTierSlug)}
        className={`mt-2 w-full cursor-pointer rounded-xl border px-4 py-3 text-base font-semibold shadow-sm focus:outline-none focus:ring-2 focus:ring-ds-primary/25 ${
          highlighted
            ? "border-white/25 bg-white/10 text-white focus:border-white/40"
            : "border-ds-outline text-ds-on-surface bg-white focus:border-ds-primary"
        }`}
      >
        {PRICING_TIER_SLUGS.map((tierSlug) => {
          const c = PRICING_TIER_CARDS.find((t) => t.slug === tierSlug);
          return (
            <option key={tierSlug} value={tierSlug}>
              {c?.name ?? tierSlug}
            </option>
          );
        })}
      </select>

      <div
        className={`mt-4 rounded-xl px-4 py-5 sm:px-5 ${
          highlighted ? "bg-ds-primary text-white" : "border border-zinc-200 bg-white text-ds-on-surface"
        }`}
      >
        <div className="mb-3 flex min-h-[1.75rem] items-center justify-center">
          {highlighted ? (
            popularBadge
          ) : (
            <span className="invisible inline-flex" aria-hidden>
              {popularBadge}
            </span>
          )}
        </div>
        {card ? (
          <>
            <h3 className={`${typography.name} ${highlighted ? "text-white" : "text-ds-on-surface"}`}>{card.name}</h3>
            <p
              className={`${typography.tagline} ${
                highlighted ? "text-white/85" : "text-ds-on-surface-variant"
              }`}
            >
              {card.tagline}
            </p>
          </>
        ) : null}

        <div
          className={`mt-4 flex flex-wrap items-baseline gap-x-2 gap-y-1 border-b pb-4 ${
            highlighted ? "border-white/20" : "border-zinc-200/70"
          }`}
        >
          <span className={`${typography.price} ${highlighted ? "text-white" : "text-ds-on-surface"}`}>{price}</span>
          {period ? (
            <span className={`${typography.period} ${highlighted ? "text-white/75" : "text-ds-on-surface-variant"}`}>
              {period}
            </span>
          ) : null}
        </div>

        {onPlanCheckout ? (
          <button
            type="button"
            disabled={checkoutBusy}
            onClick={() => onPlanCheckout(slug)}
            className={`${typography.cta} mt-4 w-full ${unitedPlanCtaClassName(highlighted)} disabled:cursor-wait disabled:opacity-70`}
          >
            {checkoutBusy
              ? "Opening checkout…"
              : slug === "free" && isAuthenticated
                ? "Stay on Free"
                : cta.label}
          </button>
        ) : (
          <Link href={cta.href} className={`${typography.cta} mt-4 w-full ${unitedPlanCtaClassName(highlighted)}`}>
            {slug === "free" && isAuthenticated ? "Stay on Free" : cta.label}
          </Link>
        )}
      </div>

      <div className={`mt-6 space-y-1 ${highlighted ? "rounded-xl bg-white p-4 text-ds-on-surface sm:p-5" : ""}`}>
        {PRICING_DETAIL_SECTIONS.map((section) => (
          <div key={section.title} className="pt-4 first:pt-0">
            <h3 className="text-ds-on-surface border-b border-ds-outline pb-2 text-xs font-bold uppercase tracking-widest">
              {section.title}
            </h3>
            <ul className="divide-y divide-ds-outline/60">
              {section.rows.map((row) => (
                <li key={`${section.title}-${row.label}`} className="flex items-center justify-between gap-3 py-3">
                  <span className="text-ds-on-surface-variant flex min-w-0 flex-1 items-start gap-1 text-sm font-medium leading-snug">
                    <span className="min-w-0">{row.label}</span>
                    {pricingRowTooltip(row.label) ? (
                      <InfoHint text={pricingRowTooltip(row.label)!} labelFor={row.label} placement="top" />
                    ) : null}
                  </span>
                  <span className="shrink-0 text-right">
                    <MatrixCellDisplay cell={row.cells[slug]} />
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Full pricing table: desktop = sticky united plan cards + scrolling feature rows; mobile = plan dropdown + single-plan details. */
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
  const [mobilePlan, setMobilePlan] = useState<PricingTierSlug>("standard");

  return (
    <div className={`${UNITED_PLAN_SHELL} lg:overflow-visible`}>
      <div className="lg:hidden">
        <PricingMatrixMobileView
          slug={mobilePlan}
          isAuthenticated={isAuthenticated}
          onPlanChange={setMobilePlan}
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
  const isOnboarding = variant === "onboarding";

  if (loadError) {
    return (
      <div className="border-ds-outline text-ds-on-surface-variant rounded-ds-xl border bg-ds-surface p-6 text-center text-sm">
        {loadError}
      </div>
    );
  }

  return (
    <div className={unitedPlanChrome(isOnboarding ? "onboarding" : "teaser").shell}>
      <PricingUnitedPlanColumns
        density={isOnboarding ? "onboarding" : "landing"}
        isAuthenticated={isAuthenticated}
        showTagline
        showFeatureRows={!isOnboarding}
        showTeaserBullets={isOnboarding}
        onPlanCheckout={isOnboarding ? onPlanCheckout : undefined}
        checkoutBusySlug={checkoutBusySlug}
        variant={variant}
      />
    </div>
  );
}
