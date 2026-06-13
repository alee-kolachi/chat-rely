"use client";

import { useEffect, useMemo, useState } from "react";
import {
  WidgetChatShell,
  WidgetComposerPreview,
  WidgetWelcomeMessages,
} from "@/components/chat/widget-chat-shell";
import { WidgetWelcomeScreen } from "@/components/chat/widget-welcome-screen";
import { WidgetBrandAvatar } from "@/components/chat/widget-brand-avatar";
import {
  PoweredByChatRely,
  WIDGET_POWERED_BY_STRIP_CLASS,
} from "@/components/branding/powered-by-chatrely";
import { useAgentIntegrationsBootstrap } from "@/components/integrations/use-agent-integrations-bootstrap";
import { AgentSettingsShell } from "@/components/agent-settings/agent-settings-shell";
import { PlanFeatureLabel } from "@/components/ui/plan-unlock-footer";
import { UnsavedChangesActionBar } from "@/components/ui/unsaved-changes-action-bar";
import { useDashboardAgent } from "@/components/layout/dashboard-agent-context";
import { useMeContext } from "@/components/layout/me-context-provider";
import { backendFetch } from "@/lib/backend-api";
import { BRAND_COLOR_PRESETS } from "@/lib/brand-color-presets";
import {
  applyWelcomeScreenToBehaviorRecord,
  DEFAULT_WELCOME_SCREEN_HEADLINE_COLOR,
  effectiveWelcomeMessages,
  formatHex,
  mergeBehaviorSettings,
  normaliseHex,
  normalizeWelcomeScreenSettings,
  readBehaviorString,
  welcomeScreenSettingsForForm,
  WELCOME_SCREEN_BUTTON_LABEL_MAX,
  WELCOME_SCREEN_DESCRIPTION_MAX,
  WELCOME_SCREEN_HEADLINE_MAX,
  WELCOME_SCREEN_SOCIAL_LABEL_MAX,
  WELCOME_SCREEN_SOCIAL_URL_MAX,
  type WelcomeScreenSocialLink,
  type WidgetPosition,
} from "@/lib/agent-settings";
import { brandChromeClasses } from "@/lib/brand-chrome";
import { effectivePlanSlug } from "@/lib/plan-slugs";
import {
  planHidesPoweredByChatrely,
  planIncludesWidgetStyling,
  widgetStylingAccess,
} from "@/lib/widget-branding";
import {
  incompleteWidgetColorField,
  readWidgetAppearance,
  resolveWidgetAppearance,
  sanitizeWidgetAppearanceForPlan,
  widgetAppearanceToPayload,
  WIDGET_COLOR_FIELDS,
  WIDGET_COLOR_GROUPS,
  WIDGET_COLOR_RESOLVED_KEY,
  WIDGET_FONT_OPTIONS,
  type WidgetAppearanceColors,
  type WidgetAppearanceSettings,
  type WidgetFontFamily,
  type WidgetThemeMode,
} from "@/lib/widget-appearance";
import {
  clampWidgetBorderRadius,
  readWidgetAnimationEnabled,
  readWidgetBorderRadius,
  WIDGET_BORDER_RADIUS_MAX,
  WIDGET_BORDER_RADIUS_MIN,
  WIDGET_BORDER_RADIUS_PRESETS,
} from "@/lib/widget-shape";
import { faviconServiceUrl } from "@/lib/website-url";
import { appButtonClassName } from "@/lib/button-styles";
import { cn } from "@/lib/utils";

export default function AgentSettingsAppearancePage() {
  return (
    <AgentSettingsShell active="appearance">
      <AppearanceForm />
    </AgentSettingsShell>
  );
}

function AppearanceForm() {
  const { selectedAgent, selectedAgentId, refreshAgents } = useDashboardAgent();
  const { data: meData, loading: meLoading } = useMeContext();
  const {
    websitePreview: integrationsWebsitePreview,
    loading: integrationsLoading,
  } = useAgentIntegrationsBootstrap(selectedAgentId || undefined);

  const planSlug = effectivePlanSlug(meData?.plan);
  const planResolved = !meLoading && meData != null;
  const widgetStyling = useMemo(
    () => widgetStylingAccess(meData?.plan, planResolved),
    [meData?.plan?.slug, meData?.plan?.name, planResolved]
  );
  const widgetStylingIncluded = planIncludesWidgetStyling(meData?.plan);

  const initialBrand = useMemo(() => {
    const raw = selectedAgent?.behavior_settings?.brand_color;
    return formatHex(typeof raw === "string" ? raw : "") ?? BRAND_COLOR_PRESETS[0].hex;
  }, [selectedAgent?.behavior_settings?.brand_color]);

  const initialPosition = useMemo((): WidgetPosition => {
    const raw = readBehaviorString(selectedAgent?.behavior_settings, "widget_position");
    return raw === "bottom_left" ? "bottom_left" : "bottom_right";
  }, [selectedAgent?.behavior_settings]);

  const initialAppearance = useMemo(
    () => readWidgetAppearance(selectedAgent?.behavior_settings),
    [selectedAgent?.behavior_settings]
  );

  const agentDisplayName = selectedAgent?.name?.trim() || "Support";

  const initialWelcomeScreen = useMemo(
    () => welcomeScreenSettingsForForm(selectedAgent?.behavior_settings),
    [selectedAgent?.behavior_settings]
  );

  const initialBorderRadius = useMemo(
    () => readWidgetBorderRadius(selectedAgent?.behavior_settings),
    [selectedAgent?.behavior_settings]
  );

  const initialAnimationEnabled = useMemo(
    () => readWidgetAnimationEnabled(selectedAgent?.behavior_settings),
    [selectedAgent?.behavior_settings]
  );

  const [hex, setHex] = useState<string>(initialBrand.replace("#", ""));
  const [position, setPosition] = useState<WidgetPosition>(initialPosition);
  const [widgetBorderRadius, setWidgetBorderRadius] = useState(initialBorderRadius);
  const [widgetAnimationEnabled, setWidgetAnimationEnabled] = useState(initialAnimationEnabled);
  const [previewAnimationKey, setPreviewAnimationKey] = useState(0);
  const [themeMode, setThemeMode] = useState<WidgetThemeMode>(initialAppearance.theme_mode ?? "light");
  const [fontFamily, setFontFamily] = useState<WidgetFontFamily>(
    initialAppearance.font_family ?? "geist"
  );
  const [customColors, setCustomColors] = useState<WidgetAppearanceColors>(
    initialAppearance.colors ?? {}
  );
  const [welcomeScreenEnabled, setWelcomeScreenEnabled] = useState(initialWelcomeScreen.enabled);
  const [welcomeScreenHeadline, setWelcomeScreenHeadline] = useState(initialWelcomeScreen.headline);
  const [welcomeScreenHeadlineColor, setWelcomeScreenHeadlineColor] = useState(
    initialWelcomeScreen.headlineColor.replace("#", "")
  );
  const [welcomeScreenDescription, setWelcomeScreenDescription] = useState(
    initialWelcomeScreen.description
  );
  const [welcomeScreenButtonLabel, setWelcomeScreenButtonLabel] = useState(
    initialWelcomeScreen.buttonLabel
  );
  const [socialLinks, setSocialLinks] = useState<[WelcomeScreenSocialLink, WelcomeScreenSocialLink]>(
    initialWelcomeScreen.socialLinks
  );
  const [previewChatOpen, setPreviewChatOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  useEffect(() => {
    queueMicrotask(() => {
      setHex(initialBrand.replace("#", ""));
      setPosition(initialPosition);
      setWidgetBorderRadius(initialBorderRadius);
      setWidgetAnimationEnabled(initialAnimationEnabled);
      setThemeMode(initialAppearance.theme_mode ?? "light");
      setFontFamily(initialAppearance.font_family ?? "geist");
      setCustomColors(initialAppearance.colors ?? {});
      setWelcomeScreenEnabled(initialWelcomeScreen.enabled);
      setWelcomeScreenHeadline(initialWelcomeScreen.headline);
      setWelcomeScreenHeadlineColor(initialWelcomeScreen.headlineColor.replace("#", ""));
      setWelcomeScreenDescription(initialWelcomeScreen.description);
      setWelcomeScreenButtonLabel(initialWelcomeScreen.buttonLabel);
      setSocialLinks(initialWelcomeScreen.socialLinks);
      setPreviewChatOpen(false);
      setError(null);
      setSavedAt(null);
    });
  }, [
    selectedAgent?.id,
    initialBrand,
    initialPosition,
    initialBorderRadius,
    initialAnimationEnabled,
    initialAppearance,
    initialWelcomeScreen,
  ]);

  useEffect(() => {
    if (!welcomeScreenEnabled) setPreviewChatOpen(false);
  }, [welcomeScreenEnabled]);

  useEffect(() => {
    if (widgetAnimationEnabled) {
      setPreviewAnimationKey((key) => key + 1);
    }
  }, [widgetAnimationEnabled]);

  const previewBrandColor = useMemo(() => formatHex(hex) ?? BRAND_COLOR_PRESETS[0].hex, [hex]);

  const draftAppearance: WidgetAppearanceSettings = useMemo(
    () => ({
      theme_mode: themeMode,
      font_family: fontFamily,
      colors: Object.keys(customColors).length > 0 ? customColors : undefined,
    }),
    [themeMode, fontFamily, customColors]
  );

  const previewAppearance = widgetStylingIncluded ? draftAppearance : {};
  const resolvedPreview = useMemo(
    () => resolveWidgetAppearance(previewAppearance, previewBrandColor),
    [previewAppearance, previewBrandColor]
  );
  const previewAccentColor = resolvedPreview.colors.header;
  const previewAccentChrome = useMemo(
    () => brandChromeClasses(previewAccentColor),
    [previewAccentColor]
  );

  const websiteLogoPending = Boolean(selectedAgentId && integrationsLoading);
  const websiteLogoUrl = useMemo(() => {
    if (!selectedAgentId || integrationsLoading) return null;
    const raw = integrationsWebsitePreview?.source_url?.trim();
    if (!raw) return null;
    return faviconServiceUrl(raw) || null;
  }, [selectedAgentId, integrationsLoading, integrationsWebsitePreview?.source_url]);

  const welcomeScreenPreview = useMemo(
    () =>
      normalizeWelcomeScreenSettings({
        enabled: welcomeScreenEnabled,
        headline: welcomeScreenHeadline,
        headlineColor: formatHex(welcomeScreenHeadlineColor) ?? DEFAULT_WELCOME_SCREEN_HEADLINE_COLOR,
        description: welcomeScreenDescription,
        buttonLabel: welcomeScreenButtonLabel,
        socialLinks,
      }),
    [
      welcomeScreenEnabled,
      welcomeScreenHeadline,
      welcomeScreenHeadlineColor,
      welcomeScreenDescription,
      welcomeScreenButtonLabel,
      socialLinks,
    ]
  );

  const welcomeScreenDirty = useMemo(
    () =>
      welcomeScreenEnabled !== initialWelcomeScreen.enabled ||
      welcomeScreenHeadline !== initialWelcomeScreen.headline ||
      (formatHex(welcomeScreenHeadlineColor) ?? DEFAULT_WELCOME_SCREEN_HEADLINE_COLOR) !==
        initialWelcomeScreen.headlineColor ||
      welcomeScreenDescription !== initialWelcomeScreen.description ||
      welcomeScreenButtonLabel !== initialWelcomeScreen.buttonLabel ||
      socialLinks[0].label !== initialWelcomeScreen.socialLinks[0].label ||
      socialLinks[0].url !== initialWelcomeScreen.socialLinks[0].url ||
      socialLinks[1].label !== initialWelcomeScreen.socialLinks[1].label ||
      socialLinks[1].url !== initialWelcomeScreen.socialLinks[1].url,
    [
      welcomeScreenEnabled,
      welcomeScreenHeadline,
      welcomeScreenHeadlineColor,
      welcomeScreenDescription,
      welcomeScreenButtonLabel,
      socialLinks,
      initialWelcomeScreen,
    ]
  );

  const previewWelcomeMessages = useMemo(
    () => effectiveWelcomeMessages(selectedAgent?.behavior_settings, agentDisplayName),
    [selectedAgent?.behavior_settings, agentDisplayName]
  );

  const hidePoweredByPlan = useMemo(
    () => !meLoading && planHidesPoweredByChatrely(planSlug),
    [meLoading, planSlug]
  );

  const appearanceDirty = useMemo(() => {
    const saved = initialAppearance;
    if ((saved.theme_mode ?? "light") !== themeMode) return true;
    if ((saved.font_family ?? "geist") !== fontFamily) return true;
    for (const field of WIDGET_COLOR_FIELDS) {
      const a = formatHex(saved.colors?.[field.key] ?? "") ?? "";
      const b = formatHex(customColors[field.key] ?? "") ?? "";
      if (a !== b) return true;
    }
    return false;
  }, [initialAppearance, themeMode, fontFamily, customColors]);

  const dirty = useMemo(() => {
    const formatted = formatHex(hex) ?? "";
    return (
      formatted !== initialBrand ||
      position !== initialPosition ||
      widgetBorderRadius !== initialBorderRadius ||
      widgetAnimationEnabled !== initialAnimationEnabled ||
      appearanceDirty ||
      welcomeScreenDirty
    );
  }, [
    hex,
    position,
    widgetBorderRadius,
    widgetAnimationEnabled,
    initialBrand,
    initialPosition,
    initialBorderRadius,
    initialAnimationEnabled,
    appearanceDirty,
    welcomeScreenDirty,
  ]);

  const validHex = formatHex(hex) !== null;

  function updateCustomColor(key: keyof WidgetAppearanceColors, value: string) {
    const cleaned = normaliseHex(value);
    setCustomColors((prev) => {
      const next = { ...prev };
      if (!cleaned) {
        delete next[key];
        return next;
      }
      next[key] = `#${cleaned}`;
      return next;
    });
  }

  function resetAdvancedColors() {
    setCustomColors({});
  }

  async function handleSave() {
    if (!selectedAgentId || isSaving || !dirty) return;
    const formatted = formatHex(hex);
    if (!formatted) {
      setError("Enter a valid 6-character hex color (e.g. 3B82F6).");
      return;
    }
    const incompleteColor = incompleteWidgetColorField(customColors);
    if (incompleteColor) {
      setError(`${incompleteColor} must be 6 hex characters (e.g. FF24FF), or clear the field.`);
      return;
    }
    setIsSaving(true);
    setError(null);
    setSavedAt(null);
    try {
      const appearancePayload = widgetStylingIncluded
        ? widgetAppearanceToPayload(draftAppearance)
        : undefined;
      const partial: Record<string, unknown> = {
        brand_color: formatted,
        widget_position: position,
        widget_border_radius: clampWidgetBorderRadius(widgetBorderRadius),
        widget_animation_enabled: widgetAnimationEnabled,
      };
      if (widgetStylingIncluded) {
        partial.widget_appearance = appearancePayload ?? {};
      }
      let merged = mergeBehaviorSettings(selectedAgent?.behavior_settings, partial);
      applyWelcomeScreenToBehaviorRecord(merged as Record<string, unknown>, welcomeScreenPreview);
      merged = sanitizeWidgetAppearanceForPlan(merged, planSlug);
      await backendFetch(`/api/v1/agents/${selectedAgentId}`, {
        method: "PATCH",
        body: JSON.stringify({ behavior_settings: merged }),
      });
      await refreshAgents({ silent: true });
      setSavedAt(Date.now());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save appearance settings");
    } finally {
      setIsSaving(false);
    }
  }

  function handleCancel() {
    setHex(initialBrand.replace("#", ""));
    setPosition(initialPosition);
    setWidgetBorderRadius(initialBorderRadius);
    setWidgetAnimationEnabled(initialAnimationEnabled);
    setThemeMode(initialAppearance.theme_mode ?? "light");
    setFontFamily(initialAppearance.font_family ?? "geist");
    setCustomColors(initialAppearance.colors ?? {});
    setWelcomeScreenEnabled(initialWelcomeScreen.enabled);
    setWelcomeScreenHeadline(initialWelcomeScreen.headline);
    setWelcomeScreenHeadlineColor(initialWelcomeScreen.headlineColor.replace("#", ""));
    setWelcomeScreenDescription(initialWelcomeScreen.description);
    setWelcomeScreenButtonLabel(initialWelcomeScreen.buttonLabel);
    setSocialLinks(initialWelcomeScreen.socialLinks);
    setError(null);
    setSavedAt(null);
  }

  function updateSocialLink(
    index: 0 | 1,
    field: keyof WelcomeScreenSocialLink,
    value: string
  ): void {
    setSocialLinks((prev) => {
      const next: [WelcomeScreenSocialLink, WelcomeScreenSocialLink] = [
        { ...prev[0] },
        { ...prev[1] },
      ];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  }

  function swatchColorForField(field: (typeof WIDGET_COLOR_FIELDS)[number]): string {
    if (customColors[field.key]) {
      return resolvedPreview.colors[WIDGET_COLOR_RESOLVED_KEY[field.key]];
    }
    if (field.usesBrand) return previewBrandColor;
    return resolvedPreview.colors[WIDGET_COLOR_RESOLVED_KEY[field.key]];
  }

  return (
    <>
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)] lg:items-stretch">
      <div className="relative z-10 min-w-0 space-y-6">
        {error ? <p className="text-sm font-medium text-rose-600">{error}</p> : null}
        {savedAt ? (
          <p className="text-sm font-medium text-emerald-600">
            Saved. Your live widget picks this up automatically. You do not need to change your embed code.
          </p>
        ) : null}
        <section className="border-ds-outline bg-ds-surface rounded-ds-xl border p-6 shadow-sm">
          <h2 className="ds-app-section-title mb-1">Basics</h2>
        <p className="text-ds-on-surface-variant mb-6 text-sm leading-relaxed">
          Welcome screen, brand color, and widget position for your storefront.
        </p>

        <div className="space-y-6">
          <div>
            <p className="text-ds-on-surface mb-1 text-sm font-semibold">Welcome screen</p>
            <p className="ds-app-body-muted mb-4">
              Home view visitors see before chat. Uses your brand accent color below.
            </p>
            <label className="mb-4 flex cursor-pointer items-center gap-3">
              <input
                type="checkbox"
                className="border-ds-outline text-ds-primary size-4 rounded border"
                checked={welcomeScreenEnabled}
                onChange={(e) => setWelcomeScreenEnabled(e.target.checked)}
              />
              <span className="text-ds-on-surface text-sm font-medium">Show welcome screen in widget</span>
            </label>
            <div className={welcomeScreenEnabled ? "space-y-4" : "pointer-events-none space-y-4 opacity-50"}>
              <div className="border-ds-outline-subtle space-y-4 rounded-ds-lg border p-4">
                <p className="text-ds-on-surface text-sm font-semibold">Welcome card</p>
                <p className="ds-app-body-muted -mt-2 text-sm">
                  Headline on the accent banner, bot intro, and chat button.
                </p>
                <div>
                  <label htmlFor="appearance-welcome-screen-headline" className="text-ds-on-surface mb-1 block text-sm font-semibold">
                    Headline
                  </label>
                  <input
                    id="appearance-welcome-screen-headline"
                    className="ds-app-field rounded-ds-lg"
                    value={welcomeScreenHeadline}
                    onChange={(e) => setWelcomeScreenHeadline(e.target.value)}
                    maxLength={WELCOME_SCREEN_HEADLINE_MAX}
                    disabled={!welcomeScreenEnabled}
                  />
                </div>
                <div>
                  <label htmlFor="appearance-welcome-screen-headline-color" className="text-ds-on-surface mb-1 block text-sm font-semibold">
                    Headline color
                  </label>
                  <p className="ds-app-body-muted mb-2 text-sm">
                    Text on the accent banner. Default is white.
                  </p>
                  <div className="flex items-center gap-3">
                    <input
                      id="appearance-welcome-screen-headline-color"
                      type="color"
                      className="border-ds-outline size-10 shrink-0 cursor-pointer rounded-ds-lg border bg-white p-1"
                      value={formatHex(welcomeScreenHeadlineColor) ?? DEFAULT_WELCOME_SCREEN_HEADLINE_COLOR}
                      onChange={(e) => setWelcomeScreenHeadlineColor(e.target.value.replace("#", ""))}
                      disabled={!welcomeScreenEnabled}
                    />
                    <input
                      className="ds-app-field rounded-ds-lg font-mono uppercase"
                      value={welcomeScreenHeadlineColor}
                      onChange={(e) => setWelcomeScreenHeadlineColor(normaliseHex(e.target.value))}
                      maxLength={6}
                      placeholder="FFFFFF"
                      disabled={!welcomeScreenEnabled}
                      aria-label="Headline color hex"
                    />
                    <button
                      type="button"
                      className="text-ds-on-surface-variant hover:text-ds-on-surface shrink-0 text-sm font-medium"
                      onClick={() => setWelcomeScreenHeadlineColor(DEFAULT_WELCOME_SCREEN_HEADLINE_COLOR.replace("#", ""))}
                      disabled={!welcomeScreenEnabled}
                    >
                      Reset
                    </button>
                  </div>
                </div>
                <div>
                  <label htmlFor="appearance-welcome-screen-description" className="text-ds-on-surface mb-1 block text-sm font-semibold">
                    Bot description
                  </label>
                  <textarea
                    id="appearance-welcome-screen-description"
                    rows={3}
                    className="ds-app-field ds-app-field--compact rounded-ds-lg leading-relaxed"
                    value={welcomeScreenDescription}
                    onChange={(e) => setWelcomeScreenDescription(e.target.value)}
                    maxLength={WELCOME_SCREEN_DESCRIPTION_MAX}
                    disabled={!welcomeScreenEnabled}
                  />
                </div>
                <div>
                  <label htmlFor="appearance-welcome-screen-button" className="text-ds-on-surface mb-1 block text-sm font-semibold">
                    Button label
                  </label>
                  <input
                    id="appearance-welcome-screen-button"
                    className="ds-app-field rounded-ds-lg"
                    value={welcomeScreenButtonLabel}
                    onChange={(e) => setWelcomeScreenButtonLabel(e.target.value)}
                    maxLength={WELCOME_SCREEN_BUTTON_LABEL_MAX}
                    disabled={!welcomeScreenEnabled}
                  />
                </div>
              </div>
              <div className="border-ds-outline-subtle space-y-4 rounded-ds-lg border p-4">
                <p className="text-ds-on-surface text-sm font-semibold">Social links</p>
                <p className="ds-app-body-muted -mt-2 text-sm">
                  Optional cards below the main welcome card. Replace the default links with your profiles. Links open in a new tab.
                </p>
                <div className="space-y-3">
                  <p className="text-ds-on-surface-variant text-xs font-semibold uppercase tracking-wide">
                    Link 1
                  </p>
                  <div>
                    <label htmlFor="appearance-social-1-label" className="text-ds-on-surface mb-1 block text-sm font-semibold">
                      Label
                    </label>
                    <input
                      id="appearance-social-1-label"
                      className="ds-app-field rounded-ds-lg"
                      value={socialLinks[0].label}
                      onChange={(e) => updateSocialLink(0, "label", e.target.value)}
                      maxLength={WELCOME_SCREEN_SOCIAL_LABEL_MAX}
                      disabled={!welcomeScreenEnabled}
                    />
                  </div>
                  <div>
                    <label htmlFor="appearance-social-1-url" className="text-ds-on-surface mb-1 block text-sm font-semibold">
                      URL
                    </label>
                    <input
                      id="appearance-social-1-url"
                      className="ds-app-field rounded-ds-lg"
                      value={socialLinks[0].url}
                      onChange={(e) => updateSocialLink(0, "url", e.target.value)}
                      maxLength={WELCOME_SCREEN_SOCIAL_URL_MAX}
                      placeholder="https://instagram.com/yourstore"
                      disabled={!welcomeScreenEnabled}
                    />
                  </div>
                </div>
                <div className="space-y-3">
                  <p className="text-ds-on-surface-variant text-xs font-semibold uppercase tracking-wide">
                    Link 2
                  </p>
                  <div>
                    <label htmlFor="appearance-social-2-label" className="text-ds-on-surface mb-1 block text-sm font-semibold">
                      Label
                    </label>
                    <input
                      id="appearance-social-2-label"
                      className="ds-app-field rounded-ds-lg"
                      value={socialLinks[1].label}
                      onChange={(e) => updateSocialLink(1, "label", e.target.value)}
                      maxLength={WELCOME_SCREEN_SOCIAL_LABEL_MAX}
                      disabled={!welcomeScreenEnabled}
                    />
                  </div>
                  <div>
                    <label htmlFor="appearance-social-2-url" className="text-ds-on-surface mb-1 block text-sm font-semibold">
                      URL
                    </label>
                    <input
                      id="appearance-social-2-url"
                      className="ds-app-field rounded-ds-lg"
                      value={socialLinks[1].url}
                      onChange={(e) => updateSocialLink(1, "url", e.target.value)}
                      maxLength={WELCOME_SCREEN_SOCIAL_URL_MAX}
                      placeholder="https://tiktok.com/@yourstore"
                      disabled={!welcomeScreenEnabled}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div>
            <p className="text-ds-on-surface mb-1 text-sm font-semibold">Brand color</p>
              <p className="ds-app-body-muted mb-4">Primary accent for launcher and default header tones.</p>
              <div className="flex flex-wrap items-center gap-2.5">
                <input
                  type="color"
                  className="border-ds-outline size-10 shrink-0 cursor-pointer rounded-ds-lg border bg-white p-1 sm:size-11"
                  value={formatHex(hex) ?? BRAND_COLOR_PRESETS[0].hex}
                  onChange={(e) => setHex(e.target.value.replace("#", ""))}
                  aria-label="Brand color picker"
                />
                {BRAND_COLOR_PRESETS.map((preset) => {
                  const presetHex = preset.hex.replace("#", "").toUpperCase();
                  const isSelected = presetHex === hex.toUpperCase();
                  return (
                    <button
                      key={preset.hex}
                      type="button"
                      onClick={() => setHex(presetHex)}
                      aria-label={preset.label}
                      title={preset.label}
                      className={cn(
                        "size-10 rounded-full border-2 transition-transform hover:scale-105 sm:size-11",
                        isSelected
                          ? "border-ds-primary ring-2 ring-ds-primary/25 ring-offset-2"
                          : "border-transparent"
                      )}
                      style={{ backgroundColor: preset.hex }}
                    />
                  );
                })}
                <div className="border-ds-outline-subtle ml-1 flex items-center overflow-hidden rounded-ds-md border">
                  <span className="ds-app-body-muted px-2 font-mono">#</span>
                  <input
                    className="ds-app-field w-24 border-0 py-2 font-mono text-xs uppercase focus:ring-0"
                    value={hex}
                    onChange={(e) => setHex(normaliseHex(e.target.value))}
                    aria-label="Hex color"
                    spellCheck={false}
                  />
                </div>
              </div>
              {!validHex && hex.length > 0 ? (
                <p className="mt-2 text-xs font-medium text-rose-600">Hex must be 6 characters (0-9, A-F).</p>
              ) : null}
            </div>

            <div>
              <p className="text-ds-on-surface mb-1 text-sm font-semibold">Widget position</p>
              <p className="ds-app-body-muted mb-3">Where the widget sits on the page.</p>
              <div role="radiogroup" aria-label="Widget position" className="grid grid-cols-2 gap-3">
                <PositionOption
                  value="bottom_left"
                  label="Bottom left"
                  checked={position === "bottom_left"}
                  onSelect={() => setPosition("bottom_left")}
                />
                <PositionOption
                  value="bottom_right"
                  label="Bottom right"
                  checked={position === "bottom_right"}
                  onSelect={() => setPosition("bottom_right")}
                />
              </div>
            </div>
          </div>
        </section>

        <section className="border-ds-outline bg-ds-surface rounded-ds-xl border p-6 shadow-sm">
          <h2 className="ds-app-section-title mb-1">Widget</h2>
          <p className="text-ds-on-surface-variant mb-6 text-sm leading-relaxed">
            Shape and a one-time attention animation on the storefront button.
          </p>

          <div className="space-y-6">
            <div>
              <p className="text-ds-on-surface mb-1 text-sm font-semibold">Corner radius</p>
              <p className="ds-app-body-muted mb-3">
                Square, rounded, or full circle. The white ring and animation follow this shape.
              </p>
              <div className="mb-4 flex flex-wrap gap-2">
                {WIDGET_BORDER_RADIUS_PRESETS.map((preset) => {
                  const selected = widgetBorderRadius === preset.value;
                  return (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => setWidgetBorderRadius(preset.value)}
                      className={cn(
                        "rounded-ds-md border px-3 py-1.5 text-sm font-medium transition-colors",
                        selected
                          ? "border-ds-primary bg-white text-ds-on-surface ring-2 ring-ds-primary/15"
                          : "border-ds-outline-subtle bg-ds-app-canvas/50 text-ds-on-surface-variant hover:border-ds-outline"
                      )}
                    >
                      {preset.label}
                    </button>
                  );
                })}
              </div>
              <div className="flex items-center gap-3">
                <input
                  id="appearance-widget-border-radius"
                  type="range"
                  min={WIDGET_BORDER_RADIUS_MIN}
                  max={WIDGET_BORDER_RADIUS_MAX}
                  step={1}
                  value={widgetBorderRadius}
                  onChange={(e) =>
                    setWidgetBorderRadius(clampWidgetBorderRadius(Number(e.target.value)))
                  }
                  aria-label="Widget corner radius"
                  className="text-ds-primary h-2 min-w-0 flex-1 cursor-pointer accent-ds-primary"
                />
                <span className="text-ds-on-surface-variant w-12 shrink-0 text-right font-mono text-xs">
                  {widgetBorderRadius}px
                </span>
              </div>
            </div>

            <div>
              <label className="flex cursor-pointer items-start gap-3">
                <input
                  type="checkbox"
                  className="border-ds-outline text-ds-primary mt-0.5 size-4 rounded border"
                  checked={widgetAnimationEnabled}
                  onChange={(e) => setWidgetAnimationEnabled(e.target.checked)}
                />
                <span>
                  <span className="text-ds-on-surface block text-sm font-semibold">
                    Attention animation
                  </span>
                  <span className="ds-app-body-muted mt-0.5 block text-sm">
                    Plays once when the page loads: a short brand-color arc on the white ring.
                  </span>
                </span>
              </label>
            </div>
          </div>
        </section>

        <section className="border-ds-outline bg-ds-surface rounded-ds-xl border p-6 shadow-sm">
          <div className="mb-6">
            <PlanFeatureLabel showCrown={widgetStyling.showCrown} className="mb-1">
              <h2 className="ds-app-section-title">Widget styling</h2>
            </PlanFeatureLabel>
            <p className="text-ds-on-surface-variant text-sm leading-relaxed">
              Dark mode and font for your storefront widget.
            </p>
          </div>

          <div className="space-y-6">
            <div>
              <PlanFeatureLabel showCrown={widgetStyling.showCrown} className="mb-1">
                <p className="text-ds-on-surface text-sm font-semibold">Theme</p>
              </PlanFeatureLabel>
              <p className="ds-app-body-muted mb-3">Light or dark chat panel styling.</p>
              <div role="radiogroup" aria-label="Widget theme" className="grid grid-cols-2 gap-3">
                <ThemeOption
                  value="light"
                  label="Light"
                  checked={themeMode === "light"}
                  disabled={widgetStyling.blockInteraction}
                  onSelect={() => setThemeMode("light")}
                />
                <ThemeOption
                  value="dark"
                  label="Dark"
                  checked={themeMode === "dark"}
                  disabled={widgetStyling.blockInteraction}
                  onSelect={() => setThemeMode("dark")}
                />
              </div>
            </div>

            <div>
              <PlanFeatureLabel showCrown={widgetStyling.showCrown} className="mb-1">
                <label htmlFor="widget-font" className="text-ds-on-surface block text-sm font-semibold">
                  Font
                </label>
              </PlanFeatureLabel>
              <p className="ds-app-body-muted mb-3">Typeface for widget copy on your site.</p>
              <select
                id="widget-font"
                className="ds-app-field w-full max-w-sm"
                value={fontFamily}
                disabled={widgetStyling.blockInteraction}
                onChange={(e) => setFontFamily(e.target.value as WidgetFontFamily)}
              >
                {WIDGET_FONT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </section>

        <section className="border-ds-outline bg-ds-surface rounded-ds-xl border p-6 shadow-sm">
          <div className="mb-6">
            <PlanFeatureLabel showCrown={widgetStyling.showCrown} className="mb-1">
              <h2 className="ds-app-section-title">Widget colors</h2>
            </PlanFeatureLabel>
            <p className="text-ds-on-surface-variant text-sm leading-relaxed">
              Override header, chat background, bubbles, and input area. Leave blank to use theme defaults.
            </p>
          </div>

          <div className="space-y-6">
            {WIDGET_COLOR_GROUPS.map((group) => {
              const groupFields = WIDGET_COLOR_FIELDS.filter((field) =>
                (group.fields as readonly string[]).includes(field.key)
              );
              return (
                <div key={group.title}>
                  <p className="text-ds-on-surface text-sm font-semibold">{group.title}</p>
                  <p className="ds-app-body-muted mb-3 text-xs">{group.description}</p>
                  <div className="space-y-4">
                    {groupFields.map((field) => {
                      const raw = customColors[field.key]?.replace("#", "") ?? "";
                      const swatchHex = swatchColorForField(field);
                      const hexIncomplete = raw.length > 0 && raw.length < 6;
                      const showFieldHeading =
                        groupFields.length > 1 || field.label !== group.title;
                      return (
                        <div
                          key={field.key}
                          className="border-ds-outline-subtle rounded-ds-lg border bg-ds-surface p-3"
                        >
                          {showFieldHeading ? (
                            <>
                              <p className="text-ds-on-surface text-sm font-medium">{field.label}</p>
                              <p className="ds-app-body-muted mb-2 text-xs">{field.hint}</p>
                            </>
                          ) : null}
                          <div className="flex flex-wrap items-center gap-2">
                            <input
                              type="color"
                              className="border-ds-outline size-10 shrink-0 cursor-pointer rounded-ds-lg border bg-white p-1 disabled:cursor-not-allowed disabled:opacity-60"
                              value={swatchHex}
                              disabled={widgetStyling.blockInteraction}
                              onChange={(e) => updateCustomColor(field.key, e.target.value)}
                              aria-label={`${field.label} color picker`}
                            />
                            <div className="border-ds-outline-subtle flex items-center overflow-hidden rounded-ds-md border bg-ds-surface">
                              <span className="ds-app-body-muted px-2 font-mono">#</span>
                              <input
                                className="ds-app-field w-24 border-0 bg-ds-surface py-2 font-mono text-xs uppercase focus:ring-0 disabled:cursor-not-allowed disabled:opacity-60"
                                value={raw}
                                placeholder={field.usesBrand ? "Brand" : "Auto"}
                                disabled={widgetStyling.blockInteraction}
                                onChange={(e) => updateCustomColor(field.key, e.target.value)}
                                aria-label={`${field.label} hex color`}
                                spellCheck={false}
                              />
                            </div>
                            {raw ? (
                              <button
                                type="button"
                                className="text-ds-on-surface-variant text-xs font-medium hover:text-ds-on-surface disabled:cursor-not-allowed disabled:opacity-60"
                                disabled={widgetStyling.blockInteraction}
                                onClick={() => updateCustomColor(field.key, "")}
                              >
                                Clear
                              </button>
                            ) : null}
                          </div>
                          {hexIncomplete ? (
                            <p className="mt-2 text-xs font-medium text-amber-700">
                              Enter 6 hex characters (e.g. FF24FF). Preview uses a padded color until
                              complete.
                            </p>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-6 flex justify-end">
            <button
              type="button"
              className={appButtonClassName("default", { size: "sm" })}
              disabled={widgetStyling.blockInteraction}
              onClick={resetAdvancedColors}
            >
              Reset to theme defaults
            </button>
          </div>
        </section>
      </div>

      <div className="lg:sticky lg:top-6 lg:self-start">
        <div className="mx-auto flex w-full max-w-[26rem] flex-col items-center">
          <div
            className="flex h-[min(37.5rem,85vh)] w-full flex-col overflow-hidden rounded-[28px] border border-ds-outline shadow-[0_20px_55px_rgba(15,23,42,0.06)]"
            style={{ backgroundColor: resolvedPreview.colors.panelBackground }}
          >
            {welcomeScreenEnabled && !previewChatOpen ? (
              <WidgetWelcomeScreen
                agentName={agentDisplayName}
                brandColorHex={previewBrandColor}
                panelBackgroundHex={resolvedPreview.colors.panelBackground}
                headline={welcomeScreenPreview.headline}
                headlineColor={welcomeScreenPreview.headlineColor}
                description={welcomeScreenPreview.description}
                buttonLabel={welcomeScreenPreview.buttonLabel}
                socialLinks={welcomeScreenPreview.socialLinks}
                websiteLogoUrl={websiteLogoUrl}
                websiteLogoPending={websiteLogoPending}
                hidePoweredBy={hidePoweredByPlan}
                className="min-h-0 flex-1"
                onChatClick={() => setPreviewChatOpen(true)}
              />
            ) : (
              <WidgetChatShell
                agentName={agentDisplayName}
                brandColorHex={previewBrandColor}
                widgetAppearance={previewAppearance}
                websiteLogoUrl={websiteLogoUrl}
                websiteLogoPending={websiteLogoPending}
                shellHeightClass="h-full"
                className="h-full max-w-none rounded-none border-0 shadow-none"
                footerBorderless
                onHeaderBack={
                  welcomeScreenEnabled ? () => setPreviewChatOpen(false) : undefined
                }
                headerBackLabel="Back to welcome screen"
                footer={
                  <>
                    <WidgetComposerPreview
                      brandColorHex={previewBrandColor}
                      accentColor={previewAccentColor}
                      className={hidePoweredByPlan ? "pb-3.5" : undefined}
                    />
                    {!hidePoweredByPlan ? (
                      <PoweredByChatRely compact className={WIDGET_POWERED_BY_STRIP_CLASS} />
                    ) : null}
                  </>
                }
              >
                <div className="h-full space-y-3 overflow-y-auto p-4 sm:p-5">
                  <WidgetWelcomeMessages
                    messages={previewWelcomeMessages}
                    resolved={resolvedPreview}
                    brandColorHex={previewBrandColor}
                    websiteLogoUrl={websiteLogoUrl}
                    websiteLogoPending={websiteLogoPending}
                  />
                </div>
              </WidgetChatShell>
            )}
          </div>
          <div
            className={cn(
              "mt-3 flex w-full shrink-0",
              position === "bottom_left" ? "justify-start" : "justify-end"
            )}
          >
            <WidgetBrandAvatar
              logoUrl={websiteLogoUrl}
              logoPending={websiteLogoPending}
              hasBrand
              chrome={previewAccentChrome}
              brandColorHex={previewAccentColor}
              size="launcher"
              borderRadius={widgetBorderRadius}
              animationEnabled={widgetAnimationEnabled}
              animationKey={previewAnimationKey}
            />
          </div>
        </div>
      </div>
    </div>

    <UnsavedChangesActionBar
      open={dirty}
      isSaving={isSaving}
      saveDisabled={!validHex}
      onSave={handleSave}
      onCancel={handleCancel}
    />
    </>
  );
}

function PositionOption({
  value,
  label,
  checked,
  onSelect,
}: {
  value: WidgetPosition;
  label: string;
  checked: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={checked}
      onClick={onSelect}
      className={cn(
        "rounded-ds-lg border p-3 text-left transition-colors",
        checked
          ? "border-ds-primary bg-white ring-2 ring-ds-primary/15"
          : "border-ds-outline-subtle bg-ds-app-canvas/50 hover:border-ds-outline"
      )}
    >
      <div className="border-ds-outline-subtle relative mb-2 aspect-video rounded-ds-sm border bg-white">
        <span
          className={cn(
            "bg-ds-primary absolute bottom-2 size-3 rounded-full",
            value === "bottom_left" ? "left-2" : "right-2"
          )}
        />
      </div>
      <span className={cn("text-xs", checked ? "font-semibold text-ds-on-surface" : "font-medium text-ds-on-surface")}>
        {label}
      </span>
    </button>
  );
}

function ThemeOption({
  value,
  label,
  checked,
  disabled = false,
  onSelect,
}: {
  value: WidgetThemeMode;
  label: string;
  checked: boolean;
  disabled?: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={checked}
      disabled={disabled}
      onClick={onSelect}
      className={cn(
        "rounded-ds-lg border p-3 text-left transition-colors",
        checked
          ? "border-ds-primary bg-white ring-2 ring-ds-primary/15"
          : "border-ds-outline-subtle bg-ds-app-canvas/50 hover:border-ds-outline",
        disabled && "cursor-not-allowed border-dashed border-amber-200/80 opacity-55"
      )}
    >
      <div
        className={cn(
          "border-ds-outline-subtle mb-2 aspect-video rounded-ds-sm border",
          value === "dark" ? "bg-slate-900" : "bg-white"
        )}
      />
      <span className={cn("text-xs", checked ? "font-semibold text-ds-on-surface" : "font-medium text-ds-on-surface")}>
        {label}
      </span>
    </button>
  );
}

