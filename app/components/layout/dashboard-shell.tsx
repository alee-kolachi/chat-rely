import type { ReactNode } from "react";
import { DashboardSidebar } from "@/components/layout/dashboard-sidebar";
import { DashboardTopbar } from "@/components/layout/dashboard-topbar";

export function DashboardShell({ children }: { children: ReactNode }) {
  return (
    <div className="bg-ds-neutral text-ds-on-surface flex min-h-full flex-1">
      <DashboardSidebar />
      <div className="flex min-w-0 flex-1 flex-col bg-ds-surface">
        <DashboardTopbar />
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
