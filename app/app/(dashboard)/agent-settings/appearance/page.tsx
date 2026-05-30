"use client";

import { useEffect, useMemo, useState } from "react";
import { PoweredByChatRely } from "@/components/branding/powered-by-chatrely";
import { WidgetChatShell } from "@/components/chat/widget-chat-shell";
import { WidgetBrandAvatar } from "@/components/chat/widget-brand-avatar";
import { useAgentIntegrationsBootstrap } from "@/components/integrations/use-agent-integrations-bootstrap";
import { AgentSettingsShell } from "@/components/agent-settings/agent-settings-shell";
import { useDashboardAgent } from "@/components/layout/dashboard-agent-context";
import { useMeContext } from "@/components/layout/me-context-provider";
import { backendFetch } from "@/lib/backend-api";
import { BRAND_COLOR_PRESETS } from "@/lib/brand-color-presets";
import {
  formatHex,
  mergeBehaviorSettings,
  normaliseHex,
  readBehaviorString,
  type WidgetPosition,
} from "@/lib/agent-settings";
import { brandChromeClasses, parseBrandColorHex, previewAssistantLineForTone } from "@/lib/brand-chrome";
import { planHidesPoweredByChatrely } from "@/lib/widget-branding";
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

  const initialBrand = parseBrandColorHex(selectedAgent?.behavior_settings?.brand_color) ?? BRAND_COLOR_PRESETS[0].hex;
  const initialPosition = (() => {
    const raw = readBehaviorString(selectedAgent?.behavior_settings, "widget_position");
    return raw === "bottom_left" ? "bottom_left" : "bottom_right";
  })();

  const [hex, setHex] = useState<string>(initialBrand.replace("#", ""));
  const [position, setPosition] = useState<WidgetPosition>(initialPosition);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  useEffect(() => {
    const nextHex = initialBrand.replace("#", "");
    queueMicrotask(() => {
      setHex(nextHex);
      setPosition(initialPosition);
      setError(null);
      setSavedAt(null);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAgent?.id]);

  const previewBrandColor = useMemo(() => {
    const formatted = formatHex(hex);
    return formatted ?? BRAND_COLOR_PRESETS[0].hex;
  }, [hex]);

  const previewBrandChrome = useMemo(() => brandChromeClasses(previewBrandColor), [previewBrandColor]);

  const agentDisplayName = selectedAgent?.name?.trim() || "Support";

  const websiteLogoPending = Boolean(selectedAgentId && integrationsLoading);
  const websiteLogoUrl = useMemo(() => {
    if (!selectedAgentId || integrationsLoading) return null;
    const raw = integrationsWebsitePreview?.source_url?.trim();
    if (!raw) return null;
    return faviconServiceUrl(raw) || null;
  }, [selectedAgentId, integrationsLoading, integrationsWebsitePreview?.source_url]);

  const previewMessage = useMemo(() => {
    const greeting = readBehaviorString(selectedAgent?.behavior_settings, "greeting_message").trim();
    if (greeting) return greeting;
    return previewAssistantLineForTone(readBehaviorString(selectedAgent?.behavior_settings, "tone"));
  }, [selectedAgent?.behavior_settings]);

  const hidePoweredByPlan = useMemo(
    () => !meLoading && planHidesPoweredByChatrely(meData?.plan.slug),
    [meLoading, meData?.plan.slug]
  );

  const dirty = useMemo(() => {
    const formatted = formatHex(hex) ?? "";
    return formatted !== initialBrand || position !== initialPosition;
  }, [hex, position, initialBrand, initialPosition]);

  const validHex = formatHex(hex) !== null;

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
      const merged = mergeBehaviorSettings(selectedAgent?.behavior_settings, {
        brand_color: formatted,
        widget_position: position,
      });
      await backendFetch(`/api/v1/agents/${selectedAgentId}`, {
        method: "PATCH",
        body: JSON.stringify({ behavior_settings: merged }),
      });
      await refreshAgents();
      setSavedAt(Date.now());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save appearance settings");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)] lg:items-stretch">
      <section className="border-ds-outline rounded-ds-xl border bg-ds-surface p-6 shadow-sm">
        <h2 className="ds-app-section-title mb-1">Appearance</h2>
        <p className="text-ds-on-surface-variant mb-6 text-sm leading-relaxed">
          Brand color and launcher position for your storefront widget.
        </p>

        <div className="space-y-6">
          <div>
            <p className="text-ds-on-surface mb-1 text-sm font-semibold">Brand color</p>
            <p className="ds-app-body-muted mb-4">Header and launcher accent on your site.</p>
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
              <div className="border-ds-outline ml-1 flex items-center overflow-hidden rounded-ds-md border">
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

          {error ? <p className="text-sm font-medium text-rose-600">{error}</p> : null}
          {savedAt ? (
            <p className="text-sm font-medium text-emerald-600">
              Saved. Your live widget picks this up automatically. You do not need to change your embed code.
            </p>
          ) : null}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={handleSave}
              disabled={!dirty || isSaving || !validHex}
              className={appButtonClassName()}
            >
              {isSaving ? "Saving..." : "Save changes"}
            </button>
          </div>
        </div>
      </section>

      <section className="border-ds-outline flex min-h-0 flex-col rounded-ds-xl border bg-ds-sidebar/40 p-6 shadow-sm">
        <p className="ds-app-kicker mb-5 shrink-0 font-semibold">Customer preview</p>
        <div className="mx-auto flex w-full max-w-[26rem] flex-col items-center max-lg:min-h-0 lg:min-h-0 lg:flex-1">
          <WidgetChatShell
            agentName={agentDisplayName}
            brandColorHex={previewBrandColor}
            websiteLogoUrl={websiteLogoUrl}
            websiteLogoPending={websiteLogoPending}
            className="w-full lg:flex-1"
            shellHeightClass="min-h-[30rem] w-full sm:min-h-[32rem] lg:min-h-0 lg:h-full"
            footer={
              <div className="flex flex-col">
                <div className="border-ds-outline px-3 py-2.5">
                  <div className="rounded-ds-md border border-ds-outline bg-ds-sidebar px-3 py-2 text-xs text-ds-on-surface-variant">
                    Write a message…
                  </div>
                </div>
                {!hidePoweredByPlan ? (
                  <PoweredByChatRely compact className="bg-transparent px-3 pb-2.5 pt-0" />
                ) : null}
              </div>
            }
          >
            <div className="flex min-h-0 flex-1 flex-col overflow-y-auto bg-ds-sidebar p-3 sm:p-4">
              <div className="border-ds-outline max-w-[92%] rounded-2xl rounded-tl-sm border bg-white px-3 py-2.5 text-xs leading-relaxed text-ds-on-surface sm:text-sm">
                {previewMessage}
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
      </section>
    </div>
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
          : "border-ds-outline bg-ds-sidebar/50 hover:border-black/45"
      )}
    >
      <div className="border-ds-outline relative mb-2 aspect-video rounded-ds-sm border bg-white">
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
