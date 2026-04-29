"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogoutButton } from "@/components/auth/logout-button";
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
  { href: "/actions", label: "Actions", icon: IconActions },
  { href: "/conversations", label: "Conversations", icon: IconConversations },
  { href: "/tickets", label: "Tickets", icon: IconTickets },
  { href: "/deploy", label: "Deploy", icon: IconDeploy },
  { href: "/usage", label: "Usage", icon: IconUsage },
  {
    href: "/settings",
    label: "Settings",
    icon: IconSettings,
    children: [
      { href: "/settings/general", label: "General" },
      { href: "/settings/plan", label: "Plan" },
      { href: "/settings/billing", label: "Billing" },
      { label: "Log out", action: "logout" },
    ],
  },
];

function isRouteActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function hasActiveChild(pathname: string, children: NavChild[]) {
  return children.some((child) => child.href && isRouteActive(pathname, child.href));
}

export function DashboardSidebar() {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const savedCollapsed = window.localStorage.getItem("dashboard-sidebar-collapsed");
    setIsCollapsed(savedCollapsed === "true");
  }, []);

  useEffect(() => {
    const nextOpenSections: Record<string, boolean> = {};
    navItems.forEach((item) => {
      if (item.children) nextOpenSections[item.href] = hasActiveChild(pathname, item.children);
    });
    setOpenSections((prev) => ({ ...nextOpenSections, ...prev }));
  }, [pathname]);

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
      className={cn(
        "border-ds-outline bg-ds-sidebar hidden shrink-0 flex-col border-r transition-[width] duration-200 md:flex",
        isCollapsed ? "w-20" : "w-64"
      )}
    >
      <div className="border-ds-outline flex h-14 items-center justify-between border-b px-3">
        <span
          className={cn(
            "text-ds-on-surface overflow-hidden text-sm font-semibold whitespace-nowrap transition-all",
            isCollapsed ? "max-w-0 opacity-0" : "max-w-[160px] opacity-100"
          )}
        >
          ChatRely
        </span>
        <button
          type="button"
          onClick={toggleSidebar}
          className="text-ds-on-surface-variant hover:bg-ds-outline/70 hover:text-ds-on-surface rounded-md p-2 transition-colors"
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <IconCollapse className={cn("size-4 transition-transform", isCollapsed && "rotate-180")} />
        </button>
      </div>

      <nav className="flex flex-col gap-1 p-2">
        {navItems.map((item) => {
          const itemActive = isRouteActive(pathname, item.href);
          const childActive = item.children ? hasActiveChild(pathname, item.children) : false;
          const sectionOpen = item.children ? openSections[item.href] : false;
          const showAsActive = itemActive || childActive;

          return (
            <div key={item.href} className="group relative">
              {item.children && !isCollapsed ? (
                <button
                  type="button"
                  onClick={() => toggleSection(item.href)}
                  className={cn(
                    "flex w-full min-w-0 items-center gap-3 rounded-lg border border-transparent px-3 py-2 text-sm transition-all",
                    "text-ds-on-surface-variant hover:bg-ds-outline/35 hover:text-ds-on-surface",
                    showAsActive && "border-ds-primary/35 bg-white !text-ds-primary font-semibold shadow-sm"
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
              ) : (
                <Link
                  href={item.href}
                  title={isCollapsed ? item.label : undefined}
                  className={cn(
                    "flex min-w-0 flex-1 items-center gap-3 rounded-lg border border-transparent px-3 py-2 text-sm transition-all",
                    "text-ds-on-surface-variant hover:bg-ds-outline/35 hover:text-ds-on-surface",
                    isCollapsed && "justify-center px-2",
                    showAsActive && "border-ds-primary/35 bg-white !text-ds-primary font-semibold shadow-sm"
                  )}
                >
                  {item.icon("size-5 shrink-0")}
                  {!isCollapsed && <span className="truncate">{item.label}</span>}
                </Link>
              )}

              {isCollapsed && (
                <div className="bg-ds-primary text-ds-on-primary pointer-events-none absolute top-1/2 left-full z-20 ml-2 -translate-y-1/2 rounded-md px-2 py-1 text-xs opacity-0 shadow-sm transition-opacity group-hover:opacity-100">
                  {item.label}
                </div>
              )}

              {!isCollapsed && item.children && sectionOpen && (
                <div className="border-ds-outline/70 mt-1 ml-7 flex flex-col gap-1 border-l pl-3">
                  {item.children.map((child) => {
                    const baseChildClass =
                      "text-ds-on-surface-variant hover:text-ds-on-surface rounded-md border border-transparent px-2 py-1.5 text-left text-xs transition-colors";

                    if (child.action === "logout") {
                      return <LogoutButton key={`${item.href}-${child.label}`} className={baseChildClass} />;
                    }

                    const childHref = child.href ?? item.href;
                    const childIsActive = isRouteActive(pathname, childHref);

                    return (
                      <Link
                        key={childHref}
                        href={childHref}
                        className={cn(baseChildClass, childIsActive && "border-ds-primary/35 bg-white !text-ds-primary font-semibold")}
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

function IconStroke({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      {children}
    </svg>
  );
}

function IconDashboard(className?: string) {
  return (
    <IconStroke className={className}>
      <rect x="3" y="3" width="8" height="8" />
      <rect x="13" y="3" width="8" height="5" />
      <rect x="13" y="10" width="8" height="11" />
      <rect x="3" y="13" width="8" height="8" />
    </IconStroke>
  );
}

function IconAnalytics(className?: string) {
  return (
    <IconStroke className={className}>
      <path d="M4 19V5" />
      <path d="M10 19v-8" />
      <path d="M16 19v-5" />
      <path d="M22 19v-12" />
    </IconStroke>
  );
}

function IconPlayground(className?: string) {
  return (
    <IconStroke className={className}>
      <path d="m8 6 10 6-10 6V6Z" />
    </IconStroke>
  );
}

function IconKnowledge(className?: string) {
  return (
    <IconStroke className={className}>
      <path d="M4 5a2 2 0 0 1 2-2h12v18l-3-2-3 2-3-2-3 2V5Z" />
    </IconStroke>
  );
}

function IconActions(className?: string) {
  return (
    <IconStroke className={className}>
      <path d="M7 7h10v10H7z" />
      <path d="M3 12h4M17 12h4M12 3v4M12 17v4" />
    </IconStroke>
  );
}

function IconConversations(className?: string) {
  return (
    <IconStroke className={className}>
      <path d="M4 5h16v10H8l-4 4V5Z" />
    </IconStroke>
  );
}

function IconTickets(className?: string) {
  return (
    <IconStroke className={className}>
      <path d="M4 8a2 2 0 0 1 2-2h12v4a2 2 0 1 0 0 4v4H6a2 2 0 0 1-2-2V8Z" />
    </IconStroke>
  );
}

function IconDeploy(className?: string) {
  return (
    <IconStroke className={className}>
      <path d="M12 3v13" />
      <path d="m7 11 5 5 5-5" />
      <path d="M4 21h16" />
    </IconStroke>
  );
}

function IconUsage(className?: string) {
  return (
    <IconStroke className={className}>
      <path d="M4 19a8 8 0 1 1 16 0" />
      <path d="m12 11 3 3" />
    </IconStroke>
  );
}

function IconSettings(className?: string) {
  return (
    <IconStroke className={className}>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </IconStroke>
  );
}

function IconChevron({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}

function IconCollapse({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M15 18l-6-6 6-6" />
    </svg>
  );
}
