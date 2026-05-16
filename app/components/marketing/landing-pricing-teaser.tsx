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
        <p className="text-ds-on-surface-variant max-w-md text-xs leading-relaxed">
          The full plan table with prices and CTAs is on the pricing page.
        </p>
      </div>
    </>
  );
}
