"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, Menu, X } from "lucide-react";
import { PlanLockedNavAffordance } from "@/components/ui/plan-unlock-footer";
import { useMeContext } from "@/components/layout/me-context-provider";
import { planAllowsAnalyticsPage } from "@/lib/analytics-plan-access";
import {
  dashboardNavActiveClass,
  dashboardNavChildLinkClass,
  dashboardNavDisabledClass,
  dashboardNavLinkClass,
} from "@/lib/dashboard-nav-styles";
import { cn } from "@/lib/utils";

const mobileNavItems = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/analytics", label: "Analytics" },
  { href: "/playground", label: "Playground" },
  {
    href: "/knowledge",
    label: "Knowledge Base",
    children: [
      { href: "/knowledge/website", label: "Website" },
      { href: "/knowledge/files", label: "Files" },
      { href: "/knowledge/text-snippet", label: "Text Snippet" },
      { href: "/knowledge/q-and-a", label: "Q&A" },
    ],
  },
  { href: "/actions", label: "Actions & integrations" },
  { href: "/conversations", label: "Conversations" },
  { href: "/tickets", label: "Tickets" },
  { href: "/deploy", label: "Deploy" },
  { href: "/usage", label: "Usage" },
  { href: "/agent-settings", label: "Agent Settings" },
  { href: "/account/profile", label: "Account" },
];

function isRouteActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function hasActiveChild(pathname: string, children: { href: string }[]) {
  return children.some((child) => pathname === child.href || pathname.startsWith(`${child.href}/`));
}

type DashboardMobileNavContextValue = {
  openMenu: () => void;
  closeMenu: () => void;
};

const DashboardMobileNavContext = createContext<DashboardMobileNavContextValue | null>(null);

export function useDashboardMobileNav() {
  const ctx = useContext(DashboardMobileNavContext);
  if (!ctx) {
    throw new Error("useDashboardMobileNav must be used within DashboardMobileNavProvider");
  }
  return ctx;
}

export function DashboardMobileNavProvider({ children }: { children: ReactNode }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const openMenu = useCallback(() => setIsMenuOpen(true), []);
  const closeMenu = useCallback(() => setIsMenuOpen(false), []);

  return (
    <DashboardMobileNavContext.Provider value={{ openMenu, closeMenu }}>
      {children}
      <DashboardMobileNavDrawer isMenuOpen={isMenuOpen} onClose={closeMenu} />
    </DashboardMobileNavContext.Provider>
  );
}

export function DashboardMobileNavTrigger({ className }: { className?: string }) {
  const { openMenu } = useDashboardMobileNav();

  return (
    <button
      type="button"
      onClick={openMenu}
      className={cn(
        "text-ds-on-surface-variant hover:bg-ds-neutral hover:text-ds-on-surface touch-manipulation min-h-11 min-w-11 shrink-0 rounded-ds-md p-2 transition-colors [-webkit-tap-highlight-color:transparent] md:hidden",
        className,
      )}
      aria-label="Open navigation menu"
    >
      <Menu className="size-5" strokeWidth={2} aria-hidden />
    </button>
  );
}

function DashboardMobileNavDrawer({
  isMenuOpen,
  onClose,
}: {
  isMenuOpen: boolean;
  onClose: () => void;
}) {
  const pathname = usePathname();
  const { data: meData, loading: meLoading } = useMeContext();
  const [mobileOpenSections, setMobileOpenSections] = useState<Record<string, boolean>>({});

  const mobileNavItemsVisible = useMemo(() => mobileNavItems, []);
  const analyticsLocked = !meLoading && !planAllowsAnalyticsPage(meData?.plan.slug);

  useEffect(() => {
    if (!isMenuOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isMenuOpen]);

  useEffect(() => {
    const next: Record<string, boolean> = {};
    mobileNavItemsVisible.forEach((item) => {
      if (item.children) next[item.href] = hasActiveChild(pathname, item.children);
    });
    queueMicrotask(() => setMobileOpenSections((prev) => ({ ...next, ...prev })));
  }, [pathname, mobileNavItemsVisible]);

  if (!isMenuOpen) return null;

  const mobileMenu = (
    <div className="fixed inset-0 z-[200] md:hidden" role="dialog" aria-modal="true">
      <button
        type="button"
        aria-label="Close navigation menu"
        className="absolute inset-0 bg-black/45 touch-manipulation"
        onClick={onClose}
      />
      <aside className="border-ds-outline bg-ds-sidebar relative z-[1] h-full w-[min(84vw,320px)] overflow-y-auto border-r p-3 shadow-xl touch-manipulation">
        <div className="border-ds-outline mb-3 flex items-center justify-between border-b pb-3">
          <span className="ds-app-card-title">Navigation</span>
          <button
            type="button"
            onClick={onClose}
            className="text-ds-on-surface-variant hover:bg-ds-neutral hover:text-ds-on-surface touch-manipulation min-h-10 min-w-10 rounded-ds-md p-2 transition-colors"
            aria-label="Close navigation menu"
          >
            <X className="size-4" strokeWidth={2} aria-hidden />
          </button>
        </div>

        <nav className="space-y-1">
          {mobileNavItemsVisible.map((item) => {
            const isAnalyticsItem = item.href === "/analytics";
            const analyticsDisabled = isAnalyticsItem && analyticsLocked;
            const childActive = item.children ? hasActiveChild(pathname, item.children) : false;
            const active = isRouteActive(pathname, item.href) || childActive;
            const sectionOpen = item.children ? mobileOpenSections[item.href] : false;

            return (
              <div key={item.href}>
                {item.children ? (
                  <button
                    type="button"
                    onClick={() =>
                      setMobileOpenSections((prev) => ({ ...prev, [item.href]: !prev[item.href] }))
                    }
                    className={cn(
                      "flex min-h-11 w-full items-center justify-between rounded-lg border border-transparent px-3 py-2 text-left text-sm transition-all touch-manipulation",
                      dashboardNavLinkClass(active, "hover:bg-ds-outline/35"),
                    )}
                    aria-expanded={sectionOpen}
                  >
                    {item.label}
                    <ChevronRight
                      className={cn("size-4 shrink-0 transition-transform", sectionOpen && "rotate-90")}
                      strokeWidth={2}
                      aria-hidden
                    />
                  </button>
                ) : analyticsDisabled ? (
                  <span
                    title="Not on your plan. Upgrade to Hobby or above for Analytics."
                    className={cn(
                      "flex min-h-11 items-center gap-2 rounded-lg px-3 py-2 text-sm touch-manipulation",
                      dashboardNavLinkClass(false),
                      dashboardNavDisabledClass,
                    )}
                  >
                    <span className="truncate">{item.label}</span>
                    <PlanLockedNavAffordance />
                  </span>
                ) : (
                  <Link
                    href={item.href}
                    onClick={onClose}
                    className={cn("flex min-h-11 items-center touch-manipulation", dashboardNavLinkClass(active))}
                  >
                    {item.label}
                  </Link>
                )}

                {item.children && sectionOpen && (
                  <div className="border-ds-outline/70 mt-1 ml-4 flex flex-col gap-1 border-l pl-3">
                    {item.children.map((child) => {
                      const childIsActive = isRouteActive(pathname, child.href);
                      return (
                        <Link
                          key={child.href}
                          href={child.href}
                          onClick={onClose}
                          className={cn(
                            "touch-manipulation flex min-h-10 items-center",
                            dashboardNavChildLinkClass(childIsActive),
                          )}
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
    </div>
  );

  return typeof document !== "undefined" ? createPortal(mobileMenu, document.body) : null;
}

/** @deprecated Use DashboardMobileNavProvider + DashboardMobileNavTrigger instead. */
export function DashboardTopbar() {
  return null;
}
