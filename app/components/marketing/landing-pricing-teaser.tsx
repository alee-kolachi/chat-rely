"use client";

import Link from "next/link";
import { PricingCards } from "@/components/marketing/pricing-sections";
import { appButtonClassName } from "@/lib/button-styles";
import { useSessionPresent } from "@/hooks/use-session-present";

export function LandingPricingTeaser() {
  const { ready: sessionReady, hasSession } = useSessionPresent();

  return (
    <>
      <PricingCards variant="teaser" isAuthenticated={sessionReady && hasSession} />
      <div className="mt-10 flex flex-col items-center gap-3 text-center">
        <Link href="/pricing" className={appButtonClassName()}>
          Compare all plans &amp; features
        </Link>
        <p className="ds-app-body-muted max-w-md">
          Essential AI on every plan. Standard and Pro add smart resolution for complex issues. Chat stays on.
        </p>
      </div>
    </>
  );
}
