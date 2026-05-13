"use client";

import Link from "next/link";
import { ChatRelyWordmark } from "@/components/branding/chat-rely-wordmark";
import { PricingCards, PricingFeatureMatrix } from "@/components/marketing/pricing-sections";
import { useSessionPresent } from "@/hooks/use-session-present";

const faqs = [
  {
    question: "What counts as a billable conversation?",
    answer:
      "We count conversations that meet a minimum quality bar (for example, at least one visitor message and two assistant replies) and are no longer open. Idle sessions close after 30 minutes of inactivity. See your dashboard for the exact rules applied to your workspace.",
    open: true,
  },
  {
    question: "What happens if I go over my included conversations?",
    answer:
      "We do not charge for extra conversations at this time. After you pass your plan’s included billable conversations for the period, the assistant automatically switches to a lower-cost model until the cycle resets or you move to a higher plan.",
    open: false,
  },
  {
    question: "When does my usage reset?",
    answer:
      "Included conversation allowances reset at the start of each billing period (shown on your Plan page). Free workspaces follow the same calendar monthly snapshot.",
    open: false,
  },
  {
    question: "Can I cancel my subscription anytime?",
    answer:
      "Yes. You can cancel from the Stripe billing portal (linked from Billing in your account). Access remains through the end of the paid period unless you delete your workspace.",
    open: false,
  },
] as const;

export function MarketingPricingClient() {
  const { ready: sessionReady, hasSession } = useSessionPresent();

  return (
    <main className="flex-1 bg-ds-surface text-ds-on-surface">
      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:py-20">
        <div className="mb-10 text-center sm:mb-14">
          <h1 className="text-3xl font-black tracking-tight text-ds-primary sm:text-4xl md:text-6xl">
            Predictable pricing, scalable plans
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-base text-ds-on-surface-variant sm:mt-5 sm:max-w-2xl sm:text-xl">
            Billable conversations—not opaque message credits. Compare plans below; on the home page, compact cards
            use info icons for extra detail on dense rows.
          </p>
        </div>

        <div className="mb-14 sm:mb-20 lg:mb-24">
          <PricingCards variant="pricing" isAuthenticated={sessionReady && hasSession} />
        </div>

        <div className="mb-20 sm:mb-24">
          <PricingFeatureMatrix />
        </div>

        <section className="mx-auto mb-32 max-w-3xl">
          <h2 className="mb-12 text-center text-3xl font-black">Frequently Asked Questions</h2>
          <div className="space-y-4">
            {faqs.map((faq) => (
              <article key={faq.question} className="overflow-hidden rounded-lg border border-zinc-200 bg-white">
                <div className="flex items-center justify-between p-6">
                  <h3 className="text-base font-bold">{faq.question}</h3>
                  <span className="text-ds-on-surface-variant">{faq.open ? "−" : "+"}</span>
                </div>
                {faq.open ? <p className="text-ds-on-surface-variant px-6 pb-6 text-sm">{faq.answer}</p> : null}
              </article>
            ))}
          </div>
        </section>

        <section className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <article className="relative overflow-hidden rounded-2xl bg-zinc-950 p-12 text-white md:col-span-2">
            <div className="relative z-10">
              <h3 className="mb-6 text-4xl font-black">Ready to transform your customer experience?</h3>
              <p className="mb-8 max-w-md text-zinc-300">
                Join teams building the future of automated support with ChatRely.
              </p>
              <Link
                href={sessionReady && hasSession ? "/dashboard" : "/signup"}
                className="inline-flex rounded-xl bg-ds-tertiary px-8 py-4 text-sm font-black text-white transition hover:opacity-90"
              >
                {sessionReady && hasSession ? "Open dashboard" : "Get Started Now"}
              </Link>
            </div>
            <div className="pointer-events-none absolute right-0 top-0 h-full w-1/2 opacity-30">
              <div className="h-full w-full rounded-full bg-gradient-to-br from-ds-tertiary to-ds-accent-pink blur-3xl" />
            </div>
          </article>
          <article className="flex flex-col items-center justify-center rounded-2xl bg-zinc-100 p-8 text-center">
            <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-white text-2xl shadow-sm">
              💬
            </div>
            <h4 className="mb-2 text-xl font-black">Expert Help</h4>
            <p className="text-ds-on-surface-variant mb-6 text-sm">Need a custom plan? Our experts are here to help.</p>
            <Link href="/login" className="text-ds-primary font-bold underline underline-offset-4">
              Talk to Sales
            </Link>
          </article>
        </section>
      </section>

      <footer className="border-t border-zinc-200 bg-zinc-50 px-6 py-12">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-8 md:flex-row">
          <ChatRelyWordmark
            iconClassName="h-7 w-auto"
            textClassName="text-2xl font-black text-ds-primary"
          />
          <nav className="flex flex-wrap items-center gap-7">
            {[
              { label: "Privacy", href: "/privacy" },
              { label: "Terms", href: "/terms" },
              { label: "Security", href: "/terms#security" },
              { label: "Contact", href: "mailto:support@chatrely.com" },
            ].map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className="text-xs font-semibold tracking-widest text-zinc-500 uppercase transition hover:text-zinc-900"
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <p className="text-xs text-zinc-500">© 2026 ChatRely Platform. Built with precision.</p>
        </div>
      </footer>
    </main>
  );
}
