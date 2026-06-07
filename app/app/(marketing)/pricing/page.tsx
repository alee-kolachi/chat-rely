import type { Metadata } from "next";
import { Suspense } from "react";
import { MarketingPricingClient } from "./pricing-client";

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "ChatRely plans by premium AI conversations, agents, Shopify actions, and analytics. Unlimited essential AI after your cap.",
};

export default function PricingPage() {
  return (
    <Suspense fallback={null}>
      <MarketingPricingClient />
    </Suspense>
  );
}
