import type { MeContextPayload } from "@/components/layout/me-context-provider";
import { planTierAtLeast } from "@/lib/plan-entitlements";
import { effectivePlanSlug, planMeetsMinimumTier } from "@/lib/plan-slugs";

type PlanLike = MeContextPayload["plan"] | null | undefined;

function normalizedPlanSlug(planSlug: string | null | undefined): string {
  return effectivePlanSlug(planSlug ? { slug: planSlug, name: null } : null);
}

export function planHidesPoweredByChatrely(planSlug: string | null | undefined): boolean {
  return planTierAtLeast(normalizedPlanSlug(planSlug), "pro");
}

export function messageFeedbackEnabledForPlanSlug(planSlug: string | null | undefined): boolean {
  return planTierAtLeast(normalizedPlanSlug(planSlug), "pro");
}

/** Pro / Scale: dark mode, fonts, granular widget colors. */
export function planAllowsAdvancedAppearance(planSlug: string | null | undefined): boolean {
  return planTierAtLeast(normalizedPlanSlug(planSlug), "pro");
}

/** Whether the workspace plan includes widget theme, font, and color overrides. */
export function planIncludesWidgetStyling(plan: PlanLike): boolean {
  if (!plan) return false;
  return planMeetsMinimumTier(plan, "pro");
}

export type WidgetStylingAccess = {
  included: boolean;
  showCrown: boolean;
  blockInteraction: boolean;
};

/**
 * Dashboard widget styling: crown + disabled only when plan is loaded and omits the feature.
 * While loading, controls stay enabled (no crown).
 */
export function widgetStylingAccess(
  plan: PlanLike,
  planResolved: boolean
): WidgetStylingAccess {
  const included = planIncludesWidgetStyling(plan);
  if (!planResolved) {
    return { included, showCrown: false, blockInteraction: false };
  }
  return {
    included,
    showCrown: !included,
    blockInteraction: !included,
  };
}
