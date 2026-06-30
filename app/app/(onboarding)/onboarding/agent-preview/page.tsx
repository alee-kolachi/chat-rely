"use client";

import { FormEvent, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  PlaygroundStyleChatPanel,
  type PlaygroundStyleChatMessage,
} from "@/components/chat/playground-style-chat-panel";
import { BackendApiError, backendFetch } from "@/lib/backend-api";
import { BRAND_COLOR_PRESETS } from "@/lib/brand-color-presets";
import { parseBrandColorHex } from "@/lib/brand-chrome";
import { clientChatContext } from "@/lib/client-context";
import { messageCreatedAtIso } from "@/lib/format-locale-datetime";
import { chatSseStream } from "@/lib/chat-sse";
import {
  applyChatSseEventToAssistantMessages,
  chatStreamComposerReadyEvent,
} from "@/lib/chat-stream-handlers";
import {
  productActionUserMessage,
  type ProductActionRequest,
} from "@/lib/product-card";
import { readAgentWidgetLogoUrl, resolveAgentLogoUrl } from "@/lib/agent-logo";
import { getOnboardingAgentName } from "@/lib/onboarding-state";
import { useResolvedOnboardingAgentId } from "@/lib/use-resolved-onboarding-agent-id";
import { useOnboardingIndexingStatus } from "@/lib/use-onboarding-indexing-status";
import { cn } from "@/lib/utils";
import { OnboardingFrame, OnboardingStepIndicator } from "@/components/onboarding/onboarding-frame";
import {
  AgentPreviewChatNotice,
} from "@/components/onboarding/agent-preview-chat-notice";
import {
  OnboardingMainColumn,
  onboardingSplitBody,
  onboardingSplitCardFilled,
  onboardingSplitGrid,
  onboardingSplitLeftSection,
  onboardingSplitPreviewWrap,
  onboardingSplitRightSection,
  onboardingSplitRoot,
  OnboardingStickyFooter,
} from "@/components/onboarding/onboarding-ui";
import type { ShopifyConnectionApi } from "@/components/integrations/use-shopify-connection";

type PreviewMessage = PlaygroundStyleChatMessage;

type AgentListRow = {
  id: string;
  name: string;
  behavior_settings?: Record<string, unknown> | null;
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
  const messageInputRef = useRef<HTMLTextAreaElement | null>(null);
  const stickToBottomRef = useRef(true);

  const [agentName, setAgentName] = useState(() => getOnboardingAgentName()?.trim() || "Your agent");
  const [behaviorSettings, setBehaviorSettings] = useState<Record<string, unknown> | null>(null);
  const [onboardingStatus, setOnboardingStatus] = useState<OnboardingStatusPayload | null>(null);
  const [shopify, setShopify] = useState<ShopifyConnectionApi | null>(null);
  const [askedRealQuestion, setAskedRealQuestion] = useState(false);
  const siteName = siteDisplayName(onboardingStatus);
  const siteUrl = onboardingStatus?.website_url ?? null;
  const siteIcon = faviconUrl(siteUrl);
  const previewLogoUrl = useMemo(
    () => resolveAgentLogoUrl(readAgentWidgetLogoUrl(behaviorSettings), siteIcon || null),
    [behaviorSettings, siteIcon]
  );
  const brandColorHex =
    parseBrandColorHex(
      typeof behaviorSettings?.brand_color === "string" ? behaviorSettings.brand_color : null,
    ) ?? BRAND_COLOR_PRESETS[0].hex;

  const showChatImportNotice =
    indexing.running || indexing.storageLimitReached || indexing.failed;

  const welcomeMessage = useMemo(() => {
    const who = agentName.trim() || "your support agent";
    if (indexing.storageLimitReached) {
      const capPhrase = indexing.storageLimitLabel ? `the ${indexing.storageLimitLabel} limit` : "your plan storage cap";
      return `Hi! I'm ${who}. Ask me something your customers would. We hit ${capPhrase}, so only part of ${siteName} was imported.`;
    }
    if (indexing.running) {
      return `Hi! I'm ${who}. Ask me something your customers would. We're still reading ${siteName}, so "I'm not sure" answers are normal until import finishes.`;
    }
    if (indexing.failed) {
      return `Hi! I'm ${who}. Site import hit a snag, but you can still try a question about ${siteName}.`;
    }
    return `Hi! I'm ${who}. Ask me something your customers would. I'll use what we know about ${siteName}.`;
  }, [agentName, siteName, indexing.running, indexing.failed, indexing.storageLimitReached, indexing.storageLimitLabel]);

  const [messages, setMessages] = useState<PreviewMessage[]>([]);

  useEffect(() => {
    setMessages([
      {
        from: "assistant",
        text: welcomeMessage,
        streamPhase: "done",
        createdAt: messageCreatedAtIso(),
      },
    ]);
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
        backendFetch<{ agents: AgentListRow[] }>("/api/v1/agents"),
        backendFetch<{ shopify: ShopifyConnectionApi }>(
          `/api/v1/agents/${encodeURIComponent(agentId)}/integrations/bootstrap?include_website_preview=false`
        ),
      ]);
      setOnboardingStatus(status);
      setShopify(bootstrap.shopify);
      const agent = agentsRes.agents.find((a) => a.id === agentId);
      if (agent?.name) setAgentName(agent.name);
      else {
        const savedName = getOnboardingAgentName()?.trim();
        if (savedName) setAgentName(savedName);
      }
      if (agent?.behavior_settings) setBehaviorSettings(agent.behavior_settings);
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

  const canSend = Boolean(agentId && input.trim() && !isSending);

  async function streamPreviewReply(
    userMessage: string,
    ac: AbortController,
    productAction?: ProductActionRequest
  ) {
    for await (const ev of chatSseStream("/api/chat/stream", {
      method: "POST",
      signal: ac.signal,
      body: JSON.stringify({
        agent_id: agentId,
        message: userMessage,
        conversation_id: conversationId,
        visitor_id: visitorIdRef.current,
        ...clientChatContext(),
        ...(productAction
          ? {
              product_action: {
                type: productAction.type,
                handle: productAction.handle,
                title: productAction.title ?? null,
              },
            }
          : {}),
      }),
    })) {
      if (ac.signal.aborted) break;
      if (ev.type === "done" && ev.conversation_id) {
        setConversationId(ev.conversation_id);
      }
      setMessages((prev) => {
        const next = applyChatSseEventToAssistantMessages(prev, ev, () => ({
          from: "assistant" as const,
          text: "",
          streamPhase: "thinking" as const,
          statusLine: null,
          createdAt: messageCreatedAtIso(),
        }));
        return next ?? prev;
      });
      if (ev.type === "done") {
        const reply = typeof ev.response === "string" ? ev.response.trim() : "";
        if (reply.length >= 8) setAskedRealQuestion(true);
      } else if (ev.type === "error") {
        throw new BackendApiError(ev.message ?? "Chat failed", 0, ev.code, ev.details);
      }
      if (chatStreamComposerReadyEvent(ev)) {
        setIsSending(false);
      }
    }
  }

  const runProductAction = useCallback(
    async (action: ProductActionRequest) => {
      if (!agentId || isSending) return;
      const userMessage = productActionUserMessage(action);
      setError(null);
      stickToBottomRef.current = true;
      setMessages((prev) => [...prev, { from: "user", text: userMessage, createdAt: messageCreatedAtIso() }]);
      setMessages((prev) => [
        ...prev,
        {
          from: "assistant",
          text: "",
          streamPhase: "thinking",
          statusLine: null,
          createdAt: messageCreatedAtIso(),
        },
      ]);
      setIsSending(true);
      chatAbortRef.current?.abort();
      const ac = new AbortController();
      chatAbortRef.current = ac;
      try {
        await streamPreviewReply(userMessage, ac, action);
      } catch (e) {
        if (ac.signal.aborted) return;
        const errMsg = e instanceof Error ? e.message : "Could not load product";
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
    },
    [agentId, conversationId, isSending]
  );

  async function handleSend(event: FormEvent) {
    event.preventDefault();
    if (!canSend || !agentId) return;
    const message = input.trim();
    setInput("");
    setError(null);
    stickToBottomRef.current = true;
    setMessages((prev) => [...prev, { from: "user", text: message, createdAt: messageCreatedAtIso() }]);
    setMessages((prev) => [
      ...prev,
      {
        from: "assistant",
        text: "",
        streamPhase: "thinking",
        statusLine: null,
        createdAt: messageCreatedAtIso(),
      },
    ]);
    setIsSending(true);
    chatAbortRef.current?.abort();
    const ac = new AbortController();
    chatAbortRef.current = ac;
    try {
      await streamPreviewReply(message, ac);
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
          primaryHref={appearanceToneHref}
          primaryLabel="Continue"
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
                    Ask questions your customers actually ask. This uses the same AI setup as the playground and
                    live widget.
                  </p>

                  <div className="mt-8 space-y-5 sm:mt-10">
                    <div className="border-ds-outline rounded-ds-lg border bg-white p-4 sm:p-5">
                      <p className="text-ds-on-surface mb-4 text-sm font-semibold">Launch checklist</p>
                      <ul className="space-y-3">
                        {checklist.map((item) => (
                          <li key={item.label} className="flex items-start gap-3">
                            <OnboardingStepIndicator completed={item.done} className="mt-0.5" />
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
                    {showChatImportNotice ? (
                      <AgentPreviewChatNotice snapshot={indexing} siteName={siteName} />
                    ) : null}
                  </div>
                </div>
              </section>

              <section
                className={cn(
                  onboardingSplitRightSection,
                  "items-center justify-center overflow-visible p-4 sm:p-6 lg:items-stretch lg:justify-center lg:overflow-visible lg:p-8",
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
                <div className={onboardingSplitPreviewWrap}>
                  <PlaygroundStyleChatPanel
                    agentName={agentName}
                    brandColorHex={brandColorHex}
                    behaviorSettings={behaviorSettings}
                    websiteLogoUrl={previewLogoUrl}
                    messages={messages}
                    isSending={isSending}
                    messageInput={input}
                    onMessageInputChange={setInput}
                    onSend={handleSend}
                    sendDisabled={!canSend}
                    composerPlaceholder={agentId ? "Test your agent…" : "Complete previous steps first"}
                    composerError={error}
                    messageInputRef={messageInputRef}
                    messagesScrollRef={messagesScrollRef}
                    onMessagesScroll={onMessagesScroll}
                    shellHeightClass="h-full max-h-[min(519px,calc(100dvh-11.4rem))] min-h-[17.96rem] w-full sm:min-h-[23.94rem] lg:max-h-[519px] lg:min-h-[519px]"
                    onShowProductDetails={(product) =>
                      void runProductAction({
                        type: "details",
                        handle: product.handle,
                        title: product.title,
                      })
                    }
                    onShowSimilarProducts={(product) =>
                      void runProductAction({
                        type: "similar",
                        handle: product.handle,
                        title: product.title,
                      })
                    }
                  />
                </div>
              </section>
            </div>
          </div>
        </div>
      </OnboardingMainColumn>
    </OnboardingFrame>
  );
}
