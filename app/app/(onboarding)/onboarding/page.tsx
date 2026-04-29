"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { backendFetch } from "@/lib/backend-api";
import { saveOnboardingAgentId } from "@/lib/onboarding-state";
import { OnboardingFrame } from "@/components/onboarding/onboarding-frame";
import {
  OnboardingFieldRow,
  OnboardingInput,
  OnboardingMainColumn,
  OnboardingStickyFooter,
} from "@/components/onboarding/onboarding-ui";

export default function OnboardingPage() {
  const router = useRouter();
  const [agentName, setAgentName] = useState("Aria");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const previewInitial = useMemo(() => {
    const value = agentName.trim();
    if (!value) return "A";
    return value.charAt(0).toUpperCase();
  }, [agentName]);

  const canContinue = agentName.trim().length > 0;

  async function handleContinue() {
    if (!canContinue || isSaving) return;
    setIsSaving(true);
    setError(null);
    try {
      const slug = agentName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 120);
      const created = await backendFetch<{ id: string }>("/api/v1/agents", {
        method: "POST",
        body: JSON.stringify({
          name: agentName.trim(),
          slug: slug || undefined,
        }),
      });
      saveOnboardingAgentId(created.id);
      const next = new URLSearchParams({ agentId: created.id });
      router.push(`/onboarding/knowledge-base?${next.toString()}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create agent");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <OnboardingFrame activeItem="Agent Name" stepLabel="Step 1 of 6">
      <OnboardingMainColumn className="max-w-6xl flex h-full items-center pt-3 pb-24 md:pt-4 md:pb-28">
        <div className="relative flex h-full w-full min-h-0 items-center">
          <div
            className="pointer-events-none absolute inset-0 -z-10 rounded-[36px] opacity-80"
            style={{
              background:
                "radial-gradient(circle at 15% 20%, rgba(124,58,237,0.16), transparent 36%), radial-gradient(circle at 85% 80%, rgba(236,72,153,0.12), transparent 40%), linear-gradient(180deg, rgba(250,248,255,0.92), rgba(246,242,255,0.7))",
            }}
            aria-hidden
          />
          <div className="border-ds-outline h-full w-full overflow-hidden rounded-[28px] border bg-white shadow-[0_20px_55px_rgba(15,23,42,0.06)]">
          <div className="grid h-full lg:grid-cols-2">
            <section className="flex h-full min-h-0 flex-col justify-center p-6 sm:p-8 lg:p-10">
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

            <section className="bg-ds-sidebar border-ds-outline relative flex h-full min-h-0 items-center justify-center border-t p-6 sm:p-8 lg:border-t-0 lg:border-l lg:p-10">
              <div
                className="pointer-events-none absolute inset-0 opacity-35"
                style={{
                  backgroundImage: "radial-gradient(color-mix(in srgb, var(--ds-on-surface-variant) 22%, transparent) 1px, transparent 1px)",
                  backgroundSize: "20px 20px",
                }}
                aria-hidden
              />
              <div className="relative mx-auto w-full max-w-[400px]">
                <div className="border-ds-outline flex min-h-[500px] flex-col overflow-hidden rounded-2xl border bg-ds-surface shadow-xl">
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
                    className="chat-preview-surface flex-1"
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
      </OnboardingMainColumn>

      <OnboardingStickyFooter
        primaryAsButton
        onPrimaryClick={() => void handleContinue()}
        primaryDisabled={!canContinue || isSaving}
        primaryLabel={isSaving ? "Saving..." : "Continue"}
      />
    </OnboardingFrame>
  );
}
