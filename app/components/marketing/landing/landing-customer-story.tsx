import { LandingSectionLabel } from "@/components/marketing/landing/landing-section-label";
import { StorySceneCsatLift } from "@/components/marketing/landing/story/scenes";

export function LandingCustomerStory() {
  return (
    <section className="bg-black px-6 py-20 sm:py-24">
      <div className="mx-auto max-w-[1100px]">
        <LandingSectionLabel tone="dark">Customer story</LandingSectionLabel>

        <div className="mt-6 grid gap-10 lg:grid-cols-2 lg:items-center">
          <article className="flex min-w-0 flex-col justify-between overflow-hidden rounded-[28px] bg-[#b4c6fc] p-6 sm:p-8">
            <span className="mkt-display text-4xl leading-none text-black/80" aria-hidden>
              &ldquo;
            </span>
            <p className="mkt-display mt-4 text-xl italic leading-snug text-black sm:text-2xl">
              ChatRely is already the best support agent we have, according to customer reviews.
            </p>
            <div className="mt-6 -mx-1 h-[100px] sm:h-[120px]">
              <StorySceneCsatLift className="h-full w-full" />
            </div>
          </article>

          <h2 className="mkt-display min-w-0 text-balance text-2xl !text-white sm:text-3xl lg:text-[2rem] lg:leading-snug">
            ChatRely helped a Shopify brand lift CSAT on order-status chats while cutting repeat tickets from shoppers
            asking the same policy questions.
          </h2>
        </div>
      </div>
    </section>
  );
}
