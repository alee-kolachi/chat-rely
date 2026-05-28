"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { backendFetch, BackendApiError } from "@/lib/backend-api";
import { fetchFirstUserAgent, isPlanAgentLimitError } from "@/lib/onboarding-resume";
import {
  getOnboardingAgentName,
  saveOnboardingAgentId,
  saveOnboardingAgentName,
} from "@/lib/onboarding-state";
import { useClientOnboardingAgentId } from "@/lib/use-client-onboarding-agent-id";
import { PromiseTimeoutError, withTimeout } from "@/lib/with-timeout";
import { CHAT_RELY_LOGO_PATH } from "@/components/branding/chat-rely-wordmark";
import { OnboardingFrame } from "@/components/onboarding/onboarding-frame";
import { cn } from "@/lib/utils";
import {
  OnboardingFieldRow,
  OnboardingInput,
  OnboardingMainColumn,
  onboardingSplitBody,
  onboardingSplitCardFilled,
  onboardingSplitGrid,
  onboardingSplitLeftSection,
  onboardingSplitPreviewShell,
  onboardingSplitPreviewWrap,
  onboardingSplitRightSectionCentered,
  onboardingSplitRoot,
  OnboardingStickyFooter,
} from "@/components/onboarding/onboarding-ui";

function deferAfterGesture(cb: () => void) {
  // Older iOS Safari versions may not expose queueMicrotask.
  if (typeof queueMicrotask === "function") {
    queueMicrotask(cb);
    return;
  }
  Promise.resolve().then(cb);
}

type Step1Issue = { kind: "auth" } | { kind: "message"; text: string };

const DEFAULT_AGENT_DISPLAY_NAME = "ChatRely Support Agent";

export default function OnboardingPage() {
  const router = useRouter();
  const storedAgentId = useClientOnboardingAgentId();
  const [agentName, setAgentName] = useState("");
  const [existingAgentId, setExistingAgentId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [step1Issue, setStep1Issue] = useState<Step1Issue | null>(null);
  const resumeHydratedRef = useRef(false);

  useEffect(() => {
    const savedName = getOnboardingAgentName();
    if (savedName) setAgentName(savedName);
  }, []);

  useEffect(() => {
    if (!storedAgentId || resumeHydratedRef.current) return;
    let cancelled = false;
    void (async () => {
      try {
        const agent = await backendFetch<{ id: string; name: string }>(`/api/v1/agents/${storedAgentId}`);
        if (cancelled) return;
        resumeHydratedRef.current = true;
        setExistingAgentId(agent.id);
        saveOnboardingAgentId(agent.id);
        setAgentName((prev) => prev.trim() || agent.name?.trim() || "");
        if (agent.name?.trim()) saveOnboardingAgentName(agent.name);
      } catch {
        if (!cancelled) resumeHydratedRef.current = true;
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [storedAgentId]);

  const handleAgentNameInput = (value: string) => {
    setAgentName(value);
    const trimmed = value.trim();
    if (trimmed) saveOnboardingAgentName(trimmed);
  };

  const previewAgentName = agentName.trim() || DEFAULT_AGENT_DISPLAY_NAME;
  const canContinue = agentName.trim().length > 0;

  function goToStep2(agentId: string) {
    saveOnboardingAgentId(agentId);
    if (agentName.trim()) saveOnboardingAgentName(agentName);
    deferAfterGesture(() => {
      router.push(`/onboarding/knowledge-base?agentId=${encodeURIComponent(agentId)}`);
    });
  }

  async function continueWithExistingAgent(agentId: string) {
    const trimmed = agentName.trim();
    if (!trimmed) return;
    saveOnboardingAgentName(trimmed);
    saveOnboardingAgentId(agentId);
    try {
      await withTimeout(
        backendFetch(`/api/v1/agents/${agentId}`, {
          method: "PATCH",
          body: JSON.stringify({ name: trimmed }),
        }),
        12_000
      );
    } catch {
      /* name patch is best-effort; agent may already match */
    }
    goToStep2(agentId);
  }

  function isRecoverableOnboardingNetworkError(e: unknown): boolean {
    if (e instanceof BackendApiError) return false;
    if (e instanceof TypeError) return true;
    if (e instanceof DOMException && e.name === "AbortError") return true;
    const message = e instanceof Error ? e.message : String(e);
    return (
      message.includes("Failed to fetch") ||
      message.includes("NetworkError") ||
      message.includes("Load failed") ||
      message.includes("ECONNREFUSED") ||
      message.includes("Network request failed")
    );
  }

  async function resolveResumeAgentId(): Promise<string | null> {
    if (existingAgentId) return existingAgentId;
    if (!storedAgentId) return null;
    try {
      const agent = await backendFetch<{ id: string }>(`/api/v1/agents/${storedAgentId}`);
      return agent.id;
    } catch {
      return null;
    }
  }

  async function bestEffortCreateAgent() {
    if (!canContinue || isSubmitting) return;
    setIsSubmitting(true);
    setStep1Issue(null);

    const resumeId = await resolveResumeAgentId();
    if (resumeId) {
      try {
        setExistingAgentId(resumeId);
        await continueWithExistingAgent(resumeId);
        return;
      } catch (e) {
        const message = e instanceof Error ? e.message : "Failed to continue setup";
        setStep1Issue({ kind: "message", text: message });
        return;
      } finally {
        setIsSubmitting(false);
      }
    }

    const slug =
      agentName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 100) || "";
    try {
      const created = await withTimeout(
        backendFetch<{ agent_id: string }>("/api/v1/onboarding/start", {
          method: "POST",
          body: JSON.stringify({
            name: agentName.trim(),
            slug: slug || undefined,
          }),
        }),
        12_000
      );
      goToStep2(created.agent_id);
    } catch (e) {
      let err: unknown = e;
      if (isPlanAgentLimitError(err)) {
        const resumeId = storedAgentId ?? (await fetchFirstUserAgent())?.id ?? null;
        if (resumeId) {
          setExistingAgentId(resumeId);
          try {
            await continueWithExistingAgent(resumeId);
            return;
          } catch (resumeErr) {
            err = resumeErr;
          }
        }
      }
      if (err instanceof BackendApiError && err.status === 409 && !isPlanAgentLimitError(err)) {
        const retrySlug = `${slug || "agent"}-${Date.now().toString(36)}`.slice(0, 120);
        try {
          const created = await withTimeout(
            backendFetch<{ agent_id: string }>("/api/v1/onboarding/start", {
              method: "POST",
              body: JSON.stringify({
                name: agentName.trim(),
                slug: retrySlug,
              }),
            }),
            12_000
          );
          goToStep2(created.agent_id);
          return;
        } catch (e2) {
          err = e2;
        }
      }
      const message = err instanceof Error ? err.message : "Failed to create agent";
      const unauthenticated =
        message.includes("No authenticated session") ||
        (err instanceof BackendApiError && (err.status === 401 || err.status === 403));
      const timedOut = err instanceof PromiseTimeoutError;
      const recoverable = isRecoverableOnboardingNetworkError(err);

      if (unauthenticated) {
        setStep1Issue({ kind: "auth" });
        return;
      }
      if (timedOut) {
        setStep1Issue({
          kind: "message",
          text: "That took too long. Check your connection and try again.",
        });
        return;
      }
      if (recoverable) {
        setStep1Issue({
          kind: "message",
          text: `Could not reach the server (${message}). Check your connection and that the API is running, then try again.`,
        });
        return;
      }
      setStep1Issue({ kind: "message", text: message });
      return;
    } finally {
      setIsSubmitting(false);
    }
  }

  const stepFooter = (
    <OnboardingStickyFooter
      primaryAsButton
      onPrimaryClick={() => {
        void bestEffortCreateAgent();
      }}
      primaryDisabled={!canContinue || isSubmitting}
      primaryPending={isSubmitting}
      primaryLabel="Continue"
    />
  );

  return (
    <OnboardingFrame
      activeItem="Agent Name"
      stepLabel="Step 1 of 5"
      linkAgentId={existingAgentId ?? storedAgentId}
      footer={stepFooter}
    >
      <OnboardingMainColumn className={cn(onboardingSplitRoot, "max-lg:pb-28")}>
        <div className={onboardingSplitBody}>
          <div
            className="pointer-events-none absolute inset-0 -z-10 rounded-[36px] opacity-80"
            style={{
              background:
                "radial-gradient(circle at 15% 20%, rgba(124,58,237,0.16), transparent 36%), radial-gradient(circle at 85% 80%, rgba(236,72,153,0.12), transparent 40%), linear-gradient(180deg, rgba(250,248,255,0.92), rgba(246,242,255,0.7))",
            }}
            aria-hidden
          />
          <div className={onboardingSplitCardFilled}>
            <div className={onboardingSplitGrid}>
            <section className={onboardingSplitLeftSection}>
              <div>
                <p className="text-ds-on-surface-variant mb-3 text-[11px] font-semibold tracking-[0.18em] uppercase">
                  Step 1
                </p>
                <h1 className="text-ds-on-surface text-2xl font-semibold tracking-tight sm:text-3xl lg:text-[2rem]">
                  Build your first <span className="text-ds-primary font-bold">AI support agent</span>
                </h1>

                <form
                  className="mt-8 space-y-6 sm:mt-10"
                  onSubmit={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    void bestEffortCreateAgent();
                  }}
                >
                  <OnboardingFieldRow
                    id="agent-name"
                    label="Agent name"
                    labelClassName="mb-2 text-[14px] leading-[14px] font-medium"
                  >
                    <OnboardingInput
                      id="agent-name"
                      type="text"
                      value={agentName}
                      onChange={(e) => handleAgentNameInput(e.currentTarget.value)}
                      onInput={(e) => handleAgentNameInput((e.target as HTMLInputElement).value)}
                      placeholder={DEFAULT_AGENT_DISPLAY_NAME}
                      autoComplete="off"
                      className="py-3.5 font-normal"
                    />
                  </OnboardingFieldRow>
                  {step1Issue ? (
                    <div className="border-ds-outline rounded-ds-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
                      {step1Issue.kind === "auth" ? (
                        <p>
                          You need to be signed in to create an agent.{" "}
                          <Link href="/login" className="font-semibold text-rose-950 underline underline-offset-2">
                            Sign in
                          </Link>{" "}
                          and try Continue again.
                        </p>
                      ) : (
                        <p>{step1Issue.text}</p>
                      )}
                    </div>
                  ) : null}
                </form>
              </div>
            </section>

            <section className={onboardingSplitRightSectionCentered}>
              <div
                className="pointer-events-none absolute inset-0 opacity-35"
                style={{
                  backgroundImage: "radial-gradient(color-mix(in srgb, var(--ds-on-surface-variant) 22%, transparent) 1px, transparent 1px)",
                  backgroundSize: "20px 20px",
                }}
                aria-hidden
              />
              <div className={onboardingSplitPreviewWrap}>
                <div className={cn(onboardingSplitPreviewShell, "h-full min-h-0 flex-1")}>
                  <div className="border-ds-outline flex items-center justify-between border-b bg-white px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-black/5 bg-white">
                        {/* eslint-disable-next-line @next/next/no-img-element -- static brand mark */}
                        <img
                          src={CHAT_RELY_LOGO_PATH}
                          alt=""
                          className="size-7 object-contain"
                          width={28}
                          height={28}
                        />
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-ds-on-surface truncate text-sm font-semibold">
                          {previewAgentName}
                        </h3>
                        <p className="text-ds-secondary text-[11px]">Online</p>
                      </div>
                    </div>
                    <div className="text-ds-on-surface-variant flex items-center gap-2 text-sm">
                      <span aria-hidden>⋮</span>
                      <span aria-hidden>×</span>
                    </div>
                  </div>

                  <div
                    className="chat-preview-surface min-h-0 flex-1"
                    style={{
                      background:
                        "linear-gradient(165deg, rgba(250,245,255,0.9) 0%, rgba(243,232,255,0.82) 45%, rgba(252,231,243,0.8) 100%)",
                    }}
                  >
                    <div className="flex h-full flex-col justify-end gap-4 p-4">
                      <div className="relative max-w-[86%] rounded-2xl bg-white p-4 shadow-sm">
                        <p className="text-ds-on-surface-variant text-[14px] leading-relaxed">
                          Hey there! I&apos;m {previewAgentName}. I can help customers discover
                          products, shipping details, and instant recommendations.
                        </p>
                        <span className="text-ds-on-surface-variant/50 absolute right-3 bottom-2 text-[10px]">9:01 PM</span>
                      </div>
                      <div className="flex justify-end">
                        <div className="bg-ds-primary text-ds-on-primary chat-turn1-user relative rounded-2xl rounded-tr-sm px-3 py-2 pb-5 text-[14px] leading-relaxed">
                          What are your shipping options?
                          <span className="text-ds-on-primary/70 absolute right-3 bottom-1 text-[10px]">9:02 PM</span>
                        </div>
                      </div>
                      <div className="flex">
                        <div className="text-ds-on-surface-variant chat-turn1-bot border-ds-outline relative rounded-2xl rounded-tl-sm border bg-white px-3 py-2 pb-5 text-[14px] leading-relaxed">
                          We offer standard, express, and next-day shipping in most regions.
                          <span className="text-ds-on-surface-variant/50 absolute right-3 bottom-1 text-[10px]">9:02 PM</span>
                        </div>
                      </div>

                      <div className="flex justify-end">
                        <div className="bg-ds-primary text-ds-on-primary chat-turn2-user relative rounded-2xl rounded-tr-sm px-3 py-2 pb-5 text-[14px] leading-relaxed">
                          Can I track my order status?
                          <span className="text-ds-on-primary/70 absolute right-3 bottom-1 text-[10px]">9:03 PM</span>
                        </div>
                      </div>
                      <div className="flex">
                        <div className="text-ds-on-surface-variant chat-turn2-bot border-ds-outline relative rounded-2xl rounded-tl-sm border bg-white px-3 py-2 pb-5 text-[14px] leading-relaxed">
                          Yes. As soon as your order ships, you get a tracking link by email.
                          <span className="text-ds-on-surface-variant/50 absolute right-3 bottom-1 text-[10px]">9:03 PM</span>
                        </div>
                      </div>
                    </div>
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
