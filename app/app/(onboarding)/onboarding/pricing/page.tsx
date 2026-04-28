"use client";

import Link from "next/link";
import { PricingCards } from "@/components/marketing/pricing-sections";
import { OnboardingFrame } from "@/components/onboarding/onboarding-frame";
import {
  OnboardingPageHeader,
  OnboardingSectionCard,
  OnboardingStickyFooter,
  OnboardingWideColumn,
  onboardingType,
} from "@/components/onboarding/onboarding-ui";

export default function OnboardingPricingPage() {
  return (
    <OnboardingFrame
      activeItem="Agent Preview"
      completedItems={["Agent Name", "Knowledge Base", "Connection", "Appearance & Tone"]}
      stepLabel="Step 5 of 6 · Choose plan"
    >
      <OnboardingWideColumn>
        <OnboardingPageHeader
          kicker="Billing"
          title="Pick a plan to unlock go-live"
          subtitle="You can start small and upgrade anytime. Message limits and seats scale with each tier."
        />

        <OnboardingSectionCard className="mb-8" padding="p-4 md:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className={onboardingType.body}>
              <span className="text-ds-on-surface font-medium">Why now?</span> Installing the widget and using live
              actions require an active plan. Your setup progress is saved.
            </p>
            <Link
              href="/pricing"
              className="text-ds-primary shrink-0 text-sm font-semibold underline underline-offset-2"
              target="_blank"
              rel="noreferrer"
            >
              Compare on full pricing page
            </Link>
          </div>
        </OnboardingSectionCard>

        <PricingCards />
      </OnboardingWideColumn>

      <OnboardingStickyFooter
        backHref="/onboarding/agent-preview"
        backLabel="Back"
        primaryHref="/onboarding/installation"
        primaryLabel="Continue to install"
        tertiary={
          <span className="text-ds-on-surface-variant hidden text-[11px] md:inline">
            You can change plan later in Settings → Plan
          </span>
        }
      />
    </OnboardingFrame>
  );
}
