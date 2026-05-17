import type { Metadata } from "next";
import Link from "next/link";
import { ChatRelyWordmark } from "@/components/branding/chat-rely-wordmark";
import { ConversationalWorkflowSection } from "@/components/marketing/conversational-workflow-section";
import { LandingHeroChatPreview } from "@/components/marketing/landing-hero-chat-preview";
import { LandingStatsSection } from "@/components/marketing/landing-stats-section";
import { PlatformDiscoverySection } from "@/components/marketing/platform-discovery-section";
import { LandingPricingTeaser } from "@/components/marketing/landing-pricing-teaser";

const highlightCards = [
  [
    "Always on, even when you're busy",
    "Chat stays on. Busy periods may reply slower, but shoppers can always reach your agent.",
  ],
  [
    "Live store data, not last week's upload",
    "Connect Shopify once. Product, order, and policy answers use your store as it is today.",
  ],
  [
    "Acts like support, not a FAQ box",
    "Look up orders, run enabled Shopify actions, and escalate to your team with the full conversation.",
  ],
] as const;

const featureCards = [
  [
    "Plans that scale with volume",
    "From free trial to Pro: more conversations, agents, and smart resolution capacity.",
  ],
  [
    "Smart resolution when it matters",
    "Essential AI handles most chats. Standard and Pro automatically use deeper reasoning on complex issues.",
  ],
  [
    "Knowledge you control",
    "Index your website, upload files, and add snippets or Q&A. Answers come from what you trained, not guesses.",
  ],
  [
    "Shopify-native actions",
    "Enable read-only Shopify tools for catalog and order questions. Human escalation creates tickets in ChatRely.",
  ],
  [
    "Widget + playground",
    "Test in the playground, then embed on your storefront. Pro can hide “Powered by ChatRely” branding.",
  ],
  [
    "Analytics by plan",
    "Hobby gets core KPIs; Standard and Pro unlock intents, quality signals, and source suggestions.",
  ],
] as const;

const integrations = [
  { name: "Shopify", detail: "OAuth connection for live catalog, orders, and policies." },
  { name: "Stripe", detail: "Self-serve subscriptions and plan upgrades." },
  { name: "Knowledge sources", detail: "Website crawl, files, snippets, and structured Q&A." },
] as const;

export const metadata: Metadata = {
  title: "AI support agents for Shopify stores",
  description:
    "Grounded AI support for Shopify: live store data, your knowledge, human handoff, and predictable conversation pricing.",
};

export default function LandingPage() {
  return (
    <main className="flex-1 bg-ds-surface text-ds-on-surface">
      <section className="bg-ds-surface px-6 pb-14 pt-10 sm:pb-16 sm:pt-14 lg:pb-20">
        <div className="mx-auto grid max-w-[1200px] gap-16 lg:grid-cols-2 lg:items-center">
          <div className="max-w-xl">
            <h1 className="text-5xl font-semibold leading-tight tracking-tight sm:text-6xl">
              AI support that stays accurate on your Shopify store
            </h1>
            <p className="mt-5 text-lg leading-8 text-ds-on-surface-variant">
              Train on your knowledge, connect Shopify, and embed a support agent in minutes. Essential AI on every plan;
              smart resolution when questions get hard.
            </p>
            <div className="mt-5 flex flex-wrap justify-center gap-3 sm:justify-start sm:gap-4">
              <Link
                href="/signup"
                className="inline-flex h-14 w-full items-center justify-center whitespace-nowrap rounded-ds-lg border border-transparent bg-ds-primary px-8 text-sm font-medium text-ds-on-primary sm:w-[280px]"
              >
                Start free
              </Link>
              <Link
                href="/pricing"
                className="inline-flex h-14 w-full items-center justify-center whitespace-nowrap rounded-ds-lg border border-ds-outline bg-ds-surface px-8 text-sm font-medium hover:bg-white sm:w-[280px]"
              >
                View pricing
              </Link>
            </div>
            <p className="mt-10 text-sm text-ds-on-surface-variant">
              Free tier available · No credit card required to start
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
              Support that stays on, stays grounded, and hands off cleanly
            </h2>
            <p className="text-base leading-7 text-ds-on-surface-variant lg:max-w-md lg:justify-self-end">
              ChatRely uses your Shopify store and knowledge so shoppers get live answers, not invented policies. Your
              team gets the thread when a human steps in.
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {highlightCards.map(([title, text]) => (
              <article
                key={title}
                className="rounded-[28px] border border-ds-outline bg-white p-8 shadow-sm transition hover:shadow-lg"
              >
                <div className="mb-8 aspect-[4/3] rounded-2xl border border-ds-outline bg-gradient-to-br from-ds-primary/5 via-white to-ds-tertiary/10" />
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
            Everything in the product, not a slide deck
          </h2>
          <p className="mt-5 max-w-2xl text-lg text-ds-on-surface-variant">
            These are capabilities you can use today in the ChatRely dashboard and storefront widget.
          </p>
          <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {featureCards.map(([title, text]) => (
              <article
                key={title}
                className="rounded-[28px] border border-ds-outline bg-white p-8 shadow-sm transition hover:shadow-lg"
              >
                <div className="mb-8 aspect-video rounded-2xl border border-zinc-200 bg-gradient-to-br from-zinc-50 to-ds-primary/5" />
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
              Conversation limits per month. Essential AI on every tier, smart resolution on Standard and Pro. Chat stays
              on.
            </p>
          </div>
          <LandingPricingTeaser />
        </div>
      </section>

      <section className="border-y border-zinc-200 bg-white px-6 py-16 sm:py-20 lg:py-24">
        <div className="mx-auto max-w-[1200px]">
          <div className="mb-12 flex flex-col justify-between gap-10 lg:flex-row lg:items-end">
            <div>
              <h3 className="text-3xl font-semibold">Works with your stack</h3>
              <p className="mt-4 max-w-md text-ds-on-surface-variant">
                Shopify and knowledge sources power the agent today. Billing runs through Stripe on paid plans.
              </p>
            </div>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {integrations.map((item) => (
              <article key={item.name} className="rounded-2xl border border-ds-outline bg-ds-surface/50 p-6">
                <h4 className="text-lg font-semibold">{item.name}</h4>
                <p className="mt-2 text-sm leading-relaxed text-ds-on-surface-variant">{item.detail}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <PlatformDiscoverySection />

      <section className="bg-white px-6 py-24">
        <div className="mx-auto max-w-[1200px] text-center">
          <h2 className="mx-auto max-w-4xl text-5xl font-semibold tracking-tight md:text-6xl">
            Ship support that matches how your store actually runs
          </h2>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-ds-on-surface-variant">
            Connect Shopify, add knowledge, test in the playground, and embed the widget. Usually done in one sitting.
          </p>
          <Link
            href="/signup"
            className="mt-10 inline-flex rounded-ds-lg bg-ds-primary px-10 py-5 text-sm font-semibold text-ds-on-primary"
          >
            Start free
          </Link>
          <p className="mt-4 text-sm text-ds-on-surface-variant">Free plan · Upgrade when you need more volume</p>
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
              <Link
                href="/pricing"
                className="rounded-ds-md border border-zinc-800 px-4 py-2 text-sm text-zinc-300 no-underline"
              >
                Pricing
              </Link>
              <Link href="/privacy" className="rounded-ds-md border border-zinc-800 px-4 py-2 text-sm text-zinc-300 no-underline">
                Privacy
              </Link>
              <Link href="/about" className="rounded-ds-md border border-zinc-800 px-4 py-2 text-sm text-zinc-300 no-underline">
                About
              </Link>
              <Link href="/terms" className="rounded-ds-md border border-zinc-800 px-4 py-2 text-sm text-zinc-300 no-underline">
                Terms
              </Link>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-10 sm:grid-cols-3">
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-widest text-zinc-500">Product</h4>
              <ul className="mt-5 space-y-3 text-sm text-zinc-400">
                <li>
                  <Link href="/signup" className="hover:text-white">
                    Get started
                  </Link>
                </li>
                <li>
                  <Link href="/pricing" className="hover:text-white">
                    Pricing
                  </Link>
                </li>
                <li>
                  <Link href="/login" className="hover:text-white">
                    Log in
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-widest text-zinc-500">Company</h4>
              <ul className="mt-5 space-y-3 text-sm text-zinc-400">
                <li>
                  <Link href="/about" className="hover:text-white">
                    About us
                  </Link>
                </li>
                <li>
                  <a href="mailto:support@chatrely.com" className="hover:text-white">
                    Contact
                  </a>
                </li>
              </ul>
            </div>
            <div className="col-span-2 sm:col-span-1">
              <h4 className="text-xs font-semibold uppercase tracking-widest text-zinc-500">Legal</h4>
              <ul className="mt-5 space-y-3 text-sm text-zinc-400">
                <li>
                  <Link href="/privacy" className="hover:text-white">
                    Privacy policy
                  </Link>
                </li>
                <li>
                  <Link href="/terms" className="hover:text-white">
                    Terms of service
                  </Link>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}
