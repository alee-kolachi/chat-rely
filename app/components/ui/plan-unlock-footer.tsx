import Link from "next/link";
import { PlanCrownIcon, PlanTierBadge, type PlanTierBadgeVariant } from "@/components/ui/plan-tier-badge";
import { appButtonClassName } from "@/lib/button-styles";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

type PlanTierHint = PlanTierBadgeVariant | "hobby";

/** Crown + short label for locked cards and section headers. */
export function PlanLockedLabel({
  tier = "pro",
  className,
}: {
  tier?: PlanTierHint;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      {tier === "standard" ? <PlanTierBadge tier="standard" /> : <PlanCrownIcon className="size-3.5" />}
      <span className="text-xs font-semibold text-amber-800">Not on your plan</span>
    </div>
  );
}

/** Crown suffix for sidebar / mobile nav items that are visible but not clickable. */
export function PlanLockedNavAffordance({ className }: { className?: string }) {
  return (
    <span className={cn("ml-auto flex shrink-0 items-center gap-1.5", className)}>
      <PlanCrownIcon className="size-3.5" title="Not on your plan" />
      <span className="text-[10px] font-semibold text-amber-800">Not on your plan</span>
    </span>
  );
}

/** White callout bar with crown, message, and View plans button. */
export function PlanRequiredCallout({
  tier = "pro",
  message = "Not included on your plan",
  className,
}: {
  tier?: PlanTierHint;
  message?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "border-ds-outline bg-ds-surface flex flex-col gap-3 rounded-ds-lg border px-4 py-3 shadow-sm sm:flex-row sm:items-center sm:justify-between",
        className
      )}
    >
      <div className="flex items-center gap-2.5">
        {tier === "standard" ? <PlanTierBadge tier="standard" /> : <PlanCrownIcon />}
        <p className="text-ds-on-surface text-sm font-medium">{message}</p>
      </div>
      <Link href="/account/plan" className={appButtonClassName("primary", { size: "sm" })}>
        View plans
      </Link>
    </div>
  );
}

type PlanUnlockFooterProps = {
  className?: string;
};

/** Standalone plan link for compact locked cards. */
export function PlanUnlockFooter({ className }: PlanUnlockFooterProps) {
  return (
    <Link
      href="/account/plan"
      className={cn(
        "text-ds-primary hover:text-ds-interactive-hover mt-3 inline-block w-fit text-xs font-semibold underline-offset-2 hover:underline",
        className
      )}
    >
      View plans
    </Link>
  );
}

export function planFeatureCardClass(included: boolean) {
  return cn(
    "flex min-h-[4.5rem] flex-col justify-between gap-2 rounded-ds-lg border bg-ds-surface px-4 py-3 shadow-sm",
    included ? "border-ds-outline-subtle" : "border-dashed border-amber-300/90"
  );
}

/** True when plan is loaded and the feature is not on the current plan. */
export function planFeatureLocked(planResolved: boolean, included: boolean): boolean {
  return planResolved && !included;
}

type PlanFeatureLabelProps = {
  /** When set, overrides `included` / `planResolved` for crown visibility. */
  showCrown?: boolean;
  included?: boolean;
  planResolved?: boolean;
  children: ReactNode;
  className?: string;
};

/** Label with premium crown when the feature is not on the current plan. */
export function PlanFeatureLabel({
  showCrown,
  included = true,
  planResolved = true,
  children,
  className,
}: PlanFeatureLabelProps) {
  const locked = showCrown ?? planFeatureLocked(planResolved, included);
  return (
    <div className={cn("flex items-center gap-2", className)}>
      {children}
      {locked ? <PlanCrownIcon className="size-3.5 shrink-0" title="Not on your plan" /> : null}
    </div>
  );
}

type PlanGatedBlockProps = {
  locked: boolean;
  tier?: PlanTierHint;
  calloutMessage?: string;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
  /** When true, skip outer dashed ring (use inside an existing card). */
  inset?: boolean;
};

/**
 * Shows full UI for plan-gated sections but blocks interaction when locked.
 * Callout + dimmed, non-interactive content — no gray fill.
 */
export function PlanGatedBlock({
  locked,
  tier = "pro",
  calloutMessage,
  children,
  className,
  contentClassName,
  inset = false,
}: PlanGatedBlockProps) {
  return (
    <div
      className={cn(
        locked && !inset && "rounded-ds-xl border border-dashed border-amber-300/90 p-4 sm:p-5",
        className
      )}
    >
      {locked ? (
        <PlanRequiredCallout
          tier={tier}
          message={calloutMessage ?? "Not included on your plan"}
          className="mb-5"
        />
      ) : null}
      <div
        className={cn(
          locked &&
            "pointer-events-none select-none rounded-ds-lg border border-dashed border-amber-200/70 opacity-[0.72]",
          contentClassName
        )}
        aria-disabled={locked || undefined}
      >
        {children}
      </div>
    </div>
  );
}
