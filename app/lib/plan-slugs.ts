/** Normalize legacy catalog slugs (matches backend `canonical_plan_slug`). */

import { planTierAtLeast } from "@/lib/plan-entitlements";

const LEGACY_SLUG_TO_CANONICAL: Record<string, string> = {
  starter: "hobby",
  growth: "standard",
};

const TIER_ORDER = ["free", "hobby", "standard", "pro", "scale"] as const;

const KNOWN_SLUGS = new Set<string>(TIER_ORDER);

const NAME_TO_SLUG: Record<string, string> = {
  free: "free",
  hobby: "hobby",
  standard: "standard",
  pro: "pro",
  scale: "scale",
};

export function canonicalPlanSlug(planSlug: string | null | undefined): string {
  const s = (planSlug ?? "").trim().toLowerCase();
  if (!s) return "";
  return LEGACY_SLUG_TO_CANONICAL[s] ?? s;
}

type PlanLike = { slug?: string | null; name?: string | null } | null | undefined;

function tierIndex(slug: string): number {
  const i = TIER_ORDER.indexOf(slug as (typeof TIER_ORDER)[number]);
  return i >= 0 ? i : -1;
}

/** Infer catalog slug from display name (e.g. "Pro Plan" → pro). */
export function slugFromPlanName(name: string): string {
  const n = name.trim().toLowerCase();
  if (!n) return "";
  if (NAME_TO_SLUG[n]) return NAME_TO_SLUG[n];
  if (n.includes("scale")) return "scale";
  if (n.includes("pro")) return "pro";
  if (n.includes("standard") || n.includes("growth")) return "standard";
  if (n.includes("hobby") || n.includes("starter")) return "hobby";
  return "";
}

/**
 * Best catalog slug for entitlements. Uses the higher of API slug vs plan name so
 * a "Pro" display name is not overridden by a stale or legacy slug (nav uses name first).
 */
export function highestPlanSlugFromPlan(plan: PlanLike): string {
  if (!plan) return "free";

  const candidates = new Set<string>();
  const fromSlug = canonicalPlanSlug(plan.slug);
  if (fromSlug && KNOWN_SLUGS.has(fromSlug)) {
    candidates.add(fromSlug);
  }

  const rawSlug = (plan.slug ?? "").trim().toLowerCase();
  if (rawSlug.includes("scale")) candidates.add("scale");
  if (rawSlug.includes("pro")) candidates.add("pro");

  const fromName = slugFromPlanName(plan.name ?? "");
  if (fromName) candidates.add(fromName);

  if (candidates.size === 0) {
    return fromSlug || "free";
  }

  let best = "free";
  for (const slug of candidates) {
    if (tierIndex(slug) > tierIndex(best)) {
      best = slug;
    }
  }
  return best;
}

/** Slug used for client-side entitlements. */
export function effectivePlanSlug(plan: PlanLike): string {
  return highestPlanSlugFromPlan(plan);
}

export function planMeetsMinimumTier(plan: PlanLike, minimum: (typeof TIER_ORDER)[number]): boolean {
  return planTierAtLeast(highestPlanSlugFromPlan(plan), minimum);
}
