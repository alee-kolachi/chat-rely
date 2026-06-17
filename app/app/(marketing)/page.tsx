import type { Metadata } from "next";
import { LandingComparisonSection } from "@/components/marketing/landing/landing-comparison-section";
import { LandingFinalCta } from "@/components/marketing/landing/landing-final-cta";
import { LandingFooter } from "@/components/marketing/landing/landing-footer";
import { LandingHeroSection } from "@/components/marketing/landing/landing-hero-section";
import { LandingProductSection } from "@/components/marketing/landing/landing-product-section";
import { LandingHowItWorks } from "@/components/marketing/landing/landing-how-it-works";
import { LandingTrustSection } from "@/components/marketing/landing/landing-trust-section";

export const metadata: Metadata = {
  title: "ChatRely - AI support for Shopify, no per-ticket fees",
  description:
    "The AI chatbot built for Shopify. Answers from live catalog, orders, and help content, with human handoff. Flat pricing, no message credits. Free plan, no credit card.",
};

export default function LandingPage() {
  return (
    <main className="flex-1">
      <LandingHeroSection />
      <LandingHowItWorks />
      <LandingComparisonSection />
      <LandingTrustSection />
      <LandingProductSection />
      <LandingFinalCta />
      <LandingFooter />
    </main>
  );
}
