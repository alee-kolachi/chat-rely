"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { backendFetch } from "@/lib/backend-api";
import { getOnboardingAgentId } from "@/lib/onboarding-state";
import { OnboardingFrame } from "@/components/onboarding/onboarding-frame";
import {
  OnboardingFieldRow,
  OnboardingInput,
  OnboardingMainColumn,
  OnboardingPageHeader,
  OnboardingSectionCard,
  OnboardingStickyFooter,
  onboardingType,
} from "@/components/onboarding/onboarding-ui";

const toneOptions = ["Friendly", "Professional", "Concise"] as const;
const colorOptions = ["#000000", "#FB923C", "#F472B6", "#3B82F6", "#10B981", "#6366F1"] as const;

export default function AppearanceToneOnboardingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [tone, setTone] = useState<(typeof toneOptions)[number]>("Friendly");
  const [hex, setHex] = useState("000000");
  const [selectedColor, setSelectedColor] = useState(0);
  const [model, setModel] = useState("gpt-4o");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const agentId = searchParams.get("agentId") ?? getOnboardingAgentId();

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
      router.push(`/onboarding/agent-preview?agentId=${encodeURIComponent(agentId)}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save appearance settings");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <OnboardingFrame
      activeItem="Appearance & Tone"
      completedItems={["Agent Name", "Knowledge Base", "Connection"]}
      stepLabel="Step 4 of 6"
    >
      <div className="mx-auto grid w-full max-w-6xl gap-8 px-4 pb-24 pt-8 md:grid-cols-12 md:gap-10 md:px-8 md:pb-28 md:pt-10">
        <div className="md:col-span-7">
          <OnboardingMainColumn className="max-w-none px-0 pb-0 pt-0">
            <OnboardingPageHeader
              kicker="Step 4 · Experience"
              title="Appearance and tone"
              subtitle="Choose how the agent sounds and how the widget looks on your site. Preview updates on the right."
            />

            <OnboardingSectionCard className="mb-6">
              <OnboardingFieldRow id="model" label="Model" hint="Higher capability can increase latency and cost.">
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
            </OnboardingSectionCard>

            <OnboardingSectionCard className="mb-6">
              <p className={onboardingType.sectionLabel}>Tone</p>
              <p className={`${onboardingType.hint} mb-3`}>Sets default phrasing style for customer-facing replies.</p>
              <div className="bg-ds-sidebar flex rounded-ds-md border border-ds-outline p-1">
                {toneOptions.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTone(t)}
                    className={`flex-1 rounded-ds-sm px-3 py-2 text-sm font-medium transition-all ${
                      tone === t
                        ? "bg-white text-ds-on-surface shadow-sm"
                        : "text-ds-on-surface-variant hover:text-ds-on-surface"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </OnboardingSectionCard>

            <OnboardingSectionCard>
              <p className={onboardingType.sectionLabel}>Brand color</p>
              <p className={`${onboardingType.hint} mb-4`}>Used for accents in the widget and launcher.</p>
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
                    className={`size-10 rounded-full border-2 transition-transform hover:scale-105 ${
                      selectedColor === index ? "border-ds-primary ring-2 ring-ds-primary/25 ring-offset-2" : "border-transparent"
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

              <p className={`${onboardingType.sectionLabel} mt-8`}>Widget position</p>
              <p className={`${onboardingType.hint} mb-3`}>Where the launcher appears on the storefront.</p>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  className="border-ds-outline hover:border-ds-primary/50 rounded-ds-lg border bg-ds-sidebar/50 p-3 text-left transition-colors"
                >
                  <div className="border-ds-outline relative mb-2 aspect-video rounded-ds-sm border bg-white">
                    <span className="bg-ds-primary absolute bottom-2 left-2 size-3 rounded-full" />
                  </div>
                  <span className="text-xs font-medium text-ds-on-surface">Bottom left</span>
                </button>
                <button
                  type="button"
                  className="border-ds-primary ring-ds-primary/15 rounded-ds-lg border bg-white p-3 text-left ring-2"
                >
                  <div className="border-ds-outline relative mb-2 aspect-video rounded-ds-sm border bg-white">
                    <span className="bg-ds-primary absolute right-2 bottom-2 size-3 rounded-full" />
                  </div>
                  <span className="text-xs font-semibold text-ds-on-surface">Bottom right</span>
                </button>
              </div>
            </OnboardingSectionCard>
          </OnboardingMainColumn>
        </div>

        <aside className="md:col-span-5">
          <div className="border-ds-outline md:sticky md:top-20 rounded-ds-lg border bg-ds-surface p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-ds-on-surface text-sm font-semibold">Live preview</p>
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-800">
                Active
              </span>
            </div>
            <div className="border-ds-outline overflow-hidden rounded-ds-lg border bg-white">
              <div className="bg-ds-primary px-4 py-3">
                <p className="text-sm font-semibold text-ds-on-primary">Your widget</p>
                <p className="text-ds-on-primary/75 text-[11px]">Tone: {tone}</p>
              </div>
              <div className="space-y-2 bg-ds-sidebar p-3">
                <div className="border-ds-outline rounded-2xl rounded-tl-sm border bg-white px-3 py-2 text-xs text-ds-on-surface">
                  Thanks for reaching out— how can I help?
                </div>
              </div>
              <div className="flex justify-end p-3">
                <div
                  className="flex size-11 items-center justify-center rounded-full text-lg text-ds-on-primary shadow-md"
                  style={{ backgroundColor: colorOptions[selectedColor] }}
                >
                  💬
                </div>
              </div>
            </div>
            <p className="text-ds-on-surface-variant mt-3 text-center text-xs italic">
              Reflects tone and color only; full chat UI in Playground.
            </p>
            {error ? <p className="mt-2 text-center text-xs text-rose-600">{error}</p> : null}
          </div>
        </aside>
      </div>

      <OnboardingStickyFooter
        backHref="/onboarding/connection"
        backLabel="Back"
        primaryAsButton
        onPrimaryClick={handleContinue}
        primaryDisabled={!agentId || isSaving}
        primaryLabel={isSaving ? "Saving..." : "Continue"}
      />
    </OnboardingFrame>
  );
}
