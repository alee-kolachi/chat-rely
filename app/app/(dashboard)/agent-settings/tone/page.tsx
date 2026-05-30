"use client";

import { useEffect, useMemo, useState } from "react";
import { backendFetch } from "@/lib/backend-api";
import { previewAssistantLineForTone } from "@/lib/brand-chrome";
import { useDashboardAgent } from "@/components/layout/dashboard-agent-context";
import { AgentSettingsShell } from "@/components/agent-settings/agent-settings-shell";
import {
  TONE_OPTIONS,
  type AgentTone,
  mergeBehaviorSettings,
  readBehaviorString,
} from "@/lib/agent-settings";
import { appButtonClassName } from "@/lib/button-styles";
import { cn } from "@/lib/utils";

export default function AgentSettingsTonePage() {
  return (
    <AgentSettingsShell active="tone">
      <ToneForm />
    </AgentSettingsShell>
  );
}

function ToneForm() {
  const { selectedAgent, selectedAgentId, refreshAgents } = useDashboardAgent();

  const initialTone = (() => {
    const raw = readBehaviorString(selectedAgent?.behavior_settings, "tone");
    return TONE_OPTIONS.includes(raw as AgentTone) ? (raw as AgentTone) : "Friendly";
  })();
  const initialDescription = readBehaviorString(selectedAgent?.behavior_settings, "tone_description");

  const [tone, setTone] = useState<AgentTone>(initialTone);
  const [description, setDescription] = useState<string>(initialDescription);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  useEffect(() => {
    const nextTone = initialTone;
    const nextDescription = initialDescription;
    queueMicrotask(() => {
      setTone(nextTone);
      setDescription(nextDescription);
      setError(null);
      setSavedAt(null);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAgent?.id]);

  const dirty = useMemo(
    () => tone !== initialTone || description.trim() !== initialDescription.trim(),
    [tone, description, initialTone, initialDescription]
  );

  async function handleSave() {
    if (!selectedAgentId || isSaving || !dirty) return;
    setIsSaving(true);
    setError(null);
    setSavedAt(null);
    try {
      const merged = mergeBehaviorSettings(selectedAgent?.behavior_settings, {
        tone,
        tone_description: description.trim() || undefined,
      });
      // If user cleared the description we want to remove the key from JSON.
      if (!description.trim()) {
        delete (merged as Record<string, unknown>).tone_description;
      }
      await backendFetch(`/api/v1/agents/${selectedAgentId}`, {
        method: "PATCH",
        body: JSON.stringify({ behavior_settings: merged }),
      });
      await refreshAgents();
      setSavedAt(Date.now());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save tone settings");
    } finally {
      setIsSaving(false);
    }
  }

  const previewLine = previewAssistantLineForTone(tone);

  return (
    <div className="space-y-6">
      <section className="border-ds-outline rounded-ds-xl border bg-ds-surface p-6 shadow-sm">
        <h2 className="ds-app-section-title mb-1">Tone</h2>
        <p className="text-ds-on-surface-variant mb-6 text-sm leading-relaxed">
          Sets the default phrasing style. Replies are nudged toward this voice in the system prompt.
        </p>

        <div className="space-y-6">
          <div>
            <p className="text-ds-on-surface mb-3 text-sm font-semibold">Default tone</p>
            <div
              role="radiogroup"
              aria-label="Default tone"
              className="bg-ds-sidebar border-ds-outline flex flex-col gap-1 rounded-ds-md border p-1 sm:flex-row sm:gap-0"
            >
              {TONE_OPTIONS.map((option) => (
                <button
                  key={option}
                  type="button"
                  role="radio"
                  aria-checked={tone === option}
                  onClick={() => setTone(option)}
                  className={cn(
                    "w-full rounded-ds-sm px-3 py-2.5 text-sm font-medium transition-all sm:flex-1",
                    tone === option
                      ? "bg-white text-ds-on-surface shadow-sm"
                      : "text-ds-on-surface-variant hover:text-ds-on-surface"
                  )}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label htmlFor="tone-description" className="text-ds-on-surface mb-1 block text-sm font-semibold">
              Custom guidance <span className="text-ds-on-surface-variant font-normal">(optional)</span>
            </label>
            <p className="ds-app-body-muted mb-2">
              Style notes for the agent, e.g. &ldquo;use British English, never use emojis,
              keep sentences under 20 words&rdquo;.
            </p>
            <textarea
              id="tone-description"
              className="ds-app-field min-h-[6.5rem] rounded-ds-lg leading-relaxed"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={1000}
              placeholder="Optional: how should the agent sound beyond the preset above?"
            />
            <p className="text-ds-on-surface-variant mt-1 text-right text-[11px] tabular-nums">
              {description.length}/1000
            </p>
          </div>

          <div className="border-ds-outline rounded-ds-md border bg-ds-sidebar/50 p-4">
            <p className="text-ds-on-surface-variant mb-1 text-[11px] font-semibold tracking-wide uppercase">
              Sample reply
            </p>
            <p className="text-ds-on-surface text-sm leading-relaxed">{previewLine}</p>
          </div>

          {error ? <p className="text-sm font-medium text-rose-600">{error}</p> : null}
          {savedAt ? <p className="text-sm font-medium text-emerald-600">Saved.</p> : null}

          <div className="border-ds-outline flex justify-end gap-3 border-t pt-4">
            <button
              type="button"
              onClick={handleSave}
              disabled={!dirty || isSaving}
              className={appButtonClassName()}
            >
              {isSaving ? "Saving..." : "Save changes"}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
