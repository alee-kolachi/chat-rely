"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import { UserProfileProvider } from "@/components/account/user-profile-context";
import { DashboardAgentProvider } from "@/components/layout/dashboard-agent-context";
import { DashboardAgentUrlSync } from "@/components/layout/dashboard-agent-url-sync";
import { DashboardScreenTopbar } from "@/components/layout/dashboard-screen-topbar";
import { DashboardSidebar } from "@/components/layout/dashboard-sidebar";
import { SetDashboardTopbarExtrasProvider } from "@/components/layout/dashboard-topbar-extras-context";
import { DashboardTopbar } from "@/components/layout/dashboard-topbar";
import { NotificationsProvider } from "@/components/layout/notifications-context";

export function DashboardShell({ children }: { children: ReactNode }) {
  const [topbarExtras, setTopbarExtras] = useState<ReactNode>(null);

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
              <main className="relative z-0 flex min-h-0 flex-1 flex-col overflow-y-auto overflow-x-hidden overscroll-y-contain px-6 pt-6 pb-[max(3rem,calc(1.5rem+env(safe-area-inset-bottom,0px)))] md:pb-[max(4rem,calc(2rem+env(safe-area-inset-bottom,0px)))]">
                {children}
              </main>
            </div>
          </div>
        </SetDashboardTopbarExtrasProvider>
        </NotificationsProvider>
      </UserProfileProvider>
    </DashboardAgentProvider>
  );
}
