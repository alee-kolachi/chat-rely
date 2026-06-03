"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { WidgetBrandAvatar } from "@/components/chat/widget-brand-avatar";
import { PlaygroundStyleChatPanel } from "@/components/chat/playground-style-chat-panel";
import { backendFetch } from "@/lib/backend-api";
import { BRAND_COLOR_PRESETS } from "@/lib/brand-color-presets";
import { brandChromeClasses, parseBrandColorHex } from "@/lib/brand-chrome";
import {
  TONE_OPTIONS,
  WELCOME_MESSAGE_MAX,
  type AgentTone,
  defaultWelcomeMessage,
  effectiveWelcomeMessage,
  readBehaviorString,
} from "@/lib/agent-settings";
import { messageCreatedAtIso } from "@/lib/format-locale-datetime";
import { faviconServiceUrl } from "@/lib/website-url";
import { getOnboardingAgentName } from "@/lib/onboarding-state";
import { useResolvedOnboardingAgentId } from "@/lib/use-resolved-onboarding-agent-id";
import { OnboardingFrame } from "@/components/onboarding/onboarding-frame";
import { AppSegmentGroupSimple } from "@/components/ui/app-segment-group";
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

type AgentListRow = {
  id: string;
  name: string;
  behavior_settings?: Record<string, unknown> | null;
};

type OnboardingStatusPayload = {
  website_url: string | null;
};

type BootstrapPayload = {
  website_preview?: { source_url: string | null } | null;
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
  const [agentName, setAgentName] = useState(() => getOnboardingAgentName()?.trim() || "Your agent");
  const [behaviorSettings, setBehaviorSettings] = useState<Record<string, unknown> | null>(null);
  const [welcome, setWelcome] = useState("");
  const [websiteLogoUrl, setWebsiteLogoUrl] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const agentId = useResolvedOnboardingAgentId();
  const messageInputRef = useRef<HTMLTextAreaElement | null>(null);
  const messagesScrollRef = useRef<HTMLDivElement | null>(null);
  const previewSampleTimestamp = useMemo(() => messageCreatedAtIso(), []);

  const agentPreviewBackHref = useMemo(() => {
    const path = "/onboarding/agent-preview";
    if (!agentId) return path;
    return `${path}?agentId=${encodeURIComponent(agentId)}`;
  }, [agentId]);

  useEffect(() => {
    const savedName = getOnboardingAgentName()?.trim();
    if (savedName) setAgentName(savedName);
  }, []);

  useEffect(() => {
    if (!agentId) {
      queueMicrotask(() => setIsLoading(false));
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const [agentsRes, bootstrap, status] = await Promise.all([
          backendFetch<{ agents: AgentListRow[] }>("/api/v1/agents"),
          backendFetch<BootstrapPayload>(
            `/api/v1/agents/${encodeURIComponent(agentId)}/integrations/bootstrap?include_website_preview=true`,
          ),
          backendFetch<OnboardingStatusPayload>(
            `/api/v1/onboarding/status?agent_id=${encodeURIComponent(agentId)}`,
          ).catch(() => null),
        ]);
        if (cancelled) return;

        const agent = agentsRes.agents.find((row) => row.id === agentId);
        const behavior = agent?.behavior_settings ?? {};
        const savedTone = normalizeTone(readBehaviorString(behavior, "tone"));
        const savedColor = parseBrandColorHex(behavior.brand_color) ?? BRAND_COLOR_PRESETS[0].hex;
        const presetIndex = BRAND_COLOR_PRESETS.findIndex(
          (p) => p.hex.toUpperCase() === savedColor.toUpperCase(),
        );

        setAgentName(agent?.name?.trim() || getOnboardingAgentName()?.trim() || "Your agent");
        setBehaviorSettings(behavior);
        setWelcome(readBehaviorString(behavior, "greeting_message"));
        setTone(savedTone);
        setHex(savedColor.replace("#", ""));
        setSelectedPreset(presetIndex >= 0 ? presetIndex : 0);

        const siteUrl =
          bootstrap.website_preview?.source_url?.trim() || status?.website_url?.trim() || null;
        setWebsiteLogoUrl(siteUrl ? faviconServiceUrl(siteUrl) || null : null);
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

  const previewBehaviorSettings = useMemo(
    () => ({
      ...(behaviorSettings ?? {}),
      brand_color: previewBrandColor,
    }),
    [behaviorSettings, previewBrandColor],
  );

  const previewAssistantMessage = useMemo(() => {
    const behavior = { greeting_message: welcome.trim() || undefined };
    return effectiveWelcomeMessage(behavior, agentName);
  }, [welcome, agentName]);

  const previewMessages = useMemo(
    () => [
      {
        from: "assistant" as const,
        text: previewAssistantMessage,
        streamPhase: "done" as const,
      },
      {
        from: "user" as const,
        text: "Sample visitor reply",
        streamPhase: "done" as const,
        createdAt: previewSampleTimestamp,
      },
    ],
    [previewAssistantMessage, previewSampleTimestamp],
  );

  async function handleContinue() {
    if (!agentId || isSaving) return;
    setIsSaving(true);
    setError(null);
    try {
      const prefs: Record<string, unknown> = {
        agent_id: agentId,
        tone,
        brand_color: previewBrandColor,
        widget_position: "bottom_right",
      };
      const trimmedWelcome = welcome.trim();
      if (trimmedWelcome) prefs.greeting_message = trimmedWelcome;
      await backendFetch("/api/v1/onboarding/preferences", {
        method: "PATCH",
        body: JSON.stringify(prefs),
      });
      router.push(`/onboarding/pricing?agentId=${encodeURIComponent(agentId)}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save appearance settings");
    } finally {
      setIsSaving(false);
    }
  }

  function handlePreviewSend(event: FormEvent) {
    event.preventDefault();
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
                      <label htmlFor="onboarding-welcome" className="text-ds-on-surface mb-1 block text-sm font-semibold">
                        Welcome message <span className="text-ds-on-surface-variant font-normal">(optional)</span>
                      </label>
                      <p className="ds-app-body-muted mb-2 text-sm">
                        First message customers see. Leave blank to use: {defaultWelcomeMessage(agentName)}
                      </p>
                      <textarea
                        id="onboarding-welcome"
                        className="ds-app-field min-h-[4.5rem] w-full rounded-ds-lg text-sm leading-relaxed"
                        value={welcome}
                        onChange={(e) => setWelcome(e.target.value)}
                        maxLength={WELCOME_MESSAGE_MAX}
                        placeholder={defaultWelcomeMessage(agentName)}
                      />
                    </div>

                    <div className="border-ds-outline rounded-ds-lg border bg-white p-4 sm:p-5">
                      <p className="text-ds-on-surface mb-1 text-sm font-semibold">Tone</p>
                      <p className="ds-app-body-muted mb-3">How replies sound to customers.</p>
                      <p className="text-ds-on-surface-variant mb-3 text-xs leading-relaxed">
                        You can add detailed brand instructions later in Agent Settings → Tone.
                      </p>
                      <AppSegmentGroupSimple
                        aria-label="Tone"
                        value={tone}
                        onChange={setTone}
                        options={TONE_OPTIONS.map((t) => ({ value: t, label: t }))}
                      />
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
                        <div className="border-ds-outline flex min-w-0 w-full items-center overflow-hidden rounded-ds-md border sm:ml-1 sm:w-auto">
                          <span className="ds-app-body-muted shrink-0 px-2 font-mono">#</span>
                          <OnboardingInput
                            value={hex}
                            onChange={(e) => setHex(e.target.value.replace(/[^0-9A-Fa-f]/g, "").slice(0, 6))}
                            className="min-w-0 w-full border-0 py-2 font-mono text-xs uppercase focus:ring-0 sm:w-24"
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
                <div className="relative z-[1] mx-auto flex w-full max-w-[26rem] flex-col items-center pb-2">
                  <PlaygroundStyleChatPanel
                    agentName={agentName}
                    brandColorHex={previewBrandColor}
                    behaviorSettings={previewBehaviorSettings}
                    websiteLogoUrl={websiteLogoUrl}
                    websiteLogoPending={isLoading}
                    messages={previewMessages}
                    isSending={false}
                    messageInput=""
                    onMessageInputChange={() => {}}
                    onSend={handlePreviewSend}
                    sendDisabled
                    composerDisabled
                    composerPlaceholder="Test your agent…"
                    messageInputRef={messageInputRef}
                    messagesScrollRef={messagesScrollRef}
                    shellHeightClass="h-full min-h-[14rem] w-full sm:min-h-[20rem] lg:min-h-[520px]"
                  />
                  <div className="mt-3 flex w-full justify-end">
                    <WidgetBrandAvatar
                      logoUrl={websiteLogoUrl}
                      logoPending={isLoading}
                      hasBrand={Boolean(previewBrandColor)}
                      chrome={previewBrandChrome}
                      brandColorHex={previewBrandColor}
                      size="launcher"
                    />
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
