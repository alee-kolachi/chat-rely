import type { ReactNode } from "react";
import { PostAuthCacheReset } from "@/components/auth/post-auth-cache-reset";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { MeContextErrorBanner } from "@/components/layout/me-context-error-banner";
import { MeContextProvider } from "@/components/layout/me-context-provider";

export default function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <MeContextProvider>
      <PostAuthCacheReset />
      <MeContextErrorBanner />
      <DashboardShell>{children}</DashboardShell>
    </MeContextProvider>
  );
}
