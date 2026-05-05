"use client";

import Link from "next/link";
import { PricingCards, PricingComparison } from "@/components/marketing/pricing-sections";
import { usePublicPlans } from "@/hooks/use-public-plans";
import { useSessionPresent } from "@/hooks/use-session-present";

export function LandingPricingTeaser() {
  const { plans, error, loading } = usePublicPlans();
  const { ready: sessionReady, hasSession } = useSessionPresent();

  return (
    <>
      <PricingCards
        plans={plans}
        loading={loading || !sessionReady}
        loadError={error}
        isAuthenticated={hasSession}
      />
      <div className="mt-12">
        <PricingComparison plans={plans} loading={loading} loadError={error} />
      </div>
      <div className="mt-8 text-center">
        <Link href="/pricing" className="text-ds-tertiary text-sm font-semibold underline underline-offset-4">
          View full pricing details
        </Link>
      </div>
    </>
  );
}
