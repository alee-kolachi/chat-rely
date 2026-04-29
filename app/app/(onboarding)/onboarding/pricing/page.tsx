"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { getOnboardingAgentId } from "@/lib/onboarding-state";
import { PricingCards } from "@/components/marketing/pricing-sections";
import { OnboardingFrame } from "@/components/onboarding/onboarding-frame";
import { OnboardingStickyFooter } from "@/components/onboarding/onboarding-ui";

export default function OnboardingPricingPage() {
  const searchParams = useSearchParams();
  const agentId = useMemo(() => searchParams.get("agentId") ?? getOnboardingAgentId(), [searchParams]);

  const backHref = useMemo(
    () => (agentId ? `/onboarding/agent-preview?agentId=${encodeURIComponent(agentId)}` : "/onboarding/agent-preview"),
    [agentId]
  );
  const installHref = useMemo(
    () => (agentId ? `/onboarding/installation?agentId=${encodeURIComponent(agentId)}` : "/onboarding/installation"),
    [agentId]
  );

  return (
    <OnboardingFrame
      activeItem="Agent Preview"
      completedItems={["Agent Name", "Knowledge Base", "Connection", "Appearance & Tone", "Agent Preview"]}
      stepLabel="Plans & billing"
    >
      <div className="relative flex min-h-0 min-w-0 w-full flex-1 flex-col">
        <div
          className="pointer-events-none absolute inset-0 -z-10"
          style={{
            background:
              "radial-gradient(ellipse 100% 70% at 50% 0%, color-mix(in srgb, var(--ds-primary) 12%, transparent), transparent 50%), linear-gradient(180deg, color-mix(in srgb, var(--ds-sidebar) 70%, white) 0%, #ffffff 45%)",
          }}
          aria-hidden
        />

        <div className="relative mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 pt-6 pb-[max(8.5rem,calc(5rem+env(safe-area-inset-bottom,0px)))] md:px-10 md:pt-8 md:pb-32">
          <header className="mx-auto w-full max-w-3xl shrink-0 text-center">
            <p className="text-ds-primary text-[11px] font-semibold tracking-[0.2em] uppercase">Plans & billing</p>
            <h1 className="text-ds-on-surface mt-3 text-[1.65rem] font-semibold leading-[1.2] tracking-tight sm:text-3xl md:text-[2rem]">
              Select a plan to finish setup
            </h1>
            <p className="text-ds-on-surface-variant mx-auto mt-3 max-w-[min(100%,48rem)] text-center text-[13px] leading-snug sm:text-sm">
              Paid tier for production—your setup is saved. Billing in{" "}
              <Link href="/settings" className="text-ds-primary font-medium underline decoration-ds-primary/30 underline-offset-[3px] hover:decoration-ds-primary">
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

          <div className="mt-6 sm:mt-8">
            <PricingCards variant="onboarding" />
          </div>
        </div>
      </div>

      <OnboardingStickyFooter
        backHref={backHref}
        backLabel="Back"
        primaryHref={installHref}
        primaryLabel="Continue to install"
        tertiary={
          <span className="text-ds-on-surface-variant hidden max-w-md text-[11px] leading-snug lg:inline">
            Taxes may apply by region. Questions before you commit? Use support from Settings.
          </span>
        }
      />
    </OnboardingFrame>
  );
}
