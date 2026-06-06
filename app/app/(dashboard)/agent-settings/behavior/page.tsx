"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { backendFetch } from "@/lib/backend-api";
import { useDashboardAgent } from "@/components/layout/dashboard-agent-context";
import { AgentSettingsShell } from "@/components/agent-settings/agent-settings-shell";
import { UnsavedChangesActionBar } from "@/components/ui/unsaved-changes-action-bar";
import {
  LANGUAGE_OPTIONS,
  WELCOME_MESSAGE_MAX,
  type AgentReliabilityRecord,
  defaultWelcomeMessage,
  mergeBehaviorSettings,
  readBehaviorString,
} from "@/lib/agent-settings";

export default function AgentSettingsBehaviorPage() {
  return (
    <AgentSettingsShell active="behavior">
      <BehaviorForm />
    </AgentSettingsShell>
  );
}

function BehaviorForm() {
  const { selectedAgent, selectedAgentId, refreshAgents } = useDashboardAgent();

  const [greeting, setGreeting] = useState<string>("");
  const [language, setLanguage] = useState<string>("auto");
  const [fallback, setFallback] = useState<string>("");
  const [inactivity, setInactivity] = useState<number>(30);
  const [maxUnresolved, setMaxUnresolved] = useState<number>(2);

  const [reliability, setReliability] = useState<AgentReliabilityRecord | null>(null);
  const [loadingReliability, setLoadingReliability] = useState<boolean>(true);
  const [reliabilityError, setReliabilityError] = useState<string | null>(null);

  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  const loadReliability = useCallback(async (agentId: string) => {
    setLoadingReliability(true);
    setReliabilityError(null);
    try {
      const data = await backendFetch<AgentReliabilityRecord>(`/api/v1/agents/${agentId}/reliability`);
      setReliability(data);
      setFallback(data.fallback_message);
      setInactivity(data.inactivity_timeout_minutes);
      setMaxUnresolved(data.max_unresolved_turns_before_escalation);
    } catch (e) {
      setReliabilityError(e instanceof Error ? e.message : "Failed to load reliability settings");
    } finally {
      setLoadingReliability(false);
    }
  }, []);

  useEffect(() => {
    if (!selectedAgentId) return;
    const nextGreeting = readBehaviorString(selectedAgent?.behavior_settings, "greeting_message");
    const nextLanguage = readBehaviorString(selectedAgent?.behavior_settings, "language") || "auto";
    const agentId = selectedAgentId;
    queueMicrotask(() => {
      setGreeting(nextGreeting);
      setLanguage(nextLanguage);
      setError(null);
      setSavedAt(null);
      void loadReliability(agentId);
    });
  }, [selectedAgentId, selectedAgent?.behavior_settings, loadReliability]);

  const initialBehavior = useMemo(
    () => ({
      greeting: readBehaviorString(selectedAgent?.behavior_settings, "greeting_message"),
      language: readBehaviorString(selectedAgent?.behavior_settings, "language") || "auto",
    }),
    [selectedAgent?.behavior_settings]
  );

  const dirty = useMemo(() => {
    const behaviorChanged =
      greeting.trim() !== initialBehavior.greeting.trim() || language !== initialBehavior.language;
    if (!reliability) return behaviorChanged;
    const reliabilityChanged =
      fallback.trim() !== reliability.fallback_message.trim() ||
      inactivity !== reliability.inactivity_timeout_minutes ||
      maxUnresolved !== reliability.max_unresolved_turns_before_escalation;
    return behaviorChanged || reliabilityChanged;
  }, [greeting, language, fallback, inactivity, maxUnresolved, initialBehavior, reliability]);

  const inactivityValid = inactivity >= 5 && inactivity <= 240;
  const unresolvedValid = maxUnresolved >= 1;
  const fallbackValid = fallback.trim().length > 0;
  const allValid = inactivityValid && unresolvedValid && fallbackValid;

  async function handleSave() {
    if (!selectedAgentId || isSaving || !dirty || !allValid) return;
    setIsSaving(true);
    setError(null);
    setSavedAt(null);
    try {
      const behaviorChanged =
        greeting.trim() !== initialBehavior.greeting.trim() || language !== initialBehavior.language;

      const reliabilityChanged =
        !reliability ||
        fallback.trim() !== reliability.fallback_message.trim() ||
        inactivity !== reliability.inactivity_timeout_minutes ||
        maxUnresolved !== reliability.max_unresolved_turns_before_escalation;

      const saveTasks: Promise<void>[] = [];

      if (behaviorChanged) {
        const merged = mergeBehaviorSettings(selectedAgent?.behavior_settings, {
          greeting_message: greeting.trim() || undefined,
          language: language === "auto" ? undefined : language,
        });
        if (!greeting.trim()) delete (merged as Record<string, unknown>).greeting_message;
        if (language === "auto") delete (merged as Record<string, unknown>).language;
        saveTasks.push(
          backendFetch(`/api/v1/agents/${selectedAgentId}`, {
            method: "PATCH",
            body: JSON.stringify({ behavior_settings: merged }),
          }).then(() => undefined)
        );
      }

      if (reliabilityChanged) {
        saveTasks.push(
          backendFetch<AgentReliabilityRecord>(`/api/v1/agents/${selectedAgentId}/reliability`, {
            method: "PATCH",
            body: JSON.stringify({
              fallback_message: fallback.trim(),
              inactivity_timeout_minutes: inactivity,
              max_unresolved_turns_before_escalation: maxUnresolved,
            }),
          }).then((updated) => {
            setReliability(updated);
          })
        );
      }

      await Promise.all(saveTasks);
      await refreshAgents({ silent: true });
      setSavedAt(Date.now());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save behavior settings");
    } finally {
      setIsSaving(false);
    }
  }

  function handleCancel() {
    setGreeting(initialBehavior.greeting);
    setLanguage(initialBehavior.language);
    if (reliability) {
      setFallback(reliability.fallback_message);
      setInactivity(reliability.inactivity_timeout_minutes);
      setMaxUnresolved(reliability.max_unresolved_turns_before_escalation);
    }
    setError(null);
    setSavedAt(null);
  }

  return (
    <>
    <div className="space-y-6">
      <section className="border-ds-outline bg-ds-surface rounded-ds-xl border p-6 shadow-sm">
        <h2 className="ds-app-section-title mb-1">Conversation behavior</h2>
        <p className="text-ds-on-surface-variant mb-6 text-sm leading-relaxed">
          What the visitor sees first, the language to default to, and how the agent recovers when it&apos;s unsure.
          Tune the model, creativity, and system prompt in{" "}
          <Link href="/playground" className="text-ds-primary font-semibold hover:underline">
            Playground
          </Link>
          .
        </p>

        <div className="space-y-6">
          <div>
            <label htmlFor="welcome-message" className="text-ds-on-surface mb-1 block text-sm font-semibold">
              Welcome message <span className="text-ds-on-surface-variant font-normal">(optional)</span>
            </label>
            <p className="ds-app-body-muted mb-2">
              First message customers see in the widget and playground. Leave blank to use:{" "}
              {defaultWelcomeMessage(selectedAgent?.name)}
            </p>
            <textarea
              id="welcome-message"
              className="ds-app-field min-h-[5rem] rounded-ds-lg leading-relaxed"
              value={greeting}
              onChange={(e) => setGreeting(e.target.value)}
              maxLength={WELCOME_MESSAGE_MAX}
              placeholder={defaultWelcomeMessage(selectedAgent?.name)}
            />
            <p className="text-ds-on-surface-variant mt-1 text-right text-[11px] tabular-nums">
              {greeting.length}/{WELCOME_MESSAGE_MAX}
            </p>
          </div>

          <div>
            <label htmlFor="language" className="text-ds-on-surface mb-1 block text-sm font-semibold">
              Default language
            </label>
            <p className="ds-app-body-muted mb-2">
              Auto-detect matches the visitor&apos;s message language. Pick a specific language to default replies
              to that language unless they write in another one.
            </p>
            <select
              id="language"
              className="ds-app-field rounded-ds-lg"
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
            >
              {LANGUAGE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      <section className="border-ds-outline bg-ds-surface rounded-ds-xl border p-6 shadow-sm">
        <h2 className="ds-app-section-title mb-1">Fallback &amp; escalation</h2>
        <p className="text-ds-on-surface-variant mb-6 text-sm leading-relaxed">
          What to say when the agent isn&apos;t confident, and when to consider handing over to a human.
        </p>

        {loadingReliability ? (
          <p className="text-ds-on-surface-variant text-sm">Loading reliability settings...</p>
        ) : reliabilityError ? (
          <p className="text-sm font-medium text-rose-600">{reliabilityError}</p>
        ) : (
          <div className="space-y-6">
            <div>
              <label htmlFor="fallback-message" className="text-ds-on-surface mb-1 block text-sm font-semibold">
                Fallback message
              </label>
              <p className="ds-app-body-muted mb-2">
                Used when the agent cannot answer confidently from your knowledge base.
              </p>
              <textarea
                id="fallback-message"
                className="ds-app-field min-h-[5rem] rounded-ds-lg leading-relaxed"
                value={fallback}
                onChange={(e) => setFallback(e.target.value)}
                maxLength={2000}
              />
              {!fallbackValid ? (
                <p className="mt-1 text-xs font-medium text-rose-600">Fallback message cannot be empty.</p>
              ) : null}
            </div>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-6">
              <div>
                <label htmlFor="inactivity" className="text-ds-on-surface mb-1.5 block text-sm font-semibold">
                  Inactivity timeout (minutes)
                </label>
                <p className="ds-app-body-muted mb-2">
                  Idle conversations are auto-closed after this period (5–240 min).
                </p>
                <input
                  id="inactivity"
                  className="ds-app-field w-32 rounded-ds-lg py-2.5 text-center tabular-nums font-semibold"
                  type="number"
                  min={5}
                  max={240}
                  value={inactivity}
                  onChange={(e) => setInactivity(Number(e.target.value))}
                />
                {!inactivityValid ? (
                  <p className="mt-1 text-xs font-medium text-rose-600">Must be between 5 and 240.</p>
                ) : null}
              </div>
              <div>
                <label htmlFor="max-unresolved" className="text-ds-on-surface mb-1.5 block text-sm font-semibold">
                  Max unresolved turns before escalation
                </label>
                <p className="ds-app-body-muted mb-2">
                  After this many vague replies, the agent suggests a human handoff (≥ 1).
                </p>
                <input
                  id="max-unresolved"
                  className="ds-app-field w-32 rounded-ds-lg py-2.5 text-center tabular-nums font-semibold"
                  type="number"
                  min={1}
                  value={maxUnresolved}
                  onChange={(e) => setMaxUnresolved(Number(e.target.value))}
                />
                {!unresolvedValid ? (
                  <p className="mt-1 text-xs font-medium text-rose-600">Must be 1 or more.</p>
                ) : null}
              </div>
            </div>
          </div>
        )}
      </section>

      {error ? <p className="text-sm font-medium text-rose-600">{error}</p> : null}
      {savedAt ? <p className="text-sm font-medium text-emerald-600">Saved.</p> : null}
    </div>

    <UnsavedChangesActionBar
      open={dirty}
      isSaving={isSaving}
      saveDisabled={!allValid || loadingReliability}
      onSave={handleSave}
      onCancel={handleCancel}
    />
    </>
  );
}
