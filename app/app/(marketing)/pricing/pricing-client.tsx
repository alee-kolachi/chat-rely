"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { LandingFooter } from "@/components/marketing/landing/landing-footer";
import { LandingSectionLabel } from "@/components/marketing/landing/landing-section-label";
import { PricingPagePlans } from "@/components/marketing/pricing-sections";
import { useSessionPresent } from "@/hooks/use-session-present";
import { BackendApiError, backendFetch } from "@/lib/backend-api";
import type { PricingTierSlug } from "@/lib/marketing/pricing-catalog";

const faqs = [
  {
    question: "What counts toward my conversation allowance?",
    answer:
      "We count a chat when it closes if there was any visitor message, assistant reply, or tool use. Idle sessions close after about 30 minutes.",
  },
  {
    question: "What happens if I go over my included conversations?",
    answer:
      "On paid plans, replies switch to normal models and the widget stays open until the cycle resets or you upgrade. On Free, AI replies stop after 30 conversations for the month.",
  },
  {
    question: "What are premium and normal models?",
    answer:
      "Premium models give faster, sharper replies on paid plans within your monthly allowance. Normal models keep chat online with slower replies. Free uses normal models only.",
  },
  {
    question: "When does my usage reset?",
    answer:
      "Included conversation allowances reset at the start of each billing period (shown on your Plan page). Free workspaces follow the same calendar monthly snapshot.",
  },
  {
    question: "Can I cancel my subscription anytime?",
    answer:
      "Yes. You can cancel from the Stripe billing portal (linked from Billing in your account). Access remains through the end of the paid period unless you delete your workspace.",
  },
] as const;

export function MarketingPricingClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { ready: sessionReady, hasSession } = useSessionPresent();
  const [checkoutBusySlug, setCheckoutBusySlug] = useState<string | null>(null);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [checkoutBanner, setCheckoutBanner] = useState<string | null>(null);

  const showDashboard = sessionReady && hasSession;

  useEffect(() => {
    const q = searchParams.get("checkout");
    if (q === "success") {
      setCheckoutBanner("Payment received. Your plan updates shortly. Open the dashboard to confirm.");
    } else if (q === "cancel") {
      setCheckoutBanner("Checkout canceled. Pick a plan below when you are ready.");
    } else {
      setCheckoutBanner(null);
    }
  }, [searchParams]);

  const onPlanCheckout = useCallback(
    async (slug: PricingTierSlug) => {
      if (!showDashboard) {
        router.push("/signup");
        return;
      }
      if (slug === "free") {
        router.push("/dashboard");
        return;
      }
      if (checkoutBusySlug) return;
      setCheckoutBusySlug(slug);
      setCheckoutError(null);
      try {
        const res = await backendFetch<{ url: string }>("/api/v1/billing/checkout", {
          method: "POST",
          body: JSON.stringify({
            plan_slug: slug,
            interval: "month",
            return_context: "marketing",
          }),
        });
        window.location.href = res.url;
      } catch (e) {
        const msg = e instanceof BackendApiError ? e.message : e instanceof Error ? e.message : "Checkout failed";
        setCheckoutError(msg);
        setCheckoutBusySlug(null);
      }
    },
    [checkoutBusySlug, router, showDashboard],
  );

  return (
    <main className="flex-1 bg-ds-surface text-ds-on-surface">
      <section className="px-6 py-12 sm:py-16 lg:py-20">
        <div className="mx-auto max-w-[1100px]">
          <LandingSectionLabel>Pricing</LandingSectionLabel>
          <h1 className="mkt-display mt-6 text-4xl sm:text-5xl">Plans &amp; pricing</h1>
          <p className="mkt-body mt-5 max-w-2xl">Find the right plan for your store.</p>
          <p className="mt-4 max-w-2xl text-[0.9375rem] leading-relaxed text-ds-on-surface-variant">
            Paid plans use premium models within your conversation allowance. After that, normal models keep the widget open.
            Free is limited to 30 conversations per month, then AI replies stop until the next cycle or you upgrade.
          </p>

          {checkoutBanner ? (
            <p className="border-ds-outline bg-ds-surface/95 text-ds-on-surface mt-8 rounded-ds-md border px-4 py-2 text-sm">
              {checkoutBanner}
            </p>
          ) : null}
          {checkoutError ? (
            <p className="border-ds-outline bg-ds-surface/95 mt-4 rounded-ds-md border px-4 py-2 text-sm text-rose-600">
              {checkoutError}
            </p>
          ) : null}

          <div className="mt-12 sm:mt-16">
            <PricingPagePlans
              isAuthenticated={showDashboard}
              onPlanCheckout={showDashboard ? onPlanCheckout : undefined}
              checkoutBusySlug={checkoutBusySlug}
            />
          </div>

          <section className="mt-20 border-t border-ds-outline pt-16 sm:mt-24 sm:pt-20">
            <LandingSectionLabel>Billing</LandingSectionLabel>
            <h2 className="mkt-display mt-6 text-3xl sm:text-4xl">Common questions</h2>
            <dl className="mt-10 divide-y divide-ds-outline border-y border-ds-outline">
              {faqs.map((faq) => (
                <div key={faq.question} className="py-6 sm:py-7">
                  <dt className="mkt-display text-lg sm:text-xl">{faq.question}</dt>
                  <dd className="mt-3 text-[0.9375rem] leading-relaxed text-ds-on-surface-variant">{faq.answer}</dd>
                </div>
              ))}
            </dl>
          </section>

        </div>
      </section>

      <section className="bg-ds-primary px-6 py-16 sm:py-20">
        <div className="mx-auto max-w-[1100px]">
          <LandingSectionLabel tone="primary">Get started</LandingSectionLabel>
          <h2 className="mkt-display mt-6 max-w-xl text-3xl !text-ds-on-primary sm:text-4xl">
            {showDashboard ? "Open your dashboard" : "Start free on your store"}
          </h2>
          <p className="mkt-body mt-4 max-w-lg !text-ds-on-primary/85">
            {showDashboard
              ? "Your plan and usage live in the dashboard. Upgrade anytime from Account."
              : "Free plan, no credit card. Add your help content and go live with one embed snippet."}
          </p>
          <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center">
            <Link
              href={showDashboard ? "/dashboard" : "/signup"}
              className="mkt-pill mkt-pill-dark inline-flex px-8 py-3.5 text-base"
            >
              {showDashboard ? "Open dashboard" : "Create your agent"}
            </Link>
            <a
              href="mailto:alee@chatrely.com"
              className="text-sm font-medium text-ds-on-primary/80 underline underline-offset-4 transition hover:text-ds-on-primary"
            >
              Questions? Email alee@chatrely.com
            </a>
          </div>
        </div>
      </section>

      <LandingFooter />
    </main>
  );
}
