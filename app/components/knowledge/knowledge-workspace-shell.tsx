import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Shared layout + canvas for all Knowledge workspace routes (tokens: `ds-app-shell`). */
export function KnowledgeWorkspaceShell({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "ds-app-shell !m-0 flex min-h-0 w-full flex-1 flex-col lg:flex-row",
        className,
      )}
    >
      {children}
    </div>
  );
}
