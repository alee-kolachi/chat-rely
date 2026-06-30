"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { WidgetBrandAvatar } from "@/components/chat/widget-brand-avatar";
import {
  WidgetChatPreviewFooter,
  WidgetChatShell,
  WidgetComposerPreview,
  WidgetPreviewUserBubble,
  WidgetWelcomeMessages,
} from "@/components/chat/widget-chat-shell";
import { WidgetWelcomeScreen } from "@/components/chat/widget-welcome-screen";
import { PoweredByChatRely } from "@/components/branding/powered-by-chatrely";
import { backendFetch } from "@/lib/backend-api";
import { BRAND_COLOR_PRESETS } from "@/lib/brand-color-presets";
import { brandChromeClasses, parseBrandColorHex } from "@/lib/brand-chrome";
import {
  TONE_OPTIONS,
  type AgentTone,
  effectiveWelcomeMessages,
  formatHex,
  normaliseHex,
  normalizeAgentTone,
  readBehaviorString,
  readWelcomeScreenEnabled,
  resolveWelcomeScreenSettings,
} from "@/lib/agent-settings";
import { readWidgetAppearance, resolveWidgetAppearance } from "@/lib/widget-appearance";
import { readAgentWidgetLogoUrl, resolveAgentLogoUrl } from "@/lib/agent-logo";
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
  onboardingAppearancePreviewCard,
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

export default function AppearanceToneOnboardingPage() {
  const router = useRouter();
  const [tone, setTone] = useState<AgentTone>("Friendly");
  const [hex, setHex] = useState("831C91");
  const [selectedPreset, setSelectedPreset] = useState(0);
  const [agentName, setAgentName] = useState(() => getOnboardingAgentName()?.trim() || "Your agent");
  const [behaviorSettings, setBehaviorSettings] = useState<Record<string, unknown> | null>(null);
  const [welcomeScreenEnabled, setWelcomeScreenEnabled] = useState(true);
  const [previewChatOpen, setPreviewChatOpen] = useState(false);
  const [websiteFaviconUrl, setWebsiteFaviconUrl] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const agentId = useResolvedOnboardingAgentId();
  const messagesScrollRef = useRef<HTMLDivElement | null>(null);

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
        const savedTone = normalizeAgentTone(readBehaviorString(behavior, "tone"));
        const savedColor = parseBrandColorHex(behavior.brand_color) ?? BRAND_COLOR_PRESETS[0].hex;
        const presetIndex = BRAND_COLOR_PRESETS.findIndex(
          (p) => p.hex.toUpperCase() === savedColor.toUpperCase(),
        );

        setAgentName(agent?.name?.trim() || getOnboardingAgentName()?.trim() || "Your agent");
        setBehaviorSettings(behavior);
        setWelcomeScreenEnabled(readWelcomeScreenEnabled(behavior));
        setTone(savedTone);
        setHex(savedColor.replace("#", ""));
        setSelectedPreset(presetIndex >= 0 ? presetIndex : 0);

        const siteUrl =
          bootstrap.website_preview?.source_url?.trim() || status?.website_url?.trim() || null;
        setWebsiteFaviconUrl(siteUrl ? faviconServiceUrl(siteUrl) || null : null);
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

  useEffect(() => {
    if (!welcomeScreenEnabled) setPreviewChatOpen(false);
  }, [welcomeScreenEnabled]);

  const validHex = formatHex(hex) !== null;

  const previewBrandColor = useMemo(() => {
    const parsed = formatHex(hex) ?? parseBrandColorHex(`#${hex}`);
    if (parsed) return parsed;
    return BRAND_COLOR_PRESETS[selectedPreset]?.hex ?? "#831C91";
  }, [hex, selectedPreset]);

  function syncHexFromPicker(value: string) {
    const newHex = value.replace("#", "").toUpperCase();
    setHex(newHex);
    const presetIndex = BRAND_COLOR_PRESETS.findIndex(
      (p) => p.hex.replace("#", "").toUpperCase() === newHex,
    );
    if (presetIndex >= 0) setSelectedPreset(presetIndex);
  }

  const previewBrandChrome = useMemo(() => brandChromeClasses(previewBrandColor), [previewBrandColor]);

  const previewLogoUrl = useMemo(
    () => resolveAgentLogoUrl(readAgentWidgetLogoUrl(behaviorSettings), websiteFaviconUrl),
    [behaviorSettings, websiteFaviconUrl]
  );

  const previewBehaviorSettings = useMemo(
    () => ({
      ...(behaviorSettings ?? {}),
      brand_color: previewBrandColor,
    }),
    [behaviorSettings, previewBrandColor],
  );

  const previewAssistantMessages = useMemo(
    () => effectiveWelcomeMessages(behaviorSettings ?? {}, agentName),
    [behaviorSettings, agentName],
  );

  const welcomeScreenPreview = useMemo(
    () =>
      resolveWelcomeScreenSettings({
        ...(behaviorSettings ?? {}),
        welcome_screen_enabled: welcomeScreenEnabled,
      }),
    [behaviorSettings, welcomeScreenEnabled],
  );

  const widgetAppearance = useMemo(
    () => readWidgetAppearance(previewBehaviorSettings),
    [previewBehaviorSettings],
  );

  const resolvedPreview = useMemo(
    () => resolveWidgetAppearance(widgetAppearance, previewBrandColor),
    [widgetAppearance, previewBrandColor],
  );

  const appearancePreviewCardClass = onboardingAppearancePreviewCard;

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
        welcome_screen_enabled: welcomeScreenEnabled,
      };
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
          primaryDisabled={!agentId || isLoading || !validHex}
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
                    <span className="text-ds-on-surface font-bold">Advanced settings</span> (welcome screen copy,
                    detailed tone instructions, widget colors) are in Agent Settings after onboarding.
                  </p>

                  <div className="mt-8 space-y-5 sm:mt-10">
                    <div className="border-ds-outline rounded-ds-lg border bg-white p-4 sm:p-5">
                      <p className="text-ds-on-surface mb-1 text-sm font-semibold">Welcome screen</p>
                      <p className="ds-app-body-muted mb-4">Home view visitors see before chat.</p>
                      <label className="flex cursor-pointer items-center gap-3">
                        <input
                          type="checkbox"
                          className="border-ds-outline text-ds-primary size-4 rounded border"
                          checked={welcomeScreenEnabled}
                          onChange={(e) => setWelcomeScreenEnabled(e.target.checked)}
                        />
                        <span className="text-ds-on-surface text-sm font-medium">Show welcome screen in widget</span>
                      </label>
                    </div>

                    <div className="border-ds-outline rounded-ds-lg border bg-white p-4 sm:p-5">
                      <p className="text-ds-on-surface mb-1 text-sm font-semibold">Tone</p>
                      <p className="ds-app-body-muted mb-4">How your agent sounds in replies.</p>
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
                        <input
                          type="color"
                          className="border-ds-outline size-11 shrink-0 cursor-pointer rounded-ds-lg border bg-white p-1 touch-manipulation sm:size-10"
                          value={formatHex(hex) ?? BRAND_COLOR_PRESETS[0].hex}
                          onChange={(e) => syncHexFromPicker(e.target.value)}
                          aria-label="Brand color picker"
                        />
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
                            onChange={(e) => syncHexFromPicker(normaliseHex(e.target.value))}
                            className="min-w-0 w-full border-0 py-2 font-mono text-xs uppercase focus:ring-0 sm:w-24"
                            aria-label="Hex color"
                            spellCheck={false}
                          />
                        </div>
                      </div>
                      {!validHex && hex.length > 0 ? (
                        <p className="mt-2 text-xs font-medium text-rose-600">Hex must be 6 characters (0-9, A-F).</p>
                      ) : null}
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
                    {welcomeScreenEnabled && !previewChatOpen ? (
                      <div className={appearancePreviewCardClass}>
                        <WidgetWelcomeScreen
                          agentName={agentName}
                          brandColorHex={previewBrandColor}
                          panelBackgroundHex={resolvedPreview.colors.panelBackground}
                          headline={welcomeScreenPreview.headline}
                          headlineColor={welcomeScreenPreview.headlineColor}
                          description={welcomeScreenPreview.description}
                          buttonLabel={welcomeScreenPreview.buttonLabel}
                          socialLinks={welcomeScreenPreview.socialLinks}
                          websiteLogoUrl={previewLogoUrl}
                          websiteLogoPending={isLoading}
                          className="min-h-0 flex-1"
                          onChatClick={() => setPreviewChatOpen(true)}
                        />
                        <div className="flex shrink-0 items-center justify-center bg-white px-5 py-2.5">
                          <PoweredByChatRely compact className="px-0 pb-[max(10px,env(safe-area-inset-bottom,0px))] pt-0" />
                        </div>
                      </div>
                    ) : (
                      <div className={appearancePreviewCardClass}>
                        <WidgetChatShell
                          agentName={agentName}
                          brandColorHex={previewBrandColor}
                          widgetAppearance={widgetAppearance}
                          websiteLogoUrl={previewLogoUrl}
                          websiteLogoPending={isLoading}
                          shellHeightClass="h-full min-h-0"
                          shellBorderless
                          className="min-h-0 max-w-none flex-1 rounded-none shadow-none"
                          footerBorderless
                          onHeaderBack={
                            welcomeScreenEnabled ? () => setPreviewChatOpen(false) : undefined
                          }
                          headerBackLabel="Back to welcome screen"
                          footer={
                            <WidgetChatPreviewFooter>
                              <WidgetComposerPreview
                                brandColorHex={previewBrandColor}
                                accentColor={resolvedPreview.colors.header}
                                composerBackground={resolvedPreview.colors.composerBackground}
                                className="pt-0"
                              />
                            </WidgetChatPreviewFooter>
                          }
                        >
                          <div
                            ref={messagesScrollRef}
                            className="h-full space-y-3 overflow-y-auto bg-transparent px-4 py-4 sm:px-4"
                          >
                            <WidgetWelcomeMessages
                              messages={previewAssistantMessages}
                              resolved={resolvedPreview}
                            />
                            <div className="flex justify-end">
                              <WidgetPreviewUserBubble resolved={resolvedPreview}>
                                Sample visitor reply
                              </WidgetPreviewUserBubble>
                            </div>
                          </div>
                        </WidgetChatShell>
                      </div>
                    )}
                  <div className="mt-3 flex w-full justify-end">
                    <WidgetBrandAvatar
                      logoUrl={previewLogoUrl}
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
