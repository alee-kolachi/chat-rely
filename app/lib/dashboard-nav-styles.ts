import { cn } from "@/lib/utils";

/** Light purple fill for active dashboard sidebar items. */
export const dashboardNavActiveClass =
  "bg-ds-nav-active !text-ds-primary font-semibold";

export const dashboardNavItemClass =
  "flex min-w-0 items-center gap-3 rounded-lg border border-transparent px-3 py-2 text-sm transition-all text-ds-on-surface-variant hover:bg-ds-outline/35 hover:text-ds-on-surface";

export const dashboardNavChildClass =
  "ds-app-body-muted hover:bg-ds-outline/35 hover:text-ds-on-surface rounded-md border border-transparent px-2 py-1.5 text-left transition-colors";

export const dashboardNavDisabledClass =
  "pointer-events-none cursor-not-allowed text-ds-text-muted";

export function dashboardNavLinkClass(active: boolean, extra?: string) {
  return cn(dashboardNavItemClass, active && dashboardNavActiveClass, extra);
}

export function dashboardNavChildLinkClass(active: boolean, extra?: string) {
  return cn(
    dashboardNavChildClass,
    active && cn(dashboardNavActiveClass, "border-transparent"),
    extra
  );
}

/** Tab underline style (Knowledge website source types, Agent settings subnav). */
export function dashboardTabClass(active: boolean) {
  return cn(
    "cursor-pointer shrink-0 border-b-2 pt-1.5 pb-1 text-sm font-medium transition-colors",
    active
      ? "border-ds-primary text-ds-primary font-semibold"
      : "border-transparent text-ds-on-surface-variant hover:text-ds-on-surface"
  );
}
