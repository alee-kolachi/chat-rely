import type { Metadata } from "next";
import Link from "next/link";
import { ChatRelyWordmark } from "@/components/branding/chat-rely-wordmark";
import { ConversationalWorkflowSection } from "@/components/marketing/conversational-workflow-section";
import { LandingHeroChatPreview } from "@/components/marketing/landing-hero-chat-preview";
import { LandingStatsSection } from "@/components/marketing/landing-stats-section";
import { PlatformDiscoverySection } from "@/components/marketing/platform-discovery-section";
import { LandingPricingTeaser } from "@/components/marketing/landing-pricing-teaser";

const brands = ["Make", "Shopify", "Zendesk", "Notion", "Slack", "Stripe", "Salesforce", "WhatsApp", "Zapier"];

const highlightCards = [
  [
    "Always on — even during your biggest sales",
    "Flash sale or midnight spike, your agent stays live. Customers talk to your brand, not an error screen.",
  ],
  [
    "Live store data, not last week's upload",
    "Price change Tuesday, your agent knows Tuesday. No retraining, no stale answers.",
  ],
  [
    "Acts like support, not a FAQ box",
    "Looks up orders, opens tickets, hands off with the full thread. Your team gets context, not confusion.",
  ],
] as const;

const featureCards = [
  [
    "Multi-agent ready",
    "Run separate agents for support, returns, and product questions. Each one trained on exactly what it needs — nothing it doesn't.",
  ],
  [
    "You choose the model",
    "From lightweight and fast to the most capable available. Match the model to the conversation, not the other way around.",
  ],
  [
    "Learns from tickets, not just documents",
    "Every resolved ticket becomes a potential knowledge update. Your agent gets sharper from real support history — not just what you thought to upload.",
  ],
  [
    "No retraining cycle",
    "Catalog updated. Policy revised. Agent already knows. There is no step two.",
  ],
  [
    "White-label ready",
    "Your brand, your colors, your name. ChatRely stays invisible — your support experience stays yours.",
  ],
  [
    "Access controls that make sense",
    "Set what each agent can see, do, and escalate. Useful for teams managing multiple stores or handing access to contractors without handing over everything.",
  ],
] as const;

export const metadata: Metadata = {
  title: "AI Agents for Customer Support",
  description:
    "Build and deploy AI support agents with ChatRely. Train on your data, automate workflows, and deliver better customer experiences.",
};

export default function LandingPage() {
  return (
    <main className="flex-1 bg-ds-surface text-ds-on-surface">
      <section className="bg-ds-surface px-6 pb-14 pt-10 sm:pb-16 sm:pt-14 lg:pb-20">
        <div className="mx-auto grid max-w-[1200px] gap-16 lg:grid-cols-2 lg:items-center">
          <div className="max-w-xl">
            <h1 className="text-5xl font-semibold leading-tight tracking-tight sm:text-6xl">
              AI agents for magical customer experiences
            </h1>
            <p className="mt-5 text-lg leading-8 text-ds-on-surface-variant">
              ChatRely is the complete platform for building and deploying AI support agents. Train on your data,
              integrate with your tools, and start in minutes.
            </p>
            <div className="mt-5 flex flex-wrap justify-center gap-3 sm:justify-start sm:gap-4">
              <Link
                href="/login"
                className="inline-flex h-14 w-full items-center justify-center whitespace-nowrap rounded-ds-lg border border-transparent bg-ds-primary px-8 text-sm font-medium text-ds-on-primary sm:w-[280px]"
              >
                Book a demo
              </Link>
              <Link
                href="/signup"
                className="inline-flex h-14 w-full items-center justify-center whitespace-nowrap rounded-ds-lg border border-ds-outline bg-ds-surface px-8 text-sm font-medium hover:bg-white sm:w-[280px]"
              >
                Build your agent for free
              </Link>
            </div>
            <p className="mt-10 text-sm text-ds-on-surface-variant">
              <span className="font-semibold text-ds-on-surface">120+ businesses</span> building with ChatRely
            </p>
          </div>

          <LandingHeroChatPreview />
        </div>
      </section>

      <LandingStatsSection />

      <section className="bg-white px-6 py-16 sm:py-20 lg:py-24">
        <div className="mx-auto max-w-[1200px]">
          <div className="mb-16 grid gap-10 lg:grid-cols-2">
            <h2 className="text-4xl font-semibold tracking-tight">
              Support that stays on, stays accurate, and actually gets things done
            </h2>
            <p className="text-base leading-7 text-ds-on-surface-variant lg:max-w-md lg:justify-self-end">
              ChatRely connects directly to your live Shopify store — looking up orders, handling returns, and escalating
              with full context — so your customers never hit an error screen and your team never starts from scratch.
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {highlightCards.map(([title, text]) => (
              <article key={title} className="rounded-[28px] border border-ds-outline bg-white p-8 shadow-sm transition hover:shadow-lg">
                <div className="mb-8 aspect-[4/3] rounded-2xl border border-ds-outline bg-ds-surface" />
                <h3 className="text-2xl font-semibold">{title}</h3>
                <p className="mt-3 text-sm leading-6 text-ds-on-surface-variant">{text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <ConversationalWorkflowSection />

      <section className="bg-white px-6 py-16 sm:py-20 lg:py-24">
        <div className="mx-auto max-w-[1200px]">
          <h2 className="max-w-2xl text-4xl font-semibold tracking-tight">
            Built for stores that can't afford a broken support experience
          </h2>
          <p className="mt-5 max-w-2xl text-lg text-ds-on-surface-variant">
            ChatRely was designed around one constraint: whatever happens — traffic spike, catalog update, edge-case
            question — your customers should never feel the gap.
          </p>
          <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {featureCards.map(([title, text]) => (
              <article key={title} className="rounded-[28px] border border-ds-outline bg-white p-8 shadow-sm transition hover:shadow-lg">
                <div className="mb-8 aspect-video rounded-2xl border border-zinc-200 bg-zinc-50" />
                <h3 className="text-xl font-semibold">{title}</h3>
                <p className="mt-3 text-sm leading-6 text-ds-on-surface-variant">{text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-zinc-200 bg-[#f8f9fa] px-6 py-16 sm:py-20 lg:py-24">
        <div className="mx-auto max-w-[1200px]">
          <div className="mb-12 text-center">
            <h2 className="text-4xl font-semibold tracking-tight">Predictable pricing, scalable plans</h2>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-ds-on-surface-variant">
              Designed for every stage of your journey.
            </p>
          </div>
          <LandingPricingTeaser />
        </div>
      </section>

      <section className="border-y border-zinc-200 bg-[#f8f9fa] px-6 py-16 sm:py-20 lg:py-24">
        <div className="mx-auto max-w-[1200px]">
          <div className="mb-14 flex flex-col justify-between gap-10 lg:flex-row lg:items-center">
            <div>
              <h3 className="text-3xl font-semibold">Works with your tools</h3>
              <p className="mt-4 max-w-md text-ds-on-surface-variant">
                Integrate data sources and systems to enrich your agent knowledge and actions.
              </p>
            </div>
            <div className="flex flex-wrap gap-6 text-sm font-semibold text-zinc-700">
              {brands.map((brand) => (
                <span key={`tool-${brand}`}>{brand}</span>
              ))}
            </div>
          </div>
          <div className="grid gap-8 border-t border-zinc-200 pt-12 md:grid-cols-3">
            {["API", "Whitelabel", "Always Improving"].map((item) => (
              <article key={item}>
                <h4 className="font-semibold">{item}</h4>
                <p className="mt-2 text-sm text-ds-on-surface-variant">
                  Deep integrations, brand consistency, and continuous learning for better support outcomes.
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <PlatformDiscoverySection />

      <section className="bg-white px-6 py-24">
        <div className="mx-auto max-w-[1200px] text-center">
          <h2 className="mx-auto max-w-4xl text-5xl font-semibold tracking-tight md:text-6xl">
            Make customer service your competitive edge
          </h2>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-ds-on-surface-variant">
            Use ChatRely to deliver exceptional AI customer support experiences that set you apart.
          </p>
          <Link
            href="/signup"
            className="mt-10 inline-flex rounded-ds-lg bg-ds-primary px-10 py-5 text-sm font-semibold text-ds-on-primary"
          >
            Build your agent for free
          </Link>
          <p className="mt-4 text-sm text-ds-on-surface-variant">No credit card required</p>
        </div>
      </section>

      <footer className="bg-black px-6 py-20 text-white">
        <div className="mx-auto grid max-w-[1200px] gap-12 lg:grid-cols-2">
          <div className="space-y-6">
            <ChatRelyWordmark
              invertLogo
              iconClassName="h-7 w-auto"
              textClassName="text-4xl font-black tracking-tight text-white"
            />
            <p className="text-sm text-zinc-500">© 2026 ChatRely</p>
            <div className="flex flex-wrap gap-3">
              <a
                href="mailto:support@chatrely.com"
                className="rounded-ds-md bg-white px-5 py-2 text-sm font-semibold text-black no-underline"
              >
                Contact
              </a>
              <Link href="/privacy" className="rounded-ds-md border border-zinc-800 px-4 py-2 text-sm text-zinc-300 no-underline">
                Privacy
              </Link>
              <Link href="/terms" className="rounded-ds-md border border-zinc-800 px-4 py-2 text-sm text-zinc-300 no-underline">
                Terms
              </Link>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-10 md:grid-cols-3">
            {(
              [
                ["Product", ["Customer Service", "Pricing", "Security", "Affiliates"]],
                ["Resources", ["Contact us", "API", "Guide", "Blog"]],
                ["Company", ["Careers", "Privacy policy", "Terms of service", "Trust center"]],
              ] as const
            ).map(([title, items]) => (
              <div key={title}>
                <h4 className="text-xs font-semibold uppercase tracking-widest text-zinc-500">{title}</h4>
                <ul className="mt-5 space-y-3 text-sm text-zinc-400">
                  {items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </footer>
    </main>
  );
}
