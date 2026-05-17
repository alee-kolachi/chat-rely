"use client";

import Link from "next/link";
import { PricingCards } from "@/components/marketing/pricing-sections";
import { useSessionPresent } from "@/hooks/use-session-present";

export function LandingPricingTeaser() {
  const { ready: sessionReady, hasSession } = useSessionPresent();

  return (
    <>
      <PricingCards variant="teaser" isAuthenticated={sessionReady && hasSession} />
      <div className="mt-10 flex flex-col items-center gap-3 text-center">
        <Link
          href="/pricing"
          className="bg-ds-primary text-ds-on-primary hover:bg-ds-primary-hover inline-flex min-h-11 items-center justify-center rounded-ds-lg px-6 py-2.5 text-sm font-semibold shadow-sm transition-colors"
        >
          Compare all plans &amp; features
        </Link>
        <p className="ds-app-body-muted max-w-md">
          Essential AI on every plan. Standard and Pro add smart resolution for complex issues. Chat stays on.
        </p>
      </div>
    </>
  );
}
