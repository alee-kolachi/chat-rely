"use client";

import { useState } from "react";
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
  { href: "/actions", label: "Actions" },
  { href: "/conversations", label: "Conversations" },
  { href: "/tickets", label: "Tickets" },
  { href: "/deploy", label: "Deploy" },
  { href: "/usage", label: "Usage" },
  {
    href: "/settings",
    label: "Settings",
    children: [
      { href: "/settings/general", label: "General" },
      { href: "/settings/plan", label: "Plan" },
      { href: "/settings/billing", label: "Billing" },
    ],
  },
];

function isRouteActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function DashboardTopbar() {
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <>
      <header className="border-ds-outline flex h-14 items-center justify-between border-b px-4 md:hidden">
        <button
          type="button"
          onClick={() => setIsMenuOpen(true)}
          className="text-ds-on-surface-variant hover:bg-ds-neutral hover:text-ds-on-surface rounded-ds-md p-2 transition-colors"
          aria-label="Open navigation menu"
        >
          <IconMenu className="size-5" />
        </button>
        <span className="text-ds-on-surface text-sm font-semibold">ChatRely</span>
        <LogoutButton className="text-ds-on-surface-variant hover:bg-ds-neutral rounded-ds-md px-3 py-1.5 text-sm transition-colors hover:text-ds-on-surface" />
      </header>

      {isMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            type="button"
            aria-label="Close navigation menu"
            className="absolute inset-0 bg-black/45"
            onClick={() => setIsMenuOpen(false)}
          />
          <aside className="border-ds-outline bg-ds-sidebar relative h-full w-[min(84vw,320px)] overflow-y-auto border-r p-3 shadow-xl">
            <div className="border-ds-outline mb-3 flex items-center justify-between border-b pb-3">
              <span className="text-ds-on-surface text-sm font-semibold">Navigation</span>
              <button
                type="button"
                onClick={() => setIsMenuOpen(false)}
                className="text-ds-on-surface-variant hover:bg-ds-neutral hover:text-ds-on-surface rounded-ds-md p-2 transition-colors"
                aria-label="Close navigation menu"
              >
                <IconClose className="size-4" />
              </button>
            </div>

            <nav className="space-y-1">
              {mobileNavItems.map((item) => {
                const active = isRouteActive(pathname, item.href);
                return (
                  <div key={item.href}>
                    <Link
                      href={item.href}
                      onClick={() => setIsMenuOpen(false)}
                      className={cn(
                        "flex items-center rounded-lg border border-transparent px-3 py-2 text-sm transition-all",
                        "text-ds-on-surface-variant hover:bg-ds-outline/35 hover:text-ds-on-surface",
                        active && "border-zinc-300 bg-white text-ds-on-surface font-semibold shadow-sm"
                      )}
                    >
                      {item.label}
                    </Link>

                    {item.children && (
                      <div className="border-ds-outline/70 mt-1 ml-4 flex flex-col gap-1 border-l pl-3">
                        {item.children.map((child) => {
                          const childActive = isRouteActive(pathname, child.href);
                          return (
                            <Link
                              key={child.href}
                              href={child.href}
                              onClick={() => setIsMenuOpen(false)}
                              className={cn(
                                "text-ds-on-surface-variant hover:text-ds-on-surface rounded-md border border-transparent px-2 py-1.5 text-xs transition-colors",
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
      )}
    </>
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
