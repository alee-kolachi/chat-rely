"use client";

import { FormEvent, useMemo, useState } from "react";
import { AssistantMarkdown } from "@/components/chat/assistant-markdown";
import { AssistantThinkingDots } from "@/components/chat/assistant-thinking-dots";
import { BackendApiError, backendNdjsonStream } from "@/lib/backend-api";
import { useResolvedOnboardingAgentId } from "@/lib/use-resolved-onboarding-agent-id";
import { OnboardingFrame } from "@/components/onboarding/onboarding-frame";
import {
  OnboardingMainColumn,
  onboardingSplitBody,
  onboardingSplitCard,
  onboardingSplitGrid,
  onboardingSplitRoot,
  OnboardingStickyFooter,
} from "@/components/onboarding/onboarding-ui";

const checklistItems = [
  { label: "Knowledge sources connected", done: true },
  { label: "Agent tone and appearance set", done: true },
  { label: "Shopify connection started", done: true },
  { label: "Try at least one real question", done: false },
];

export default function AgentPreviewOnboardingPage() {
  const agentId = useResolvedOnboardingAgentId();
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<Array<{ from: "user" | "assistant"; text: string }>>([
    { from: "assistant", text: "Hello! I can use your connected knowledge sources. Ask me a question." },
  ]);
  const [retrievalSummary, setRetrievalSummary] = useState<string>("No retrieval yet");

  const canSend = Boolean(agentId && input.trim() && !isSending);
  const continueHref = useMemo(() => {
    if (!agentId) return "/onboarding/pricing";
    return `/onboarding/pricing?agentId=${encodeURIComponent(agentId)}`;
  }, [agentId]);

  const appearanceBackHref = useMemo(() => {
    if (!agentId) return "/onboarding/appearance-tone";
    return `/onboarding/appearance-tone?agentId=${encodeURIComponent(agentId)}`;
  }, [agentId]);

  async function handleSend(event: FormEvent) {
    event.preventDefault();
    if (!canSend || !agentId) return;
    const message = input.trim();
    setInput("");
    setError(null);
    setMessages((prev) => [...prev, { from: "user", text: message }]);
    setMessages((prev) => [...prev, { from: "assistant", text: "" }]);
    setIsSending(true);
    try {
      for await (const ev of backendNdjsonStream("/api/v1/runtime/chat/stream", {
        method: "POST",
        body: JSON.stringify({
          agent_id: agentId,
          message,
          conversation_id: conversationId,
          visitor_id: "onboarding-preview",
        }),
      })) {
        if (ev.type === "start") {
          setConversationId(ev.conversation_id);
        } else if (ev.type === "token") {
          setMessages((prev) => {
            if (prev.length === 0) return prev;
            const last = prev[prev.length - 1];
            if (last.from !== "assistant") return prev;
            const next = [...prev];
            next[next.length - 1] = { from: "assistant", text: last.text + ev.text };
            return next;
          });
        } else if (ev.type === "done") {
          setConversationId(ev.conversation_id);
          const reply = typeof ev.response === "string" ? ev.response : "";
          setMessages((prev) => {
            if (prev.length === 0) return prev;
            const last = prev[prev.length - 1];
            if (last.from !== "assistant") return prev;
            const next = [...prev];
            next[next.length - 1] = { from: "assistant", text: reply };
            return next;
          });
          const fb = Boolean(ev.fallback_used);
          const rc =
            typeof ev.retrieval_count === "number" && Number.isFinite(ev.retrieval_count)
              ? ev.retrieval_count
              : 0;
          setRetrievalSummary(
            fb ? "Fallback answer used (low confidence retrieval)." : `Retrieved ${rc} chunk(s).`
          );
        } else if (ev.type === "error") {
          throw new BackendApiError(ev.message ?? "Chat failed", 0, ev.code, ev.details);
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to send preview message");
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last?.from === "assistant" && !(last.text ?? "").trim()) {
          return prev.slice(0, -1);
        }
        return prev;
      });
    } finally {
      setIsSending(false);
    }
  }

  return (
    <OnboardingFrame
      activeItem="Agent Preview"
      completedItems={["Agent Name", "Knowledge Base", "Connection", "Appearance & Tone"]}
      stepLabel="Step 5 of 6"
      linkAgentId={agentId}
      footer={
        <OnboardingStickyFooter
          backHref={appearanceBackHref}
          backLabel="Back"
          primaryHref={continueHref}
          primaryLabel="Choose plan & continue"
        />
      }
    >
      <OnboardingMainColumn className={onboardingSplitRoot}>
        <div className={onboardingSplitBody}>
          <div
            className="pointer-events-none absolute inset-0 -z-10 rounded-[36px] opacity-80"
            style={{
              background:
                "radial-gradient(circle at 18% 20%, rgba(56,189,248,0.14), transparent 38%), radial-gradient(circle at 82% 75%, rgba(167,139,250,0.12), transparent 42%), linear-gradient(180deg, rgba(248,250,252,0.95), rgba(244,244,255,0.72))",
            }}
            aria-hidden
          />

          <div className={onboardingSplitCard}>
            <div className={onboardingSplitGrid}>
              <section className="flex flex-col justify-center p-6 sm:p-8 max-lg:min-h-min lg:min-h-0 lg:h-full lg:p-10">
                <div>
                  <p className="text-ds-on-surface-variant mb-3 text-[11px] font-semibold tracking-[0.18em] uppercase">
                    Step 5
                  </p>
                  <h1 className="text-ds-on-surface text-2xl font-semibold tracking-tight sm:text-3xl lg:text-[2rem]">
                    Test your <span className="text-ds-primary font-bold">agent</span> before go-live
                  </h1>
                  <p className="text-ds-on-surface-variant mt-2 text-sm leading-relaxed">
                    Ask questions your customers actually ask. Good answers here mean fewer surprises after you ship.
                  </p>

                  <div className="mt-6 flex items-center gap-2">
                    <span className="size-2 shrink-0 rounded-full bg-emerald-500" aria-hidden />
                    <p className="text-ds-on-surface-variant text-[11px] font-semibold uppercase tracking-wider">
                      Live test · uses connected knowledge where available
                    </p>
                  </div>

                  <div className="mt-8 space-y-5 sm:mt-10">
                    <div className="border-ds-outline rounded-ds-lg border bg-white p-4 sm:p-5">
                      <p className="text-ds-on-surface mb-4 text-sm font-semibold">Launch checklist</p>
                      <ul className="space-y-3">
                        {checklistItems.map((item) => (
                          <li key={item.label} className="flex items-start gap-3">
                            {item.done ? (
                              <span className="bg-ds-primary text-ds-on-primary mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold">
                                ✓
                              </span>
                            ) : (
                              <span
                                className="border-ds-outline mt-0.5 size-5 shrink-0 rounded-full border-2 border-dashed"
                                aria-hidden
                              />
                            )}
                            <span
                              className={
                                item.done
                                  ? "text-sm font-medium text-ds-on-surface"
                                  : "text-sm font-medium text-ds-on-surface-variant"
                              }
                            >
                              {item.label}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="border-ds-outline rounded-ds-lg border bg-ds-sidebar/50 p-4 sm:p-5 opacity-90">
                      <p className="text-ds-on-surface-variant mb-3 text-[11px] font-semibold uppercase tracking-wider">
                        After go-live
                      </p>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="border-ds-outline flex gap-3 rounded-ds-md border bg-white p-3">
                          <div className="text-ds-on-surface-variant flex size-9 shrink-0 items-center justify-center rounded-ds-md bg-ds-sidebar text-[10px] font-bold">
                            {"</>"}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-ds-on-surface">Embed on site</p>
                            <p className="text-ds-on-surface-variant mt-0.5 text-[11px] leading-relaxed">
                              Snippet for any platform
                            </p>
                          </div>
                        </div>
                        <div className="border-ds-outline flex gap-3 rounded-ds-md border bg-white p-3">
                          <div className="text-ds-on-surface-variant flex size-9 shrink-0 items-center justify-center rounded-ds-md bg-ds-sidebar text-xs font-bold">
                            S
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-ds-on-surface">Shopify app</p>
                            <p className="text-ds-on-surface-variant mt-0.5 text-[11px] leading-relaxed">
                              One-click theme install
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              <section className="bg-ds-sidebar border-ds-outline relative flex flex-col border-t p-4 sm:p-6 max-lg:min-h-min lg:min-h-0 lg:h-full lg:border-t-0 lg:border-l lg:p-8">
                <div
                  className="pointer-events-none absolute inset-0 opacity-35"
                  style={{
                    backgroundImage:
                      "radial-gradient(color-mix(in srgb, var(--ds-on-surface-variant) 22%, transparent) 1px, transparent 1px)",
                    backgroundSize: "20px 20px",
                  }}
                  aria-hidden
                />
                <div className="relative flex flex-col items-stretch max-lg:min-h-min lg:min-h-0 lg:flex-1">
                  <div className="border-ds-outline flex w-full min-h-[22rem] flex-col overflow-hidden rounded-2xl border bg-white shadow-xl max-lg:mx-auto max-lg:flex-none max-lg:max-h-none sm:min-h-[26rem] lg:min-h-[560px]">
                    <div className="bg-ds-primary flex shrink-0 items-center gap-3 px-4 py-4 sm:px-5 sm:py-4">
                      <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-white text-sm font-bold text-ds-primary sm:size-11">
                        AI
                      </div>
                      <div className="min-w-0">
                        <p className="text-base font-semibold text-ds-on-primary sm:text-[1.05rem]">Store assistant</p>
                        <p className="text-ds-on-primary/85 mt-0.5 flex items-center gap-1.5 text-xs sm:text-[13px]">
                          <span className="size-2 shrink-0 rounded-full bg-emerald-400" />
                          Ready to test
                        </p>
                      </div>
                    </div>
                    <div className="border-ds-outline shrink-0 border-b bg-ds-sidebar px-4 py-2.5 sm:px-5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-ds-on-surface-variant">Shopify sync may still be running</span>
                        <span className="font-semibold text-ds-on-surface">75%</span>
                      </div>
                      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-ds-outline/80">
                        <div className="preview-progress-bar bg-ds-primary h-full w-3/4 rounded-full" />
                      </div>
                    </div>
                    <div className="min-h-0 flex-1 space-y-3 overflow-y-auto bg-white p-4 text-sm leading-relaxed sm:p-5">
                      {messages.map((message, idx) => {
                        const isStreamingAssistant =
                          message.from === "assistant" &&
                          isSending &&
                          idx === messages.length - 1 &&
                          !message.text.trim();
                        return (
                          <div
                            key={`${message.from}-${idx}`}
                            className={
                              message.from === "user"
                                ? "bg-ds-primary ml-auto max-w-[92%] rounded-2xl rounded-tr-sm px-4 py-2.5 text-ds-on-primary sm:max-w-[88%]"
                                : isStreamingAssistant
                                  ? "border-ds-outline flex max-w-[92%] items-center leading-none rounded-2xl rounded-tl-sm border bg-ds-sidebar px-3 py-2 text-ds-on-surface sm:max-w-[88%]"
                                  : "border-ds-outline max-w-[92%] rounded-2xl rounded-tl-sm border bg-ds-sidebar px-4 py-2.5 text-ds-on-surface sm:max-w-[88%]"
                            }
                          >
                            {message.from === "assistant" ? (
                              isStreamingAssistant ? (
                                <AssistantThinkingDots />
                              ) : (
                                <AssistantMarkdown>{message.text}</AssistantMarkdown>
                              )
                            ) : (
                              message.text
                            )}
                          </div>
                        );
                      })}
                    </div>
                    <div className="border-ds-outline shrink-0 border-t bg-white p-3 sm:p-4">
                      <form onSubmit={handleSend} className="flex items-center gap-2 sm:gap-3">
                        <input
                          value={input}
                          onChange={(e) => setInput(e.target.value)}
                          placeholder={agentId ? "Ask a question…" : "Complete previous steps first"}
                          className="border-ds-outline focus:border-ds-primary min-h-11 min-w-0 flex-1 rounded-full border bg-ds-sidebar px-4 text-sm outline-none sm:min-h-12 sm:px-5"
                          disabled={!agentId || isSending}
                        />
                        <button
                          type="submit"
                          disabled={!canSend}
                          className="bg-ds-primary text-ds-on-primary hover:bg-ds-primary-hover touch-manipulation min-h-11 shrink-0 rounded-full px-5 py-2.5 text-sm font-semibold transition-colors disabled:pointer-events-none disabled:opacity-40 sm:min-h-12 sm:px-5 sm:py-3 [-webkit-tap-highlight-color:transparent]"
                        >
                          Send
                        </button>
                      </form>
                      <p className="text-ds-on-surface-variant mt-2 text-xs sm:text-[13px]">{retrievalSummary}</p>
                      {error ? <p className="mt-1.5 text-xs text-rose-600 sm:text-sm">{error}</p> : null}
                    </div>
                  </div>
                </div>
              </section>
            </div>
          </div>
        </div>
      </OnboardingMainColumn>

      <style jsx>{`
        @keyframes preview-progress {
          0%,
          100% {
            width: 68%;
          }
          50% {
            width: 78%;
          }
        }
        .preview-progress-bar {
          animation: preview-progress 8s ease-in-out infinite;
        }
      `}</style>
    </OnboardingFrame>
  );
}
