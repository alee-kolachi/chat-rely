"use client";

import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from "react";
import {
  LandingChatAssistantBubble,
  LandingChatThinkingIndicator,
  LandingChatUserBubble,
  LandingChatWidgetShell,
} from "@/components/marketing/landing/landing-chat-widget-shell";
import {
  LandingProductCarousel,
  preloadLandingProductImages,
} from "@/components/marketing/landing/landing-product-carousel";
import { LANDING_DEMO_SHOE_PRODUCTS } from "@/lib/marketing/landing-demo-products";
import type { ProductCard } from "@/lib/product-card";

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

function thinkDurationForTurn(stepCount: number): number {
  if (stepCount <= 0) return TIMING.typingPause;
  return (
    TIMING.firstStepDelay +
    Math.max(0, stepCount - 1) * TIMING.stepDelay +
    TIMING.afterLastStep +
    TIMING.stepsFade +
    TIMING.typingPause
  );
}

function ChatBubble({ message }: { message: HeroChatMessage }) {
  const isUser = message.role === "user";
  const hasProducts = !isUser && Boolean(message.products?.length);

  if (isUser) {
    return <LandingChatUserBubble animateIn>{message.content}</LandingChatUserBubble>;
  }

  if (hasProducts && message.products) {
    return (
      <LandingChatAssistantBubble animateIn trailing={<LandingProductCarousel products={message.products} />}>
        {message.content}
      </LandingChatAssistantBubble>
    );
  }

  return <LandingChatAssistantBubble animateIn>{message.content}</LandingChatAssistantBubble>;
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
  const [isThinking, setIsThinking] = useState(false);
  const [playbackKey, setPlaybackKey] = useState(0);

  const displayMessages = mode === "live" && liveMessages ? liveMessages : messages;
  const contentOffset = useAutoRevealOffset(messagesViewportRef, messagesContentRef, [
    displayMessages,
    isThinking,
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
    setIsThinking(false);

    let elapsed = TIMING.initialPause;
    const cycleKey = playbackKey;

    script.forEach((turn, index) => {
      schedule(elapsed, () => {
        setMessages((current) => [
          ...current,
          { id: `${cycleKey}-${turn.id}-user`, role: "user", content: turn.userMessage },
        ]);
        setIsThinking(true);
      });

      elapsed += index === 0 ? TIMING.userDelay - 200 : TIMING.userDelay;
      elapsed += thinkDurationForTurn(turn.steps.length);

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
        setIsThinking(false);
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
    <LandingChatWidgetShell
      messagesViewportRef={messagesViewportRef}
      messagesContentRef={messagesContentRef}
      contentOffset={contentOffset}
    >
      {displayMessages.map((message) => (
        <ChatBubble key={message.id} message={message} />
      ))}

      {mode === "demo" && isThinking ? <LandingChatThinkingIndicator /> : null}
    </LandingChatWidgetShell>
  );
}
