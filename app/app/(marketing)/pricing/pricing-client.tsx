"use client";

import Link from "next/link";
import { useId, useState } from "react";
import { ChatRelyWordmark } from "@/components/branding/chat-rely-wordmark";
import { PricingFeatureMatrix } from "@/components/marketing/pricing-sections";
import { useSessionPresent } from "@/hooks/use-session-present";

const faqs = [
  {
    question: "What counts as a billable conversation?",
    answer:
      "We count conversations that meet a minimum quality bar (for example, at least one visitor message and two assistant replies) and are no longer open. Idle sessions close after 30 minutes of inactivity. See your dashboard for the exact rules applied to your workspace.",
  },
  {
    question: "What happens if I go over my included conversations?",
    answer:
      "We do not charge for extra conversations at this time. After you pass your plan’s included billable conversations for the period, the assistant automatically switches to a lower-cost model until the cycle resets or you move to a higher plan.",
  },
  {
    question: "When does my usage reset?",
    answer:
      "Included conversation allowances reset at the start of each billing period (shown on your Plan page). Free workspaces follow the same calendar monthly snapshot.",
  },
  {
    question: "Can I cancel my subscription anytime?",
    answer:
      "Yes. You can cancel from the Stripe billing portal (linked from Billing in your account). Access remains through the end of the paid period unless you delete your workspace.",
  },
] as const;

export function MarketingPricingClient() {
  const { ready: sessionReady, hasSession } = useSessionPresent();
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const faqIdPrefix = useId();

  return (
    <main className="flex-1 bg-ds-surface text-ds-on-surface">
      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:py-20">
        <div className="mb-10 text-center sm:mb-14">
          <h1 className="text-3xl font-black tracking-tight text-ds-primary sm:text-4xl md:text-6xl">
            Predictable pricing, scalable plans
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-base text-ds-on-surface-variant sm:mt-5 sm:max-w-2xl sm:text-xl">
            Plans, prices, and every included capability in one table. Hover the info icons only where we added extra
            context.
          </p>
        </div>

        <div className="mb-20 sm:mb-24">
          <PricingFeatureMatrix isAuthenticated={sessionReady && hasSession} />
        </div>

        <section className="mx-auto mb-32 max-w-3xl font-sans">
          <h2 className="mb-12 text-center text-3xl font-black tracking-tight text-ds-on-surface">
            Frequently Asked Questions
          </h2>
          <div className="space-y-4">
            {faqs.map((faq, index) => {
              const isOpen = openFaq === index;
              const panelId = `${faqIdPrefix}-faq-panel-${index}`;
              const buttonId = `${faqIdPrefix}-faq-button-${index}`;
              return (
                <article
                  key={faq.question}
                  className="border-ds-outline overflow-hidden rounded-xl border bg-white shadow-[0_1px_3px_rgba(15,23,42,0.06)] transition-shadow hover:shadow-md"
                >
                  <h3>
                    <button
                      type="button"
                      id={buttonId}
                      aria-expanded={isOpen}
                      aria-controls={panelId}
                      onClick={() => setOpenFaq((current) => (current === index ? null : index))}
                      className="hover:bg-ds-muted/80 flex w-full items-center justify-between gap-4 p-6 text-left text-base font-semibold text-ds-on-surface transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ds-primary focus-visible:ring-offset-2"
                    >
                      <span>{faq.question}</span>
                      <span
                        aria-hidden="true"
                        className={`flex h-6 w-6 shrink-0 items-center justify-center text-lg leading-none text-ds-on-surface-variant transition-transform duration-200 ${
                          isOpen ? "rotate-45" : "rotate-0"
                        }`}
                      >
                        +
                      </span>
                    </button>
                  </h3>
                  <div
                    id={panelId}
                    role="region"
                    aria-labelledby={buttonId}
                    hidden={!isOpen}
                    className="px-6 pb-6"
                  >
                    <p className="text-ds-on-surface-variant text-sm">{faq.answer}</p>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        <section className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <article className="border-ds-primary/25 relative isolate overflow-hidden rounded-2xl border bg-ds-primary p-10 text-ds-on-primary shadow-[0_12px_40px_rgba(131,28,145,0.22)] sm:p-12 md:col-span-2">
            <div
              className="pointer-events-none absolute -right-24 -top-24 size-[28rem] rounded-full opacity-40 blur-3xl"
              style={{
                background:
                  "radial-gradient(circle at 30% 30%, color-mix(in srgb, var(--ds-on-primary) 22%, transparent), transparent 62%)",
              }}
              aria-hidden
            />
            <div className="relative z-10 max-w-2xl">
              <p className="text-ds-on-primary/75 mb-3 text-xs font-semibold uppercase tracking-[0.14em]">
                Next step
              </p>
              <h3 className="mb-4 text-2xl font-black tracking-tight sm:text-3xl md:text-4xl md:leading-[1.15]">
                Ready to transform your customer experience?
              </h3>
              <p className="text-ds-on-primary/88 mb-8 max-w-lg text-base leading-relaxed">
                Join teams building the future of automated support with ChatRely.
              </p>
              <Link
                href={sessionReady && hasSession ? "/dashboard" : "/signup"}
                className="hover:bg-ds-muted focus-visible:ring-offset-ds-primary inline-flex min-h-11 items-center justify-center rounded-xl bg-white px-8 py-3.5 text-sm font-semibold text-ds-primary shadow-md transition-colors hover:text-ds-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2"
              >
                {sessionReady && hasSession ? "Open dashboard" : "Get started"}
              </Link>
            </div>
          </article>
          <article className="border-ds-outline flex flex-col items-center justify-center rounded-2xl border bg-white p-8 text-center shadow-[0_1px_3px_rgba(15,23,42,0.06)]">
            <div className="border-ds-outline/80 mb-6 flex h-16 w-16 items-center justify-center rounded-full border bg-ds-muted text-2xl">
              💬
            </div>
            <h4 className="mb-2 text-lg font-bold tracking-tight text-ds-on-surface sm:text-xl">Expert help</h4>
            <p className="text-ds-on-surface-variant mb-6 max-w-[16rem] text-sm leading-relaxed">
              Need a custom plan? Our experts are here to help.
            </p>
            <Link
              href="/login"
              className="text-ds-primary hover:text-ds-primary-hover text-sm font-semibold underline underline-offset-4 transition-colors"
            >
              Talk to sales
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
