"use client";

import Link from "next/link";
import { OnboardingFrame } from "@/components/onboarding/onboarding-frame";
import {
  OnboardingMainColumn,
  OnboardingPageHeader,
  OnboardingSectionCard,
  onboardingType,
} from "@/components/onboarding/onboarding-ui";

/**
 * Optional entry screen — not in the 6-step sidebar; reduces cold-start anxiety.
 */
export default function OnboardingWelcomePage() {
  return (
    <OnboardingFrame activeItem="Agent Name" completedItems={[]} stepLabel="Welcome">
      <OnboardingMainColumn className="max-w-xl text-center">
        <OnboardingPageHeader
          kicker="ChatRely"
          title="Set up your AI support agent"
          subtitle="Six short steps: identity, knowledge, integrations, tone, a quick test, then install. You can exit anytime— progress is saved in the product."
        />
        <OnboardingSectionCard>
          <ul className="space-y-3 text-left text-sm text-ds-on-surface">
            <li className="flex gap-2">
              <span className="text-ds-tertiary font-bold">1</span>
              Name your agent and point us at your site
            </li>
            <li className="flex gap-2">
              <span className="text-ds-tertiary font-bold">2</span>
              Add files or sheets for richer answers
            </li>
            <li className="flex gap-2">
              <span className="text-ds-tertiary font-bold">3–6</span>
              Connect Shopify, tune experience, validate, install
            </li>
          </ul>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Link
              href="/onboarding"
              className="bg-ds-primary text-ds-on-primary hover:bg-ds-secondary inline-flex items-center justify-center rounded-ds-md px-6 py-3 text-sm font-semibold transition-colors"
            >
              Start setup
            </Link>
            <Link
              href="/dashboard"
              className="text-ds-on-surface-variant hover:text-ds-on-surface text-sm font-semibold underline underline-offset-2"
            >
              I already have an agent — go to dashboard
            </Link>
          </div>
        </OnboardingSectionCard>
        <p className={`${onboardingType.hint} mt-6`}>Typical time: about 5 minutes.</p>
      </OnboardingMainColumn>
    </OnboardingFrame>
  );
}
