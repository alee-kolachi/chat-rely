import type { ReactNode } from "react";
import { LogoutButton } from "@/components/auth/logout-button";
import { AdminSidebar } from "@/components/admin/admin-sidebar";

export function AdminShell({ email, children }: { email: string; children: ReactNode }) {
  return (
    <div className="bg-ds-neutral text-ds-on-surface flex h-[100dvh] max-h-[100dvh] min-h-0 w-full flex-1 overflow-hidden">
      <AdminSidebar />
      <div className="isolate flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-ds-surface">
        <header className="border-ds-outline flex h-14 shrink-0 items-center justify-between gap-4 border-b px-6 md:h-16">
          <div className="flex min-w-0 items-center gap-3">
            <span className="bg-ds-primary/15 text-ds-primary rounded-md px-2 py-0.5 text-xs font-semibold uppercase tracking-wide">
              Admin
            </span>
            <span className="text-ds-on-surface-variant truncate text-sm">{email}</span>
          </div>
          <LogoutButton className="text-ds-on-surface-variant hover:bg-ds-neutral shrink-0 rounded-ds-md px-3 py-2 text-sm font-medium transition-colors hover:text-ds-on-surface" />
        </header>
        <main className="relative z-0 flex min-h-0 flex-1 flex-col overflow-y-auto overflow-x-hidden overscroll-y-contain bg-ds-app-canvas ds-dashboard-main-pad">
          {children}
          <div aria-hidden className="ds-dashboard-main-spacer" />
        </main>
      </div>
    </div>
  );
}
