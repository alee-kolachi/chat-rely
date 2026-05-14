"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { backendFetch } from "@/lib/backend-api";
import { useResolvedOnboardingAgentId } from "@/lib/use-resolved-onboarding-agent-id";
import { OnboardingFrame } from "@/components/onboarding/onboarding-frame";
import { brandChromeClasses } from "@/lib/brand-chrome";
import { cn } from "@/lib/utils";
import {
  OnboardingFieldRow,
  OnboardingInput,
  OnboardingMainColumn,
  onboardingSplitBody,
  onboardingSplitCard,
  onboardingSplitGrid,
  onboardingSplitRootStretch,
  OnboardingStickyFooter,
} from "@/components/onboarding/onboarding-ui";

const toneOptions = ["Friendly", "Professional", "Concise"] as const;
const colorOptions = ["#000000", "#FB923C", "#F472B6", "#3B82F6", "#10B981", "#6366F1"] as const;

export default function AppearanceToneOnboardingPage() {
  const router = useRouter();
  const [tone, setTone] = useState<(typeof toneOptions)[number]>("Friendly");
  const [hex, setHex] = useState("000000");
  const [selectedColor, setSelectedColor] = useState(0);
  const [model, setModel] = useState("gpt-4o");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const agentId = useResolvedOnboardingAgentId();

  const agentPreviewBackHref = useMemo(() => {
    const path = "/onboarding/agent-preview";
    if (!agentId) return path;
    return `${path}?agentId=${encodeURIComponent(agentId)}`;
  }, [agentId]);

  const previewAssistantMessage = useMemo(() => {
    if (tone === "Professional") return "Hello— how may I assist you today?";
    if (tone === "Concise") return "Hi. What do you need?";
    return "Thanks for reaching out— how can I help?";
  }, [tone]);

  const previewBrandColor = useMemo(() => {
    const cleaned = hex.replace(/[^0-9A-Fa-f]/g, "").slice(0, 6);
    if (cleaned.length === 6) return `#${cleaned.toUpperCase()}`;
    return colorOptions[selectedColor];
  }, [hex, selectedColor]);

  const previewBrandChrome = useMemo(() => brandChromeClasses(previewBrandColor), [previewBrandColor]);

  async function handleContinue() {
    if (!agentId || isSaving) return;
    setIsSaving(true);
    setError(null);
    try {
      await backendFetch(`/api/v1/agents/${agentId}`, {
        method: "PATCH",
        body: JSON.stringify({
          model,
          behavior_settings: {
            tone,
            brand_color: `#${hex.toUpperCase()}`,
            widget_position: "bottom_right",
          },
        }),
      });
      router.push(`/onboarding/pricing?agentId=${encodeURIComponent(agentId)}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save appearance settings");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <OnboardingFrame
      activeItem="Appearance & Tone"
      completedItems={["Agent Name", "Knowledge Base", "Connection", "Agent Preview"]}
      stepLabel="Step 5 of 5"
      linkAgentId={agentId}
      footer={
        <OnboardingStickyFooter
          backHref={agentPreviewBackHref}
          backLabel="Back"
          primaryAsButton
          onPrimaryClick={handleContinue}
          primaryDisabled={!agentId}
          primaryPending={isSaving}
          primaryLabel={isSaving ? "Saving..." : "Continue"}
        />
      }
    >
      <OnboardingMainColumn className={onboardingSplitRootStretch}>
        <div className={onboardingSplitBody}>
          <div
            className="pointer-events-none absolute inset-0 -z-10 rounded-[36px] opacity-80"
            style={{
              background:
                "radial-gradient(circle at 14% 18%, rgba(99,102,241,0.16), transparent 36%), radial-gradient(circle at 86% 78%, rgba(244,114,182,0.12), transparent 40%), linear-gradient(180deg, rgba(250,245,255,0.94), rgba(241,245,249,0.75))",
            }}
            aria-hidden
          />

          <div className={cn(onboardingSplitCard, "flex flex-col max-lg:flex-none lg:min-h-0 lg:flex-1")}>
            <div className={onboardingSplitGrid}>
              <section className="flex flex-col overflow-visible p-6 sm:p-8 max-lg:min-h-min lg:h-full lg:min-h-0 lg:overflow-y-auto lg:overscroll-y-auto lg:p-10">
                <div>
                  <p className="text-ds-on-surface-variant mb-3 text-[11px] font-semibold tracking-[0.18em] uppercase">
                    Step 5
                  </p>
                  <h1 className="text-ds-on-surface text-2xl font-semibold tracking-tight sm:text-3xl lg:text-[2rem]">
                    <span className="text-ds-primary font-bold">Appearance</span> and tone
                  </h1>
                  <p className="text-ds-on-surface-variant mt-2 text-sm leading-relaxed">
                    Choose how the agent sounds and how the widget looks on your site. Changes show in the live preview
                    below (or beside on larger screens).
                  </p>

                  <div className="mt-8 space-y-5 sm:mt-10">
                    <div className="border-ds-outline rounded-ds-lg border bg-white p-4 sm:p-5">
                      <OnboardingFieldRow
                        id="model"
                        label="Model"
                        labelClassName="mb-2 text-[14px] leading-[14px] font-medium"
                        hint="Higher capability can increase latency and cost."
                      >
                        <select
                          id="model"
                          className="border-ds-outline focus:border-ds-primary focus:ring-ds-primary/15 w-full appearance-none rounded-ds-md border bg-white px-4 py-3 text-sm outline-none focus:ring-2"
                          value={model}
                          onChange={(e) => setModel(e.target.value)}
                        >
                          <option value="gpt-4o">GPT-4o (recommended)</option>
                          <option value="gpt-4o-mini">GPT-4o mini</option>
                          <option value="gpt-3.5">GPT-3.5 Turbo</option>
                        </select>
                      </OnboardingFieldRow>
                    </div>

                    <div className="border-ds-outline rounded-ds-lg border bg-white p-4 sm:p-5">
                      <p className="text-ds-on-surface mb-1 text-sm font-semibold">Tone</p>
                      <p className="text-ds-on-surface-variant mb-3 text-xs leading-relaxed">
                        Sets default phrasing style for customer-facing replies.
                      </p>
                      <div className="bg-ds-sidebar flex flex-col gap-1 rounded-ds-md border border-ds-outline p-1 sm:flex-row sm:gap-0">
                        {toneOptions.map((t) => (
                          <button
                            key={t}
                            type="button"
                            onClick={() => setTone(t)}
                            className={`touch-manipulation w-full rounded-ds-sm px-3 py-3 text-sm font-medium transition-all sm:flex-1 sm:py-2 ${
                              tone === t
                                ? "bg-white text-ds-on-surface shadow-sm"
                                : "text-ds-on-surface-variant hover:text-ds-on-surface"
                            }`}
                          >
                            {t}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="border-ds-outline rounded-ds-lg border bg-white p-4 sm:p-5">
                      <p className="text-ds-on-surface mb-1 text-sm font-semibold">Brand color</p>
                      <p className="text-ds-on-surface-variant mb-4 text-xs leading-relaxed">
                        Used for accents in the widget and launcher.
                      </p>
                      <div className="flex flex-wrap items-center gap-2">
                        {colorOptions.map((color, index) => (
                          <button
                            key={color}
                            type="button"
                            onClick={() => {
                              setSelectedColor(index);
                              setHex(color.replace("#", "").toUpperCase().slice(0, 6));
                            }}
                            aria-label={`Color ${color}`}
                            className={`touch-manipulation size-11 rounded-full border-2 transition-transform hover:scale-105 sm:size-10 ${
                              selectedColor === index
                                ? "border-ds-primary ring-2 ring-ds-primary/25 ring-offset-2"
                                : "border-transparent"
                            }`}
                            style={{ backgroundColor: color }}
                          />
                        ))}
                        <div className="border-ds-outline ml-1 flex items-center overflow-hidden rounded-ds-md border">
                          <span className="text-ds-on-surface-variant px-2 font-mono text-xs">#</span>
                          <OnboardingInput
                            value={hex}
                            onChange={(e) => setHex(e.target.value.replace(/[^0-9A-Fa-f]/g, "").slice(0, 6))}
                            className="w-24 border-0 py-2 font-mono text-xs uppercase focus:ring-0"
                            aria-label="Hex color"
                          />
                        </div>
                      </div>
                    </div>

                    {error ? <p className="text-sm font-medium text-rose-600">{error}</p> : null}
                  </div>
                </div>
              </section>

              <section className="bg-ds-sidebar border-ds-outline relative flex flex-col overflow-visible border-t p-6 sm:p-8 max-lg:min-h-min lg:h-full lg:min-h-0 lg:items-center lg:justify-center lg:overflow-y-auto lg:overscroll-y-auto lg:border-t-0 lg:border-l lg:p-10">
                <div
                  className="pointer-events-none absolute inset-0 opacity-35"
                  style={{
                    backgroundImage:
                      "radial-gradient(color-mix(in srgb, var(--ds-on-surface-variant) 22%, transparent) 1px, transparent 1px)",
                    backgroundSize: "20px 20px",
                  }}
                  aria-hidden
                />
                <div className="relative z-[1] mx-auto flex w-full max-w-[400px] flex-col items-center pb-2">
                  <div
                    role="region"
                    aria-label="Chat widget"
                    className="border-ds-outline flex min-h-[14rem] w-full max-w-[340px] flex-col overflow-hidden rounded-2xl border bg-white shadow-xl sm:min-h-[20rem] lg:min-h-[420px]"
                  >
                    <div
                      className="flex shrink-0 items-center gap-2 px-4 py-3"
                      style={{ backgroundColor: previewBrandColor }}
                    >
                      <span
                        className={`size-2 shrink-0 rounded-full shadow-sm ${previewBrandChrome.dotClass}`}
                        aria-hidden
                      />
                      <span className={`text-sm font-semibold ${previewBrandChrome.titleClass}`}>Chat</span>
                    </div>
                    <div className="min-h-0 flex-1 overflow-y-auto bg-ds-sidebar p-3">
                      <div className="border-ds-outline rounded-2xl rounded-tl-sm border bg-white px-3 py-2.5 text-xs leading-relaxed text-ds-on-surface">
                        {previewAssistantMessage}
                      </div>
                    </div>
                    <div className="border-ds-outline shrink-0 border-t bg-white px-3 py-2.5">
                      <div className="rounded-ds-md border border-ds-outline bg-ds-sidebar px-3 py-2 text-xs text-ds-on-surface-variant">
                        Write a message…
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 flex w-full max-w-[340px] justify-end">
                    <div
                      className={`pointer-events-none flex size-14 items-center justify-center rounded-full border border-black/10 text-xl shadow-[0_10px_25px_rgba(15,23,42,0.22)] ring-4 ring-white ${previewBrandChrome.fabIconClass}`}
                      style={{ backgroundColor: previewBrandColor }}
                      aria-hidden
                    >
                      💬
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
