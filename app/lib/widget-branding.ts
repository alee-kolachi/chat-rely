/** Mirrors backend `hide_powered_by_chatrely_for_plan_slug` for dashboard preview vs embed. */

export function planHidesPoweredByChatrely(planSlug: string | null | undefined): boolean {
  const s = (planSlug ?? "").trim().toLowerCase();
  return s === "pro" || s === "scale";
}

export function messageFeedbackEnabledForPlanSlug(planSlug: string | null | undefined): boolean {
  const s = (planSlug ?? "").trim().toLowerCase();
  return s === "pro" || s === "scale";
}

/** Pro / Scale: dark mode, fonts, granular widget colors. */
export function planAllowsAdvancedAppearance(planSlug: string | null | undefined): boolean {
  const s = (planSlug ?? "").trim().toLowerCase();
  return s === "pro" || s === "scale";
}
