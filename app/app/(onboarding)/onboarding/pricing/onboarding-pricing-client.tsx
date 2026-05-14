"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import { useResolvedOnboardingAgentId } from "@/lib/use-resolved-onboarding-agent-id";
import { BackendApiError, backendFetch } from "@/lib/backend-api";
import { PricingCards } from "@/components/marketing/pricing-sections";
import { OnboardingFrame } from "@/components/onboarding/onboarding-frame";
import { OnboardingStickyFooter } from "@/components/onboarding/onboarding-ui";

export function OnboardingPricingClient() {
  const router = useRouter();
  const agentId = useResolvedOnboardingAgentId();
  const [continueBusy, setContinueBusy] = useState(false);
  const [continueError, setContinueError] = useState<string | null>(null);

  const backHref = useMemo(
    () =>
      agentId ? `/onboarding/appearance-tone?agentId=${encodeURIComponent(agentId)}` : "/onboarding/appearance-tone",
    [agentId],
  );

  const playgroundHref = useMemo(() => {
    if (!agentId) return "/playground";
    return `/playground?agentId=${encodeURIComponent(agentId)}`;
  }, [agentId]);

  const onContinue = useCallback(async () => {
    if (!agentId || continueBusy) return;
    setContinueError(null);
    setContinueBusy(true);
    try {
      await backendFetch("/api/v1/onboarding/finish", {
        method: "POST",
        body: JSON.stringify({ agent_id: agentId }),
      });
      router.push(playgroundHref);
    } catch (e) {
      setContinueError(e instanceof BackendApiError ? e.message : "Could not complete setup.");
    } finally {
      setContinueBusy(false);
    }
  }, [agentId, continueBusy, playgroundHref, router]);

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
          onPrimaryClick={() => void onContinue()}
          primaryPending={continueBusy}
          primaryDisabled={!agentId}
          primaryLabel="Continue"
          tertiary={
            <span className="text-ds-on-surface-variant block max-w-full text-center text-[10px] leading-snug sm:max-w-md sm:text-left sm:text-[11px]">
              Taxes may apply by region. Questions before you commit? Use support from Settings.
            </span>
          }
        />
      }
    >
      {continueError ? (
        <p className="border-ds-outline bg-ds-surface/95 mx-auto mt-2 max-w-3xl rounded-ds-md border px-3 py-2 text-center text-xs text-rose-600 sm:px-4">
          {continueError}
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
          </header>

          <div className="mt-4 min-w-0 sm:mt-6 md:mt-8">
            <PricingCards variant="onboarding" isAuthenticated />
          </div>
        </div>
      </div>
    </OnboardingFrame>
  );
}
