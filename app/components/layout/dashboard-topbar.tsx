"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogoutButton } from "@/components/auth/logout-button";
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

export function DashboardTopbar() {
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [mobileOpenSections, setMobileOpenSections] = useState<Record<string, boolean>>({});

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
    mobileNavItems.forEach((item) => {
      if (item.children) next[item.href] = hasActiveChild(pathname, item.children);
    });
    queueMicrotask(() => setMobileOpenSections((prev) => ({ ...next, ...prev })));
  }, [pathname]);

  const mobileMenu = isMenuOpen ? (
      <div className="fixed inset-0 z-[200] md:hidden" role="dialog" aria-modal="true">
        <button
          type="button"
          aria-label="Close navigation menu"
          className="absolute inset-0 bg-black/45 touch-manipulation"
          onClick={() => setIsMenuOpen(false)}
        />
        <aside className="border-ds-outline bg-ds-sidebar relative z-[1] h-full w-[min(84vw,320px)] overflow-y-auto border-r p-3 shadow-xl touch-manipulation">
          <div className="border-ds-outline mb-3 flex items-center justify-between border-b pb-3">
            <span className="text-ds-on-surface text-sm font-semibold">Navigation</span>
            <button
              type="button"
              onClick={() => setIsMenuOpen(false)}
              className="text-ds-on-surface-variant hover:bg-ds-neutral hover:text-ds-on-surface touch-manipulation min-h-10 min-w-10 rounded-ds-md p-2 transition-colors"
              aria-label="Close navigation menu"
            >
              <IconClose className="size-4" />
            </button>
          </div>

          <nav className="space-y-1">
            {mobileNavItems.map((item) => {
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
                        "text-ds-on-surface-variant hover:bg-ds-outline/35 hover:text-ds-on-surface",
                        active && "border-zinc-300 bg-white text-ds-on-surface font-semibold shadow-sm"
                      )}
                      aria-expanded={sectionOpen}
                    >
                      {item.label}
                      <IconChevronSmall className={cn("size-4 shrink-0 transition-transform", sectionOpen && "rotate-90")} />
                    </button>
                  ) : (
                    <Link
                      href={item.href}
                      onClick={() => setIsMenuOpen(false)}
                      className={cn(
                        "flex min-h-11 items-center rounded-lg border border-transparent px-3 py-2 text-sm transition-all touch-manipulation",
                        "text-ds-on-surface-variant hover:bg-ds-outline/35 hover:text-ds-on-surface",
                        active && "border-zinc-300 bg-white text-ds-on-surface font-semibold shadow-sm"
                      )}
                    >
                      {item.label}
                    </Link>
                  )}

                  {item.children && sectionOpen && (
                    <div className="border-ds-outline/70 mt-1 ml-4 flex flex-col gap-1 border-l pl-3">
                      {item.children.map((child) => {
                        const childActive = isRouteActive(pathname, child.href);
                        return (
                          <Link
                            key={child.href}
                            href={child.href}
                            onClick={() => setIsMenuOpen(false)}
                            className={cn(
                              "text-ds-on-surface-variant hover:text-ds-on-surface touch-manipulation flex min-h-10 items-center rounded-md border border-transparent px-2 py-1.5 text-xs transition-colors",
                              childActive && "border-zinc-300 bg-white text-ds-on-surface font-semibold"
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
  ) : null;

  return (
    <>
      <header className="border-ds-outline bg-ds-surface sticky top-0 z-[70] flex h-14 shrink-0 items-center justify-between border-b px-4 md:hidden">
        <button
          type="button"
          onClick={() => setIsMenuOpen(true)}
          className="text-ds-on-surface-variant hover:bg-ds-neutral hover:text-ds-on-surface touch-manipulation min-h-11 min-w-11 rounded-ds-md p-2 transition-colors [-webkit-tap-highlight-color:transparent]"
          aria-label="Open navigation menu"
        >
          <IconMenu className="size-5" />
        </button>
        <span className="text-ds-on-surface text-sm font-semibold">ChatRely</span>
        <LogoutButton className="text-ds-on-surface-variant hover:bg-ds-neutral touch-manipulation min-h-11 rounded-ds-md px-3 py-2 text-sm transition-colors hover:text-ds-on-surface [-webkit-tap-highlight-color:transparent]" />
      </header>

      {mobileMenu && typeof document !== "undefined" ? createPortal(mobileMenu, document.body) : null}
    </>
  );
}

function IconChevronSmall({ className }: { className?: string }) {
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

function IconMenu({ className }: { className?: string }) {
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
      <path d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  );
}

function IconClose({ className }: { className?: string }) {
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
      <path d="m6 6 12 12M18 6 6 18" />
    </svg>
  );
}
