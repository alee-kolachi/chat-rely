import Link from "next/link";
import type { AnalyticsAccessTier } from "@/lib/analytics-plan-access";
import { messageFeedbackEnabledForPlanSlug } from "@/lib/widget-branding";

function planDisplayName(plan: { name?: unknown; slug?: unknown } | null | undefined): string {
  const name = typeof plan?.name === "string" ? plan.name.trim() : "";
  if (name) return name;
  const slug = typeof plan?.slug === "string" ? plan.slug.trim() : "";
  if (!slug) return "Your plan";
  return slug
    .split(/[-_]/g)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

type AnalyticsPlanNoticeProps = {
  plan: { name?: unknown; slug?: unknown } | null | undefined;
  analyticsTier: AnalyticsAccessTier;
};

/** Explains analytics limits for the current plan at the bottom of the Analytics page. */
export function AnalyticsPlanNotice({ plan, analyticsTier }: AnalyticsPlanNoticeProps) {
  if (analyticsTier === "none") return null;

  const displayName = planDisplayName(plan);
  const hasFeedback = messageFeedbackEnabledForPlanSlug(
    typeof plan?.slug === "string" ? plan.slug : null
  );

  if (analyticsTier === "basic") {
    return (
      <section className="border-ds-outline bg-ds-sidebar/80 rounded-ds-xl border p-4 shadow-sm md:p-5">
        <p className="text-ds-on-surface text-sm font-semibold">
          You&apos;re on the {displayName} plan
        </p>
        <p className="ds-app-body-muted mt-1 leading-relaxed">
          Analytics here is basic: KPIs and daily conversation volume. Upgrade to Standard or Pro for
          intents, geography, sentiment, and quality metrics.
        </p>
        <Link
          href="/account/plan"
          className="text-ds-primary mt-3 inline-block text-sm font-semibold hover:underline"
        >
          View plans
        </Link>
      </section>
    );
  }

  if (!hasFeedback) {
    return (
      <section className="border-ds-outline bg-ds-sidebar/80 rounded-ds-xl border p-4 shadow-sm md:p-5">
        <p className="text-ds-on-surface text-sm font-semibold">
          You&apos;re on the {displayName} plan
        </p>
        <p className="ds-app-body-muted mt-1 leading-relaxed">
          Advanced analytics is included. Visitor message feedback in the widget is on Pro.
        </p>
        <Link
          href="/account/plan"
          className="text-ds-primary mt-3 inline-block text-sm font-semibold hover:underline"
        >
          View plans
        </Link>
      </section>
    );
  }

  return null;
}
