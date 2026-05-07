"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { onboardingType } from "@/components/onboarding/onboarding-ui";
import { AccountMenu } from "@/components/layout/account-menu";
import { NotificationsMenu } from "@/components/layout/notifications-menu";
import { getDashboardScreenTitle } from "@/lib/dashboard-route-title";
import { cn } from "@/lib/utils";
import { useDashboardAgent } from "./dashboard-agent-context";

const fieldControlClass = cn("ds-app-field max-w-[min(100%,20rem)] text-sm");

type DashboardScreenTopbarProps = {
  rightExtras?: ReactNode;
};

export function DashboardScreenTopbar({ rightExtras }: DashboardScreenTopbarProps) {
  const pathname = usePathname();
  const title = getDashboardScreenTitle(pathname);
  const { agents, selectedAgentId, setSelectedAgentId, agentsLoading, agentsError } = useDashboardAgent();

  return (
    <header className="border-ds-outline bg-ds-surface flex h-14 shrink-0 items-center justify-between border-b px-4 md:h-16 md:px-8">
      <div className="flex min-w-0 flex-1 items-center gap-3 md:gap-4">
        <span className="text-ds-on-surface shrink-0 truncate text-base font-semibold tracking-tight md:text-lg">
          {title}
        </span>
        <div className="bg-ds-outline hidden h-4 w-px shrink-0 sm:block" />
        <div className="min-w-0 max-w-full flex-1 sm:max-w-md">
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
              className={fieldControlClass}
              aria-label="Agent"
              value={selectedAgentId}
              disabled={agents.length === 0}
              onChange={(e) => setSelectedAgentId(e.target.value)}
            >
              {agents.length === 0 ? <option value="">No agents</option> : null}
              {agents.map((agent) => (
                <option key={agent.id} value={agent.id}>
                  {agent.name}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2 md:gap-3">
        {rightExtras}
        <NotificationsMenu />
        <AccountMenu />
      </div>
    </header>
  );
}
