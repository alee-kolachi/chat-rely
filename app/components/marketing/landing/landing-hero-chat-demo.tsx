"use client";

import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from "react";
import { AssistantThinkingDots } from "@/components/chat/assistant-thinking-dots";
import { CHAT_RELY_LOGO_PATH } from "@/components/branding/chat-rely-wordmark";
import { PoweredByChatRely } from "@/components/branding/powered-by-chatrely";
import {
  LandingProductCarousel,
  preloadLandingProductImages,
} from "@/components/marketing/landing/landing-product-carousel";
import { LANDING_DEMO_SHOE_PRODUCTS } from "@/lib/marketing/landing-demo-products";
import type { ProductCard } from "@/lib/product-card";
import { cn } from "@/lib/utils";

/** Shared message shape for demo playback and future live chat. */
export type HeroChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  products?: ProductCard[];
};

export type HeroChatDemoTurn = {
  id: string;
  userMessage: string;
  steps: readonly string[];
  agentReply: string;
  products?: ProductCard[];
};

export const HERO_CHAT_DEMO_SCRIPT: HeroChatDemoTurn[] = [
  {
    id: "order",
    userMessage: "Where is order #1042?",
    steps: ["Identifying intent", "Looking up order", "Sharing tracking"],
    agentReply: "Order #1042 shipped yesterday. Tracking: 1Z999AA10123456784.",
  },
  {
    id: "catalog",
    userMessage: "Show me running shoes in size 9.",
    steps: ["Searching catalog", "Checking inventory"],
    agentReply: "Here are running shoes in size 9 from your live catalog:",
    products: LANDING_DEMO_SHOE_PRODUCTS,
  },
  {
    id: "return",
    userMessage: "Can I return an opened item?",
    steps: ["Identifying intent", "Searching knowledge", "Answering from policy"],
    agentReply: "Opened items can be returned within 14 days if unused. I can start a return if you share your order number.",
  },
  {
    id: "exchange",
    userMessage: "Can I exchange this for a different size?",
    steps: ["Identifying intent", "Searching knowledge", "Answering from policy"],
    agentReply: "Yes. Exchanges are free within 30 days if the item is unworn with tags. Share your order number and I can send a prepaid label.",
  },
];

const MESSAGE_AREA_GRADIENT =
  "linear-gradient(165deg, rgba(255,255,255,0.95) 0%, rgba(255,255,255,1) 45%, rgba(138,5,255,0.06) 100%)";

const TIMING = {
  initialPause: 500,
  userDelay: 900,
  firstStepDelay: 650,
  stepDelay: 950,
  afterLastStep: 380,
  stepsFade: 320,
  typingPause: 520,
  betweenTurns: 2600,
  endPause: 5800,
} as const;

const MSG_IN_ANIMATION = "animate-[mkt-msg-in_0.5s_cubic-bezier(0.22,1,0.36,1)_both]";

function ThinkingSteps({
  steps,
  visibleStep,
  fadingOut,
}: {
  steps: readonly string[];
  visibleStep: number;
  fadingOut: boolean;
}) {
  return (
    <div
      className={cn(
        "space-y-2.5 py-1 transition-opacity duration-300 ease-out",
        fadingOut ? "pointer-events-none opacity-0" : "opacity-100",
      )}
      aria-hidden={fadingOut}
    >
      {steps.map((step, index) => (
        <div
          key={step}
          className={cn(
            "flex items-center gap-2 transition-all duration-500 ease-out",
            index <= visibleStep ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0",
            index === visibleStep ? "text-ds-on-surface" : "text-ds-on-surface-variant",
          )}
        >
          <span
            className={cn(
              "size-2 shrink-0 rounded-full transition-colors duration-300",
              index <= visibleStep ? "bg-ds-primary" : "bg-ds-outline",
            )}
            aria-hidden
          />
          {step}
        </div>
      ))}
    </div>
  );
}

function TypingBubble() {
  return (
    <div className={cn("flex justify-start", MSG_IN_ANIMATION)} aria-hidden>
      <div className="mkt-chat-message flex max-w-[90%] items-center rounded-2xl rounded-tl-md border border-ds-outline bg-white px-3 py-2.5 shadow-sm">
        <AssistantThinkingDots />
      </div>
    </div>
  );
}

const ASSISTANT_BUBBLE_CLASS =
  "mkt-chat-message rounded-2xl rounded-tl-md border border-ds-outline bg-white px-3 py-2 text-ds-on-surface-variant shadow-sm";

function ChatBubble({ message }: { message: HeroChatMessage }) {
  const isUser = message.role === "user";
  const hasProducts = !isUser && Boolean(message.products?.length);

  if (hasProducts && message.products) {
    return (
      <div className={cn("flex justify-start", MSG_IN_ANIMATION)}>
        <div className="flex w-full min-w-0 max-w-[95%] flex-col gap-2">
          <div className={cn(ASSISTANT_BUBBLE_CLASS, "max-w-full text-left")}>{message.content}</div>
          <LandingProductCarousel products={message.products} />
        </div>
      </div>
    );
  }

  return (
    <div className={cn("flex", MSG_IN_ANIMATION, isUser ? "justify-end" : "justify-start")}>
      <div
        className={
          isUser
            ? "mkt-chat-message max-w-[85%] rounded-2xl rounded-tr-md bg-[#2f2f2f] px-3 py-2 text-left !text-white"
            : cn(ASSISTANT_BUBBLE_CLASS, "max-w-[90%]")
        }
      >
        {message.content}
      </div>
    </div>
  );
}

type HeroChatDemoProps = {
  /** Override script for tests or future live mode seed. */
  script?: HeroChatDemoTurn[];
  /** When wired to backend, pass messages here and set mode="live". */
  messages?: HeroChatMessage[];
  mode?: "demo" | "live";
};

function useAutoRevealOffset(
  viewportRef: RefObject<HTMLDivElement | null>,
  contentRef: RefObject<HTMLDivElement | null>,
  deps: unknown[],
) {
  const [offset, setOffset] = useState(0);

  const updateOffset = () => {
    const viewport = viewportRef.current;
    const content = contentRef.current;
    if (!viewport || !content) return;
    const overflow = content.scrollHeight - viewport.clientHeight;
    setOffset(overflow > 0 ? overflow : 0);
  };

  useLayoutEffect(() => {
    updateOffset();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- caller passes explicit reveal triggers
  }, deps);

  useEffect(() => {
    const content = contentRef.current;
    if (!content) return;
    const observer = new ResizeObserver(updateOffset);
    observer.observe(content);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- resize observer follows same reveal triggers
  }, deps);

  return offset;
}

export function HeroChatDemo({ script = HERO_CHAT_DEMO_SCRIPT, messages: liveMessages, mode = "demo" }: HeroChatDemoProps) {
  const messagesViewportRef = useRef<HTMLDivElement>(null);
  const messagesContentRef = useRef<HTMLDivElement>(null);
  const [messages, setMessages] = useState<HeroChatMessage[]>([]);
  const [turnIndex, setTurnIndex] = useState(0);
  const [visibleStep, setVisibleStep] = useState(-1);
  const [activeSteps, setActiveSteps] = useState<readonly string[] | null>(null);
  const [stepsFadingOut, setStepsFadingOut] = useState(false);
  const [showTyping, setShowTyping] = useState(false);
  const [playbackKey, setPlaybackKey] = useState(0);

  const displayMessages = mode === "live" && liveMessages ? liveMessages : messages;
  const contentOffset = useAutoRevealOffset(messagesViewportRef, messagesContentRef, [
    displayMessages,
    activeSteps,
    showTyping,
    visibleStep,
    stepsFadingOut,
    playbackKey,
  ]);

  useEffect(() => {
    preloadLandingProductImages(LANDING_DEMO_SHOE_PRODUCTS);
  }, []);

  useEffect(() => {
    if (mode !== "demo") return;

    let cancelled = false;
    const timers: number[] = [];
    const schedule = (delayMs: number, fn: () => void) => {
      timers.push(
        window.setTimeout(() => {
          if (!cancelled) fn();
        }, delayMs),
      );
    };

    setMessages([]);
    setTurnIndex(0);
    setVisibleStep(-1);
    setActiveSteps(null);
    setStepsFadingOut(false);
    setShowTyping(false);

    let elapsed = TIMING.initialPause;
    const cycleKey = playbackKey;

    script.forEach((turn, index) => {
      schedule(elapsed, () => {
        setTurnIndex(index);
        setMessages((current) => [
          ...current,
          { id: `${cycleKey}-${turn.id}-user`, role: "user", content: turn.userMessage },
        ]);
        setActiveSteps(turn.steps);
        setVisibleStep(-1);
        setStepsFadingOut(false);
        setShowTyping(false);
      });

      elapsed += index === 0 ? TIMING.userDelay - 200 : TIMING.userDelay;

      turn.steps.forEach((_, stepIndex) => {
        elapsed += stepIndex === 0 ? TIMING.firstStepDelay : TIMING.stepDelay;
        schedule(elapsed, () => setVisibleStep(stepIndex));
      });

      elapsed += TIMING.afterLastStep;
      schedule(elapsed, () => setStepsFadingOut(true));

      elapsed += TIMING.stepsFade;
      schedule(elapsed, () => {
        setActiveSteps(null);
        setStepsFadingOut(false);
        setVisibleStep(-1);
        setShowTyping(true);
      });

      elapsed += TIMING.typingPause;
      schedule(elapsed, () => {
        setMessages((current) => [
          ...current,
          {
            id: `${cycleKey}-${turn.id}-assistant`,
            role: "assistant",
            content: turn.agentReply,
            products: turn.products,
          },
        ]);
        setShowTyping(false);
      });

      elapsed += index === script.length - 1 ? TIMING.endPause : TIMING.betweenTurns;
    });

    schedule(elapsed, () => setPlaybackKey((current) => current + 1));

    return () => {
      cancelled = true;
      timers.forEach((timer) => window.clearTimeout(timer));
    };
  }, [playbackKey, mode, script]);

  return (
    <div className="pointer-events-none flex h-[min(600px,70vh)] w-full max-w-[460px] flex-col overflow-hidden rounded-[28px] border border-ds-outline bg-white shadow-ds-lg">
      <div className="flex shrink-0 items-center gap-2 border-b border-ds-outline/80 bg-white px-3 py-2 sm:px-4">
        {/* eslint-disable-next-line @next/next/no-img-element -- static SVG from /public */}
        <img
          src={CHAT_RELY_LOGO_PATH}
          alt=""
          className="h-6 w-auto shrink-0 object-contain"
          width={4931}
          height={3503}
        />
        <div className="min-w-0 flex-1">
          <p className="mkt-font truncate text-sm font-semibold text-ds-on-surface sm:text-[15px]">
            ChatRely Support Agent
          </p>
          <p className="mkt-font flex items-center gap-1.5 text-[11px] leading-tight text-ds-on-surface-variant">
            <span
              className="size-2 shrink-0 rounded-full bg-green-500 shadow-[0_0_0_2px_rgba(34,197,94,0.28)]"
              aria-hidden
            />
            Online
          </p>
        </div>
      </div>

      <div
        ref={messagesViewportRef}
        className="min-h-0 flex-1 overflow-hidden p-4 sm:p-5 mkt-chat-message"
        style={{ background: MESSAGE_AREA_GRADIENT }}
        aria-live="polite"
        aria-relevant="additions"
      >
        <div
          ref={messagesContentRef}
          className="space-y-3 pb-8 transition-transform duration-500 ease-out will-change-transform"
          style={{ transform: `translateY(-${contentOffset}px)` }}
        >
          {displayMessages.map((message) => (
            <ChatBubble key={message.id} message={message} />
          ))}

          {mode === "demo" && activeSteps ? (
            <ThinkingSteps steps={activeSteps} visibleStep={visibleStep} fadingOut={stepsFadingOut} />
          ) : null}

          {mode === "demo" && showTyping ? <TypingBubble /> : null}
        </div>
      </div>

      <div className="shrink-0 border-t border-ds-outline bg-white">
        <div className="px-4 py-3">
          <div
            className="mkt-chat-message rounded-full border border-ds-outline bg-ds-surface px-3 py-2 text-ds-on-surface-variant"
            aria-hidden
          >
            Message…
          </div>
        </div>
        <PoweredByChatRely compact className="border-t border-ds-outline/70 bg-ds-surface/60" />
      </div>
    </div>
  );
}
