"use client";

import { useEffect, useMemo, useState } from "react";
import { backendFetch } from "@/lib/backend-api";
import { useDashboardAgent } from "@/components/layout/dashboard-agent-context";
import { AgentSettingsShell } from "@/components/agent-settings/agent-settings-shell";
import { AppSegmentGroupSimple } from "@/components/ui/app-segment-group";
import { UnsavedChangesActionBar } from "@/components/ui/unsaved-changes-action-bar";
import {
  TONE_OPTIONS,
  type AgentTone,
  mergeBehaviorSettings,
  readBehaviorString,
} from "@/lib/agent-settings";

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
      if (!description.trim()) {
        delete (merged as Record<string, unknown>).tone_description;
      }
      await backendFetch(`/api/v1/agents/${selectedAgentId}`, {
        method: "PATCH",
        body: JSON.stringify({ behavior_settings: merged }),
      });
      await refreshAgents({ silent: true });
      setSavedAt(Date.now());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save tone settings");
    } finally {
      setIsSaving(false);
    }
  }

  function handleCancel() {
    setTone(initialTone);
    setDescription(initialDescription);
    setError(null);
    setSavedAt(null);
  }

  return (
    <>
      <section className="border-ds-outline bg-ds-surface rounded-ds-xl border p-6 shadow-sm">
        <h2 className="ds-app-section-title mb-1">Tone &amp; instructions</h2>
        <p className="text-ds-on-surface-variant mb-6 text-sm leading-relaxed">
          Pick a default phrasing style, then add any brand-specific guidance. Both shape how the agent replies.
        </p>

        <div className="space-y-6">
          <div>
            <p className="text-ds-on-surface mb-3 text-sm font-semibold">Default tone</p>
            <AppSegmentGroupSimple
              aria-label="Default tone"
              value={tone}
              onChange={setTone}
              options={TONE_OPTIONS.map((option) => ({ value: option, label: option }))}
            />
          </div>

          <div>
            <label htmlFor="tone-description" className="text-ds-on-surface mb-1 block text-sm font-semibold">
              Brand instructions <span className="text-ds-on-surface-variant font-normal">(optional)</span>
            </label>
            <p className="ds-app-body-muted mb-2">
              Tell the agent how your team talks to customers. Examples: &ldquo;Our products are high-ticket,
              always offer to schedule a call&rdquo;, &ldquo;Demo products on a video call&rdquo;,
              &ldquo;Use British English and never use emojis&rdquo;.
            </p>
            <textarea
              id="tone-description"
              className="ds-app-field min-h-[6.5rem] rounded-ds-lg leading-relaxed"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={2000}
              placeholder="How should the agent talk, and what should it always suggest?"
            />
            <p className="text-ds-on-surface-variant mt-1 text-right text-[11px] tabular-nums">
              {description.length}/2000
            </p>
          </div>

          {error ? <p className="text-sm font-medium text-rose-600">{error}</p> : null}
          {savedAt ? <p className="text-sm font-medium text-emerald-600">Saved.</p> : null}
        </div>
      </section>

      <UnsavedChangesActionBar
        open={dirty}
        isSaving={isSaving}
        onSave={handleSave}
        onCancel={handleCancel}
      />
    </>
  );
}
