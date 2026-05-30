import type { ReactNode } from "react";
import { IsoGridPanelBackground } from "@/components/marketing/iso-grid-panel-background";

export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex min-h-full flex-1 items-center justify-center bg-ds-surface p-6">
      <IsoGridPanelBackground id="auth-shell-iso-grid" />
      <div className="border-ds-outline relative z-10 w-full max-w-sm rounded-ds-lg border bg-ds-surface p-8 shadow-sm">
        {children}
      </div>
    </div>
  );
}
