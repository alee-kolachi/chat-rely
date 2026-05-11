import type { Metadata } from "next";
import Link from "next/link";
import { CHAT_RELY_LOGO_PATH, ChatRelyWordmark } from "@/components/branding/chat-rely-wordmark";
import { ConversationalWorkflowSection } from "@/components/marketing/conversational-workflow-section";
import { PlatformDiscoverySection } from "@/components/marketing/platform-discovery-section";
import { LandingPricingTeaser } from "@/components/marketing/landing-pricing-teaser";

const brands = ["Make", "Shopify", "Zendesk", "Notion", "Slack", "Stripe", "Salesforce", "WhatsApp", "Zapier"];

const highlightCards = [
  ["Purpose-built for LLMs", "Reasoning-focused responses for complex support cases with context-aware generation."],
  ["Designed for simplicity", "Create and deploy AI agents quickly with guided setup and low operational overhead."],
  ["Engineered for security", "Enterprise controls, access policies, and compliance-ready workflows built in."],
] as const;

const featureCards = [
  ["Sync with real-time data", "Connect to order, CRM, and billing systems for live customer context."],
  ["Take actions automatically", "Execute workflows like plan upgrades and support escalations in real time."],
  ["Compare AI models", "Test model quality and cost side-by-side for your support use-cases."],
  ["Smart escalation", "Escalate based on policy, confidence, and customer sentiment."],
  ["Advanced reporting", "Track resolution rates, trends, and satisfaction signals over time."],
  ["Flexible integrations", "Use APIs and native integrations to connect your full support stack."],
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
            <div className="inline-flex items-center gap-2 rounded-full border border-ds-outline bg-ds-surface px-3 py-1 text-xs">
              <span className="font-semibold uppercase tracking-wider text-ds-tertiary">New Feature</span>
              <span className="text-ds-on-surface-variant">Custom AI workflows are here</span>
            </div>
            <h1 className="mt-6 text-5xl font-semibold leading-tight tracking-tight sm:text-6xl">
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
              <span className="font-semibold text-ds-on-surface">5,000+ businesses</span> building with ChatRely
            </p>
          </div>

          <div className="relative">
            <div className="rounded-[30px] bg-gradient-to-br from-ds-tertiary/55 via-ds-accent-pink/45 to-violet-500/45 p-3 sm:p-4">
              <div className="mx-auto max-w-[540px] overflow-hidden rounded-[22px] border border-ds-outline bg-ds-surface shadow-2xl shadow-zinc-300/35 scale-[0.92] sm:scale-[0.95]">
                <div className="flex items-center justify-between border-b border-ds-outline bg-white p-3.5 sm:p-4">
                  <div className="flex min-w-0 items-center gap-2">
                    {/* eslint-disable-next-line @next/next/no-img-element -- static SVG from /public */}
                    <img
                      src={CHAT_RELY_LOGO_PATH}
                      alt=""
                      className="h-7 w-auto shrink-0 object-contain"
                      width={4931}
                      height={3503}
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-bold">ChatRely Support Agent</p>
                      <p className="text-xs text-green-600">Online</p>
                    </div>
                  </div>
                  <span className="shrink-0 text-xs text-ds-on-surface-variant">Preview</span>
                </div>
                <div className="space-y-3.5 bg-ds-surface p-4 sm:p-5">
                  <div className="max-w-[82%] rounded-2xl rounded-tl-sm border border-ds-outline bg-white p-3 text-sm">
                    Hi! How can I help you build your custom AI agent today?
                  </div>
                  <div className="ml-auto max-w-[82%] rounded-2xl rounded-tr-sm bg-ds-primary p-3 text-sm text-ds-on-primary">
                    How do I upload PDF documents for training?
                  </div>
                  <div className="max-w-[82%] rounded-2xl rounded-tl-sm border border-ds-outline bg-white p-3 text-sm">
                    Head to the Sources tab, click Files, and drop your PDFs there. I will learn from them instantly.
                  </div>
                </div>
                <div className="border-t border-ds-outline bg-white p-3.5 sm:p-4">
                  <div className="rounded-ds-md bg-ds-surface px-4 py-3 text-sm text-ds-on-surface-variant">
                    Ask anything...
                  </div>
                </div>
              </div>
            </div>
            <div className="absolute -right-6 -top-6 -z-10 h-28 w-28 rounded-full bg-ds-tertiary/20 blur-3xl" />
            <div className="absolute -bottom-8 -left-8 -z-10 h-36 w-36 rounded-full bg-ds-primary/10 blur-3xl" />
          </div>
        </div>
      </section>

      <section className="border-y border-zinc-200 bg-[#f8f9fa] px-6 py-20">
        <div className="mx-auto max-w-[1200px]">
          <p className="mb-10 text-center text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
            Trusted by industry leaders worldwide
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            {brands.map((brand) => (
              <span key={brand} className="rounded-full border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700">
                {brand}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white px-6 py-16 sm:py-20 lg:py-24">
        <div className="mx-auto max-w-[1200px]">
          <div className="mb-16 grid gap-10 lg:grid-cols-2">
            <h2 className="text-4xl font-semibold tracking-tight">The complete platform for AI support agents</h2>
            <p className="text-base leading-7 text-ds-on-surface-variant lg:max-w-md lg:justify-self-end">
              ChatRely is designed for building AI customer support agents that solve customer issues while improving
              business outcomes.
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
          <h2 className="max-w-2xl text-4xl font-semibold tracking-tight">Build the perfect customer-facing AI agent</h2>
          <p className="mt-5 max-w-2xl text-lg text-ds-on-surface-variant">
            ChatRely gives you the tools to train your ideal support agent and connect it to your systems.
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
