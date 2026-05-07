"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { useState } from "react";
import { onboardingType } from "@/components/onboarding/onboarding-ui";
import { AccountMenu } from "@/components/layout/account-menu";
import { NotificationsMenu } from "@/components/layout/notifications-menu";
import { useMeContext } from "@/components/layout/me-context-provider";
import { cn } from "@/lib/utils";
import { DashboardCreateAgentModal } from "./dashboard-create-agent-modal";
import { useDashboardAgent } from "./dashboard-agent-context";

const fieldControlClass = cn("ds-app-field max-w-[min(100%,20rem)] text-sm");

type DashboardScreenTopbarProps = {
  rightExtras?: ReactNode;
};

export function DashboardScreenTopbar({ rightExtras }: DashboardScreenTopbarProps) {
  const [createOpen, setCreateOpen] = useState(false);
  /** Remount modal when opened so form state resets without an effect. */
  const [createAgentModalKey, setCreateAgentModalKey] = useState(0);
  const { data: meData } = useMeContext();
  const { agents, selectedAgentId, setSelectedAgentId, agentsLoading, agentsError, refreshAgents } =
    useDashboardAgent();

  const maxAgents = meData?.plan.max_agents;
  const atAgentLimit = typeof maxAgents === "number" && agents.length >= maxAgents;
  const createTitle =
    typeof maxAgents === "number" && atAgentLimit ? "Agent limit reached for your plan" : "Create new agent";

  return (
    <header className="border-ds-outline bg-ds-surface flex h-14 shrink-0 items-center justify-between border-b px-4 md:h-16 md:px-8">
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2 sm:gap-3 md:gap-4">
        <div className="flex min-w-0 max-w-full flex-1 items-center gap-2 sm:gap-3 md:max-w-lg">
          <span className="text-ds-on-surface-variant shrink-0 text-[11px] font-semibold tracking-wide uppercase sm:text-xs">
            Agent
          </span>
          <div className="min-w-0 flex-1">
            {agentsError ? (
              <span className={cn(onboardingType.body, "text-rose-600 truncate")}>{agentsError}</span>
            ) : agentsLoading ? (
              <div
                role="status"
                aria-live="polite"
                aria-label="Loading workspace"
                className={cn(fieldControlClass, "flex w-full min-w-0 cursor-default items-center gap-2")}
              >
                <span className="text-ds-on-surface-variant min-w-0 truncate">Loading workspace</span>
                <span className="ml-auto flex shrink-0 items-center gap-1" aria-hidden>
                  <span className="ds-thinking-dot" />
                  <span className="ds-thinking-dot" />
                  <span className="ds-thinking-dot" />
                </span>
              </div>
            ) : (
              <select
                className={cn(fieldControlClass, "w-full")}
                aria-label="Choose agent"
                value={selectedAgentId}
                disabled={agents.length === 0}
                onChange={(e) => setSelectedAgentId(e.target.value)}
              >
                {agents.length === 0 ? <option value="">No agents yet</option> : null}
                {agents.map((agent) => (
                  <option key={agent.id} value={agent.id}>
                    {agent.name}
                  </option>
                ))}
              </select>
            )}
          </div>
          {!agentsLoading && !agentsError ? (
            <>
              <button
                type="button"
                onClick={() => {
                  setCreateAgentModalKey((k) => k + 1);
                  setCreateOpen(true);
                }}
                disabled={atAgentLimit}
                title={createTitle}
                aria-label={createTitle}
                className={cn(
                  "border-ds-outline bg-ds-surface text-ds-on-surface hover:bg-ds-sidebar shrink-0 rounded-lg border px-2.5 py-2 text-sm font-semibold transition-colors md:px-3",
                  "disabled:cursor-not-allowed disabled:opacity-45"
                )}
              >
                <span className="md:hidden" aria-hidden>
                  +
                </span>
                <span className="hidden md:inline">New agent</span>
              </button>
              {atAgentLimit ? (
                <Link
                  href="/account/billing"
                  className="text-ds-primary hover:text-ds-secondary shrink-0 text-xs font-semibold underline-offset-2 hover:underline md:text-sm"
                >
                  Upgrade
                </Link>
              ) : null}
            </>
          ) : null}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2 md:gap-3">
        {rightExtras}
        <NotificationsMenu />
        <AccountMenu />
      </div>
      <DashboardCreateAgentModal
        key={createAgentModalKey}
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        refreshAgents={refreshAgents}
        setSelectedAgentId={setSelectedAgentId}
      />
    </header>
  );
}
