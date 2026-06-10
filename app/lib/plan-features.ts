import type { MeContextPayload } from "@/components/layout/me-context-provider";

type PlanLike = MeContextPayload["plan"] | null | undefined;

function featureBool(features: Record<string, unknown> | undefined, key: string): boolean {
  const v = features?.[key];
  return v === true || v === "true";
}

/** Hobby and above: connect Shopify and use live store tools. */
export function planIncludesShopify(plan: PlanLike): boolean {
  if (!plan) return false;
  return featureBool(plan.features, "shopify_enabled");
}

/** Hobby and above: human handoff / escalation action. */
export function planIncludesHumanEscalation(plan: PlanLike): boolean {
  if (!plan) return false;
  return featureBool(plan.features, "human_escalation_enabled");
}

export type PlanFeatureAccess = {
  included: boolean;
  showCrown: boolean;
  blockInteraction: boolean;
};

/** Crown + disabled controls once plan is loaded and omits the feature. */
export function planFeatureAccess(included: boolean, planResolved: boolean): PlanFeatureAccess {
  if (!planResolved) {
    return { included, showCrown: false, blockInteraction: false };
  }
  return {
    included,
    showCrown: !included,
    blockInteraction: !included,
  };
}

export function shopifyConnectAccess(plan: PlanLike, planResolved: boolean): PlanFeatureAccess {
  return planFeatureAccess(planIncludesShopify(plan), planResolved);
}

export function humanEscalationPlanAccess(plan: PlanLike, planResolved: boolean): PlanFeatureAccess {
  return planFeatureAccess(planIncludesHumanEscalation(plan), planResolved);
}
