import Link from "next/link";
import { cn } from "@/lib/utils";

export type AdminTab = {
  id: string;
  label: string;
  count?: number;
};

export type AdminTabsProps = {
  tabs: AdminTab[];
  activeId: string;
  /** Returns the URL for a given tab; lets the host page preserve other querystring params. */
  buildHref: (id: string) => string;
};

/**
 * URL-driven tab strip used by tabbed admin pages (`/knowledge`, `/billing`).
 * Server-rendered — the active state comes from a parent searchParam, not client state.
 */
export function AdminTabs({ tabs, activeId, buildHref }: AdminTabsProps) {
  return (
    <div
      role="tablist"
      className="border-ds-outline -mb-px flex items-center gap-1 overflow-x-auto border-b"
    >
      {tabs.map((tab) => {
        const isActive = tab.id === activeId;
        return (
          <Link
            key={tab.id}
            href={buildHref(tab.id)}
            role="tab"
            aria-selected={isActive}
            className={cn(
              "border-b-2 px-4 py-2 text-sm transition-colors -mb-[1px]",
              isActive
                ? "border-ds-primary text-ds-primary font-semibold"
                : "text-ds-on-surface-variant hover:text-ds-on-surface border-transparent"
            )}
          >
            {tab.label}
            {typeof tab.count === "number" && (
              <span
                className={cn(
                  "ml-2 rounded-full px-1.5 py-0.5 text-[10px] font-medium",
                  isActive
                    ? "bg-ds-primary/10 text-ds-primary"
                    : "bg-ds-outline/40 text-ds-on-surface-variant"
                )}
              >
                {tab.count.toLocaleString()}
              </span>
            )}
          </Link>
        );
      })}
    </div>
  );
}
