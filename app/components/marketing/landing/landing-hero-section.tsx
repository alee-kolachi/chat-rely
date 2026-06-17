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

      <div className="relative z-10 mx-auto grid max-w-[1200px] items-center gap-8 sm:gap-10 lg:min-h-[calc(100svh-6.75rem)] lg:grid-cols-2 lg:gap-12">
        <LandingReveal className="flex w-full flex-col items-center justify-center text-center lg:h-full lg:items-start lg:justify-center lg:pr-2 lg:text-left xl:pr-0">
          <p className="mkt-font text-xs font-semibold uppercase tracking-[0.14em] text-ds-primary">
            AI Chatbot for Shopify
          </p>
          <h1 className="mkt-display mx-auto mt-2 max-w-xl text-balance text-[2.75rem] leading-[1.08] sm:mt-3 sm:text-[3.25rem] sm:leading-[1.1] lg:mx-0 lg:text-[3.5rem] lg:leading-[1.1]">
            Your store&apos;s smartest
            <br className="sm:hidden" /> employee,
            <br />
            <span className="text-ds-primary">on a flat salary.</span>
          </h1>
          <div
            data-hero-subcopy
            className="mkt-font mx-auto mt-5 w-full max-w-[34rem] space-y-2 text-[0.875rem] font-medium leading-[1.6] tracking-[-0.03em] text-ds-on-surface-variant sm:mt-6 sm:space-y-2.5 sm:text-base lg:mx-0 lg:max-w-none"
          >
            <p>
              Trained on your live Shopify catalog, orders, and inventory. Grounded answers on price, stock, and policy,
              never guesses. Hands off to your team when shoppers need a person.
            </p>
            <p>Flat pricing, no per-conversation fees.</p>
          </div>
          <div className="mt-5 flex flex-col items-center gap-3 sm:mt-7 sm:flex-row sm:justify-center lg:justify-start">
            <Link href="/signup" className="mkt-pill mkt-pill-primary px-8 py-3.5 text-base">
              Start for free
            </Link>
            <Link href="/pricing" className="mkt-pill mkt-pill-outline px-8 py-3.5 text-base">
              See pricing
            </Link>
          </div>
          <p className="mkt-font mx-auto mt-3 text-xs text-ds-on-surface-variant/60 sm:mt-4 lg:mx-0">
            Free plan · No credit card · No per-ticket fees
          </p>
        </LandingReveal>

        <LandingReveal
          className="flex h-full items-center justify-center sm:ml-4 lg:ml-8 lg:translate-x-[22%] lg:justify-end"
          delayMs={120}
        >
          <div className={cn("w-full origin-center scale-95 lg:origin-center", LANDING_CHAT_WIDTH_CLASS)}>
            <HeroChatDemo />
          </div>
        </LandingReveal>
      </div>
    </section>
  );
}
