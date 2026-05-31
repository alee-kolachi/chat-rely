"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { UserProfileProvider } from "@/components/account/user-profile-context";
import { DashboardAgentProvider } from "@/components/layout/dashboard-agent-context";
import { DashboardAgentUrlSync } from "@/components/layout/dashboard-agent-url-sync";
import { DashboardScreenTopbar } from "@/components/layout/dashboard-screen-topbar";
import { DashboardSidebar } from "@/components/layout/dashboard-sidebar";
import { SetDashboardTopbarExtrasProvider } from "@/components/layout/dashboard-topbar-extras-context";
import { DashboardTopbar } from "@/components/layout/dashboard-topbar";
import { NotificationsProvider } from "@/components/layout/notifications-context";

export function DashboardShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [topbarExtras, setTopbarExtras] = useState<ReactNode>(null);
  /** Full-height workspaces scroll inside their panes; outer main stays viewport-tall. */
  const workspaceMain =
    pathname.startsWith("/knowledge") ||
    pathname.startsWith("/playground") ||
    pathname.startsWith("/conversations");

  return (
    <DashboardAgentProvider>
      <DashboardAgentUrlSync />
      <UserProfileProvider>
        <NotificationsProvider>
        <SetDashboardTopbarExtrasProvider setExtras={setTopbarExtras}>
          <div className="bg-ds-neutral text-ds-on-surface flex h-[100dvh] max-h-[100dvh] min-h-0 w-full flex-1 overflow-hidden">
            <DashboardSidebar />
            <div className="isolate flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-ds-surface">
              <DashboardTopbar />
              <DashboardScreenTopbar rightExtras={topbarExtras} />
              <main
                className={cn(
                  "relative z-0 flex min-h-0 flex-1 flex-col overflow-x-hidden overscroll-y-contain bg-ds-app-canvas",
                  workspaceMain
                    ? "overflow-hidden p-0"
                    : "ds-dashboard-main-pad overflow-y-auto",
                )}
              >
                {children}
                {!workspaceMain ? <div aria-hidden className="ds-dashboard-main-spacer" /> : null}
              </main>
            </div>
          </div>
        </SetDashboardTopbarExtrasProvider>
        </NotificationsProvider>
      </UserProfileProvider>
    </DashboardAgentProvider>
  );
}
