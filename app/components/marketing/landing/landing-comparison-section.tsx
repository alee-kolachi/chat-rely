"use client";

import type { LucideIcon } from "lucide-react";
import { Package, RefreshCw, ShoppingBag, Users } from "lucide-react";
import { LandingSectionLabel } from "@/components/marketing/landing/landing-section-label";
import { useScrollProgress } from "@/hooks/use-scroll-progress";
import { cn } from "@/lib/utils";

const conversation = [
  { role: "user" as const, text: "Where is order #1042?" },
  {
    role: "assistant" as const,
    text: "Order #1042 shipped yesterday. Tracking: 1Z999AA10123456784.",
  },
  { role: "user" as const, text: "Is the blue hoodie in stock in size M?" },
  {
    role: "assistant" as const,
    text: "Yes, 12 units available. I can send a checkout link if you want.",
  },
  { role: "user" as const, text: "If it doesn't fit, can I exchange?" },
  {
    role: "assistant" as const,
    text: "Exchanges are free within 30 days if unworn with tags. Share your order number and I can start it here.",
  },
  { role: "user" as const, text: "Can I talk to someone on your team?" },
  {
    role: "assistant" as const,
    text: "Absolutely. I'm connecting you now with the full conversation attached.",
  },
] as const;

const MESSAGE_THRESHOLDS = [0.08, 0.16, 0.28, 0.38, 0.5, 0.6, 0.72, 0.82] as const;

const STAGES = [
  { at: 0.12, intent: 0 },
  { at: 0.32, intent: 1 },
  { at: 0.52, intent: 2 },
  { at: 0.72, intent: 3 },
] as const;

const intents: { icon: LucideIcon; title: string; body: string }[] = [
  {
    icon: Package,
    title: "Order tracking",
    body: "Shipment status and tracking pulled from Shopify, not a FAQ link.",
  },
  {
    icon: ShoppingBag,
    title: "Live inventory",
    body: "Variant-level stock checks against your catalog as it is today.",
  },
  {
    icon: RefreshCw,
    title: "Returns and exchanges",
    body: "Your return rules, applied in the thread instead of a policy PDF.",
  },
  {
    icon: Users,
    title: "Human handoff",
    body: "Escalations reach your team with the full conversation attached.",
  },
];

function visibleMessageCount(progress: number) {
  return MESSAGE_THRESHOLDS.filter((threshold) => progress >= threshold).length;
}

function activeIntentIndex(progress: number) {
  let index = -1;
  for (const stage of STAGES) {
    if (progress >= stage.at) index = stage.intent;
  }
  return index;
}

function intentEnterProgress(progress: number, index: number): number {
  const stage = STAGES[index];
  if (!stage) return 1;

  const nextAt = STAGES[index + 1]?.at ?? 0.95;
  const slideWindow = (nextAt - stage.at) * 0.4;

  if (progress < stage.at) return 0;
  if (progress >= stage.at + slideWindow) return 1;
  return (progress - stage.at) / slideWindow;
}

function ConversationBubble({ role, text }: { role: "user" | "assistant"; text: string }) {
  const isUser = role === "user";

  return (
    <div
      className={cn(
        "flex animate-[mkt-msg-in_0.5s_cubic-bezier(0.22,1,0.36,1)_both]",
        isUser ? "justify-end" : "justify-start",
      )}
    >
      <div
        className={
          isUser
            ? "mkt-chat-message max-w-[88%] rounded-2xl rounded-tr-md bg-[#2a2a2a] px-3 py-2 text-left !text-[15px] !text-white shadow-[0_6px_20px_rgba(0,0,0,0.16)]"
            : "mkt-chat-message max-w-[92%] rounded-2xl rounded-tl-md border border-ds-outline/80 bg-white px-3 py-2 !text-[15px] text-ds-on-surface-variant shadow-sm"
        }
      >
        {text}
      </div>
    </div>
  );
}

function IntentCard({
  intent,
  isActive,
  enter,
}: {
  intent: (typeof intents)[number];
  isActive: boolean;
  enter: number;
}) {
  const Icon = intent.icon;

  return (
    <article
      className={cn(
        "rounded-[18px] border bg-white p-3.5 transition-[border-color,box-shadow,transform,opacity] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] sm:p-4",
        isActive
          ? "border-ds-primary/45 shadow-[0_16px_40px_rgba(138,5,255,0.12)] ring-1 ring-ds-primary/10"
          : "border-ds-outline/70 shadow-sm",
      )}
      style={{
        opacity: enter,
        transform: `translateX(${(1 - enter) * 56}px)`,
      }}
    >
      <div className="flex items-start gap-2.5">
        <div className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-ds-primary/25 bg-ds-primary/10">
          <Icon className="size-4 text-ds-primary" strokeWidth={1.75} aria-hidden />
        </div>
        <div className="min-w-0">
          <h3 className="mkt-display text-base text-ds-on-surface">{intent.title}</h3>
          <p className="mkt-font mt-1 text-xs leading-relaxed text-ds-on-surface-variant sm:text-sm">
            {intent.body}
          </p>
        </div>
      </div>
    </article>
  );
}

export function LandingComparisonSection() {
  const { ref, progress } = useScrollProgress<HTMLDivElement>();
  const visibleMessages = visibleMessageCount(progress);
  const activeIntent = activeIntentIndex(progress);

  return (
    <section className="relative z-10 bg-ds-surface" aria-label="Beyond static FAQs">
      <div ref={ref} className="relative h-[300vh]">
        <div className="sticky top-16 z-20 h-[calc(100dvh-4rem)] overflow-hidden bg-ds-surface px-6">
          <div className="mx-auto flex h-full max-w-[1100px] flex-col py-5 sm:py-7">
            <div className="shrink-0">
              <LandingSectionLabel tone="light">Beyond static FAQs</LandingSectionLabel>
            </div>

            <div className="mt-4 grid min-h-0 flex-1 grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:gap-9">
              {/* pointer-events-none so page scroll is never trapped on the demo chat */}
              <div className="pointer-events-none flex min-h-0 flex-col overflow-hidden rounded-[28px] border border-ds-outline/80 bg-white shadow-[0_20px_56px_rgba(15,15,15,0.07)]">
                <div className="flex shrink-0 items-center justify-between border-b border-ds-outline/70 px-4 py-3">
                  <div>
                    <p className="mkt-font text-[11px] font-semibold uppercase tracking-[0.14em] text-ds-primary">
                      Live thread
                    </p>
                    <p className="mkt-font mt-0.5 text-xs text-ds-on-surface-variant sm:text-sm">
                      One chat, every intent
                    </p>
                  </div>
                  <span className="mkt-font flex items-center gap-1.5 rounded-full border border-ds-outline/80 bg-ds-surface px-2.5 py-1 text-[10px] font-medium text-ds-on-surface-variant">
                    <span className="size-1.5 rounded-full bg-green-500" aria-hidden />
                    Online
                  </span>
                </div>

                <div className="min-h-0 flex-1 space-y-2 overflow-hidden bg-white p-4 sm:space-y-2.5 sm:p-5">
                  {conversation.slice(0, visibleMessages).map((message, index) => (
                    <ConversationBubble
                      key={`${message.role}-${index}`}
                      role={message.role}
                      text={message.text}
                    />
                  ))}
                </div>

                <div className="shrink-0 border-t border-ds-outline/70 bg-white px-4 py-2.5">
                  <div className="mkt-chat-message rounded-full border border-ds-outline bg-ds-surface px-3 py-2 text-ds-on-surface-variant">
                    Message…
                  </div>
                </div>
              </div>

              <div className="flex min-h-0 flex-col lg:pl-1">
                <div className="shrink-0">
                  <h2 className="mkt-display text-2xl sm:text-3xl lg:text-4xl">
                    One conversation covers what shoppers actually ask
                  </h2>
                  <p className="mkt-body mt-2 text-sm text-ds-on-surface-variant sm:text-base">
                    Scroll to watch messages land and capabilities stack in the same thread.
                  </p>
                  <div className="mt-3 flex items-center gap-2">
                    {intents.map((intent, index) => (
                      <span
                        key={intent.title}
                        className={cn(
                          "h-1 rounded-full transition-all duration-500 ease-out",
                          index <= activeIntent ? "w-7 bg-ds-primary" : "w-2.5 bg-ds-outline",
                          index === activeIntent && "shadow-[0_0_10px_rgba(138,5,255,0.35)]",
                        )}
                        aria-hidden
                      />
                    ))}
                  </div>
                </div>

                <div className="mt-3 min-h-0 flex-1 overflow-hidden">
                  {activeIntent < 0 ? (
                    <p className="mkt-font animate-[mkt-scroll-hint_1.8s_ease-in-out_infinite] pt-2 text-sm text-ds-on-surface-variant">
                      Keep scrolling
                    </p>
                  ) : (
                    <div className="flex h-full flex-col gap-2 overflow-hidden pt-1">
                      {intents.map((intent, index) => {
                        if (index > activeIntent) return null;

                        return (
                          <IntentCard
                            key={intent.title}
                            intent={intent}
                            isActive={index === activeIntent}
                            enter={intentEnterProgress(progress, index)}
                          />
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
