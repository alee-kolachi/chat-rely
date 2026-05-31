"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { PoweredByChatRely } from "@/components/branding/powered-by-chatrely";
import {
  WidgetChatShell,
  WidgetPreviewAssistantBubble,
  WidgetPreviewUserBubble,
} from "@/components/chat/widget-chat-shell";
import { MessageTimestamp, UserBubbleBody } from "@/components/chat/message-timestamp";
import { WidgetBrandAvatar } from "@/components/chat/widget-brand-avatar";
import { useAgentIntegrationsBootstrap } from "@/components/integrations/use-agent-integrations-bootstrap";
import { AgentSettingsShell } from "@/components/agent-settings/agent-settings-shell";
import { PlanTierBadge } from "@/components/ui/plan-tier-badge";
import { PlanGatedBlock } from "@/components/ui/plan-unlock-footer";
import { UnsavedChangesActionBar } from "@/components/ui/unsaved-changes-action-bar";
import { useDashboardAgent } from "@/components/layout/dashboard-agent-context";
import { useMeContext } from "@/components/layout/me-context-provider";
import { backendFetch } from "@/lib/backend-api";
import { BRAND_COLOR_PRESETS } from "@/lib/brand-color-presets";
import {
  WELCOME_MESSAGE_MAX,
  defaultWelcomeMessage,
  effectiveWelcomeMessage,
  formatHex,
  mergeBehaviorSettings,
  normaliseHex,
  readBehaviorString,
  type WidgetPosition,
} from "@/lib/agent-settings";
import { brandChromeClasses } from "@/lib/brand-chrome";
import { planAllowsAdvancedAppearance, planHidesPoweredByChatrely } from "@/lib/widget-branding";
import {
  readWidgetAppearance,
  resolveWidgetAppearance,
  sanitizeWidgetAppearanceForPlan,
  widgetAppearanceToPayload,
  WIDGET_COLOR_FIELDS,
  WIDGET_COLOR_GROUPS,
  WIDGET_FONT_OPTIONS,
  type WidgetAppearanceColors,
  type WidgetAppearanceSettings,
  type WidgetFontFamily,
  type WidgetThemeMode,
} from "@/lib/widget-appearance";
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

  const planSlug = meData?.plan.slug ?? null;
  const proAppearance = planAllowsAdvancedAppearance(planSlug);

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

  const initialGreeting = useMemo(
    () => readBehaviorString(selectedAgent?.behavior_settings, "greeting_message"),
    [selectedAgent?.behavior_settings]
  );

  const [hex, setHex] = useState<string>(initialBrand.replace("#", ""));
  const [position, setPosition] = useState<WidgetPosition>(initialPosition);
  const [welcome, setWelcome] = useState<string>(initialGreeting);
  const [themeMode, setThemeMode] = useState<WidgetThemeMode>(initialAppearance.theme_mode ?? "light");
  const [fontFamily, setFontFamily] = useState<WidgetFontFamily>(
    initialAppearance.font_family ?? "geist"
  );
  const [customColors, setCustomColors] = useState<WidgetAppearanceColors>(
    initialAppearance.colors ?? {}
  );
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  useEffect(() => {
    queueMicrotask(() => {
      setHex(initialBrand.replace("#", ""));
      setPosition(initialPosition);
      setWelcome(initialGreeting);
      setThemeMode(initialAppearance.theme_mode ?? "light");
      setFontFamily(initialAppearance.font_family ?? "geist");
      setCustomColors(initialAppearance.colors ?? {});
      setError(null);
      setSavedAt(null);
    });
  }, [selectedAgent?.id, initialBrand, initialPosition, initialGreeting, initialAppearance]);

  const previewBrandColor = useMemo(() => formatHex(hex) ?? BRAND_COLOR_PRESETS[0].hex, [hex]);

  const draftAppearance: WidgetAppearanceSettings = useMemo(
    () => ({
      theme_mode: themeMode,
      font_family: fontFamily,
      colors: Object.keys(customColors).length > 0 ? customColors : undefined,
    }),
    [themeMode, fontFamily, customColors]
  );

  const previewAppearance = proAppearance ? draftAppearance : {};
  const resolvedPreview = useMemo(
    () => resolveWidgetAppearance(previewAppearance, previewBrandColor),
    [previewAppearance, previewBrandColor]
  );
  const previewSampleTimestamp = useMemo(() => new Date().toISOString(), []);
  const previewBrandChrome = useMemo(
    () => brandChromeClasses(resolvedPreview.colors.header),
    [resolvedPreview.colors.header]
  );

  const agentDisplayName = selectedAgent?.name?.trim() || "Support";

  const websiteLogoPending = Boolean(selectedAgentId && integrationsLoading);
  const websiteLogoUrl = useMemo(() => {
    if (!selectedAgentId || integrationsLoading) return null;
    const raw = integrationsWebsitePreview?.source_url?.trim();
    if (!raw) return null;
    return faviconServiceUrl(raw) || null;
  }, [selectedAgentId, integrationsLoading, integrationsWebsitePreview?.source_url]);

  const previewMessage = useMemo(() => {
    const behavior = {
      ...(selectedAgent?.behavior_settings ?? {}),
      greeting_message: welcome.trim() || undefined,
    };
    return effectiveWelcomeMessage(behavior, agentDisplayName);
  }, [selectedAgent?.behavior_settings, welcome, agentDisplayName]);

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
      welcome.trim() !== initialGreeting.trim() ||
      appearanceDirty
    );
  }, [hex, position, welcome, initialBrand, initialPosition, initialGreeting, appearanceDirty]);

  const validHex = formatHex(hex) !== null;

  function updateCustomColor(key: keyof WidgetAppearanceColors, value: string) {
    const formatted = formatHex(value);
    setCustomColors((prev) => {
      const next = { ...prev };
      if (!formatted) {
        delete next[key];
        return next;
      }
      next[key] = formatted;
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
    setIsSaving(true);
    setError(null);
    setSavedAt(null);
    try {
      const appearancePayload = proAppearance ? widgetAppearanceToPayload(draftAppearance) : undefined;
      const partial: Record<string, unknown> = {
        brand_color: formatted,
        widget_position: position,
        greeting_message: welcome.trim() || undefined,
      };
      if (proAppearance) {
        partial.widget_appearance = appearancePayload ?? {};
      }
      let merged = mergeBehaviorSettings(selectedAgent?.behavior_settings, partial);
      if (!welcome.trim()) delete (merged as Record<string, unknown>).greeting_message;
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
    setWelcome(initialGreeting);
    setThemeMode(initialAppearance.theme_mode ?? "light");
    setFontFamily(initialAppearance.font_family ?? "geist");
    setCustomColors(initialAppearance.colors ?? {});
    setError(null);
    setSavedAt(null);
  }

  function swatchColorForField(field: (typeof WIDGET_COLOR_FIELDS)[number]): string {
    const custom = formatHex(customColors[field.key]?.replace("#", "") ?? "");
    if (custom) return custom;
    if (field.usesBrand) return previewBrandColor;
    const c = resolvedPreview.colors;
    switch (field.key) {
      case "header":
        return c.header;
      case "user_bubble":
        return c.userBubble;
      case "panel_background":
        return c.panelBackground;
      case "assistant_bubble":
        return c.assistantBubble;
      case "assistant_bubble_border":
        return c.assistantBubbleBorder;
      case "composer_background":
        return c.composerBackground;
      default:
        return previewBrandColor;
    }
  }

  return (
    <>
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)] lg:items-stretch">
      <div className="space-y-6">
        {error ? <p className="text-sm font-medium text-rose-600">{error}</p> : null}
        {savedAt ? (
          <p className="text-sm font-medium text-emerald-600">
            Saved. Your live widget picks this up automatically. You do not need to change your embed code.
          </p>
        ) : null}
        <section className="border-ds-outline bg-ds-surface rounded-ds-xl border p-6 shadow-sm">
          <h2 className="ds-app-section-title mb-1">Basics</h2>
        <p className="text-ds-on-surface-variant mb-6 text-sm leading-relaxed">
          Brand color, welcome message, and launcher position for your storefront widget.
        </p>

        <div className="space-y-6">
          <div>
            <label htmlFor="appearance-welcome-message" className="text-ds-on-surface mb-1 block text-sm font-semibold">
              Welcome message <span className="text-ds-on-surface-variant font-normal">(optional)</span>
            </label>
            <p className="ds-app-body-muted mb-2">
              First message customers see when they open chat. Leave blank to use:{" "}
              {defaultWelcomeMessage(agentDisplayName)}
            </p>
            <textarea
              id="appearance-welcome-message"
              className="ds-app-field min-h-[5rem] rounded-ds-lg leading-relaxed"
              value={welcome}
              onChange={(e) => setWelcome(e.target.value)}
              maxLength={WELCOME_MESSAGE_MAX}
              placeholder={defaultWelcomeMessage(agentDisplayName)}
            />
            <p className="text-ds-on-surface-variant mt-1 text-right text-[11px] tabular-nums">
              {welcome.length}/{WELCOME_MESSAGE_MAX}
            </p>
          </div>

          <div>
            <p className="text-ds-on-surface mb-1 text-sm font-semibold">Brand color</p>
              <p className="ds-app-body-muted mb-4">Primary accent for launcher and default header tones.</p>
              <div className="flex flex-wrap items-center gap-2.5">
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
              <p className="ds-app-body-muted mb-3">Where the launcher sits on the page.</p>
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
          <div className="mb-6">
            <div className="mb-1 flex items-center gap-2">
              <h2 className="ds-app-section-title">Widget styling</h2>
              {!proAppearance ? <PlanTierBadge tier="pro" /> : null}
            </div>
            <p className="text-ds-on-surface-variant text-sm leading-relaxed">
              Dark mode, fonts, and per-area colors for a white-label storefront widget.
            </p>
          </div>

          <PlanGatedBlock
            locked={!proAppearance}
            tier="pro"
            inset
            calloutMessage="Pro plan required for widget styling"
            contentClassName="space-y-6"
          >
            <div>
              <div className="mb-4">
                <p className="text-ds-on-surface text-sm font-semibold">Theme &amp; font</p>
              </div>
              <div className="space-y-6">
            <div>
              <p className="text-ds-on-surface mb-1 text-sm font-semibold">Theme</p>
              <p className="ds-app-body-muted mb-3">Light or dark chat panel styling.</p>
              <div role="radiogroup" aria-label="Widget theme" className="grid grid-cols-2 gap-3">
                <ThemeOption
                  value="light"
                  label="Light"
                  checked={themeMode === "light"}
                  disabled={!proAppearance}
                  onSelect={() => setThemeMode("light")}
                />
                <ThemeOption
                  value="dark"
                  label="Dark"
                  checked={themeMode === "dark"}
                  disabled={!proAppearance}
                  onSelect={() => setThemeMode("dark")}
                />
              </div>
            </div>

            <div>
              <label htmlFor="widget-font" className="text-ds-on-surface mb-1 block text-sm font-semibold">
                Font
              </label>
              <p className="ds-app-body-muted mb-3">Typeface for widget copy on your site.</p>
              <select
                id="widget-font"
                className="ds-app-field w-full max-w-sm"
                value={fontFamily}
                disabled={!proAppearance}
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
            </div>

            <div>
              <p className="text-ds-on-surface mb-4 text-sm font-semibold">Widget colors</p>
              <p className="ds-app-body-muted mb-4 text-sm">
                Override header, chat background, bubbles, and input area. Leave blank to use theme defaults.
              </p>
              <div className="space-y-6">
                {WIDGET_COLOR_GROUPS.map((group) => (
                  <div key={group.title}>
                    <p className="text-ds-on-surface text-sm font-semibold">{group.title}</p>
                    <p className="ds-app-body-muted mb-3 text-xs">{group.description}</p>
                    <div className="space-y-4">
                      {WIDGET_COLOR_FIELDS.filter((field) =>
                        (group.fields as readonly string[]).includes(field.key)
                      ).map((field) => {
                        const raw = customColors[field.key]?.replace("#", "") ?? "";
                        const swatchHex = swatchColorForField(field);
                        return (
                          <div
                            key={field.key}
                            className="border-ds-outline-subtle rounded-ds-lg border bg-ds-app-canvas/60 p-3"
                          >
                            <p className="text-ds-on-surface text-sm font-medium">{field.label}</p>
                            <p className="ds-app-body-muted mb-2 text-xs">{field.hint}</p>
                            <div className="flex flex-wrap items-center gap-2">
                              <span
                                className="border-ds-outline-subtle size-8 shrink-0 rounded-ds-md border"
                                style={{ backgroundColor: swatchHex }}
                                aria-hidden
                              />
                              <div className="border-ds-outline-subtle flex items-center overflow-hidden rounded-ds-md border">
                                <span className="ds-app-body-muted px-2 font-mono">#</span>
                                <input
                                  className="ds-app-field ds-app-field-canvas w-24 border-0 py-2 font-mono text-xs uppercase focus:ring-0"
                                  value={raw}
                                  placeholder={field.usesBrand ? "Brand" : "Auto"}
                                  disabled={!proAppearance}
                                  onChange={(e) => updateCustomColor(field.key, e.target.value)}
                                  aria-label={`${field.label} hex color`}
                                  spellCheck={false}
                                />
                              </div>
                              {raw ? (
                                <button
                                  type="button"
                                  className="text-ds-on-surface-variant text-xs font-medium hover:text-ds-on-surface"
                                  disabled={!proAppearance}
                                  onClick={() => updateCustomColor(field.key, "")}
                                >
                                  Clear
                                </button>
                              ) : null}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
                <button
                  type="button"
                  className="text-ds-on-surface-variant text-xs font-medium hover:text-ds-on-surface"
                  disabled={!proAppearance}
                  onClick={resetAdvancedColors}
                >
                  Reset widget colors to theme defaults
                </button>
              </div>
            </div>
          </PlanGatedBlock>
        </section>
      </div>

      <div className="lg:sticky lg:top-6 lg:self-start">
        <div className="mx-auto flex w-full max-w-[26rem] flex-col items-center">
          <WidgetChatShell
            agentName={agentDisplayName}
            brandColorHex={previewBrandColor}
            widgetAppearance={previewAppearance}
            websiteLogoUrl={websiteLogoUrl}
            websiteLogoPending={websiteLogoPending}
            className="w-full"
            shellHeightClass="h-[min(37.5rem,85vh)] w-full"
            footer={
              <div className="flex flex-col">
                <div className="px-3 py-2.5">
                  <div
                    className="text-ds-on-surface-variant rounded-ds-md border px-3 py-2 text-xs shadow-ds-sm"
                    style={{
                      backgroundColor: resolvedPreview.colors.composerBackground,
                      borderColor: "#d1d5db",
                      color: resolvedPreview.colors.textMuted,
                    }}
                  >
                    Write a message…
                  </div>
                </div>
                {!hidePoweredByPlan ? (
                  <PoweredByChatRely compact className="bg-transparent px-3 pb-2.5 pt-0" />
                ) : null}
              </div>
            }
          >
            <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-3 sm:p-4">
              <WidgetPreviewAssistantBubble resolved={resolvedPreview}>
                <div>
                  {previewMessage}
                  <div className="mt-1 flex justify-end">
                    <MessageTimestamp variant="bubble" value={previewSampleTimestamp} />
                  </div>
                </div>
              </WidgetPreviewAssistantBubble>
              <div className="flex justify-end">
                <WidgetPreviewUserBubble resolved={resolvedPreview}>
                  <UserBubbleBody
                    timestamp={
                      <MessageTimestamp
                        variant="bubble"
                        value={previewSampleTimestamp}
                        tone="on-primary"
                      />
                    }
                  >
                    Sample visitor reply
                  </UserBubbleBody>
                </WidgetPreviewUserBubble>
              </div>
            </div>
          </WidgetChatShell>
          <div
            className={cn(
              "mt-3 flex w-full shrink-0",
              position === "bottom_left" ? "justify-start" : "justify-end"
            )}
          >
            <WidgetBrandAvatar
              logoUrl={websiteLogoUrl}
              logoPending={websiteLogoPending}
              hasBrand={Boolean(previewBrandColor)}
              chrome={previewBrandChrome}
              brandColorHex={previewBrandColor}
              size="launcher"
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
