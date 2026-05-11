"use client";

import Link from "next/link";
import { ChatRelyWordmark } from "@/components/branding/chat-rely-wordmark";
import { OnboardingFrame } from "@/components/onboarding/onboarding-frame";
import {
  OnboardingMainColumn,
  OnboardingPageHeader,
  OnboardingSectionCard,
  OnboardingStickyFooter,
  onboardingType,
} from "@/components/onboarding/onboarding-ui";

/**
 * Optional entry screen — not in the 6-step sidebar; reduces cold-start anxiety.
 */
export default function OnboardingWelcomePage() {
  return (
    <OnboardingFrame
      activeItem="Agent Name"
      completedItems={[]}
      stepLabel="Welcome"
      footer={<OnboardingStickyFooter primaryHref="/onboarding" primaryLabel="Continue" />}
    >
      <OnboardingMainColumn className="max-w-xl text-center">
        <OnboardingPageHeader
          kicker={<ChatRelyWordmark iconClassName="h-6 w-auto" textClassName="text-xl font-semibold text-ds-on-surface" />}
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
          <div className="mt-6 flex justify-center">
            <Link
              href="/dashboard"
              className="text-ds-on-surface-variant hover:text-ds-on-surface inline-flex min-h-11 items-center justify-center text-sm font-semibold underline underline-offset-2 [-webkit-tap-highlight-color:transparent]"
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
