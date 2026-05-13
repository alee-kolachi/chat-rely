/** Mirrors backend `analytics_access_tier_for_plan_slug` for nav / links only; API is authoritative. */

export type AnalyticsAccessTier = "none" | "basic" | "full";

export function analyticsAccessTierForPlanSlug(planSlug: string | null | undefined): AnalyticsAccessTier {
  const s = (planSlug ?? "").trim().toLowerCase();
  if (!s || s === "free") return "none";
  if (s === "hobby") return "basic";
  if (s === "standard" || s === "pro" || s === "scale") return "full";
  return "none";
}

export function planAllowsAnalyticsPage(planSlug: string | null | undefined): boolean {
  return analyticsAccessTierForPlanSlug(planSlug) !== "none";
}

export function planHasFullAnalytics(planSlug: string | null | undefined): boolean {
  return analyticsAccessTierForPlanSlug(planSlug) === "full";
}
