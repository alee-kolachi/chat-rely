import type { Metadata } from "next";
import { Suspense } from "react";
import { MarketingPricingClient } from "./pricing-client";

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "ChatRely plans by monthly conversations, agents, and AI actions. Premium models on paid plans; normal models keep chat online after your allowance.",
};

export default function PricingPage() {
  return (
    <Suspense fallback={null}>
      <MarketingPricingClient />
    </Suspense>
  );
}
