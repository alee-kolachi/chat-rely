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
      <div className="flex h-[100dvh] max-h-[100dvh] min-h-0 w-full flex-col overflow-hidden">
        <PostAuthCacheReset />
        <MeContextErrorBanner />
        <DashboardShell className="min-h-0 flex-1">{children}</DashboardShell>
      </div>
    </MeContextProvider>
  );
}
