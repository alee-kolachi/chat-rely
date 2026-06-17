"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { LucideIcon } from "lucide-react";
import { LayoutGrid, Package, ScanSearch, Users } from "lucide-react";
import {
  LandingChatAssistantBubble,
  LandingChatUserBubble,
  LandingChatWidgetShell,
} from "@/components/marketing/landing/landing-chat-widget-shell";
import { LandingSectionLabel } from "@/components/marketing/landing/landing-section-label";
import {
  LandingProductCarousel,
  preloadLandingProductImages,
} from "@/components/marketing/landing/landing-product-carousel";
import { useScrollProgress } from "@/hooks/use-scroll-progress";
import { LANDING_DEMO_HOODIE_PRODUCTS } from "@/lib/marketing/landing-demo-products";
import type { ProductCard } from "@/lib/product-card";
import { cn } from "@/lib/utils";

const SECTION_LABEL = "What ChatRely does";

type ComparisonMessage =
  | { role: "user"; text: string }
  | { role: "assistant"; text: string; products?: ProductCard[] };

const conversation: ComparisonMessage[] = [
  { role: "user", text: "Where is my order #8821?" },
  {
    role: "assistant",
    text: "Order #8821 is out for delivery today. Tracking: 1Z999AA10998877665.",
  },
  { role: "user", text: "Do you have any blue hoodies in size M?" },
  {
    role: "assistant",
    text: "Here are blue hoodies in size M from your live catalog:",
    products: LANDING_DEMO_HOODIE_PRODUCTS,
  },
  { role: "user", text: "Is the Classic Blue Hoodie in stock in size M?" },
  {
    role: "assistant",
    text: "Yes, 12 in size M. I can send a checkout link if you want.",
  },
  { role: "user", text: "Can I talk to someone on your team?" },
  {
    role: "assistant",
    text: "Absolutely. I'm connecting you now. Your full chat goes to our team so you won't repeat yourself.",
  },
];

const MESSAGE_THRESHOLDS = [0.08, 0.16, 0.28, 0.38, 0.52, 0.64, 0.76, 0.88] as const;

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
    body: "Pulls live shipment status and tracking from Shopify orders.",
  },
  {
    icon: LayoutGrid,
    title: "Product cards in chat",
    body: "Catalog search returns swipeable cards with image, price, and stock.",
  },
  {
    icon: ScanSearch,
    title: "Live stock answers",
    body: "Checks real inventory before a shopper checks out.",
  },
  {
    icon: Users,
    title: "Human handoff",
    body: "Escalates to your inbox with the full thread, so no one repeats themselves.",
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


function ConversationBubble({
  message,
  animateIn = false,
}: {
  message: ComparisonMessage;
  animateIn?: boolean;
}) {
  const isUser = message.role === "user";
  const hasProducts = !isUser && Boolean(message.products?.length);

  if (isUser) {
    return <LandingChatUserBubble animateIn={animateIn}>{message.text}</LandingChatUserBubble>;
  }

  if (hasProducts && message.products) {
    return (
      <LandingChatAssistantBubble
        animateIn={animateIn}
        trailing={<LandingProductCarousel products={message.products} />}
      >
        {message.text}
      </LandingChatAssistantBubble>
    );
  }

  return <LandingChatAssistantBubble animateIn={animateIn}>{message.text}</LandingChatAssistantBubble>;
}

const INTENT_CARD_SHADOW =
  "shadow-[0_6px_24px_-6px_rgba(15,23,42,0.08),0_2px_8px_-3px_rgba(15,23,42,0.04)]";
const INTENT_CARD_ACTIVE_SHADOW =
  "shadow-[0_10px_36px_-8px_rgba(138,5,255,0.14),0_4px_14px_-5px_rgba(138,5,255,0.08)]";

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
          ? cn("border-ds-primary/40", INTENT_CARD_ACTIVE_SHADOW)
          : cn("border-ds-outline/70", INTENT_CARD_SHADOW),
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

function IntentProgressDots({ activeIntent }: { activeIntent: number }) {
  return (
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
  );
}

function ComparisonCopy() {
  return (
    <div className="shrink-0">
      <h2 className="mkt-display max-w-xl text-2xl leading-tight sm:text-3xl lg:text-[2rem] lg:leading-[1.15]">
        One widget that answers, sells, and escalates
      </h2>
      <p className="mkt-body mt-3 max-w-lg text-sm leading-relaxed text-ds-on-surface-variant sm:text-[0.9375rem]">
        Live orders, product cards, and your help content in a single embed, with a clean handoff to your team when
        it&apos;s needed.
      </p>
    </div>
  );
}

function IntentStack({ progress, activeIntent }: { progress: number; activeIntent: number }) {
  return (
    <div className="mt-3">
      {activeIntent < 0 ? (
        <p className="mkt-font animate-[mkt-scroll-hint_1.8s_ease-in-out_infinite] pt-2 text-sm text-ds-on-surface-variant">
          Keep scrolling
        </p>
      ) : (
        <div className="flex flex-col gap-2 px-1 py-2 pt-1">
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
  );
}

function LiveThreadChat({ visibleMessages }: { visibleMessages: number }) {
  const messagesViewportRef = useRef<HTMLDivElement>(null);
  const messagesContentRef = useRef<HTMLDivElement>(null);
  const [contentOffset, setContentOffset] = useState(0);

  useEffect(() => {
    preloadLandingProductImages(LANDING_DEMO_HOODIE_PRODUCTS);
  }, []);

  useLayoutEffect(() => {
    const viewport = messagesViewportRef.current;
    const content = messagesContentRef.current;
    if (!viewport || !content) return;
    const overflow = content.scrollHeight - viewport.clientHeight;
    setContentOffset(overflow > 0 ? overflow : 0);
  }, [visibleMessages]);

  useEffect(() => {
    const content = messagesContentRef.current;
    if (!content) return;
    const observer = new ResizeObserver(() => {
      const viewport = messagesViewportRef.current;
      if (!viewport) return;
      const overflow = content.scrollHeight - viewport.clientHeight;
      setContentOffset(overflow > 0 ? overflow : 0);
    });
    observer.observe(content);
    return () => observer.disconnect();
  }, [visibleMessages]);

  return (
    <div className="flex min-h-0 items-center justify-center">
      <LandingChatWidgetShell
        messagesViewportRef={messagesViewportRef}
        messagesContentRef={messagesContentRef}
        contentOffset={contentOffset}
      >
        {conversation.slice(0, visibleMessages).map((message, index) => (
          <ConversationBubble key={`msg-${index}`} message={message} animateIn={index === visibleMessages - 1} />
        ))}
      </LandingChatWidgetShell>
    </div>
  );
}

function LandingComparisonDesktop() {
  const { ref, progress } = useScrollProgress<HTMLDivElement>();
  const visibleMessages = visibleMessageCount(progress);
  const activeIntent = activeIntentIndex(progress);

  return (
    <div ref={ref} className="relative hidden h-[360vh] lg:block">
      <div className="sticky top-16 z-20 h-[calc(100dvh-4rem)] overflow-hidden bg-ds-surface px-6">
        <div className="mx-auto flex h-full max-w-[1100px] flex-col py-5 sm:py-7">
          <div className="shrink-0">
            <LandingSectionLabel tone="light">{SECTION_LABEL}</LandingSectionLabel>
          </div>

          <div className="mt-4 grid min-h-0 flex-1 grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] gap-9">
            <LiveThreadChat visibleMessages={visibleMessages} />

            <div className="flex min-h-0 flex-col pl-1">
              <ComparisonCopy />
              <IntentProgressDots activeIntent={activeIntent} />
              <div className="mt-3 min-h-0 flex-1 overflow-y-auto px-1 py-2">
                <IntentStack progress={progress} activeIntent={activeIntent} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function LandingComparisonMobile() {
  const { ref, progress } = useScrollProgress<HTMLDivElement>();
  const activeIntent = activeIntentIndex(progress);

  return (
    <div ref={ref} className="relative h-[220vh] lg:hidden">
      <div className="sticky top-16 z-20 bg-ds-surface px-6 pb-10 pt-5 sm:py-7">
        <div className="mx-auto max-w-[1100px]">
          <LandingSectionLabel tone="light">{SECTION_LABEL}</LandingSectionLabel>
          <div className="mt-4">
            <ComparisonCopy />
            <IntentProgressDots activeIntent={activeIntent} />
            <IntentStack progress={progress} activeIntent={activeIntent} />
          </div>
        </div>
      </div>
    </div>
  );
}

export function LandingComparisonSection() {
  return (
    <section className="relative z-10 bg-ds-surface" aria-label={SECTION_LABEL}>
      <LandingComparisonMobile />
      <LandingComparisonDesktop />
    </section>
  );
}
