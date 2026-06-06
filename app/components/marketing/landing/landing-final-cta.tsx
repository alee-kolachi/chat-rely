import Link from "next/link";
import { LandingReveal } from "@/components/marketing/landing/landing-reveal";
import { LandingSectionLabel } from "@/components/marketing/landing/landing-section-label";
import { StorySceneLaunch } from "@/components/marketing/landing/story/scenes";

export function LandingFinalCta() {
  return (
    <section className="bg-ds-primary px-6 py-20 sm:py-24">
      <div className="mx-auto max-w-[1100px]">
        <LandingReveal>
          <LandingSectionLabel tone="primary">Get started</LandingSectionLabel>
        </LandingReveal>

        <div className="mt-6 grid items-center gap-12 lg:grid-cols-2">
          <LandingReveal>
            <h2 className="mkt-display max-w-xl text-4xl !text-ds-on-primary sm:text-5xl">
              Put AI support on your Shopify store
            </h2>
            <p className="mkt-body mt-5 max-w-lg !text-ds-on-primary/85">
              Free plan, no credit card. Connect Shopify, add your help content, and go live with one embed snippet.
            </p>
            <Link href="/signup" className="mkt-pill mkt-pill-dark mt-8 inline-flex px-8 py-3.5 text-base sm:mt-10">
              Create your agent
            </Link>
          </LandingReveal>

          <LandingReveal delayMs={100} className="flex justify-center lg:justify-end">
            <div className="w-full max-w-[420px] overflow-hidden rounded-[28px] border border-black/10 bg-white/30 p-4 sm:p-6">
              <StorySceneLaunch className="h-full w-full" />
            </div>
          </LandingReveal>
        </div>
      </div>
    </section>
  );
}
