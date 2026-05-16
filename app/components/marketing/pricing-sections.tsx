"use client";

import Link from "next/link";
import { createPortal } from "react-dom";
import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  LANDING_ROW_TOOLTIPS,
  PRICING_DETAIL_SECTIONS,
  PRICING_TEASER_BULLETS,
  PRICING_TIER_CARDS,
  PRICING_TIER_SLUGS,
  buildLandingTierFeatureRows,
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

type InfoHintPlacement = "top" | "right";

function FeatureRowInfoHint({
  text,
  labelFor,
  highlighted,
  placement = "top",
}: {
  text: string;
  labelFor: string;
  highlighted?: boolean;
  placement?: InfoHintPlacement;
}) {
  const btnRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [rect, setRect] = useState<DOMRect | null>(null);

  const measure = useCallback(() => {
    const el = btnRef.current;
    if (!el) return;
    setRect(el.getBoundingClientRect());
  }, []);

  const show = useCallback(() => {
    measure();
    setOpen(true);
  }, [measure]);

  const hide = useCallback(() => {
    setOpen(false);
    setRect(null);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onReposition = () => {
      measure();
    };
    window.addEventListener("scroll", hide, true);
    window.addEventListener("resize", onReposition);
    return () => {
      window.removeEventListener("scroll", hide, true);
      window.removeEventListener("resize", onReposition);
    };
  }, [open, hide, measure]);

  const btnCls = highlighted
    ? "text-white/70 hover:text-white focus-visible:ring-white/80"
    : "text-ds-on-surface-variant hover:text-ds-primary focus-visible:ring-ds-primary";

  const bubbleBase =
    "pointer-events-none fixed z-[99999] w-max max-w-[min(20rem,calc(100vw-1.5rem))] rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-left text-sm leading-snug text-zinc-800 shadow-xl";

  return (
    <>
      <span className="relative ml-0.5 inline-flex shrink-0 align-middle">
        <button
          ref={btnRef}
          type="button"
          onPointerEnter={show}
          onPointerLeave={hide}
          onFocus={show}
          onBlur={hide}
          className={`inline-flex size-5 items-center justify-center rounded-full outline-none focus-visible:ring-2 ${btnCls}`}
          aria-label={`More about ${labelFor}`}
        >
          <svg viewBox="0 0 20 20" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
            <circle cx="10" cy="10" r="7.25" />
            <path strokeLinecap="round" d="M10 14V9.25M10 6.75h.01" />
          </svg>
        </button>
      </span>
      {open && rect && typeof document !== "undefined"
        ? createPortal(
            <span
              role="tooltip"
              className={bubbleBase}
              style={
                placement === "right"
                  ? {
                      left: rect.right + 10,
                      top: rect.top + rect.height / 2,
                      transform: "translateY(-50%)",
                    }
                  : {
                      left: rect.left + rect.width / 2,
                      top: rect.top - 10,
                      transform: "translate(-50%, -100%)",
                    }
              }
            >
              {text}
            </span>,
            document.body,
          )
        : null}
    </>
  );
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
          —
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
                <FeatureRowInfoHint text={row.tooltip} labelFor={row.displayLabel} highlighted={highlighted} placement="top" />
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

function PlanHeaderPopularRow() {
  return (
    <tr className="bg-white">
      <td className="px-4 pt-2 sm:px-5" />
      {PRICING_TIER_SLUGS.map((slug) => (
        <td key={slug} className="px-3 pt-2 text-center sm:px-5">
          {slug === "standard" ? (
            <span className="bg-ds-primary/10 text-ds-primary inline-block rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider">
              Popular
            </span>
          ) : null}
        </td>
      ))}
    </tr>
  );
}

function PlanHeaderNameRow() {
  return (
    <tr className="border-b border-ds-outline bg-white">
      <th
        scope="col"
        className="text-ds-on-surface-variant px-4 py-3 text-left align-bottom text-xs font-semibold uppercase tracking-wider sm:px-5"
      >
        <span className="sr-only">Plans</span>
      </th>
      {PRICING_TIER_SLUGS.map((slug) => {
        const card = PRICING_TIER_CARDS.find((c) => c.slug === slug);
        return (
          <th key={slug} scope="col" className="text-ds-on-surface border-b border-ds-outline px-3 py-3 text-center align-bottom sm:px-5">
            <span className="text-lg font-bold tracking-tight sm:text-xl">{card?.name ?? slug}</span>
          </th>
        );
      })}
    </tr>
  );
}

function PlanHeaderPriceRow() {
  return (
    <tr className="border-b border-ds-outline bg-white">
      <td className="px-4 py-3 sm:px-5" />
      {PRICING_TIER_SLUGS.map((slug) => {
        const card = PRICING_TIER_CARDS.find((c) => c.slug === slug);
        if (!card) return null;
        const { price, period } = formatMonthlyPrice(card.monthlyPriceCents);
        return (
          <td key={slug} className="text-ds-on-surface border-b border-ds-outline px-3 py-3 text-center sm:px-5">
            <div className="flex flex-wrap items-baseline justify-center gap-x-1">
              <span className="text-2xl font-bold tabular-nums tracking-tight sm:text-3xl">{price}</span>
              {period ? <span className="text-ds-on-surface-variant text-sm font-medium">{period}</span> : null}
            </div>
          </td>
        );
      })}
    </tr>
  );
}

function PlanHeaderCtaRow({ isAuthenticated }: { isAuthenticated: boolean }) {
  return (
    <tr className="border-b border-ds-outline bg-white">
      <td className="px-4 py-4 sm:px-5" />
      {PRICING_TIER_SLUGS.map((slug) => {
        const cta = planCta(slug, isAuthenticated);
        const isStandard = slug === "standard";
        return (
          <td key={slug} className="border-b border-ds-outline px-3 py-4 text-center sm:px-5">
            {isStandard ? (
              <Link
                href={cta.href}
                className="inline-flex min-w-[9.5rem] items-center justify-center rounded-xl bg-gradient-to-b from-[#a028b3] via-ds-primary to-[#6a1578] px-5 py-2.5 text-sm font-semibold text-ds-on-primary shadow-[0_10px_32px_-8px_rgba(131,28,145,0.55)] ring-1 ring-white/30 transition hover:shadow-[0_14px_40px_-8px_rgba(131,28,145,0.65)] hover:ring-white/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ds-primary focus-visible:ring-offset-2"
              >
                {cta.label}
              </Link>
            ) : (
              <Link
                href={cta.href}
                className="text-ds-on-surface hover:border-ds-primary/35 hover:bg-zinc-50 focus-visible:ring-ds-primary inline-flex min-w-[9.5rem] items-center justify-center rounded-xl border border-zinc-200 bg-white px-5 py-2.5 text-sm font-semibold shadow-sm transition hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
              >
                {cta.label}
              </Link>
            )}
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
                  {LANDING_ROW_TOOLTIPS[row.label] ? (
                    <FeatureRowInfoHint
                      text={LANDING_ROW_TOOLTIPS[row.label]}
                      labelFor={row.label}
                      placement="right"
                    />
                  ) : null}
                </span>
              </td>
              {PRICING_TIER_SLUGS.map((slug) => (
                <td key={slug} className="px-3 py-3 text-center align-middle sm:px-4 sm:py-3.5">
                  <div className="flex justify-center">
                    {row.label === "Shopify" && slug === "free" ? (
                      <span className="inline-flex min-h-8 min-w-8" aria-label="Shopify is not included on the Free plan" />
                    ) : (
                      <MatrixCellDisplay cell={row.cells[slug]} />
                    )}
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
}: {
  slug: PricingTierSlug;
  isAuthenticated: boolean;
  onPlanChange: (next: PricingTierSlug) => void;
}) {
  const card = PRICING_TIER_CARDS.find((c) => c.slug === slug);
  const { price, period } = card ? formatMonthlyPrice(card.monthlyPriceCents) : { price: "", period: "" };
  const cta = planCta(slug, isAuthenticated);
  const isStandard = slug === "standard";

  return (
    <div className="bg-white p-4 sm:p-5">
      <label htmlFor="pricing-plan-select" className="text-ds-on-surface-variant text-xs font-semibold uppercase tracking-wider">
        Choose a plan
      </label>
      <select
        id="pricing-plan-select"
        value={slug}
        onChange={(e) => onPlanChange(e.target.value as PricingTierSlug)}
        className="border-ds-outline text-ds-on-surface mt-2 w-full cursor-pointer rounded-xl border bg-white px-4 py-3 text-base font-semibold shadow-sm focus:border-ds-primary focus:outline-none focus:ring-2 focus:ring-ds-primary/25"
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

      {card ? (
        <p className="text-ds-on-surface-variant mt-3 text-sm leading-snug">{card.tagline}</p>
      ) : null}

      <div className="mt-4 flex flex-wrap items-baseline gap-x-2 gap-y-1 border-b border-ds-outline/70 pb-4">
        <span className="text-ds-on-surface text-3xl font-bold tabular-nums tracking-tight">{price}</span>
        {period ? <span className="text-ds-on-surface-variant text-sm font-medium">{period}</span> : null}
      </div>

      <div className="mt-4">
        {isStandard ? (
          <Link
            href={cta.href}
            className="inline-flex w-full items-center justify-center rounded-xl bg-gradient-to-b from-[#a028b3] via-ds-primary to-[#6a1578] px-5 py-3 text-sm font-semibold text-ds-on-primary shadow-[0_10px_32px_-8px_rgba(131,28,145,0.55)] ring-1 ring-white/30 transition hover:shadow-[0_14px_40px_-8px_rgba(131,28,145,0.65)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ds-primary focus-visible:ring-offset-2"
          >
            {cta.label}
          </Link>
        ) : (
          <Link
            href={cta.href}
            className="text-ds-on-surface hover:border-ds-primary/35 hover:bg-zinc-50 focus-visible:ring-ds-primary inline-flex w-full items-center justify-center rounded-xl border border-zinc-200 bg-white px-5 py-3 text-sm font-semibold shadow-sm transition hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
          >
            {cta.label}
          </Link>
        )}
      </div>

      <div className="mt-6 space-y-1">
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
                    {LANDING_ROW_TOOLTIPS[row.label] ? (
                      <FeatureRowInfoHint text={LANDING_ROW_TOOLTIPS[row.label]} labelFor={row.label} placement="top" />
                    ) : null}
                  </span>
                  <span className="shrink-0 text-right">
                    {row.label === "Shopify" && slug === "free" ? (
                      <span className="text-ds-on-surface-variant text-sm" aria-label="Not included on Free">
                        —
                      </span>
                    ) : (
                      <MatrixCellDisplay cell={row.cells[slug]} />
                    )}
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

/** Full pricing table: desktop = sticky plan strip + scrolling feature rows; mobile = plan dropdown + single-plan details. */
export function PricingFeatureMatrix({ isAuthenticated = false }: { isAuthenticated?: boolean }) {
  const [mobilePlan, setMobilePlan] = useState<PricingTierSlug>("standard");

  return (
    <div className="border-ds-outline rounded-2xl border bg-white shadow-[0_1px_3px_rgba(15,23,42,0.06)] lg:overflow-visible">
      <div className="lg:hidden">
        <PricingMatrixMobileView slug={mobilePlan} isAuthenticated={isAuthenticated} onPlanChange={setMobilePlan} />
      </div>

      <div className="hidden lg:block">
        <div className="sticky top-16 z-40 border-b border-ds-outline bg-white shadow-[0_6px_16px_-4px_rgba(15,23,42,0.1)]">
          <table className="w-full table-fixed border-collapse text-left">
            <PricingTableColgroup />
            <thead>
              <PlanHeaderPopularRow />
              <PlanHeaderNameRow />
            </thead>
            <tbody>
              <PlanHeaderPriceRow />
              <PlanHeaderCtaRow isAuthenticated={isAuthenticated} />
            </tbody>
          </table>
        </div>
        <table className="w-full table-fixed border-collapse text-left">
          <PricingTableColgroup />
          <tbody>
            <PricingMatrixFeatureBody />
          </tbody>
        </table>
      </div>
    </div>
  );
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

type PricingCardsProps = {
  variant?: PricingCardsVariant;
  loadError?: string | null;
  isAuthenticated?: boolean;
};

export function PricingCards({ variant = "teaser", loadError, isAuthenticated = false }: PricingCardsProps) {
  const isOnboarding = variant === "onboarding";
  const showTeaserBullets = variant === "onboarding";

  if (loadError) {
    return (
      <div className="border-ds-outline text-ds-on-surface-variant rounded-ds-xl border bg-ds-surface p-6 text-center text-sm">
        {loadError}
      </div>
    );
  }

  if (!isOnboarding) {
    const popularBadge = (
      <span className="inline-flex rounded-full border border-white/20 bg-black px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white shadow-md [background-image:linear-gradient(rgba(255,255,255,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.06)_1px,transparent_1px)] [background-size:10px_10px,10px_10px]">
        Popular
      </span>
    );

    return (
      <div className="min-w-0 overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
        <div className="grid grid-cols-1 divide-y divide-zinc-200 lg:grid-cols-4 lg:divide-x lg:divide-y-0 lg:divide-zinc-200">
          {PRICING_TIER_CARDS.map((plan) => {
            const highlighted = plan.slug === "standard";
            const { price, period } = formatMonthlyPrice(plan.monthlyPriceCents);
            const cta = planCta(plan.slug, isAuthenticated);
            return (
              <div
                key={plan.slug}
                className={`flex min-w-0 flex-col px-5 py-7 sm:px-6 lg:py-8 ${
                  highlighted ? "bg-ds-primary text-white" : "bg-white text-ds-on-surface"
                }`}
              >
                <div className="mb-3 flex min-h-[1.75rem] items-center justify-center">
                  {highlighted ? popularBadge : (
                    <span className="invisible inline-flex" aria-hidden>
                      {popularBadge}
                    </span>
                  )}
                </div>
                <h3 className={`text-xl font-semibold tracking-tight ${highlighted ? "text-white" : "text-ds-on-surface"}`}>
                  {plan.name}
                </h3>
                <p
                  className={`mt-2 line-clamp-2 text-sm leading-relaxed ${
                    highlighted ? "text-white/85" : "text-ds-on-surface-variant"
                  }`}
                >
                  {plan.tagline}
                </p>
                <div className="mt-4 flex flex-wrap items-baseline gap-x-2 gap-y-1">
                  <span
                    className={`text-3xl font-bold tabular-nums tracking-tight sm:text-4xl ${
                      highlighted ? "text-white" : "text-ds-on-surface"
                    }`}
                  >
                    {price}
                  </span>
                  {period ? (
                    <span
                      className={`text-sm font-medium ${highlighted ? "text-white/75" : "text-ds-on-surface-variant"}`}
                    >
                      {period}
                    </span>
                  ) : null}
                </div>
                <div className="mt-4 min-w-0 flex-1">
                  <PricingPlanFeatureRows slug={plan.slug} highlighted={highlighted} dense />
                </div>
                <Link
                  href={cta.href}
                  className={`mx-auto mt-6 w-full rounded-xl py-3 text-center text-sm font-semibold transition ${
                    highlighted
                      ? "bg-white text-ds-primary hover:bg-zinc-100"
                      : "border-2 border-ds-primary text-ds-primary hover:bg-ds-primary hover:text-white"
                  }`}
                >
                  {cta.label}
                </Link>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto grid w-full max-w-6xl grid-cols-1 items-stretch gap-x-5 gap-y-8 px-0.5 sm:grid-cols-2 sm:gap-x-5 sm:gap-y-10 sm:px-1 lg:grid-cols-4 lg:gap-x-6 lg:gap-y-6 lg:px-1">
      {PRICING_TIER_CARDS.map((plan) => {
        const highlighted = plan.slug === "standard";
        const { price, period } = formatMonthlyPrice(plan.monthlyPriceCents);
        const cta = planCta(plan.slug, isAuthenticated);
        return (
          <article
            key={plan.slug}
            className={`relative flex min-h-0 flex-col rounded-2xl p-5 sm:p-6 lg:h-full lg:min-h-[14rem] ${
              highlighted
                ? "relative isolate z-0 bg-ds-primary text-ds-on-primary shadow-[0_12px_40px_rgba(99,102,241,0.28)] ring-2 ring-ds-primary/60"
                : "relative z-0 border border-ds-outline/45 bg-white text-ds-on-surface shadow-[0_6px_28px_rgba(15,23,42,0.06)] ring-1 ring-zinc-900/[0.05]"
            }`}
          >
            {highlighted ? (
              <span className="absolute -top-3 left-1/2 z-10 -translate-x-1/2 rounded-full bg-ds-tertiary px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white shadow-md">
                Popular
              </span>
            ) : null}
            <div className="mb-1 shrink-0">
              <h3
                className={`text-lg font-semibold tracking-tight sm:text-xl ${highlighted ? "text-ds-on-primary" : "text-ds-on-surface"}`}
              >
                {plan.name}
              </h3>
              <p
                className={`mt-1.5 line-clamp-2 text-xs leading-snug ${
                  highlighted ? "text-white/85" : "text-ds-on-surface-variant"
                }`}
              >
                {plan.tagline}
              </p>
              <div className="mt-3 flex flex-wrap items-baseline gap-x-2 gap-y-1">
                <span
                  className={`font-bold tabular-nums tracking-tight ${highlighted ? "text-4xl text-ds-on-primary sm:text-[2.5rem]" : "text-3xl text-ds-on-surface sm:text-4xl"}`}
                >
                  {price}
                </span>
                {period ? (
                  <span
                    className={`font-medium text-[15px] ${highlighted ? "text-white/80" : "text-ds-on-surface-variant"}`}
                  >
                    {period}
                  </span>
                ) : null}
              </div>
            </div>

            {showTeaserBullets ? <TeaserBulletList planSlug={plan.slug} highlighted={highlighted} /> : null}

            <Link
              href={cta.href}
              className={`mx-auto mt-4 w-full max-w-none shrink-0 rounded-ds-md py-3 text-center text-sm font-semibold transition ${
                highlighted
                  ? "bg-white text-ds-primary shadow-md hover:bg-ds-primary-hover hover:text-ds-on-primary hover:shadow-lg"
                  : "border-2 border-ds-primary bg-transparent text-ds-primary hover:bg-ds-primary-hover hover:text-ds-on-primary"
              }`}
            >
              {cta.label}
            </Link>
          </article>
        );
      })}
    </div>
  );
}
