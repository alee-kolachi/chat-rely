import type { Metadata } from "next";
import { MarketingPricingClient } from "./pricing-client";

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "ChatRely plans by conversations, agents, automations, and analytics. Essential AI on every tier, smart resolution on Standard and Pro.",
};

export default function PricingPage() {
  return <MarketingPricingClient />;
}
