import type { ReactNode } from "react";
import Link from "next/link";
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
          <Link
            href="/dashboard"
            className="text-ds-primary hover:text-ds-interactive-hover shrink-0 text-sm font-medium"
          >
            Back to dashboard
          </Link>
        </header>
        <main className="relative z-0 flex min-h-0 flex-1 flex-col overflow-y-auto overflow-x-hidden overscroll-y-contain">
          {children}
        </main>
      </div>
    </div>
  );
}
