import Link from "next/link";
import { HeroChatDemo } from "@/components/marketing/landing/landing-hero-chat-demo";
import { LandingHeroGridBackground } from "@/components/marketing/landing/landing-hero-grid-background";
import { LandingReveal } from "@/components/marketing/landing/landing-reveal";

export function LandingHeroSection() {
  return (
    <section data-hero-section className="relative overflow-hidden px-6 py-10 sm:py-12 lg:min-h-[calc(100svh-6.75rem)] lg:py-0">
      <LandingHeroGridBackground />

      <div className="relative z-10 mx-auto grid max-w-[1200px] items-center gap-10 sm:gap-12 lg:min-h-[calc(100svh-6.75rem)] lg:grid-cols-2 lg:gap-16">
        <LandingReveal className="flex w-full flex-col items-center justify-center text-center lg:items-start lg:text-left">
          <h1 className="mkt-display mx-auto max-w-xl text-[2.75rem] sm:text-[3.25rem] lg:mx-0 lg:text-[3.5rem]">
            AI support built for Shopify stores
          </h1>
          <p data-hero-subcopy className="mkt-body mx-auto mt-5 max-w-lg lg:mx-0">
            Grounded answers from your catalog, orders, and knowledge base, with human handoff when shoppers need a
            person.
          </p>
          <div className="mt-8 flex justify-center lg:justify-start">
            <Link href="/signup" className="mkt-pill mkt-pill-primary px-8 py-3.5 text-base">
              Start free →
            </Link>
          </div>
        </LandingReveal>

        <LandingReveal className="flex items-center justify-center lg:justify-end" delayMs={120}>
          <div className="w-full max-w-[420px]">
            <HeroChatDemo />
          </div>
        </LandingReveal>
      </div>
    </section>
  );
}
