"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import { UserProfileProvider } from "@/components/account/user-profile-context";
import { DashboardAgentProvider } from "@/components/layout/dashboard-agent-context";
import { DashboardScreenTopbar } from "@/components/layout/dashboard-screen-topbar";
import { DashboardSidebar } from "@/components/layout/dashboard-sidebar";
import { SetDashboardTopbarExtrasProvider } from "@/components/layout/dashboard-topbar-extras-context";
import { DashboardTopbar } from "@/components/layout/dashboard-topbar";

export function DashboardShell({ children }: { children: ReactNode }) {
  const [topbarExtras, setTopbarExtras] = useState<ReactNode>(null);

  return (
    <DashboardAgentProvider>
      <UserProfileProvider>
        <SetDashboardTopbarExtrasProvider setExtras={setTopbarExtras}>
          <div className="bg-ds-neutral text-ds-on-surface flex min-h-full flex-1">
            <DashboardSidebar />
            <div className="isolate flex min-h-0 min-w-0 flex-1 flex-col bg-ds-surface">
              <DashboardTopbar />
              <DashboardScreenTopbar rightExtras={topbarExtras} />
              <main className="relative z-0 flex min-h-0 flex-1 flex-col p-6">{children}</main>
            </div>
          </div>
        </SetDashboardTopbarExtrasProvider>
      </UserProfileProvider>
    </DashboardAgentProvider>
  );
}
