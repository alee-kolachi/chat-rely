import type { Metadata } from "next";
import Link from "next/link";
import { PricingCards, PricingComparison } from "@/components/marketing/pricing-sections";

const faqs = [
  {
    question: "How do message credits work?",
    answer:
      "One message credit is deducted for each AI interaction, including user prompts and automated assistant responses.",
    open: true,
  },
  { question: "When are my message credits renewed?", answer: "", open: false },
  { question: "Can I cancel my subscription anytime?", answer: "", open: false },
  { question: "What happens if I exceed my limit?", answer: "", open: false },
] as const;

export const metadata: Metadata = {
  title: "Pricing",
  description: "Choose the right ChatRely plan for your support team and compare features across pricing tiers.",
};

export default function PricingPage() {
  return (
    <main className="flex-1 bg-ds-sidebar text-ds-on-surface">
      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:py-20">
        <div className="mb-10 text-center sm:mb-14">
          <h1 className="text-3xl font-black tracking-tight text-ds-primary sm:text-4xl md:text-6xl">
            Predictable pricing, scalable plans
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-base text-ds-on-surface-variant sm:mt-5 sm:max-w-2xl sm:text-xl">
            Designed for every stage of your journey
          </p>
        </div>

        <div className="mb-10 flex flex-wrap items-center justify-center gap-3 sm:mb-14 sm:gap-4">
          <span className="text-sm font-bold text-ds-primary">Monthly</span>
          <div className="relative h-7 w-14 rounded-full bg-zinc-300 p-1">
            <div className="absolute right-1 h-5 w-5 rounded-full bg-ds-primary" />
          </div>
          <span className="text-sm font-medium text-ds-on-surface-variant">Yearly</span>
          <span className="rounded-full bg-ds-tertiary px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-white">
            20% off yearly plans
          </span>
        </div>

        <div className="mb-14 sm:mb-20 lg:mb-24">
          <PricingCards />
        </div>

        <div className="mb-32">
          <PricingComparison />
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
                {faq.open ? <p className="px-6 pb-6 text-sm text-ds-on-surface-variant">{faq.answer}</p> : null}
              </article>
            ))}
          </div>
        </section>

        <section className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <article className="relative overflow-hidden rounded-2xl bg-zinc-950 p-12 text-white md:col-span-2">
            <div className="relative z-10">
              <h3 className="mb-6 text-4xl font-black">Ready to transform your customer experience?</h3>
              <p className="mb-8 max-w-md text-zinc-300">
                Join 10,000+ companies already building the future of automated communication with ChatRely.
              </p>
              <Link
                href="/signup"
                className="inline-flex rounded-xl bg-ds-tertiary px-8 py-4 text-sm font-black text-white transition hover:opacity-90"
              >
                Get Started Now
              </Link>
            </div>
            <div className="pointer-events-none absolute right-0 top-0 h-full w-1/2 opacity-30">
              <div className="h-full w-full rounded-full bg-gradient-to-br from-ds-tertiary to-ds-accent-pink blur-3xl" />
            </div>
          </article>
          <article className="flex flex-col items-center justify-center rounded-2xl bg-zinc-100 p-8 text-center">
            <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-white text-2xl shadow-sm">💬</div>
            <h4 className="mb-2 text-xl font-black">Expert Help</h4>
            <p className="mb-6 text-sm text-ds-on-surface-variant">Need a custom plan? Our experts are here to help.</p>
            <Link href="/login" className="font-bold text-ds-primary underline underline-offset-4">
              Talk to Sales
            </Link>
          </article>
        </section>
      </section>

      <footer className="border-t border-zinc-200 bg-zinc-50 px-6 py-12">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-8 md:flex-row">
          <p className="text-lg font-black text-ds-primary">ChatRely</p>
          <nav className="flex flex-wrap items-center gap-7">
            {["Privacy", "Terms", "Security", "Status", "Contact"].map((item) => (
              <Link
                key={item}
                href="/"
                className="text-xs font-semibold uppercase tracking-widest text-zinc-500 transition hover:text-zinc-900"
              >
                {item}
              </Link>
            ))}
          </nav>
          <p className="text-xs text-zinc-500">© 2026 ChatRely Platform. Built with precision.</p>
        </div>
      </footer>
    </main>
  );
}
