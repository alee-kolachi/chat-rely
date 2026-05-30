import Link from "next/link";
import type { ReactNode } from "react";
import { LandingSectionLabel } from "@/components/marketing/landing/landing-section-label";
import {
  StorySceneAccurate,
  StorySceneHandoff,
  StorySceneShopify,
} from "@/components/marketing/landing/story/scenes";
import { cn } from "@/lib/utils";

const FEATURE_MEDIA_WIDTH = "max-w-[360px]";

const features = [
  {
    title: "Always on, even during your biggest sales",
    body: "Flash sale at midnight. Black Friday traffic spike. Your agent stays live through all of it. No credit cliff. No \"unavailable\" message. Just your brand showing up when it matters most.",
    tint: "bg-[#f5e6a3]",
    scene: <StorySceneShopify />,
  },
  {
    title: "Answers from your live store, not last week's upload",
    body: "Price drop on Tuesday? New product Wednesday? Policy update Thursday? Your agent already knows. ChatRely stays connected to your Shopify admin, so what customers hear always matches what your store actually says.",
    tint: "bg-[#f5e6a3]",
    scene: <StorySceneAccurate />,
  },
  {
    title: "Does the work, doesn't just answer the question",
    body: "Pulls up real order status. Opens a support ticket with the full conversation attached. Sends the follow-up email. Hands off to your team with everything they need to act, not a blank screen and a frustrated customer starting over.",
    tint: "bg-[#e5937f]",
    scene: <StorySceneHandoff />,
  },
] as const;

function FeatureStoryCard({ tint, scene }: { tint: string; scene: ReactNode }) {
  return (
    <div
      className={`${tint} relative aspect-square w-full overflow-hidden rounded-[28px] border border-black/5 p-4 sm:p-5`}
    >
      <div className="h-full w-full">{scene}</div>
    </div>
  );
}

export function LandingProductSection() {
  return (
    <section id="product" className="bg-ds-surface px-6 py-20 sm:py-24">
      <div className="mx-auto max-w-[1100px]">
        <LandingSectionLabel tone="light">Product</LandingSectionLabel>

        <div className="mt-6">
          <h2 className="mkt-display max-w-4xl text-5xl sm:text-6xl">
            Support that stays on, stays accurate, and gets things done
          </h2>
          <p className="mkt-body mt-5 max-w-3xl">
            ChatRely connects directly to your live Shopify store, looking up orders, handling returns, and escalating
            with full context, so your customers never hit an error screen and your team never starts from scratch.
          </p>
        </div>

        <div className="mt-14 space-y-20 sm:space-y-24">
          {features.map((feature, index) => {
            const reversed = index % 2 === 1;

            return (
              <article
                key={feature.title}
                className="grid grid-cols-1 items-center gap-10 lg:grid-cols-2 lg:gap-x-20 xl:gap-x-24"
              >
                <div
                  className={cn(
                    "flex w-full justify-center",
                    reversed ? "lg:order-2 lg:justify-start" : "lg:justify-end",
                  )}
                >
                  <div className={cn("w-full", FEATURE_MEDIA_WIDTH)}>
                    <FeatureStoryCard tint={feature.tint} scene={feature.scene} />
                  </div>
                </div>

                <div
                  className={cn(
                    "flex w-full justify-center",
                    reversed ? "lg:order-1 lg:justify-end" : "lg:justify-start",
                  )}
                >
                  <div className={cn("w-full text-left", FEATURE_MEDIA_WIDTH)}>
                    <h3 className="mkt-display text-3xl sm:text-4xl">{feature.title}</h3>
                    <p className="mkt-body mt-4">{feature.body}</p>
                  </div>
                </div>
              </article>
            );
          })}
        </div>

        <div className="mt-12 flex justify-center sm:mt-14">
          <Link href="/pricing" className="mkt-pill mkt-pill-outline">
            Explore plans →
          </Link>
        </div>
      </div>
    </section>
  );
}
