"use client";

import Link from "next/link";
import { OnboardingFrame } from "@/components/onboarding/onboarding-frame";
import {
  OnboardingMainColumn,
  OnboardingPageHeader,
  OnboardingSectionCard,
  OnboardingStatusBlock,
  OnboardingStickyFooter,
  onboardingType,
} from "@/components/onboarding/onboarding-ui";

const syncItems = [
  { label: "Products", state: "done" as const },
  { label: "Variants", state: "done" as const },
  { label: "Pricing models", state: "active" as const },
  { label: "Store policies", state: "pending" as const },
];

export default function ConnectionOnboardingPage() {
  return (
    <OnboardingFrame
      activeItem="Connection"
      completedItems={["Agent Name", "Knowledge Base"]}
      stepLabel="Step 3 of 6"
    >
      <OnboardingMainColumn className="max-w-2xl">
        <div className="mb-6 flex justify-end">
          <button
            type="button"
            className="text-ds-on-surface-variant hover:text-ds-on-surface text-xs font-semibold tracking-wide uppercase transition-colors"
          >
            Connect later
          </button>
        </div>

        <OnboardingPageHeader
          kicker="Step 3 · Integrations"
          title="Connect Shopify for live catalog data"
          subtitle="OAuth keeps your store secure. We sync products and policies so answers stay accurate as inventory changes."
        />

        <OnboardingSectionCard className="mb-6">
          <div className="flex flex-col items-center text-center">
            <div className="border-ds-outline mb-6 flex size-16 items-center justify-center rounded-ds-lg border bg-ds-sidebar text-2xl">
              S
            </div>
            <button
              type="button"
              className="bg-ds-primary text-ds-on-primary hover:bg-zinc-800 w-full max-w-sm rounded-ds-md py-3 text-sm font-semibold transition-colors sm:max-w-md"
            >
              Connect Shopify
            </button>
            <p className="text-ds-on-surface-variant mt-3 text-[11px] font-medium uppercase tracking-wider">
              Secure OAuth · no password sharing
            </p>
          </div>
        </OnboardingSectionCard>

        <OnboardingStatusBlock
          variant="neutral"
          title="Synchronization status"
          description="Initial sync may take a few minutes. You can keep configuring your agent."
        >
          <div className="mt-3 flex items-center justify-between text-[11px] font-semibold uppercase tracking-wide text-ds-on-surface">
            <span>Progress</span>
            <span>55%</span>
          </div>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-ds-outline/80">
            <div className="bg-ds-primary h-full w-[55%] rounded-full transition-all" />
          </div>
          <ul className="mt-4 space-y-2">
            {syncItems.map((item) => (
              <li
                key={item.label}
                className={`flex items-center justify-between rounded-ds-md border px-3 py-2.5 text-sm ${
                  item.state === "active"
                    ? "border-ds-primary bg-white ring-1 ring-ds-primary/15"
                    : item.state === "pending"
                      ? "border-dashed border-ds-outline bg-ds-sidebar/60 text-ds-on-surface-variant"
                      : "border-ds-outline bg-white"
                }`}
              >
                <span className="font-medium text-ds-on-surface">{item.label}</span>
                <span className="text-[10px] font-semibold uppercase tracking-wide text-ds-on-surface-variant">
                  {item.state === "done"
                    ? "Done"
                    : item.state === "active"
                      ? "In progress"
                      : "Pending"}
                </span>
              </li>
            ))}
          </ul>
        </OnboardingStatusBlock>

        <p className={`${onboardingType.body} mt-6 text-center`}>
          Other channels (email, helpdesk) can be linked later from{" "}
          <Link href="/settings" className="text-ds-primary font-semibold underline underline-offset-2">
            Settings
          </Link>
          .
        </p>
      </OnboardingMainColumn>

      <OnboardingStickyFooter
        backHref="/onboarding/knowledge-base/training"
        backLabel="Back"
        primaryHref="/onboarding/appearance-tone"
        primaryLabel="Continue"
      />
    </OnboardingFrame>
  );
}
