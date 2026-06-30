"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AgentLogoField } from "@/components/agent-settings/agent-logo-field";
import { useAgentIntegrationsBootstrap } from "@/components/integrations/use-agent-integrations-bootstrap";
import { useDashboardAgent } from "@/components/layout/dashboard-agent-context";
import { backendFetch } from "@/lib/backend-api";
import { appButtonClassName } from "@/lib/button-styles";
import { faviconServiceUrl } from "@/lib/website-url";
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
  const { websitePreview: integrationsWebsitePreview, loading: integrationsLoading } =
    useAgentIntegrationsBootstrap(selectedAgentId || undefined);
  const [draftName, setDraftName] = useState(selectedAgent?.name ?? "");
  const [isSavingName, setIsSavingName] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);

  const websiteFaviconUrl = useMemo(() => {
    if (!selectedAgentId || integrationsLoading) return null;
    const raw = integrationsWebsitePreview?.source_url?.trim();
    if (!raw) return null;
    return faviconServiceUrl(raw) || null;
  }, [selectedAgentId, integrationsLoading, integrationsWebsitePreview?.source_url]);

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
      await refreshAgents({ silent: true });
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
    <header className="flex flex-col gap-3">
      <div>
        <h1 className="ds-app-page-title">Agent Settings</h1>
        <p className="ds-app-page-description ds-app-page-description--wide">
          Configure how the selected chatbot looks, sounds, and behaves on your site. Reply style and tools are in{" "}
          <Link href="/playground" className="text-ds-primary font-semibold hover:underline">
            Playground
          </Link>
          .
        </p>
      </div>

      <div className="border-ds-outline bg-ds-surface rounded-ds-xl border p-4 shadow-sm sm:p-5">
        <label htmlFor="agent-name-input" className="ds-app-kicker mb-2 block text-ds-on-surface-variant">
          Agent name
        </label>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <input
            id="agent-name-input"
            className="ds-app-field min-w-0 flex-1"
            value={draftName}
            onChange={(e) => setDraftName(e.target.value)}
            placeholder="My assistant"
            maxLength={120}
            disabled={!selectedAgent}
          />
          <AgentLogoField
            agentId={selectedAgentId || null}
            behaviorSettings={selectedAgent?.behavior_settings}
            websiteFaviconUrl={websiteFaviconUrl}
            disabled={!selectedAgent}
            onSaved={() => refreshAgents({ silent: true })}
          />
          <button
            type="button"
            onClick={handleSaveName}
            disabled={!dirty || isSavingName}
            className={appButtonClassName()}
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
    <div className="border-ds-outline bg-ds-surface rounded-ds-xl border p-8 text-center shadow-sm">
      <h2 className="ds-app-section-title">No agent yet</h2>
      <p className="text-ds-on-surface-variant mt-2 text-sm leading-relaxed">
        Finish onboarding to create your first agent, then tweak appearance, tone, and behavior here.
      </p>
      <Link
        href="/onboarding"
        className={appButtonClassName("default", { className: "mt-5" })}
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
      <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-6">
        <AgentSettingsHeader />
        <AgentSettingsSubnav active={active} />
        {/* During saves we call `refreshAgents()` which toggles `agentsLoading`.
            The fetch does NOT clear `agents`, but this wrapper previously hid
            `children` while loading, causing a visible flicker.
            Keep the existing tab UI visible whenever we already have an agent;
            only show the loading placeholder when nothing is loaded yet. */}
        {!selectedAgent || agents.length === 0 ? (
          agentsLoading ? (
            <div className="border-ds-outline bg-ds-surface rounded-ds-xl border p-8 text-center text-sm text-ds-on-surface-variant shadow-sm">
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
  );
}
