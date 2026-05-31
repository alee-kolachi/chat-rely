"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useResolvedOnboardingAgentId } from "@/lib/use-resolved-onboarding-agent-id";
import { BackendApiError, backendFetch } from "@/lib/backend-api";
import type { PricingTierSlug } from "@/lib/marketing/pricing-catalog";
import { PricingCards } from "@/components/marketing/pricing-sections";
import { OnboardingFrame } from "@/components/onboarding/onboarding-frame";
import {
  OnboardingPageHeader,
  OnboardingStickyFooter,
  OnboardingWideColumn,
  onboardingType,
} from "@/components/onboarding/onboarding-ui";

export function OnboardingPricingClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const agentId = useResolvedOnboardingAgentId();
  const [continueBusy, setContinueBusy] = useState(false);
  const [checkoutBusySlug, setCheckoutBusySlug] = useState<string | null>(null);
  const [continueError, setContinueError] = useState<string | null>(null);
  const [checkoutBanner, setCheckoutBanner] = useState<string | null>(null);
  const didFinalizeCheckoutRef = useRef(false);

  const backHref = useMemo(
    () =>
      agentId ? `/onboarding/appearance-tone?agentId=${encodeURIComponent(agentId)}` : "/onboarding/appearance-tone",
    [agentId],
  );

  const playgroundHref = useMemo(() => {
    if (!agentId) return "/playground";
    return `/playground?agentId=${encodeURIComponent(agentId)}`;
  }, [agentId]);

  const finishOnboarding = useCallback(async () => {
    if (!agentId || continueBusy) return false;
    setContinueError(null);
    setContinueBusy(true);
    try {
      await backendFetch("/api/v1/onboarding/finish", {
        method: "POST",
        body: JSON.stringify({ agent_id: agentId }),
      });
      router.push(playgroundHref);
      return true;
    } catch (e) {
      setContinueError(e instanceof BackendApiError ? e.message : "Could not complete setup.");
      return false;
    } finally {
      setContinueBusy(false);
    }
  }, [agentId, continueBusy, playgroundHref, router]);

  const startCheckout = useCallback(
    async (planSlug: string) => {
      if (!agentId || checkoutBusySlug) return;
      setCheckoutBusySlug(planSlug);
      setContinueError(null);
      try {
        const res = await backendFetch<{ url: string }>("/api/v1/billing/checkout", {
          method: "POST",
          body: JSON.stringify({
            plan_slug: planSlug,
            interval: "month",
            return_context: "onboarding",
            agent_id: agentId,
          }),
        });
        window.location.href = res.url;
      } catch (e) {
        const msg = e instanceof BackendApiError ? e.message : e instanceof Error ? e.message : "Checkout failed";
        setContinueError(msg);
        setCheckoutBusySlug(null);
      }
    },
    [agentId, checkoutBusySlug],
  );

  const onPlanSelect = useCallback(
    (slug: PricingTierSlug) => {
      if (slug === "free") {
        void finishOnboarding();
        return;
      }
      void startCheckout(slug);
    },
    [finishOnboarding, startCheckout],
  );

  useEffect(() => {
    const q = searchParams.get("checkout");
    if (q === "success") {
      setCheckoutBanner("Payment received. Finishing setup…");
    } else if (q === "cancel") {
      setCheckoutBanner("Checkout canceled. Pick a plan below or continue on Free.");
    } else {
      setCheckoutBanner(null);
    }
  }, [searchParams]);

  useEffect(() => {
    const q = searchParams.get("checkout");
    if (q !== "success" || !agentId || didFinalizeCheckoutRef.current) return;
    didFinalizeCheckoutRef.current = true;
    const checkoutSessionId = searchParams.get("checkout_session_id")?.trim() ?? "";

    void (async () => {
      if (checkoutSessionId.startsWith("cs_")) {
        try {
          await backendFetch("/api/v1/billing/checkout/complete", {
            method: "POST",
            body: JSON.stringify({ checkout_session_id: checkoutSessionId }),
          });
        } catch (e) {
          const msg =
            e instanceof BackendApiError ? e.message : e instanceof Error ? e.message : "Could not finalize checkout";
          setContinueError(msg);
        }
      }
      await finishOnboarding();
    })();
  }, [agentId, finishOnboarding, searchParams]);

  return (
    <OnboardingFrame
      activeItem="Appearance & Tone"
      completedItems={["Agent Name", "Knowledge Base", "Connection", "Agent Preview", "Appearance & Tone"]}
      stepLabel="Plans & billing"
      linkAgentId={agentId}
      footer={
        <OnboardingStickyFooter
          backHref={backHref}
          backLabel="Back"
          primaryAsButton
          onPrimaryClick={() => void finishOnboarding()}
          primaryPending={continueBusy}
          primaryDisabled={!agentId || Boolean(checkoutBusySlug)}
          primaryLabel="Continue on Free"
        />
      }
    >
      <OnboardingWideColumn className="flex flex-col gap-6 !pt-6 md:!pt-8">
        {continueError ? (
          <div className="rounded-ds-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
            {continueError}
          </div>
        ) : null}

        {checkoutBanner ? (
          <div className="rounded-ds-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
            {checkoutBanner}
          </div>
        ) : null}

        <OnboardingPageHeader
          className="!mb-0"
          kicker="Plans & billing"
          title="Choose a plan"
          subtitle="Your agent setup is saved. Start on Free or upgrade for more conversations and store tools."
        />

        <PricingCards
          variant="onboarding"
          isAuthenticated
          onPlanCheckout={onPlanSelect}
          checkoutBusySlug={checkoutBusySlug ?? (continueBusy ? "free" : null)}
        />

        <p className={onboardingType.hint}>
          Change plans anytime in{" "}
          <Link href="/account/plan" className="text-ds-primary font-semibold hover:underline">
            Settings → Plan
          </Link>
          .{" "}
          <Link href="/pricing" className="text-ds-primary font-semibold hover:underline" target="_blank" rel="noreferrer">
            Compare all features
          </Link>
          .
        </p>
      </OnboardingWideColumn>
    </OnboardingFrame>
  );
}
