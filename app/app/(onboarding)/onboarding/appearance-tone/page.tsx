"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { WidgetChatShell } from "@/components/chat/widget-chat-shell";
import { backendFetch } from "@/lib/backend-api";
import { BRAND_COLOR_PRESETS } from "@/lib/brand-color-presets";
import { brandChromeClasses, parseBrandColorHex, previewAssistantLineForTone } from "@/lib/brand-chrome";
import { TONE_OPTIONS, type AgentTone, readBehaviorString } from "@/lib/agent-settings";
import { faviconServiceUrl } from "@/lib/website-url";
import { useResolvedOnboardingAgentId } from "@/lib/use-resolved-onboarding-agent-id";
import { OnboardingFrame } from "@/components/onboarding/onboarding-frame";
import { cn } from "@/lib/utils";
import {
  OnboardingInput,
  OnboardingMainColumn,
  onboardingSplitBody,
  onboardingSplitCardFilled,
  onboardingSplitGrid,
  onboardingSplitLeftSection,
  onboardingSplitRightSectionCentered,
  onboardingSplitRoot,
  OnboardingStickyFooter,
} from "@/components/onboarding/onboarding-ui";

type OnboardingStatusPayload = {
  website_url: string | null;
};

type AgentPayload = {
  name?: string;
  behavior_settings?: Record<string, unknown>;
};

function normalizeTone(raw: string | undefined): AgentTone {
  const key = (raw ?? "").trim().toLowerCase();
  if (key === "professional") return "Professional";
  if (key === "concise") return "Concise";
  return "Friendly";
}

export default function AppearanceToneOnboardingPage() {
  const router = useRouter();
  const [tone, setTone] = useState<AgentTone>("Friendly");
  const [hex, setHex] = useState("831C91");
  const [selectedPreset, setSelectedPreset] = useState(0);
  const [agentName, setAgentName] = useState("Support");
  const [websiteLogoUrl, setWebsiteLogoUrl] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const agentId = useResolvedOnboardingAgentId();

  const agentPreviewBackHref = useMemo(() => {
    const path = "/onboarding/agent-preview";
    if (!agentId) return path;
    return `${path}?agentId=${encodeURIComponent(agentId)}`;
  }, [agentId]);

  useEffect(() => {
    if (!agentId) {
      queueMicrotask(() => setIsLoading(false));
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const [agent, status] = await Promise.all([
          backendFetch<AgentPayload>(`/api/v1/agents/${agentId}`),
          backendFetch<OnboardingStatusPayload>(
            `/api/v1/onboarding/status?agent_id=${encodeURIComponent(agentId)}`,
          ),
        ]);
        if (cancelled) return;
        const behavior = agent.behavior_settings ?? {};
        const savedTone = normalizeTone(readBehaviorString(behavior, "tone"));
        const savedColor = parseBrandColorHex(behavior.brand_color) ?? BRAND_COLOR_PRESETS[0].hex;
        const presetIndex = BRAND_COLOR_PRESETS.findIndex(
          (p) => p.hex.toUpperCase() === savedColor.toUpperCase(),
        );
        setAgentName(agent.name?.trim() || "Support");
        setTone(savedTone);
        setHex(savedColor.replace("#", ""));
        setSelectedPreset(presetIndex >= 0 ? presetIndex : 0);
        const icon = faviconServiceUrl(status.website_url);
        setWebsiteLogoUrl(icon || null);
      } catch {
        if (!cancelled) setError("Could not load your agent settings.");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [agentId]);

  const previewBrandColor = useMemo(() => {
    const parsed = parseBrandColorHex(`#${hex}`);
    if (parsed) return parsed;
    return BRAND_COLOR_PRESETS[selectedPreset]?.hex ?? "#831C91";
  }, [hex, selectedPreset]);

  const previewBrandChrome = useMemo(() => brandChromeClasses(previewBrandColor), [previewBrandColor]);
  const previewAssistantMessage = useMemo(() => previewAssistantLineForTone(tone), [tone]);

  async function handleContinue() {
    if (!agentId || isSaving) return;
    setIsSaving(true);
    setError(null);
    try {
      await backendFetch(`/api/v1/agents/${agentId}`, {
        method: "PATCH",
        body: JSON.stringify({
          behavior_settings: {
            tone,
            brand_color: previewBrandColor,
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
          primaryDisabled={!agentId || isLoading}
          primaryPending={isSaving}
          primaryLabel={isSaving ? "Saving..." : "Continue"}
        />
      }
    >
      <OnboardingMainColumn className={onboardingSplitRoot}>
        <div className={onboardingSplitBody}>
          <div
            className="pointer-events-none absolute inset-0 -z-10 rounded-[36px] opacity-80"
            style={{
              background:
                "radial-gradient(circle at 14% 18%, rgba(99,102,241,0.16), transparent 36%), radial-gradient(circle at 86% 78%, rgba(244,114,182,0.12), transparent 40%), linear-gradient(180deg, rgba(250,245,255,0.94), rgba(241,245,249,0.75))",
            }}
            aria-hidden
          />

          <div className={onboardingSplitCardFilled}>
            <div className={onboardingSplitGrid}>
              <section className={cn(onboardingSplitLeftSection, "overflow-visible lg:overflow-y-auto lg:overscroll-y-auto")}>
                <div>
                  <p className="text-ds-on-surface-variant mb-3 text-[11px] font-semibold tracking-[0.18em] uppercase">
                    Step 5
                  </p>
                  <h1 className="text-ds-on-surface text-2xl font-semibold tracking-tight sm:text-3xl lg:text-[2rem]">
                    <span className="text-ds-primary font-bold">Appearance</span> and tone
                  </h1>
                  <p className="text-ds-on-surface-variant mt-2 text-sm leading-relaxed">
                    Match your brand and how the agent sounds. These settings apply in the playground and on your site.
                  </p>

                  <div className="mt-8 space-y-5 sm:mt-10">
                    <div className="border-ds-outline rounded-ds-lg border bg-white p-4 sm:p-5">
                      <p className="text-ds-on-surface mb-1 text-sm font-semibold">Tone</p>
                      <p className="ds-app-body-muted mb-3">How replies sound to customers.</p>
                      <div className="bg-ds-sidebar flex flex-col gap-1 rounded-ds-md border border-ds-outline p-1 sm:flex-row sm:gap-0">
                        {TONE_OPTIONS.map((t) => (
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
                      <p className="ds-app-body-muted mb-4">Widget header and launcher accent.</p>
                      <div className="flex flex-wrap items-center gap-2.5">
                        {BRAND_COLOR_PRESETS.map((preset, index) => (
                          <button
                            key={preset.hex}
                            type="button"
                            onClick={() => {
                              setSelectedPreset(index);
                              setHex(preset.hex.replace("#", "").toUpperCase());
                            }}
                            aria-label={preset.label}
                            title={preset.label}
                            className={cn(
                              "touch-manipulation size-11 rounded-full border-2 transition-transform hover:scale-105 sm:size-10",
                              selectedPreset === index && parseBrandColorHex(`#${hex}`)?.toUpperCase() === preset.hex.toUpperCase()
                                ? "border-ds-primary ring-2 ring-ds-primary/25 ring-offset-2"
                                : "border-transparent",
                            )}
                            style={{ backgroundColor: preset.hex }}
                          />
                        ))}
                        <div className="border-ds-outline ml-1 flex items-center overflow-hidden rounded-ds-md border">
                          <span className="ds-app-body-muted px-2 font-mono">#</span>
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

              <section className={cn(onboardingSplitRightSectionCentered, "overflow-visible lg:overflow-y-auto lg:overscroll-y-auto")}>
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
                  <WidgetChatShell
                    agentName={agentName}
                    brandColorHex={previewBrandColor}
                    websiteLogoUrl={websiteLogoUrl}
                    websiteLogoPending={isLoading}
                    shellHeightClass="h-full min-h-[14rem] w-full sm:min-h-[20rem] lg:min-h-[520px]"
                    footer={
                      <div className="border-ds-outline px-3 py-2.5">
                        <div className="rounded-ds-md border border-ds-outline bg-ds-sidebar px-3 py-2 text-xs text-ds-on-surface-variant">
                          Write a message…
                        </div>
                      </div>
                    }
                  >
                    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto bg-ds-sidebar p-3 sm:p-4">
                      <div className="border-ds-outline max-w-[92%] rounded-2xl rounded-tl-sm border bg-white px-3 py-2.5 text-xs leading-relaxed text-ds-on-surface sm:text-sm">
                        {previewAssistantMessage}
                      </div>
                    </div>
                  </WidgetChatShell>
                  <div className="mt-3 flex w-full max-w-[26rem] justify-end">
                    <div
                      className={cn(
                        "flex size-14 items-center justify-center overflow-hidden rounded-full border border-black/10 shadow-[0_10px_25px_rgba(15,23,42,0.22)] ring-4 ring-white",
                        previewBrandChrome.fabIconClass,
                      )}
                      style={{ backgroundColor: previewBrandColor }}
                      aria-hidden
                    >
                      {websiteLogoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={websiteLogoUrl} alt="" className="size-8 object-contain" />
                      ) : (
                        <span className="text-xl">💬</span>
                      )}
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
