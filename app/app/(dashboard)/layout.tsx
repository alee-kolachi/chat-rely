import type { ReactNode } from "react";
import { BackendBootstrap } from "@/components/layout/backend-bootstrap";
import { DashboardShell } from "@/components/layout/dashboard-shell";

export default function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <>
      <BackendBootstrap />
      <DashboardShell>{children}</DashboardShell>
    </>
  );
}
