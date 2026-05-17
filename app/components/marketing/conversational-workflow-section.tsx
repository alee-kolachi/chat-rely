"use client";

import { useEffect, useRef, useState } from "react";

type WorkflowItem = {
  title: string;
  status: string;
  details: string;
  cards: string[];
};

const workflowItems: WorkflowItem[] = [
  {
    title: "Connect your Shopify store",
    status: "Ready",
    details:
      "Shopify sign-in pulls products, orders, inventory, and policies into enabled actions.",
    cards: ["One-time store link", "Read-only Admin API scopes"],
  },
  {
    title: "Answer with live data",
    status: "Live",
    details:
      "WISMO, returns windows, and stock questions use Shopify as it is today, plus knowledge you indexed from your site and docs.",
    cards: ["Order & product lookups", "Grounded policy answers"],
  },
  {
    title: "Run enabled actions",
    status: "Running",
    details:
      "Turn on the Shopify actions your plan allows. The agent calls tools when needed instead of guessing catalog or order facts.",
    cards: ["Configurable per agent", "Tool results in the thread"],
  },
  {
    title: "Escalate with context",
    status: "Guarded",
    details:
      "When a shopper needs a person, the agent hands off and creates a ticket with the full transcript.",
    cards: ["Human escalation action", "Tickets in your dashboard"],
  },
  {
    title: "Review and improve",
    status: "Insights",
    details:
      "Read conversations, see analytics by plan, and add knowledge where shoppers keep asking the same thing.",
    cards: ["Conversation history", "Source suggestions on Standard+"],
  },
];

export function ConversationalWorkflowSection() {
  const [activeIndex, setActiveIndex] = useState(0);
  const active = workflowItems[activeIndex];
  const mobileDetailsRefs = useRef<Array<HTMLDetailsElement | null>>([]);

  useEffect(() => {
    const firstDetail = mobileDetailsRefs.current[0];
    if (firstDetail) firstDetail.open = true;
  }, []);

  return (
    <section className="border-y border-zinc-200 bg-[#f8f9fa] px-6 py-16 sm:py-20 lg:py-24">
      <div className="mx-auto grid max-w-[1200px] gap-12 lg:grid-cols-2 lg:items-center">
        <div>
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            How ChatRely fits your Shopify support flow
          </h2>
          <p className="mt-4 text-base leading-7 text-ds-on-surface-variant sm:mt-6">
            Connect once, answer from live data and your knowledge base, escalate when needed, and review outcomes in the
            dashboard.
          </p>

          <p className="mt-6 text-xs font-medium uppercase tracking-[0.12em] text-ds-on-surface-variant lg:hidden">
            Tap a step to preview details
          </p>

          <div className="mt-4 space-y-3 lg:hidden">
            {workflowItems.map((step, index) => (
              <details
                key={`mobile-${step.title}`}
                ref={(el) => {
                  mobileDetailsRefs.current[index] = el;
                }}
                className="group rounded-2xl border border-ds-outline bg-white"
                onToggle={(event) => {
                  const current = event.currentTarget;
                  if (!current.open) return;
                  mobileDetailsRefs.current.forEach((detail, detailIndex) => {
                    if (detail && detailIndex !== index) detail.open = false;
                  });
                }}
              >
                <summary className="flex cursor-pointer list-none items-center justify-between px-5 py-4 marker:content-none">
                  <p className="text-base font-semibold">
                    <span className="mr-3 text-ds-on-surface-variant">0{index + 1}.</span>
                    {step.title}
                  </p>
                  <span className="text-ds-on-surface-variant transition group-open:rotate-180">⌄</span>
                </summary>

                <div className="rounded-b-2xl border-t border-zinc-200 bg-zinc-100 p-5">
                  <div className="mx-auto max-w-sm rounded-2xl border border-zinc-200 bg-white p-5 shadow-lg">
                    <div className="mb-4 flex items-center justify-between border-b border-zinc-100 pb-3">
                      <h3 className="text-base font-bold">Workflow</h3>
                      <span className="text-xs text-green-600">{step.status}</span>
                    </div>
                    <p className="text-sm leading-6 text-ds-on-surface-variant">{step.details}</p>
                    <div className="mt-4 space-y-3">
                      {step.cards.map((card) => (
                        <div key={card} className="rounded-xl bg-zinc-50 p-3">
                          <p className="text-sm font-semibold">{card}</p>
                          <div className="mt-2 h-2 rounded-full bg-zinc-200" />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </details>
            ))}
          </div>

          <div className="mt-8 hidden space-y-3 lg:block">
            {workflowItems.map((step, index) => {
              const activeDesktop = index === activeIndex;
              return (
                <button
                  key={`desktop-${step.title}`}
                  type="button"
                  onClick={() => setActiveIndex(index)}
                  className={`w-full rounded-2xl px-5 py-4 text-left transition ${
                    activeDesktop
                      ? "border border-ds-outline bg-white shadow-sm"
                      : "border border-transparent bg-transparent opacity-70 hover:opacity-100"
                  }`}
                >
                  <p className="text-base font-semibold sm:text-lg">
                    <span className="mr-3 text-ds-on-surface-variant">0{index + 1}.</span>
                    {step.title}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        <div className="hidden rounded-[32px] border border-zinc-200 bg-zinc-100 p-8 lg:block">
          <div className="mx-auto max-w-sm rounded-3xl border border-zinc-200 bg-white p-6 shadow-xl">
            <div className="mb-6 flex items-center justify-between border-b border-zinc-100 pb-4">
              <h3 className="text-lg font-bold">Workflow</h3>
              <span className="text-xs text-green-600">{active.status}</span>
            </div>
            <p className="text-sm leading-6 text-ds-on-surface-variant">{active.details}</p>
            <div className="mt-5 space-y-4">
              {active.cards.map((card) => (
                <div key={card} className="rounded-xl bg-zinc-50 p-4">
                  <p className="text-sm font-semibold">{card}</p>
                  <div className="mt-3 h-2 rounded-full bg-zinc-200" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
