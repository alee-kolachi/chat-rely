"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useResolvedOnboardingAgentId } from "@/lib/use-resolved-onboarding-agent-id";
import { PricingCards } from "@/components/marketing/pricing-sections";
import { OnboardingFrame } from "@/components/onboarding/onboarding-frame";
import { OnboardingStickyFooter } from "@/components/onboarding/onboarding-ui";
import { usePublicPlans } from "@/hooks/use-public-plans";

export function OnboardingPricingClient() {
  const agentId = useResolvedOnboardingAgentId();
  const { plans, error, loading } = usePublicPlans();

  const backHref = useMemo(
    () => (agentId ? `/onboarding/agent-preview?agentId=${encodeURIComponent(agentId)}` : "/onboarding/agent-preview"),
    [agentId],
  );
  const installHref = useMemo(
    () => (agentId ? `/onboarding/installation?agentId=${encodeURIComponent(agentId)}` : "/onboarding/installation"),
    [agentId],
  );

  return (
    <OnboardingFrame
      activeItem="Agent Preview"
      completedItems={["Agent Name", "Knowledge Base", "Connection", "Appearance & Tone", "Agent Preview"]}
      stepLabel="Plans & billing"
      linkAgentId={agentId}
      footer={
        <OnboardingStickyFooter
          backHref={backHref}
          backLabel="Back"
          primaryHref={installHref}
          primaryLabel="Continue"
          tertiary={
            <span className="text-ds-on-surface-variant block max-w-full text-center text-[10px] leading-snug sm:max-w-md sm:text-left sm:text-[11px]">
              Taxes may apply by region. Questions before you commit? Use support from Settings.
            </span>
          }
        />
      }
    >
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
          <header className="mx-auto w-full min-w-0 max-w-3xl shrink-0 px-1 text-center sm:px-0">
            <p className="text-ds-primary text-[10px] font-semibold tracking-[0.18em] uppercase sm:text-[11px] sm:tracking-[0.2em]">
              Plans & billing
            </p>
            <h1 className="text-ds-on-surface mt-2 text-xl font-semibold leading-[1.25] tracking-tight sm:mt-3 sm:text-3xl md:text-[2rem]">
              Select a plan to finish setup
            </h1>
            <p className="text-ds-on-surface-variant mx-auto mt-2 max-w-[min(100%,48rem)] text-center text-xs leading-snug sm:mt-3 sm:text-[13px] md:text-sm">
              Paid tier for production—your setup is saved. Billing in{" "}
              <Link
                href="/account/plan"
                className="text-ds-primary font-medium underline decoration-ds-primary/30 underline-offset-[3px] hover:decoration-ds-primary"
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
          </header>

          <div className="mt-4 min-w-0 sm:mt-6 md:mt-8">
            <PricingCards
              variant="onboarding"
              plans={plans}
              loading={loading}
              loadError={error}
              isAuthenticated
            />
          </div>
        </div>
      </div>
    </OnboardingFrame>
  );
}
