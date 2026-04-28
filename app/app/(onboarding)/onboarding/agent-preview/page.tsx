"use client";

import { FormEvent, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { backendFetch } from "@/lib/backend-api";
import { getOnboardingAgentId } from "@/lib/onboarding-state";
import { OnboardingFrame } from "@/components/onboarding/onboarding-frame";
import {
  OnboardingPageHeader,
  OnboardingSectionCard,
  OnboardingStickyFooter,
  OnboardingWideColumn,
  onboardingType,
} from "@/components/onboarding/onboarding-ui";

const checklistItems = [
  { label: "Knowledge sources connected", done: true },
  { label: "Agent tone and appearance set", done: true },
  { label: "Shopify connection started", done: true },
  { label: "Try at least one real question", done: false },
];

export default function AgentPreviewOnboardingPage() {
  const searchParams = useSearchParams();
  const agentId = searchParams.get("agentId") ?? getOnboardingAgentId();
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

  async function handleSend(event: FormEvent) {
    event.preventDefault();
    if (!canSend || !agentId) return;
    const message = input.trim();
    setInput("");
    setError(null);
    setMessages((prev) => [...prev, { from: "user", text: message }]);
    setIsSending(true);
    try {
      const data = await backendFetch<{
        conversation_id: string;
        response: string;
        fallback_used: boolean;
        retrieval_count: number;
      }>("/api/v1/runtime/chat", {
        method: "POST",
        body: JSON.stringify({
          agent_id: agentId,
          message,
          conversation_id: conversationId,
          visitor_id: "onboarding-preview",
        }),
      });
      setConversationId(data.conversation_id);
      setMessages((prev) => [...prev, { from: "assistant", text: data.response }]);
      setRetrievalSummary(
        data.fallback_used
          ? "Fallback answer used (low confidence retrieval)."
          : `Retrieved ${data.retrieval_count} chunk(s).`
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to send preview message");
    } finally {
      setIsSending(false);
    }
  }

  return (
    <OnboardingFrame
      activeItem="Agent Preview"
      completedItems={["Agent Name", "Knowledge Base", "Connection", "Appearance & Tone"]}
      stepLabel="Step 5 of 6"
    >
      <OnboardingWideColumn>
        <OnboardingPageHeader
          kicker="Step 5 · Validate"
          title="Test your agent before you pay or install"
          subtitle="Ask questions your customers actually ask. Good answers here mean fewer surprises after go-live."
        />

        <div className="mb-3 flex items-center gap-2">
          <span className="size-2 shrink-0 rounded-full bg-emerald-500" aria-hidden />
          <p className="text-ds-on-surface-variant text-[11px] font-semibold uppercase tracking-wider">
            Live test · uses connected knowledge where available
          </p>
        </div>

        <OnboardingSectionCard className="overflow-hidden p-0" padding="p-0">
          <div className="border-ds-outline flex h-10 items-center gap-2 border-b bg-ds-sidebar px-3">
            <div className="flex gap-1.5">
              <span className="size-2.5 rounded-full bg-ds-outline" />
              <span className="size-2.5 rounded-full bg-ds-outline" />
              <span className="size-2.5 rounded-full bg-ds-outline" />
            </div>
            <div className="text-ds-on-surface-variant mx-auto max-w-[50%] truncate rounded bg-white px-3 py-1 text-center text-[10px]">
              preview.yourstore.com
            </div>
          </div>
          <div className="relative flex min-h-[320px] items-center justify-center bg-white p-6 md:min-h-[380px]">
            <div className="absolute inset-0 grid grid-cols-3 gap-4 p-8 opacity-[0.07]">
              <div className="aspect-square rounded-ds-md bg-ds-primary" />
              <div className="aspect-square rounded-ds-md bg-ds-primary" />
              <div className="aspect-square rounded-ds-md bg-ds-primary" />
            </div>
            <div className="border-ds-outline relative z-10 flex h-[min(480px,55vh)] w-full max-w-[400px] flex-col overflow-hidden rounded-ds-lg border bg-white shadow-sm">
              <div className="bg-ds-primary flex items-center gap-3 px-4 py-3">
                <div className="flex size-8 items-center justify-center rounded-full bg-white text-xs font-bold text-ds-primary">
                  AI
                </div>
                <div>
                  <p className="text-sm font-semibold text-ds-on-primary">Store assistant</p>
                  <p className="text-ds-on-primary/80 flex items-center gap-1 text-[10px]">
                    <span className="size-1.5 rounded-full bg-emerald-400" />
                    Ready
                  </p>
                </div>
              </div>
              <div className="border-ds-outline border-b bg-ds-sidebar px-3 py-2">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-ds-on-surface-variant">Shopify sync may still be running</span>
                  <span className="font-semibold text-ds-on-surface">75%</span>
                </div>
                <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-ds-outline/80">
                  <div className="preview-progress-bar bg-ds-primary h-full w-3/4 rounded-full" />
                </div>
              </div>
              <div className="flex-1 space-y-3 overflow-y-auto bg-white p-4 text-xs">
                {messages.map((message, idx) => (
                  <div
                    key={`${message.from}-${idx}`}
                    className={
                      message.from === "user"
                        ? "bg-ds-primary ml-auto max-w-[90%] rounded-2xl rounded-tr-sm px-3 py-2 leading-relaxed text-ds-on-primary"
                        : "border-ds-outline max-w-[90%] rounded-2xl rounded-tl-sm border bg-ds-sidebar px-3 py-2 leading-relaxed"
                    }
                  >
                    {message.text}
                  </div>
                ))}
                {isSending ? <p className="text-ds-on-surface-variant text-[11px]">Thinking...</p> : null}
              </div>
              <div className="border-ds-outline border-t p-3">
                <form onSubmit={handleSend} className="flex items-center gap-2">
                  <input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder={agentId ? "Ask a question..." : "Complete previous steps first"}
                    className="border-ds-outline focus:border-ds-primary flex-1 rounded-full border bg-ds-sidebar px-4 py-2.5 text-[11px] outline-none"
                    disabled={!agentId || isSending}
                  />
                  <button
                    type="submit"
                    disabled={!canSend}
                    className="text-ds-primary px-2 text-[11px] font-medium disabled:opacity-40"
                  >
                    Send
                  </button>
                </form>
                <p className="text-ds-on-surface-variant mt-2 text-[10px]">{retrievalSummary}</p>
                {error ? <p className="mt-1 text-[10px] text-rose-600">{error}</p> : null}
              </div>
            </div>
          </div>
        </OnboardingSectionCard>

        <div className="mt-10 grid gap-4 sm:grid-cols-2">
          {checklistItems.map((item) => (
            <div key={item.label} className="flex items-start gap-3">
              {item.done ? (
                <span className="bg-ds-primary text-ds-on-primary mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold">
                  ✓
                </span>
              ) : (
                <span className="border-ds-outline mt-0.5 size-5 shrink-0 rounded-full border-2 border-dashed" aria-hidden />
              )}
              <span className={item.done ? "text-sm font-medium text-ds-on-surface" : "text-sm font-medium text-ds-on-surface-variant"}>
                {item.label}
              </span>
            </div>
          ))}
        </div>

        <OnboardingSectionCard className="mt-10 opacity-60" aria-disabled>
          <p className="text-ds-on-surface-variant mb-4 text-xs font-semibold uppercase tracking-wider">
            After go-live
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex gap-4 rounded-ds-md border border-ds-outline bg-white p-4">
              <div className="text-ds-on-surface-variant flex size-10 items-center justify-center rounded-ds-md bg-ds-sidebar text-xs font-bold">
                {"</>"}
              </div>
              <div>
                <p className="text-sm font-semibold text-ds-on-surface">Embed on site</p>
                <p className={onboardingType.hint}>Snippet for any platform</p>
              </div>
            </div>
            <div className="flex gap-4 rounded-ds-md border border-ds-outline bg-white p-4">
              <div className="text-ds-on-surface-variant flex size-10 items-center justify-center rounded-ds-md bg-ds-sidebar text-xs font-bold">
                S
              </div>
              <div>
                <p className="text-sm font-semibold text-ds-on-surface">Shopify app</p>
                <p className={onboardingType.hint}>One-click theme install</p>
              </div>
            </div>
          </div>
        </OnboardingSectionCard>
      </OnboardingWideColumn>

      <OnboardingStickyFooter
        backHref="/onboarding/appearance-tone"
        backLabel="Back"
        primaryHref={continueHref}
        primaryLabel="Choose plan & continue"
      />

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
