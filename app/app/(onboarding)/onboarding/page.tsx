"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { backendFetch, BackendApiError } from "@/lib/backend-api";
import { saveOnboardingAgentId } from "@/lib/onboarding-state";
import { PromiseTimeoutError, withTimeout } from "@/lib/with-timeout";
import { OnboardingFrame } from "@/components/onboarding/onboarding-frame";
import { cn } from "@/lib/utils";
import {
  OnboardingFieldRow,
  OnboardingInput,
  OnboardingMainColumn,
  onboardingSplitBody,
  onboardingSplitCard,
  onboardingSplitGrid,
  onboardingSplitRoot,
  OnboardingStickyFooter,
} from "@/components/onboarding/onboarding-ui";

/** `crypto.randomUUID()` throws outside a secure context (e.g. http://LAN-IP on a phone). */
function createDemoAgentSuffix(): string {
  try {
    if (globalThis.isSecureContext && typeof globalThis.crypto?.randomUUID === "function") {
      return globalThis.crypto.randomUUID();
    }
  } catch {
    /* fall through */
  }
  if (process.env.NODE_ENV === "development") {
    console.warn("[onboarding] demo agent id: non-secure context or randomUUID unavailable; using fallback");
  }
  return `${Date.now().toString(36)}-${Math.random().toString(16).slice(2, 12)}`;
}

export default function OnboardingPage() {
  const router = useRouter();
  const [agentName, setAgentName] = useState("Aria");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const continueBusyRef = useRef(false);

  const canContinue = agentName.trim().length > 0;

  function goToStep2(agentId: string) {
    saveOnboardingAgentId(agentId);
    const next = new URLSearchParams({ agentId });
    router.push(`/onboarding/knowledge-base?${next.toString()}`);
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

  async function handleContinue() {
    if (!canContinue || continueBusyRef.current) return;
    continueBusyRef.current = true;
    // Defer disabling the control until after this gesture's click/touchend cycle (iOS can drop the click if disabled mid-sequence).
    queueMicrotask(() => setIsSaving(true));
    setError(null);
    const slug =
      agentName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 100) || "";
    try {
      const created = await withTimeout(
        backendFetch<{ id: string }>("/api/v1/agents", {
          method: "POST",
          body: JSON.stringify({
            name: agentName.trim(),
            slug: slug || undefined,
          }),
        }),
        12_000
      );
      goToStep2(created.id);
    } catch (e) {
      let err: unknown = e;
      if (err instanceof BackendApiError && err.status === 409) {
        const retrySlug = `${slug || "agent"}-${Date.now().toString(36)}`.slice(0, 120);
        try {
          const created = await withTimeout(
            backendFetch<{ id: string }>("/api/v1/agents", {
              method: "POST",
              body: JSON.stringify({
                name: agentName.trim(),
                slug: retrySlug,
              }),
            }),
            12_000
          );
          goToStep2(created.id);
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
      const useDemo =
        unauthenticated ||
        timedOut ||
        isRecoverableOnboardingNetworkError(err);
      if (useDemo) {
        if (process.env.NODE_ENV === "development") {
          console.warn("[onboarding] continuing with demo agent", { reason: message, timedOut });
        }
        goToStep2(`demo-${createDemoAgentSuffix()}`);
        return;
      }
      setError(message);
    } finally {
      continueBusyRef.current = false;
      setIsSaving(false);
    }
  }

  const stepFooter = (
    <OnboardingStickyFooter
      primaryAsButton
      onPrimaryClick={() => void handleContinue()}
      primaryDisabled={!canContinue}
      primaryPending={isSaving}
      primaryLabel={isSaving ? "Saving..." : "Continue"}
      tertiary={
        error ? (
          <p role="alert" className="text-rose-600 text-center text-xs font-medium leading-snug sm:max-w-md sm:text-left">
            {error}
          </p>
        ) : null
      }
    />
  );

  return (
    <OnboardingFrame
      activeItem="Agent Name"
      stepLabel="Step 1 of 6"
      footer={<div className="hidden w-full lg:block">{stepFooter}</div>}
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
          <div className={onboardingSplitCard}>
            <div className={onboardingSplitGrid}>
            <section className="flex flex-col justify-center p-6 sm:p-8 max-lg:min-h-min lg:min-h-0 lg:h-full lg:p-10">
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
                    void handleContinue();
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
                      onChange={(e) => setAgentName(e.target.value)}
                      placeholder="e.g. Aria, Luna, Support Bot"
                      autoComplete="off"
                      className="py-3.5 font-normal"
                    />
                  </OnboardingFieldRow>
                </form>
                {error ? <p className="mt-6 text-sm font-medium text-rose-600">{error}</p> : null}
              </div>
            </section>

            <section className="bg-ds-sidebar border-ds-outline relative flex flex-col items-center justify-center border-t p-6 sm:p-8 max-lg:min-h-min lg:min-h-0 lg:h-full lg:border-t-0 lg:border-l lg:p-10">
              <div
                className="pointer-events-none absolute inset-0 opacity-35"
                style={{
                  backgroundImage: "radial-gradient(color-mix(in srgb, var(--ds-on-surface-variant) 22%, transparent) 1px, transparent 1px)",
                  backgroundSize: "20px 20px",
                }}
                aria-hidden
              />
              <div className="relative mx-auto w-full max-w-[400px]">
                <div className="border-ds-outline flex min-h-[18rem] w-full flex-col overflow-hidden rounded-2xl border bg-ds-surface shadow-xl sm:min-h-[24rem] lg:min-h-[500px]">
                  <div className="border-ds-outline flex items-center justify-between border-b bg-white px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="bg-ds-primary text-ds-on-primary flex size-10 items-center justify-center rounded-xl text-base">
                        ✦
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-ds-on-surface truncate text-sm font-semibold">
                          {agentName.trim() || "Shopping AI Agent"}
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
                          Hey there! I&apos;m {agentName.trim() || "your AI assistant"}. I can help customers discover
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
        <style jsx>{`
          .chat-turn1-user,
          .chat-turn1-bot,
          .chat-turn2-user,
          .chat-turn2-bot {
            opacity: 0;
            transform: translateY(6px);
          }
          .chat-turn1-user {
            animation: phase-1-user 11s ease-in-out infinite;
          }
          .chat-turn1-bot {
            animation: phase-1-bot 11s ease-in-out infinite;
          }
          .chat-turn2-user {
            animation: phase-2-user 11s ease-in-out infinite;
          }
          .chat-turn2-bot {
            animation: phase-2-bot 11s ease-in-out infinite;
          }
          @keyframes phase-1-user {
            0%,
            10% {
              opacity: 0;
              transform: translateY(6px);
            }
            14%,
            100% {
              opacity: 1;
              transform: translateY(0);
            }
          }
          @keyframes phase-1-bot {
            0%,
            30% {
              opacity: 0;
              transform: translateY(6px);
            }
            36%,
            100% {
              opacity: 1;
              transform: translateY(0);
            }
          }
          @keyframes phase-2-user {
            0%,
            46% {
              opacity: 0;
              transform: translateY(6px);
            }
            54%,
            100% {
              opacity: 1;
              transform: translateY(0);
            }
          }
          @keyframes phase-2-bot {
            0%,
            66% {
              opacity: 0;
              transform: translateY(6px);
            }
            74%,
            100% {
              opacity: 1;
              transform: translateY(0);
            }
          }
        `}</style>

        {/* Below lg: footer lives inside the scroll layer so iOS/WebKit does not mis-hit-test it against transformed preview content. lg+ matches original docked footer. */}
        <div className="sticky bottom-0 z-[80] -mx-4 lg:hidden">{stepFooter}</div>
      </OnboardingMainColumn>
    </OnboardingFrame>
  );
}
