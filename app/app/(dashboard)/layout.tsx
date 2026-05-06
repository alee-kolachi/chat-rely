import type { ReactNode } from "react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { MeContextProvider } from "@/components/layout/me-context-provider";

export default function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <MeContextProvider>
      <DashboardShell>{children}</DashboardShell>
    </MeContextProvider>
  );
}
