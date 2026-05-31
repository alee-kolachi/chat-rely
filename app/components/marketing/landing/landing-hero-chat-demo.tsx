"use client";

import { useEffect, useState } from "react";
import { AssistantThinkingDots } from "@/components/chat/assistant-thinking-dots";
import { CHAT_RELY_LOGO_PATH } from "@/components/branding/chat-rely-wordmark";
import { cn } from "@/lib/utils";

/** Shared message shape for demo playback and future live chat. */
export type HeroChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

export type HeroChatDemoTurn = {
  id: string;
  userMessage: string;
  steps: readonly string[];
  agentReply: string;
};

export const HERO_CHAT_DEMO_SCRIPT: HeroChatDemoTurn[] = [
  {
    id: "order",
    userMessage: "Where is order #1042?",
    steps: ["Identifying intent", "Looking up order", "Sharing tracking"],
    agentReply: "Order #1042 shipped yesterday. Tracking: 1Z999AA10123456784.",
  },
  {
    id: "stock",
    userMessage: "Is the blue hoodie in stock in size M?",
    steps: ["Identifying intent", "Searching catalog", "Checking inventory"],
    agentReply: "Yes, the blue hoodie in M is in stock. 12 units available at your nearest warehouse.",
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

function ChatBubble({ message }: { message: HeroChatMessage }) {
  const isUser = message.role === "user";

  return (
    <div className={cn("flex", MSG_IN_ANIMATION, isUser ? "justify-end" : "justify-start")}>
      <div
        className={
          isUser
            ? "mkt-chat-message max-w-[85%] rounded-2xl rounded-tr-md bg-[#2f2f2f] px-3 py-2 text-left !text-white"
            : "mkt-chat-message max-w-[90%] rounded-2xl rounded-tl-md border border-ds-outline bg-white px-3 py-2 text-ds-on-surface-variant shadow-sm"
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

export function HeroChatDemo({ script = HERO_CHAT_DEMO_SCRIPT, messages: liveMessages, mode = "demo" }: HeroChatDemoProps) {
  const [messages, setMessages] = useState<HeroChatMessage[]>([]);
  const [turnIndex, setTurnIndex] = useState(0);
  const [visibleStep, setVisibleStep] = useState(-1);
  const [activeSteps, setActiveSteps] = useState<readonly string[] | null>(null);
  const [stepsFadingOut, setStepsFadingOut] = useState(false);
  const [showTyping, setShowTyping] = useState(false);
  const [playbackKey, setPlaybackKey] = useState(0);

  const displayMessages = mode === "live" && liveMessages ? liveMessages : messages;

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
          { id: `${cycleKey}-${turn.id}-assistant`, role: "assistant", content: turn.agentReply },
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
    <div className="flex h-[min(600px,70vh)] w-full max-w-[420px] flex-col overflow-hidden rounded-[28px] border border-ds-outline bg-white shadow-ds-lg">
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
        className="min-h-0 flex-1 space-y-3 overflow-hidden p-4 sm:p-5 mkt-chat-message"
        style={{ background: MESSAGE_AREA_GRADIENT }}
        aria-live="polite"
        aria-relevant="additions"
      >
        {displayMessages.map((message) => (
          <ChatBubble key={message.id} message={message} />
        ))}

        {mode === "demo" && activeSteps ? (
          <ThinkingSteps steps={activeSteps} visibleStep={visibleStep} fadingOut={stepsFadingOut} />
        ) : null}

        {mode === "demo" && showTyping ? <TypingBubble /> : null}
      </div>

      <div className="shrink-0 border-t border-ds-outline bg-white px-4 py-3">
        <div
          className="mkt-chat-message rounded-full border border-ds-outline bg-ds-surface px-3 py-2 text-ds-on-surface-variant"
          aria-hidden
        >
          Message…
        </div>
      </div>
    </div>
  );
}
