import Link from "next/link";
import { HeroChatDemo } from "@/components/marketing/landing/landing-hero-chat-demo";
import { LANDING_CHAT_WIDTH_CLASS } from "@/components/marketing/landing/landing-chat-widget-shell";
import { LandingHeroGridBackground } from "@/components/marketing/landing/landing-hero-grid-background";
import { LandingReveal } from "@/components/marketing/landing/landing-reveal";
import { cn } from "@/lib/utils";

export function LandingHeroSection() {
  return (
    <section data-hero-section className="relative overflow-hidden px-6 py-10 sm:py-12 lg:min-h-[calc(100svh-6.75rem)] lg:py-0">
      <LandingHeroGridBackground />

      <div className="relative z-10 mx-auto grid max-w-[1200px] items-center gap-10 sm:gap-12 lg:min-h-[calc(100svh-6.75rem)] lg:grid-cols-2 lg:gap-16">
        <LandingReveal className="flex w-full flex-col items-center justify-center text-center lg:items-start lg:text-left">
          <h1 className="mkt-display mx-auto max-w-xl text-[2.75rem] sm:text-[3.25rem] lg:mx-0 lg:text-[3.5rem]">
            <span className="block">Support every</span>
            <span className="block text-ds-primary">Shopify shopper.</span>
          </h1>
          <p data-hero-subcopy className="mkt-body mx-auto mt-5 max-w-lg lg:mx-0">
            ChatRely is the AI chatbot for your Shopify storefront. Answer from live catalog, orders, and your help
            content, with human handoff when shoppers need a person.
          </p>
          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center lg:justify-start">
            <Link href="/signup" className="mkt-pill mkt-pill-primary px-8 py-3.5 text-base">
              Get started for free
            </Link>
            <Link href="/pricing" className="mkt-pill mkt-pill-outline px-8 py-3.5 text-base">
              See our plans
            </Link>
          </div>
          <p className="mkt-font mx-auto mt-4 text-xs text-ds-on-surface-variant/60 lg:mx-0">
            No credit card required. Free plan.
          </p>
        </LandingReveal>

        <LandingReveal className="flex items-center justify-center sm:ml-6 lg:ml-10 lg:justify-end" delayMs={120}>
          <div className={cn("w-full", LANDING_CHAT_WIDTH_CLASS)}>
            <HeroChatDemo />
          </div>
        </LandingReveal>
      </div>
    </section>
  );
}
