import type { Metadata } from "next";
import { MarketingPricingClient } from "./pricing-client";

export const metadata: Metadata = {
  title: "Pricing",
  description: "Choose the right ChatRely plan for your support team and compare features across pricing tiers.",
};

export default function PricingPage() {
  return <MarketingPricingClient />;
}
