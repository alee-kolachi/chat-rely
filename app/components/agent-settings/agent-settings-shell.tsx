"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useDashboardAgent } from "@/components/layout/dashboard-agent-context";
import { backendFetch } from "@/lib/backend-api";
import { cn } from "@/lib/utils";
import { AgentSettingsSubnav, type AgentSettingsTabKey } from "@/components/agent-settings/agent-settings-subnav";

type AgentSettingsShellProps = {
  /** Currently active tab — used to highlight the subnav. */
  active: AgentSettingsTabKey;
  /** Tab pane content. */
  children: ReactNode;
};

/**
 * Header card that lives ABOVE every Agent Settings tab pane. Renders the
 * (editable) agent name and a small description. The actual tab strip is
 * rendered by individual pages so that the active tab key stays a typed prop.
 */
export function AgentSettingsHeader() {
  const { selectedAgent, selectedAgentId, refreshAgents, agents, agentsLoading } = useDashboardAgent();
  const [draftName, setDraftName] = useState(selectedAgent?.name ?? "");
  const [isSavingName, setIsSavingName] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);

  useEffect(() => {
    const nextName = selectedAgent?.name ?? "";
    queueMicrotask(() => {
      setDraftName(nextName);
      setNameError(null);
    });
  }, [selectedAgent?.id, selectedAgent?.name]);

  const trimmed = draftName.trim();
  const dirty = Boolean(selectedAgent) && trimmed.length > 0 && trimmed !== selectedAgent?.name;

  async function handleSaveName() {
    if (!selectedAgentId || !dirty || isSavingName) return;
    setIsSavingName(true);
    setNameError(null);
    try {
      await backendFetch(`/api/v1/agents/${selectedAgentId}`, {
        method: "PATCH",
        body: JSON.stringify({ name: trimmed }),
      });
      await refreshAgents();
    } catch (e) {
      setNameError(e instanceof Error ? e.message : "Failed to rename agent");
    } finally {
      setIsSavingName(false);
    }
  }

  if (!agentsLoading && agents.length === 0) {
    return null;
  }

  return (
    <header className="mb-6 space-y-3">
      <div>
        <h1 className="ds-app-page-title">Agent Settings</h1>
        <p className="ds-app-page-description ds-app-page-description--wide mt-2">
          Configure how the selected chatbot looks, sounds, and behaves on your site. Tune model and prompt in{" "}
          <Link href="/playground" className="text-ds-primary font-semibold hover:underline">
            Playground
          </Link>
          .
        </p>
      </div>

      <div className="border-ds-outline rounded-ds-xl border bg-ds-surface p-4 shadow-sm sm:p-5">
        <label htmlFor="agent-name-input" className="ds-app-kicker mb-2 block text-ds-on-surface-variant">
          Agent name
        </label>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <input
            id="agent-name-input"
            className="ds-app-field flex-1"
            value={draftName}
            onChange={(e) => setDraftName(e.target.value)}
            placeholder="My assistant"
            maxLength={120}
            disabled={!selectedAgent}
          />
          <button
            type="button"
            onClick={handleSaveName}
            disabled={!dirty || isSavingName}
            className={cn(
              "rounded-ds-lg px-4 py-2 text-sm font-semibold shadow-sm transition-colors",
              dirty && !isSavingName
                ? "bg-ds-primary text-ds-on-primary hover:bg-ds-secondary"
                : "bg-ds-outline/40 text-ds-on-surface-variant cursor-not-allowed"
            )}
          >
            {isSavingName ? "Saving..." : "Rename"}
          </button>
        </div>
        {nameError ? <p className="mt-2 text-xs font-medium text-rose-600">{nameError}</p> : null}
      </div>
    </header>
  );
}

/** Shown by every tab when there is no agent yet (e.g., before onboarding completes). */
export function AgentSettingsEmptyState() {
  return (
    <div className="border-ds-outline rounded-ds-xl border bg-ds-surface p-8 text-center shadow-sm">
      <h2 className="ds-app-section-title text-base">No agent yet</h2>
      <p className="text-ds-on-surface-variant mt-2 text-sm leading-relaxed">
        Finish onboarding to create your first agent — then come back to tweak its appearance, tone, and behavior.
      </p>
      <Link
        href="/onboarding"
        className="bg-ds-primary text-ds-on-primary mt-5 inline-flex items-center justify-center rounded-ds-lg px-4 py-2 text-sm font-semibold shadow-sm hover:bg-ds-secondary"
      >
        Continue onboarding
      </Link>
    </div>
  );
}

/**
 * Full-page wrapper used inside each tab page. Handles loading + empty states
 * uniformly so individual tabs only render their form when an agent exists.
 */
export function AgentSettingsShell({ active, children }: AgentSettingsShellProps) {
  const { selectedAgent, agents, agentsLoading } = useDashboardAgent();

  return (
    <div className="ds-app-shell">
      <div className="px-6 pt-6 md:px-8 md:pt-8">
        <div className="mx-auto w-full max-w-5xl">
          <AgentSettingsHeader />
        </div>
      </div>
      <AgentSettingsSubnav active={active} />
      <div className="px-6 pt-6 pb-8 md:px-8">
        <div className="mx-auto w-full max-w-5xl">
          {/* During saves we call `refreshAgents()` which toggles `agentsLoading`.
              The fetch does NOT clear `agents`, but this wrapper previously hid
              `children` while loading, causing a visible flicker.
              Keep the existing tab UI visible whenever we already have an agent;
              only show the loading placeholder when nothing is loaded yet. */}
          {!selectedAgent || agents.length === 0 ? (
            agentsLoading ? (
              <div className="border-ds-outline rounded-ds-xl border bg-ds-surface p-8 text-center text-sm text-ds-on-surface-variant shadow-sm">
                Loading agent settings...
              </div>
            ) : (
              <AgentSettingsEmptyState />
            )
          ) : (
            children
          )}
        </div>
      </div>
    </div>
  );
}
