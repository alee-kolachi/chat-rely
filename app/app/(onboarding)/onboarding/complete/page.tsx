"use client";

import Link from "next/link";
import { OnboardingFrame } from "@/components/onboarding/onboarding-frame";
import {
  OnboardingMainColumn,
  OnboardingPageHeader,
  OnboardingSectionCard,
  onboardingType,
} from "@/components/onboarding/onboarding-ui";

export default function OnboardingCompletePage() {
  return (
    <OnboardingFrame
      activeItem="Installation"
      completedItems={["Agent Name", "Knowledge Base", "Connection", "Appearance & Tone", "Agent Preview", "Installation"]}
      stepLabel="Complete"
    >
      <OnboardingMainColumn className="max-w-lg text-center">
        <div className="border-ds-outline mx-auto mb-6 flex size-14 items-center justify-center rounded-full border bg-emerald-50 text-2xl">
          ✓
        </div>
        <OnboardingPageHeader
          kicker="All set"
          title="Your onboarding checklist is done"
          subtitle="Head to the dashboard to monitor sync, tune answers in Playground, and invite teammates."
        />
        <OnboardingSectionCard className="mt-6 text-left">
          <ul className="space-y-3 text-sm text-ds-on-surface">
            <li className="flex gap-2">
              <span className="text-emerald-600" aria-hidden>
                •
              </span>
              Check Knowledge → Website crawl status
            </li>
            <li className="flex gap-2">
              <span className="text-emerald-600" aria-hidden>
                •
              </span>
              Try Playground with a few edge-case questions
            </li>
            <li className="flex gap-2">
              <span className="text-emerald-600" aria-hidden>
                •
              </span>
              Open Deploy when you’re ready for production traffic
            </li>
          </ul>
        </OnboardingSectionCard>
        <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/dashboard"
            className="bg-ds-primary text-ds-on-primary hover:bg-ds-secondary inline-flex items-center justify-center rounded-ds-md px-6 py-3 text-sm font-semibold transition-colors"
          >
            Go to dashboard
          </Link>
          <Link
            href="/playground"
            className="border-ds-outline text-ds-on-surface hover:bg-ds-sidebar inline-flex items-center justify-center rounded-ds-md border bg-white px-6 py-3 text-sm font-semibold transition-colors"
          >
            Open Playground
          </Link>
        </div>
        <p className={`${onboardingType.hint} mt-8`}>
          Need changes? Use the setup wizard links on the left or jump to Settings anytime.
        </p>
      </OnboardingMainColumn>
    </OnboardingFrame>
  );
}
