"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useResolvedOnboardingAgentId } from "@/lib/use-resolved-onboarding-agent-id";
import { BackendApiError, backendFetch } from "@/lib/backend-api";
import type { PricingTierSlug } from "@/lib/marketing/pricing-catalog";
import { PricingCards } from "@/components/marketing/pricing-sections";
import { OnboardingFrame } from "@/components/onboarding/onboarding-frame";
import { OnboardingStickyFooter } from "@/components/onboarding/onboarding-ui";

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
      setCheckoutBanner("Checkout canceled. You can pick a plan below or continue on Free.");
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
      {continueError ? (
        <p className="border-ds-outline bg-ds-surface/95 mx-auto mt-2 max-w-3xl rounded-ds-md border px-3 py-2 text-center text-xs text-rose-600 sm:px-4">
          {continueError}
        </p>
      ) : null}
      {checkoutBanner ? (
        <p className="border-ds-outline bg-ds-surface/95 text-ds-on-surface mx-auto mt-2 max-w-3xl rounded-ds-md border px-3 py-2 text-center text-xs sm:px-4 sm:text-sm">
          {checkoutBanner}
        </p>
      ) : null}
      <div className="relative flex w-full min-w-0 flex-col overflow-x-hidden max-lg:min-h-min max-lg:flex-none lg:min-h-0 lg:flex-1">
        <div
          className="pointer-events-none absolute inset-0 -z-10"
          style={{
            background:
              "radial-gradient(ellipse 100% 70% at 50% 0%, color-mix(in srgb, var(--ds-primary) 12%, transparent), transparent 50%), linear-gradient(180deg, color-mix(in srgb, var(--ds-sidebar) 70%, white) 0%, #ffffff 45%)",
          }}
          aria-hidden
        />

        <div className="relative mx-auto flex w-full min-w-0 max-w-6xl flex-col px-3 pt-4 pb-[max(8.5rem,calc(5rem+env(safe-area-inset-bottom,0px)))] max-lg:min-h-min max-lg:flex-none sm:px-4 sm:pt-6 md:px-10 md:pt-8 md:pb-32 lg:flex-1">
          <header className="mx-auto flex w-full min-w-0 max-w-3xl shrink-0 flex-col items-center px-1 text-center sm:px-0">
            <p className="text-ds-primary text-[10px] font-semibold tracking-[0.18em] uppercase sm:text-[11px] sm:tracking-[0.2em]">
              Plans & billing
            </p>
            <h1 className="text-ds-on-surface mt-2 text-xl font-semibold leading-[1.25] tracking-tight sm:mt-3 sm:text-3xl md:text-[2rem]">
              Pick a plan to go live
            </h1>
            <p className="ds-app-body-muted mx-auto mt-2 max-w-[min(100%,48rem)] text-center leading-snug sm:mt-3 sm:text-[13px] md:text-sm">
              Your agent setup is saved. Free includes Shopify connect; paid plans add live store tools and higher limits.
              Manage billing anytime
              under{" "}
              <Link
                href="/account/plan"
                className="text-ds-primary font-medium underline decoration-ds-primary/30 underline-offset-[3px] hover:decoration-black"
              >
                Settings → Plan
              </Link>
              .{" "}
              <Link
                href="/pricing"
                className="text-ds-on-surface font-medium underline decoration-ds-outline underline-offset-[3px] hover:text-ds-on-surface"
                target="_blank"
                rel="noreferrer"
              >
                Compare all plans
              </Link>
              .
            </p>
            <p className="text-ds-on-surface-variant mx-auto mt-3 max-w-[min(100%,40rem)] text-center text-[11px] leading-snug sm:text-xs">
              Taxes may apply by region. Questions before you commit? Contact support from Settings.
            </p>
          </header>

          <div className="mt-4 min-w-0 sm:mt-6 md:mt-8">
            <PricingCards
              variant="onboarding"
              isAuthenticated
              onPlanCheckout={onPlanSelect}
              checkoutBusySlug={checkoutBusySlug}
            />
          </div>
        </div>
      </div>
    </OnboardingFrame>
  );
}
