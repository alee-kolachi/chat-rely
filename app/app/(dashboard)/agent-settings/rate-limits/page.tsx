"use client";

import { useEffect, useMemo, useState } from "react";
import { backendFetch } from "@/lib/backend-api";
import { useDashboardAgent } from "@/components/layout/dashboard-agent-context";
import { AgentSettingsShell } from "@/components/agent-settings/agent-settings-shell";
import { mergeBehaviorSettings, readRateLimit } from "@/lib/agent-settings";
import { appButtonClassName } from "@/lib/button-styles";
import { cn } from "@/lib/utils";

export default function AgentSettingsRateLimitsPage() {
  return (
    <AgentSettingsShell active="rate-limits">
      <RateLimitsForm />
    </AgentSettingsShell>
  );
}

function RateLimitsForm() {
  const { selectedAgent, selectedAgentId, refreshAgents } = useDashboardAgent();

  const initial = useMemo(
    () => readRateLimit(selectedAgent?.behavior_settings),
    [selectedAgent?.behavior_settings]
  );

  const [maxMessages, setMaxMessages] = useState<number>(initial.max_messages);
  const [windowSeconds, setWindowSeconds] = useState<number>(initial.window_seconds);
  const [limitMessage, setLimitMessage] = useState<string>(initial.limit_message);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  useEffect(() => {
    const nextMax = initial.max_messages;
    const nextWindow = initial.window_seconds;
    const nextLimitMessage = initial.limit_message;
    queueMicrotask(() => {
      setMaxMessages(nextMax);
      setWindowSeconds(nextWindow);
      setLimitMessage(nextLimitMessage);
      setError(null);
      setSavedAt(null);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAgent?.id]);

  const dirty =
    maxMessages !== initial.max_messages ||
    windowSeconds !== initial.window_seconds ||
    limitMessage.trim() !== initial.limit_message.trim();

  const valid =
    Number.isFinite(maxMessages) &&
    maxMessages >= 1 &&
    Number.isFinite(windowSeconds) &&
    windowSeconds >= 1 &&
    limitMessage.trim().length > 0;

  async function handleSave() {
    if (!selectedAgentId || isSaving || !dirty || !valid) return;
    setIsSaving(true);
    setError(null);
    setSavedAt(null);
    try {
      const merged = mergeBehaviorSettings(selectedAgent?.behavior_settings, {
        rate_limit: {
          max_messages: maxMessages,
          window_seconds: windowSeconds,
          limit_message: limitMessage.trim(),
        },
      });
      await backendFetch(`/api/v1/agents/${selectedAgentId}`, {
        method: "PATCH",
        body: JSON.stringify({ behavior_settings: merged }),
      });
      await refreshAgents();
      setSavedAt(Date.now());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save rate limits");
    } finally {
      setIsSaving(false);
    }
  }

  function handleReset() {
    setMaxMessages(20);
    setWindowSeconds(60);
    setLimitMessage("Too many messages. Please try again in a bit.");
  }

  return (
    <div className="space-y-6">
      <div
        role="note"
        className="rounded-ds-xl border border-amber-300 bg-amber-50/80 p-4 text-sm text-amber-900"
      >
        <p>
          Limits apply per visitor in the widget and playground. Plan-tier throttling still applies separately when
          your subscription usage is high.
        </p>
      </div>

      <section className="border-ds-outline rounded-ds-xl border bg-ds-surface p-6 shadow-sm">
        <h2 className="ds-app-section-title mb-1">Rate limits</h2>
        <p className="text-ds-on-surface-variant mb-6 text-sm leading-relaxed">
          Throttle how many user messages this agent accepts within a rolling time window before showing the limit
          message.
        </p>

        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-8">
            <div>
              <label htmlFor="rate-limit-messages" className="text-ds-on-surface mb-1.5 block text-sm font-semibold">
                Max messages
              </label>
              <p className="ds-app-body-muted mb-2">
                Allowed before the limit message is shown.
              </p>
              <input
                id="rate-limit-messages"
                className="ds-app-field w-32 rounded-ds-lg py-2.5 text-center tabular-nums font-semibold"
                type="number"
                min={1}
                value={maxMessages}
                onChange={(e) => setMaxMessages(Number(e.target.value))}
              />
            </div>
            <div>
              <label htmlFor="rate-limit-window" className="text-ds-on-surface mb-1.5 block text-sm font-semibold">
                Window (seconds)
              </label>
              <p className="ds-app-body-muted mb-2">
                Rolling period the count applies to.
              </p>
              <input
                id="rate-limit-window"
                className="ds-app-field w-32 rounded-ds-lg py-2.5 text-center tabular-nums font-semibold"
                type="number"
                min={1}
                value={windowSeconds}
                onChange={(e) => setWindowSeconds(Number(e.target.value))}
              />
            </div>
          </div>

          <div>
            <label htmlFor="limit-message" className="text-ds-on-surface mb-1 block text-sm font-semibold">
              Message when limit is reached
            </label>
            <textarea
              id="limit-message"
              className="ds-app-field min-h-[5.5rem] rounded-ds-lg leading-relaxed"
              value={limitMessage}
              onChange={(e) => setLimitMessage(e.target.value)}
              maxLength={500}
            />
            {!limitMessage.trim() ? (
              <p className="mt-1 text-xs font-medium text-rose-600">Limit message cannot be empty.</p>
            ) : null}
          </div>

          {error ? <p className="text-sm font-medium text-rose-600">{error}</p> : null}
          {savedAt ? <p className="text-sm font-medium text-emerald-600">Saved.</p> : null}

          <div className="border-ds-outline flex justify-end gap-3 border-t pt-4">
            <button
              type="button"
              onClick={handleReset}
              className="text-ds-on-surface-variant hover:text-ds-on-surface rounded-ds-lg px-5 py-2 text-sm font-semibold transition-colors"
            >
              Reset to defaults
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={!dirty || isSaving || !valid}
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
