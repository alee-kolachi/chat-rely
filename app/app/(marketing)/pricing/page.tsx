import type { Metadata } from "next";
import { MarketingPricingClient } from "./pricing-client";

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "ChatRely plans by capabilities—agents, automations, analytics, channels, and models—with transparent usage. Pick a tier and explore what is included.",
};

export default function PricingPage() {
  return <MarketingPricingClient />;
}
