"use client";

import { FormEvent, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { StreamingAssistantMessage, type AssistantStreamPhase } from "@/components/chat/StreamingAssistantMessage";
import { BackendApiError, backendFetch } from "@/lib/backend-api";
import { chatSseStream } from "@/lib/chat-sse";
import { applyChatSseEvent, chatStreamTerminalEvent } from "@/lib/chat-stream-handlers";
import { useResolvedOnboardingAgentId } from "@/lib/use-resolved-onboarding-agent-id";
import { useOnboardingIndexingStatus } from "@/lib/use-onboarding-indexing-status";
import { appButtonClassName } from "@/lib/button-styles";
import { cn } from "@/lib/utils";
import { OnboardingFrame } from "@/components/onboarding/onboarding-frame";
import {
  OnboardingMainColumn,
  onboardingSplitBody,
  onboardingSplitCardFilled,
  onboardingSplitGrid,
  onboardingSplitLeftSection,
  onboardingSplitPreviewShell,
  onboardingSplitPreviewWrap,
  onboardingSplitRightSection,
  onboardingSplitRoot,
  OnboardingStickyFooter,
} from "@/components/onboarding/onboarding-ui";
import type { ShopifyConnectionApi } from "@/components/integrations/use-shopify-connection";

type PreviewMessage = {
  from: "user" | "assistant";
  text: string;
  streamPhase?: AssistantStreamPhase;
  errorMessage?: string | null;
  statusLine?: string | null;
};

type OnboardingStatusPayload = {
  website_url: string | null;
  website_title: string | null;
  indexing_job: Record<string, unknown> | null;
  checklist: Array<{ key: string; status: string }>;
};

function faviconUrl(siteUrl: string | null | undefined): string {
  if (!siteUrl) return "";
  try {
    const host = new URL(siteUrl).hostname;
    return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(host)}&sz=128`;
  } catch {
    return "";
  }
}

function siteDisplayName(status: OnboardingStatusPayload | null): string {
  const title = status?.website_title?.trim();
  if (title) return title;
  const url = status?.website_url;
  if (!url) return "your website";
  try {
    return new URL(url).hostname.replace(/^www\./i, "");
  } catch {
    return "your website";
  }
}

function checklistDone(checklist: OnboardingStatusPayload["checklist"], key: string): boolean {
  const row = checklist.find((c) => c.key === key);
  return row?.status === "done";
}

function newPreviewVisitorId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `onboarding-preview-${crypto.randomUUID()}`;
  }
  return `onboarding-preview-${Date.now()}`;
}

export default function AgentPreviewOnboardingPage() {
  const agentId = useResolvedOnboardingAgentId();
  const { snapshot: indexing } = useOnboardingIndexingStatus(agentId, 2500);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const visitorIdRef = useRef(newPreviewVisitorId());
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const chatAbortRef = useRef<AbortController | null>(null);
  const messagesScrollRef = useRef<HTMLDivElement | null>(null);
  const stickToBottomRef = useRef(true);

  const [agentName, setAgentName] = useState("Your agent");
  const [onboardingStatus, setOnboardingStatus] = useState<OnboardingStatusPayload | null>(null);
  const [shopify, setShopify] = useState<ShopifyConnectionApi | null>(null);
  const [askedRealQuestion, setAskedRealQuestion] = useState(false);
  const siteName = siteDisplayName(onboardingStatus);
  const siteUrl = onboardingStatus?.website_url ?? null;
  const siteIcon = faviconUrl(siteUrl);

  const welcomeMessage = useMemo(() => {
    const who = agentName.trim() || "your support agent";
    if (indexing.running) {
      return `Hi! I'm ${who}. I'm still reading ${siteName}. Wait until at least one page is indexed, then ask a real customer question.`;
    }
    if (indexing.failed) {
      return `Hi! I'm ${who}. Site import hit a snag, but you can still try a question about ${siteName}.`;
    }
    return `Hi! I'm ${who}. Ask me something your customers would. I'll use what we know about ${siteName}.`;
  }, [agentName, siteName, indexing.running, indexing.failed]);

  const [messages, setMessages] = useState<PreviewMessage[]>([]);

  useEffect(() => {
    setMessages([{ from: "assistant", text: welcomeMessage, streamPhase: "done" }]);
  }, [welcomeMessage]);

  const checklist = useMemo(() => {
    const cl = onboardingStatus?.checklist ?? [];
    const knowledgeDone =
      checklistDone(cl, "pages_indexed") ||
      indexing.succeeded ||
      indexing.readyForPreview;
    const shopifyDone = Boolean(shopify?.connected);
    const appearanceDone = checklistDone(cl, "appearance_configured");
    return [
      { label: "Knowledge sources connected", done: knowledgeDone },
      { label: "Shopify connection started", done: shopifyDone },
      { label: "Agent tone and appearance set", done: appearanceDone },
      { label: "Try at least one real question", done: askedRealQuestion },
    ];
  }, [onboardingStatus, shopify?.connected, askedRealQuestion, indexing.succeeded, indexing.readyForPreview]);

  const previewContinueLabel = indexing.running && !indexing.readyForPreview
    ? `Reading site (${indexing.pct}%)…`
    : "Continue";
  const previewContinueDisabled = indexing.running && !indexing.readyForPreview;

  const appearanceToneHref = useMemo(() => {
    if (!agentId) return "/onboarding/appearance-tone";
    return `/onboarding/appearance-tone?agentId=${encodeURIComponent(agentId)}`;
  }, [agentId]);

  const connectionBackHref = useMemo(() => {
    if (!agentId) return "/onboarding/connection";
    return `/onboarding/connection?agentId=${encodeURIComponent(agentId)}`;
  }, [agentId]);

  const refreshStatus = useCallback(async () => {
    if (!agentId) return;
    try {
      const [status, agentsRes, bootstrap] = await Promise.all([
        backendFetch<OnboardingStatusPayload>(
          `/api/v1/onboarding/status?agent_id=${encodeURIComponent(agentId)}`
        ),
        backendFetch<{ agents: Array<{ id: string; name: string }> }>("/api/v1/agents"),
        backendFetch<{ shopify: ShopifyConnectionApi }>(
          `/api/v1/agents/${encodeURIComponent(agentId)}/integrations/bootstrap?include_website_preview=false`
        ),
      ]);
      setOnboardingStatus(status);
      setShopify(bootstrap.shopify);
      const agent = agentsRes.agents.find((a) => a.id === agentId);
      if (agent?.name) setAgentName(agent.name);
    } catch {
      /* keep last snapshot */
    }
  }, [agentId]);

  useEffect(() => {
    if (!agentId) return;
    void refreshStatus();
    const timer = setInterval(() => {
      if (document.visibilityState !== "visible") return;
      void refreshStatus();
    }, 4000);
    return () => clearInterval(timer);
  }, [agentId, refreshStatus]);

  useEffect(() => {
    return () => {
      chatAbortRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    chatAbortRef.current?.abort();
    chatAbortRef.current = null;
  }, [agentId]);

  const onMessagesScroll = useCallback(() => {
    const el = messagesScrollRef.current;
    if (!el) return;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight <= 80;
    stickToBottomRef.current = nearBottom;
  }, []);

  useLayoutEffect(() => {
    const el = messagesScrollRef.current;
    if (!el || !stickToBottomRef.current) return;
    el.scrollTop = el.scrollHeight;
  }, [messages, isSending]);

  const canSend = Boolean(agentId && input.trim() && !isSending && indexing.readyForPreview);

  async function handleSend(event: FormEvent) {
    event.preventDefault();
    if (!canSend || !agentId) return;
    const message = input.trim();
    setInput("");
    setError(null);
    stickToBottomRef.current = true;
    setMessages((prev) => [...prev, { from: "user", text: message }]);
    setMessages((prev) => [
      ...prev,
      { from: "assistant", text: "", streamPhase: "thinking", statusLine: null },
    ]);
    setIsSending(true);
    chatAbortRef.current?.abort();
    const ac = new AbortController();
    chatAbortRef.current = ac;
    try {
      for await (const ev of chatSseStream("/api/chat/stream", {
        method: "POST",
        signal: ac.signal,
        body: JSON.stringify({
          agent_id: agentId,
          message,
          conversation_id: conversationId,
          visitor_id: visitorIdRef.current,
        }),
      })) {
        if (ac.signal.aborted) break;
        if (ev.type === "done" && ev.conversation_id) {
          setConversationId(ev.conversation_id);
        }
        setMessages((prev) => {
          if (prev.length === 0) return prev;
          const last = prev[prev.length - 1];
          if (last.from !== "assistant") return prev;
          const patch = applyChatSseEvent(ev, {
            text: last.text,
            streamPhase: last.streamPhase ?? "thinking",
          });
          if (!patch) return prev;
          const next = [...prev];
          next[next.length - 1] = {
            ...last,
            ...patch,
            from: "assistant",
          };
          return next;
        });
        if (ev.type === "done") {
          const reply = typeof ev.response === "string" ? ev.response.trim() : "";
          if (reply.length >= 8) setAskedRealQuestion(true);
        } else if (ev.type === "error") {
          throw new BackendApiError(ev.message ?? "Chat failed", 0, ev.code, ev.details);
        }
        if (chatStreamTerminalEvent(ev)) {
          setIsSending(false);
        }
      }
    } catch (e) {
      if (ac.signal.aborted) return;
      const errMsg = e instanceof Error ? e.message : "Failed to send message";
      setError(errMsg);
      setMessages((prev) => {
        if (prev.length === 0) return prev;
        const last = prev[prev.length - 1];
        if (last?.from !== "assistant") return prev;
        const next = [...prev];
        next[next.length - 1] = {
          ...last,
          streamPhase: "error",
          errorMessage: errMsg,
        };
        return next;
      });
    } finally {
      if (chatAbortRef.current === ac) chatAbortRef.current = null;
      setIsSending(false);
    }
  }

  return (
    <OnboardingFrame
      activeItem="Agent Preview"
      completedItems={["Agent Name", "Knowledge Base", "Connection"]}
      stepLabel="Step 4 of 5"
      linkAgentId={agentId}
      footer={
        <OnboardingStickyFooter
          backHref={connectionBackHref}
          backLabel="Back"
          primaryHref={previewContinueDisabled ? undefined : appearanceToneHref}
          primaryAsButton={previewContinueDisabled}
          onPrimaryClick={() => {}}
          primaryDisabled={previewContinueDisabled}
          primaryLabel={previewContinueLabel}
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

          <div className={onboardingSplitCardFilled}>
            <div className={onboardingSplitGrid}>
              <section className={onboardingSplitLeftSection}>
                <div>
                  <p className="text-ds-on-surface-variant mb-3 text-[11px] font-semibold tracking-[0.18em] uppercase">
                    Step 4
                  </p>
                  <h1 className="text-ds-on-surface text-2xl font-semibold tracking-tight sm:text-3xl lg:text-[2rem]">
                    Test your <span className="text-ds-primary font-bold">agent</span> before go-live
                  </h1>
                  <p className="text-ds-on-surface-variant mt-2 text-sm leading-relaxed">
                    Ask questions your customers actually ask. This uses the same AI setup as the playground and live
                    widget.
                  </p>

                  {!indexing.readyForPreview && indexing.headline ? (
                    <div className="border-ds-outline mt-5 rounded-ds-lg border bg-white px-4 py-3">
                      <p className="text-ds-on-surface text-sm font-medium">
                        Wait before testing your agent
                      </p>
                      <p className="text-ds-on-surface-variant mt-1 text-xs leading-relaxed">
                        Answers stay generic until we finish reading your site. Progress updates in the bar
                        above.
                      </p>
                    </div>
                  ) : null}

                  <div className="mt-8 space-y-5 sm:mt-10">
                    <div className="border-ds-outline rounded-ds-lg border bg-white p-4 sm:p-5">
                      <p className="text-ds-on-surface mb-4 text-sm font-semibold">Launch checklist</p>
                      <ul className="space-y-3">
                        {checklist.map((item) => (
                          <li key={item.label} className="flex items-start gap-3">
                            {item.done ? (
                              <span className="bg-ds-primary/15 text-ds-primary mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold">
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
                  </div>
                </div>
              </section>

              <section
                className={cn(
                  onboardingSplitRightSection,
                  "items-center justify-center p-4 sm:p-6 lg:items-stretch lg:justify-center lg:p-8"
                )}
              >
                <div
                  className="pointer-events-none absolute inset-0 opacity-35"
                  style={{
                    backgroundImage:
                      "radial-gradient(color-mix(in srgb, var(--ds-on-surface-variant) 22%, transparent) 1px, transparent 1px)",
                    backgroundSize: "20px 20px",
                  }}
                  aria-hidden
                />
                <div className={cn(onboardingSplitPreviewWrap, "max-h-full lg:flex-1")}>
                  <div
                    className={cn(
                      onboardingSplitPreviewShell,
                      "flex max-h-[min(520px,calc(100dvh-12rem))] min-h-[18rem] flex-col overflow-hidden bg-white sm:min-h-[24rem] lg:h-[520px] lg:max-h-[520px] lg:min-h-0"
                    )}
                  >
                    <div className="bg-ds-primary flex shrink-0 items-center gap-3 px-4 py-3.5 sm:px-5">
                      <div className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white p-1.5 sm:size-11">
                        {siteIcon ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={siteIcon} alt="" className="size-full object-contain" width={32} height={32} />
                        ) : (
                          <span className="text-ds-primary text-xs font-bold">AI</span>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-base font-semibold text-ds-on-primary sm:text-[1.05rem]">
                          {agentName}
                        </p>
                        <p className="text-ds-on-primary/85 mt-0.5 flex items-center gap-1.5 text-xs">
                          <span
                            className={`size-2 shrink-0 rounded-full ${indexing.running ? "bg-amber-300" : "bg-emerald-400"}`}
                          />
                          {indexing.running ? "Still reading your site" : indexing.succeeded ? "Ready to test" : "Partial knowledge"}
                        </p>
                      </div>
                    </div>

                    {shopify?.connected ? (
                      <div className="border-ds-outline shrink-0 border-b bg-ds-sidebar/60 px-4 py-2 text-xs text-ds-on-surface-variant">
                        Shopify linked
                        {shopify.shop_domain ? (
                          <span className="text-ds-on-surface font-medium"> · {shopify.shop_domain}</span>
                        ) : null}
                      </div>
                    ) : null}

                    <div
                      ref={messagesScrollRef}
                      onScroll={onMessagesScroll}
                      className="min-h-0 flex-1 basis-0 space-y-3 overflow-y-auto overscroll-contain bg-white p-4 sm:p-5"
                    >
                      {messages.map((message, idx) => {
                        const phase: AssistantStreamPhase =
                          message.streamPhase ??
                          (message.from === "assistant" && isSending && idx === messages.length - 1
                            ? "thinking"
                            : message.text.trim()
                              ? "done"
                              : "thinking");
                        return (
                          <div
                            key={`${message.from}-${idx}`}
                            className={
                              message.from === "user"
                                ? "bg-ds-primary ml-auto max-w-[92%] rounded-2xl rounded-tr-sm px-4 py-2.5 text-ds-on-primary sm:max-w-[88%]"
                                : "border-ds-outline max-w-[92%] rounded-2xl rounded-tl-sm border bg-ds-sidebar px-4 py-2.5 sm:max-w-[88%]"
                            }
                          >
                            {message.from === "assistant" ? (
                              <StreamingAssistantMessage
                                text={message.text}
                                phase={phase}
                                statusLine={message.statusLine}
                                errorMessage={message.errorMessage}
                              />
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
                          placeholder={
                            !indexing.readyForPreview
                              ? indexing.running
                                ? `Reading site (${indexing.pct}%)…`
                                : "Add your website on step 2 first"
                              : agentId
                                ? "Ask a question…"
                                : "Complete previous steps first"
                          }
                          className="border-ds-outline focus:border-ds-primary min-h-11 min-w-0 flex-1 rounded-full border bg-ds-sidebar px-4 text-sm outline-none focus:ring-2 focus:ring-ds-primary/15 sm:min-h-12"
                          disabled={!agentId || isSending || !indexing.readyForPreview}
                        />
                        <button
                          type="submit"
                          disabled={!canSend}
                          className={appButtonClassName("default", {
                            className: "min-h-11 shrink-0 rounded-full sm:min-h-12",
                          })}
                        >
                          Send
                        </button>
                      </form>
                      {error ? <p className="mt-2 text-xs text-rose-600 sm:text-sm">{error}</p> : null}
                    </div>
                  </div>
                </div>
              </section>
            </div>
          </div>
        </div>
      </OnboardingMainColumn>
    </OnboardingFrame>
  );
}
