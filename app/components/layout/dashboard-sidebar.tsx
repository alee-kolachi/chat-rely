"use client";

import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  BookOpen,
  Bot,
  ChevronLeft,
  ChevronRight,
  LayoutDashboard,
  MessageSquare,
  Rocket,
  Settings,
  SquareDashedMousePointer,
  Ticket,
  Wrench,
} from "lucide-react";
import { LogoutButton } from "@/components/auth/logout-button";
import { PlanCrownIcon } from "@/components/ui/plan-tier-badge";
import { PlanLockedNavAffordance } from "@/components/ui/plan-unlock-footer";
import { ChatRelyWordmark } from "@/components/branding/chat-rely-wordmark";
import { useMeContext } from "@/components/layout/me-context-provider";
import { planAllowsAnalyticsPage } from "@/lib/analytics-plan-access";
import {
  dashboardNavActiveClass,
  dashboardNavChildLinkClass,
  dashboardNavDisabledClass,
  dashboardNavLinkClass,
} from "@/lib/dashboard-nav-styles";
import { useClientMounted } from "@/lib/use-client-mounted";
import { cn } from "@/lib/utils";

type NavChild = { href?: string; label: string; action?: "logout" };
type NavItem = {
  href: string;
  label: string;
  icon: (className?: string) => ReactNode;
  children?: NavChild[];
};

const navItems: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: IconDashboard },
  { href: "/analytics", label: "Analytics", icon: IconAnalytics },
  { href: "/playground", label: "Playground", icon: IconPlayground },
  {
    href: "/knowledge",
    label: "Knowledge Base",
    icon: IconKnowledge,
    children: [
      { href: "/knowledge/website", label: "Website" },
      { href: "/knowledge/files", label: "Files" },
      { href: "/knowledge/text-snippet", label: "Text Snippet" },
      { href: "/knowledge/q-and-a", label: "Q&A" },
    ],
  },
  { href: "/actions", label: "Actions & integrations", icon: IconActions },
  { href: "/conversations", label: "Conversations", icon: IconConversations },
  { href: "/tickets", label: "Tickets", icon: IconTickets },
  { href: "/deploy", label: "Deploy", icon: IconDeploy },
  { href: "/usage", label: "Usage", icon: IconUsage },
  { href: "/agent-settings", label: "Agent Settings", icon: IconSettings },
];

function isRouteActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function hasActiveChild(pathname: string, children: NavChild[]) {
  return children.some((child) => child.href && isRouteActive(pathname, child.href));
}

/** Collapsed rail: same layout for links and flyout triggers so icons line up. */
const collapsedRailItemClass =
  "flex w-full min-h-10 shrink-0 items-center justify-center rounded-lg border border-transparent p-2 text-sm transition-all text-ds-on-surface-variant hover:bg-ds-outline/35 hover:text-ds-on-surface";

function buildOpenSectionsForPath(pathname: string): Record<string, boolean> {
  const nextOpenSections: Record<string, boolean> = {};
  navItems.forEach((item) => {
    if (item.children) nextOpenSections[item.href] = hasActiveChild(pathname, item.children);
  });
  return nextOpenSections;
}

export function DashboardSidebar() {
  const pathname = usePathname();
  const localeReady = useClientMounted();
  const [uiReady, setUiReady] = useState(false);
  const { data: meData, loading: meLoading } = useMeContext();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>(() =>
    buildOpenSectionsForPath(pathname)
  );
  const [collapsedFlyoutHref, setCollapsedFlyoutHref] = useState<string | null>(null);
  const flyoutContainerRef = useRef<HTMLDivElement>(null);

  const analyticsLocked = uiReady && !meLoading && !planAllowsAnalyticsPage(meData?.plan.slug);

  const collapsedForUi = uiReady && isCollapsed;

  useEffect(() => {
    if (!localeReady) return;
    const timeoutId = window.setTimeout(() => {
      setUiReady(true);
      const savedCollapsed = window.localStorage.getItem("dashboard-sidebar-collapsed");
      setIsCollapsed(savedCollapsed === "true");
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [localeReady]);

  useEffect(() => {
    setOpenSections((prev) => ({ ...buildOpenSectionsForPath(pathname), ...prev }));
  }, [pathname]);

  useEffect(() => {
    queueMicrotask(() => setCollapsedFlyoutHref(null));
  }, [pathname]);

  useEffect(() => {
    if (!collapsedFlyoutHref) return;
    function handlePointerDown(event: MouseEvent | PointerEvent) {
      const el = flyoutContainerRef.current;
      if (el && !el.contains(event.target as Node)) {
        setCollapsedFlyoutHref(null);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setCollapsedFlyoutHref(null);
    }
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [collapsedFlyoutHref]);

  function toggleSidebar() {
    setIsCollapsed((prev) => {
      const next = !prev;
      window.localStorage.setItem("dashboard-sidebar-collapsed", String(next));
      return next;
    });
  }

  function toggleSection(href: string) {
    setOpenSections((prev) => ({ ...prev, [href]: !prev[href] }));
  }

  return (
    <aside
      suppressHydrationWarning
      className={cn(
        "border-ds-outline bg-ds-sidebar hidden min-h-0 shrink-0 flex-col overflow-hidden border-r transition-[width] duration-200 md:flex",
        collapsedForUi ? "w-20" : "w-64"
      )}
    >
      <div className="border-ds-outline flex h-14 items-center justify-between border-b px-3 md:h-16">
        <ChatRelyWordmark
          href="/dashboard"
          showText={!collapsedForUi}
          className="min-w-0 overflow-hidden"
          iconClassName="h-5 w-auto"
          textClassName="text-lg font-semibold text-ds-on-surface"
        />
        <button
          type="button"
          onClick={toggleSidebar}
          suppressHydrationWarning
          className="text-ds-on-surface-variant hover:bg-ds-outline/70 hover:text-ds-on-surface rounded-md p-2 transition-colors"
          aria-label={collapsedForUi ? "Expand sidebar" : "Collapse sidebar"}
        >
          <IconCollapse className={cn("size-4 transition-transform", collapsedForUi && "rotate-180")} />
        </button>
      </div>

      <nav className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto overscroll-y-contain p-2">
        {navItems.map((item) => {
          const isAnalyticsItem = item.href === "/analytics";
          const analyticsDisabled = isAnalyticsItem && analyticsLocked;
          const itemActive = isRouteActive(pathname, item.href);
          const childActive = item.children ? hasActiveChild(pathname, item.children) : false;
          const sectionOpen = item.children ? openSections[item.href] : false;
          const showAsActive = itemActive || childActive;

          const flyoutOpen = collapsedForUi && item.children && collapsedFlyoutHref === item.href;

          return (
            <div
              key={item.href}
              ref={collapsedForUi && item.children && collapsedFlyoutHref === item.href ? flyoutContainerRef : undefined}
              className="group relative"
            >
              {item.children && !collapsedForUi ? (
                <button
                  type="button"
                  onClick={() => toggleSection(item.href)}
                  className={cn(
                    "flex w-full min-w-0 items-center gap-3 rounded-lg border border-transparent px-3 py-2 text-sm transition-all",
                    "text-ds-on-surface-variant hover:bg-ds-outline/35 hover:text-ds-on-surface",
                    showAsActive && dashboardNavActiveClass
                  )}
                  aria-label={sectionOpen ? `Collapse ${item.label}` : `Expand ${item.label}`}
                >
                  {item.icon("size-5 shrink-0")}
                  <span className="truncate">{item.label}</span>
                  <IconChevron
                    className={cn(
                      "text-ds-on-surface-variant ml-auto size-4 shrink-0 transition-transform",
                      sectionOpen && "rotate-90"
                    )}
                  />
                </button>
              ) : item.children && collapsedForUi ? (
                <button
                  type="button"
                  onClick={() => setCollapsedFlyoutHref((prev) => (prev === item.href ? null : item.href))}
                  title={item.label}
                  aria-expanded={flyoutOpen}
                  aria-haspopup="true"
                  className={cn(
                    collapsedRailItemClass,
                    showAsActive && dashboardNavActiveClass
                  )}
                >
                  {item.icon("size-5 shrink-0")}
                </button>
              ) : (
                analyticsDisabled ? (
                  <span
                    title="Not on your plan. Upgrade to Hobby or above for Analytics."
                    className={cn(
                      collapsedForUi
                        ? cn(collapsedRailItemClass, "relative")
                        : cn(dashboardNavLinkClass(false), "pr-2"),
                      dashboardNavDisabledClass
                    )}
                  >
                    {item.icon("size-5 shrink-0")}
                    {!collapsedForUi ? (
                      <>
                        <span className="truncate">{item.label}</span>
                        <PlanLockedNavAffordance />
                      </>
                    ) : (
                      <PlanCrownIcon className="absolute top-1 right-1 size-3" title="Not on your plan" />
                    )}
                  </span>
                ) : (
                <Link
                  href={item.href}
                  title={collapsedForUi ? item.label : undefined}
                  className={cn(
                    collapsedForUi
                      ? cn(collapsedRailItemClass, showAsActive && dashboardNavActiveClass)
                      : dashboardNavLinkClass(showAsActive, "flex min-w-0 flex-1")
                  )}
                >
                  {item.icon("size-5 shrink-0")}
                  {!collapsedForUi && <span className="truncate">{item.label}</span>}
                </Link>
                )
              )}

              {collapsedForUi && !item.children && (
                <div className="bg-ds-primary text-ds-on-primary pointer-events-none absolute top-1/2 left-full z-20 ml-2 -translate-y-1/2 rounded-md px-2 py-1 text-xs opacity-0 shadow-sm transition-opacity group-hover:opacity-100">
                  {item.label}
                </div>
              )}

              {isCollapsed && item.children && flyoutOpen && (
                <div
                  role="menu"
                  className="border-ds-outline bg-ds-surface absolute top-0 left-full z-30 ml-1 flex min-w-[11rem] flex-col gap-0.5 rounded-lg border p-1 shadow-lg"
                >
                  <p className="text-ds-on-surface-variant px-2 py-1 text-[10px] font-semibold tracking-wide uppercase">
                    {item.label}
                  </p>
                  {item.children.map((child) => {
                    const baseChildClass =
                      "ds-app-body-muted hover:text-ds-on-surface hover:bg-ds-outline/35 rounded-md px-2 py-2 text-left transition-colors";

                    if (child.action === "logout") {
                      return <LogoutButton key={`${item.href}-${child.label}`} className={baseChildClass} />;
                    }

                    const childHref = child.href ?? item.href;
                    const childIsActive = isRouteActive(pathname, childHref);

                    return (
                      <Link
                        key={childHref}
                        href={childHref}
                        role="menuitem"
                        className={cn(baseChildClass, childIsActive && cn(dashboardNavActiveClass, "font-semibold"))}
                      >
                        {child.label}
                      </Link>
                    );
                  })}
                </div>
              )}

              {!collapsedForUi && item.children && sectionOpen && (
                <div className="border-ds-outline/70 mt-1 ml-7 flex flex-col gap-1 border-l pl-3">
                  {item.children.map((child) => {
                    const baseChildClass =
                      "ds-app-body-muted hover:text-ds-on-surface rounded-md border border-transparent px-2 py-1.5 text-left transition-colors";

                    if (child.action === "logout") {
                      return <LogoutButton key={`${item.href}-${child.label}`} className={baseChildClass} />;
                    }

                    const childHref = child.href ?? item.href;
                    const childIsActive = isRouteActive(pathname, childHref);

                    return (
                      <Link
                        key={childHref}
                        href={childHref}
                        className={dashboardNavChildLinkClass(childIsActive)}
                      >
                        {child.label}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>
    </aside>
  );
}

function IconDashboard(className?: string) {
  return <LayoutDashboard className={className} strokeWidth={1.8} />;
}

function IconAnalytics(className?: string) {
  return <BarChart3 className={className} strokeWidth={1.8} />;
}

function IconPlayground(className?: string) {
  return <Bot className={className} strokeWidth={1.8} />;
}

function IconKnowledge(className?: string) {
  return <BookOpen className={className} strokeWidth={1.8} />;
}

function IconActions(className?: string) {
  return <Wrench className={className} strokeWidth={1.8} />;
}

function IconConversations(className?: string) {
  return <MessageSquare className={className} strokeWidth={1.8} />;
}

function IconTickets(className?: string) {
  return <Ticket className={className} strokeWidth={1.8} />;
}

function IconDeploy(className?: string) {
  return <Rocket className={className} strokeWidth={1.8} />;
}

function IconUsage(className?: string) {
  return <SquareDashedMousePointer className={className} strokeWidth={1.8} />;
}

function IconSettings(className?: string) {
  return <Settings className={className} strokeWidth={1.8} />;
}

function IconChevron({ className }: { className?: string }) {
  return <ChevronRight className={className} strokeWidth={2} aria-hidden />;
}

function IconCollapse({ className }: { className?: string }) {
  return <ChevronLeft className={className} strokeWidth={2} aria-hidden />;
}
