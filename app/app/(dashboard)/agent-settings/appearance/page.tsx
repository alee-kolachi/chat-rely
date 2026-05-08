"use client";

import { useEffect, useMemo, useState } from "react";
import { backendFetch } from "@/lib/backend-api";
import { brandChromeClasses, parseBrandColorHex, previewAssistantLineForTone } from "@/lib/brand-chrome";
import { useDashboardAgent } from "@/components/layout/dashboard-agent-context";
import { AgentSettingsShell } from "@/components/agent-settings/agent-settings-shell";
import {
  BRAND_COLOR_SWATCHES,
  formatHex,
  mergeBehaviorSettings,
  normaliseHex,
  readBehaviorString,
  type WidgetPosition,
} from "@/lib/agent-settings";
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

  const initialBrand = parseBrandColorHex(selectedAgent?.behavior_settings?.brand_color) ?? "#000000";
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
    const nextPosition = initialPosition;
    queueMicrotask(() => {
      setHex(nextHex);
      setPosition(nextPosition);
      setError(null);
      setSavedAt(null);
    });
    // Initialize from selectedAgent only when agent identity changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAgent?.id]);

  const previewBrandColor = useMemo(() => {
    const formatted = formatHex(hex);
    return formatted ?? BRAND_COLOR_SWATCHES[0];
  }, [hex]);

  const previewBrandChrome = useMemo(() => brandChromeClasses(previewBrandColor), [previewBrandColor]);
  const previewToneLine = previewAssistantLineForTone(
    readBehaviorString(selectedAgent?.behavior_settings, "tone")
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
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,400px)]">
      <section className="border-ds-outline rounded-ds-xl border bg-ds-surface p-6 shadow-sm">
        <h2 className="ds-app-section-title mb-1 text-base">Appearance</h2>
        <p className="text-ds-on-surface-variant mb-6 text-sm leading-relaxed">
          Pick the brand color and corner position the widget uses on your storefront.
        </p>

        <div className="space-y-6">
          <div>
            <p className="text-ds-on-surface mb-1 text-sm font-semibold">Brand color</p>
            <p className="text-ds-on-surface-variant mb-4 text-xs leading-relaxed">
              Used for the launcher button and chat header accent.
            </p>
            <div className="flex flex-wrap items-center gap-2">
              {BRAND_COLOR_SWATCHES.map((swatch) => {
                const swatchHex = swatch.replace("#", "").toUpperCase();
                const isSelected = swatchHex === hex.toUpperCase();
                return (
                  <button
                    key={swatch}
                    type="button"
                    onClick={() => setHex(swatchHex)}
                    aria-label={`Brand color ${swatch}`}
                    className={cn(
                      "size-10 rounded-full border-2 transition-transform hover:scale-105",
                      isSelected
                        ? "border-ds-primary ring-2 ring-ds-primary/25 ring-offset-2"
                        : "border-transparent"
                    )}
                    style={{ backgroundColor: swatch }}
                  />
                );
              })}
              <div className="border-ds-outline ml-1 flex items-center overflow-hidden rounded-ds-md border">
                <span className="text-ds-on-surface-variant px-2 font-mono text-xs">#</span>
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
            <p className="text-ds-on-surface-variant mb-3 text-xs leading-relaxed">
              Where the launcher appears on the page.
            </p>
            <div
              role="radiogroup"
              aria-label="Widget position"
              className="grid grid-cols-2 gap-3"
            >
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
          {savedAt ? <p className="text-sm font-medium text-emerald-600">Saved.</p> : null}

          <div className="border-ds-outline flex justify-end gap-3 border-t pt-4">
            <button
              type="button"
              onClick={handleSave}
              disabled={!dirty || isSaving || !validHex}
              className={cn(
                "rounded-ds-lg px-5 py-2 text-sm font-semibold shadow-sm transition-colors",
                dirty && !isSaving && validHex
                  ? "bg-ds-primary text-ds-on-primary hover:bg-ds-secondary"
                  : "bg-ds-outline/40 text-ds-on-surface-variant cursor-not-allowed"
              )}
            >
              {isSaving ? "Saving..." : "Save changes"}
            </button>
          </div>
        </div>
      </section>

      <section className="border-ds-outline rounded-ds-xl border bg-ds-sidebar/40 p-6 shadow-sm">
        <p className="text-ds-on-surface-variant mb-4 text-[11px] font-semibold tracking-[0.18em] uppercase">
          Live preview
        </p>
        <div className="mx-auto flex w-full max-w-[340px] flex-col items-center">
          <div
            role="region"
            aria-label="Chat widget preview"
            className="border-ds-outline flex min-h-[20rem] w-full flex-col overflow-hidden rounded-2xl border bg-white shadow-xl"
          >
            <div
              className="flex shrink-0 items-center gap-2 px-4 py-3"
              style={{ backgroundColor: previewBrandColor }}
            >
              <span className={cn("size-2 shrink-0 rounded-full shadow-sm", previewBrandChrome.dotClass)} aria-hidden />
              <span className={cn("text-sm font-semibold", previewBrandChrome.titleClass)}>
                {selectedAgent?.name?.trim() || "Chat"}
              </span>
            </div>
            <div className="bg-ds-sidebar min-h-0 flex-1 overflow-y-auto p-3">
              <div className="border-ds-outline rounded-2xl rounded-tl-sm border bg-white px-3 py-2.5 text-xs leading-relaxed text-ds-on-surface">
                {previewToneLine}
              </div>
            </div>
            <div className="border-ds-outline shrink-0 border-t bg-white px-3 py-2.5">
              <div className="rounded-ds-md border border-ds-outline bg-ds-sidebar px-3 py-2 text-xs text-ds-on-surface-variant">
                Write a message...
              </div>
            </div>
          </div>
          <div className={cn("mt-3 flex w-full", position === "bottom_left" ? "justify-start" : "justify-end")}>
            <div
              className={cn(
                "pointer-events-none flex size-14 items-center justify-center rounded-full border border-black/10 text-xl shadow-[0_10px_25px_rgba(15,23,42,0.22)] ring-4 ring-white",
                previewBrandChrome.fabIconClass
              )}
              style={{ backgroundColor: previewBrandColor }}
              aria-hidden
            >
              💬
            </div>
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
          : "border-ds-outline bg-ds-sidebar/50 hover:border-ds-primary/50"
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
