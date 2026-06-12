import Link from "next/link";
import { LandingReveal } from "@/components/marketing/landing/landing-reveal";
import { LandingSectionLabel } from "@/components/marketing/landing/landing-section-label";

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
              Free plan, no credit card. Add your help content and go live with one embed snippet. Connect Shopify on Hobby or above.
            </p>
            <Link href="/signup" className="mkt-pill mkt-pill-dark mt-8 inline-flex px-8 py-3.5 text-base sm:mt-10">
              Create your agent
            </Link>
          </LandingReveal>

          <LandingReveal delayMs={100} className="flex justify-center lg:justify-end">
            <div className="w-full max-w-[560px] overflow-hidden rounded-[28px] border border-black/10 bg-white/30 p-3 sm:p-4">
              <img
                src="/marketing/dashboard-get-started.png"
                alt="ChatRely dashboard showing agent activity and support outcomes"
                width={1024}
                height={555}
                className="h-auto w-full rounded-2xl"
              />
            </div>
          </LandingReveal>
        </div>
      </div>
    </section>
  );
}
