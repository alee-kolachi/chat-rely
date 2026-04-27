import type { ReactNode } from "react";

export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div className="dot-grid flex min-h-full flex-1 items-center justify-center p-6">
      <div className="border-ds-outline bg-ds-surface w-full max-w-sm rounded-ds-lg border p-8 shadow-sm">
        {children}
      </div>
    </div>
  );
}
