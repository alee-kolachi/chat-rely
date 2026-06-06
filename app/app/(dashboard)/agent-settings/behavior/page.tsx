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
  defaultWelcomeMessages,
  greetingMessagesMatchDefault,
  mergeBehaviorSettings,
  readBehaviorString,
  welcomeMessagesForForm,
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

  const agentDisplayName = selectedAgent?.name?.trim() || "Support";

  const initialWelcomeMessages = useMemo(
    () => welcomeMessagesForForm(selectedAgent?.behavior_settings, agentDisplayName),
    [selectedAgent?.behavior_settings, agentDisplayName]
  );

  const [welcomeMessages, setWelcomeMessages] = useState<[string, string]>(initialWelcomeMessages);
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
    const nextWelcomeMessages = welcomeMessagesForForm(selectedAgent?.behavior_settings, agentDisplayName);
    const nextLanguage = readBehaviorString(selectedAgent?.behavior_settings, "language") || "auto";
    const agentId = selectedAgentId;
    queueMicrotask(() => {
      setWelcomeMessages(nextWelcomeMessages);
      setLanguage(nextLanguage);
      setError(null);
      setSavedAt(null);
      void loadReliability(agentId);
    });
  }, [selectedAgentId, selectedAgent?.behavior_settings, agentDisplayName, loadReliability]);

  const initialBehavior = useMemo(
    () => ({
      welcomeMessages: initialWelcomeMessages,
      language: readBehaviorString(selectedAgent?.behavior_settings, "language") || "auto",
    }),
    [selectedAgent?.behavior_settings, initialWelcomeMessages]
  );

  const dirty = useMemo(() => {
    const behaviorChanged =
      welcomeMessages[0] !== initialBehavior.welcomeMessages[0] ||
      welcomeMessages[1] !== initialBehavior.welcomeMessages[1] ||
      language !== initialBehavior.language;
    if (!reliability) return behaviorChanged;
    const reliabilityChanged =
      fallback.trim() !== reliability.fallback_message.trim() ||
      inactivity !== reliability.inactivity_timeout_minutes ||
      maxUnresolved !== reliability.max_unresolved_turns_before_escalation;
    return behaviorChanged || reliabilityChanged;
  }, [welcomeMessages, language, fallback, inactivity, maxUnresolved, initialBehavior, reliability]);

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
        welcomeMessages[0] !== initialBehavior.welcomeMessages[0] ||
        welcomeMessages[1] !== initialBehavior.welcomeMessages[1] ||
        language !== initialBehavior.language;

      const reliabilityChanged =
        !reliability ||
        fallback.trim() !== reliability.fallback_message.trim() ||
        inactivity !== reliability.inactivity_timeout_minutes ||
        maxUnresolved !== reliability.max_unresolved_turns_before_escalation;

      const saveTasks: Promise<void>[] = [];

      if (behaviorChanged) {
        const defaults = defaultWelcomeMessages(agentDisplayName);
        const savedWelcome: [string, string] = [
          (welcomeMessages[0].trim() || defaults[0]).slice(0, WELCOME_MESSAGE_MAX),
          (welcomeMessages[1].trim() || defaults[1]).slice(0, WELCOME_MESSAGE_MAX),
        ];
        const partial: Record<string, unknown> = {
          language: language === "auto" ? undefined : language,
        };
        if (!greetingMessagesMatchDefault(savedWelcome, agentDisplayName)) {
          partial.greeting_messages = savedWelcome;
        }
        const merged = mergeBehaviorSettings(selectedAgent?.behavior_settings, partial);
        const mergedRecord = merged as Record<string, unknown>;
        if (greetingMessagesMatchDefault(savedWelcome, agentDisplayName)) {
          delete mergedRecord.greeting_messages;
          delete mergedRecord.greeting_message;
        } else {
          delete mergedRecord.greeting_message;
        }
        if (language === "auto") delete mergedRecord.language;
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
    setWelcomeMessages(initialBehavior.welcomeMessages);
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
            <p className="text-ds-on-surface mb-1 text-sm font-semibold">
              Welcome messages <span className="text-ds-on-surface-variant font-normal">(optional)</span>
            </p>
            <p className="ds-app-body-muted mb-4">
              First messages in chat after a visitor opens the widget from your welcome screen.
            </p>
            <div className="space-y-4">
              <div>
                <label htmlFor="welcome-message-1" className="text-ds-on-surface-variant mb-1 block text-xs font-semibold uppercase tracking-wide">
                  Message 1
                </label>
                <textarea
                  id="welcome-message-1"
                  rows={3}
                  className="ds-app-field ds-app-field--compact rounded-ds-lg leading-relaxed"
                  value={welcomeMessages[0]}
                  onChange={(e) =>
                    setWelcomeMessages((prev) => [e.target.value, prev[1]] as [string, string])
                  }
                  maxLength={WELCOME_MESSAGE_MAX}
                />
                <p className="text-ds-on-surface-variant mt-1 text-right text-[11px] tabular-nums">
                  {welcomeMessages[0].length}/{WELCOME_MESSAGE_MAX}
                </p>
              </div>
              <div>
                <label htmlFor="welcome-message-2" className="text-ds-on-surface-variant mb-1 block text-xs font-semibold uppercase tracking-wide">
                  Message 2
                </label>
                <textarea
                  id="welcome-message-2"
                  rows={3}
                  className="ds-app-field ds-app-field--compact rounded-ds-lg leading-relaxed"
                  value={welcomeMessages[1]}
                  onChange={(e) =>
                    setWelcomeMessages((prev) => [prev[0], e.target.value] as [string, string])
                  }
                  maxLength={WELCOME_MESSAGE_MAX}
                />
                <p className="text-ds-on-surface-variant mt-1 text-right text-[11px] tabular-nums">
                  {welcomeMessages[1].length}/{WELCOME_MESSAGE_MAX}
                </p>
              </div>
            </div>
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
