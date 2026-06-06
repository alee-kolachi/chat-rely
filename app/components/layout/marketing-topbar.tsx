"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ChatRelyWordmark } from "@/components/branding/chat-rely-wordmark";
import { useSessionPresent } from "@/hooks/use-session-present";
import { cn } from "@/lib/utils";

const navLinks = [
  { href: "/#product", label: "Product" },
  { href: "/pricing", label: "Pricing" },
  { href: "/about", label: "About" },
] as const;

function navLinkClass(active: boolean) {
  return `mkt-font text-[13px] font-medium tracking-tight transition ${
    active ? "text-ds-on-surface" : "text-ds-on-surface-variant hover:text-ds-on-surface"
  }`;
}

export function MarketingTopbar() {
  const pathname = usePathname();
  const { ready: sessionReady, hasSession } = useSessionPresent();
  const showDashboard = sessionReady && hasSession;
  const isHome = pathname === "/";
  const [menuOpen, setMenuOpen] = useState(false);
  const [panelEntered, setPanelEntered] = useState(false);

  const closeMenu = () => setMenuOpen(false);

  useEffect(() => {
    if (!menuOpen) {
      setPanelEntered(false);
      return;
    }
    const id = requestAnimationFrame(() => setPanelEntered(true));
    return () => cancelAnimationFrame(id);
  }, [menuOpen]);

  return (
    <header className="sticky top-0 z-50 border-b border-ds-outline/60 bg-ds-surface/95 backdrop-blur-md">
      <div className="mx-auto flex h-16 w-full max-w-[1100px] items-center justify-between gap-4 px-4 sm:px-6">
        <ChatRelyWordmark
          href="/"
          className="shrink-0"
          iconClassName="h-6 w-auto"
          textClassName="mkt-font text-base font-medium tracking-tight text-ds-on-surface"
        />

        <nav className="hidden items-center gap-6 md:flex">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={navLinkClass(link.href === "/pricing" ? pathname === "/pricing" : isHome && link.href.startsWith("/#"))}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2 sm:gap-3">
          {showDashboard ? (
            <Link href="/dashboard" className="mkt-pill mkt-pill-dark hidden px-4 py-2 md:inline-flex">
              Open dashboard
            </Link>
          ) : (
            <>
              <Link
                href="/login"
                className="mkt-font hidden rounded-full px-3 py-2 text-[13px] font-medium text-ds-on-surface-variant transition hover:text-ds-on-surface md:inline-flex"
              >
                Log in
              </Link>
              <Link href="/signup" className="mkt-pill mkt-pill-dark px-4 py-2 text-[13px]">
                Start free
              </Link>
            </>
          )}

          <button
            type="button"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-ds-outline bg-white text-ds-on-surface md:hidden"
            aria-expanded={menuOpen}
            aria-controls="marketing-mobile-menu"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            onClick={() => setMenuOpen((open) => !open)}
          >
            <span className={cn("text-lg leading-none", menuOpen && "hidden")}>≡</span>
            <span className={cn("hidden text-lg leading-none", menuOpen && "inline")}>×</span>
          </button>
        </div>
      </div>

      {menuOpen ? (
        <div className="fixed inset-0 z-[200] md:hidden" role="dialog" aria-modal="true" id="marketing-mobile-menu">
          <button
            type="button"
            aria-label="Close menu"
            className="absolute inset-0 bg-black/45 touch-manipulation"
            onClick={closeMenu}
          />
          <aside
            className={cn(
              "border-ds-outline fixed right-0 top-0 z-[1] h-full w-[min(84vw,320px)] overflow-y-auto border-l bg-white p-4 shadow-xl touch-manipulation transition-transform duration-300 motion-reduce:transition-none",
              panelEntered ? "translate-x-0" : "translate-x-full",
            )}
          >
            <div className="mb-3 flex items-center justify-between border-b border-ds-outline pb-3">
              <span className="mkt-font text-sm font-semibold text-ds-on-surface">Menu</span>
              <button
                type="button"
                onClick={closeMenu}
                className="text-ds-on-surface-variant flex min-h-10 min-w-10 items-center justify-center rounded-lg text-lg transition hover:bg-ds-muted hover:text-ds-on-surface"
                aria-label="Close menu"
              >
                ×
              </button>
            </div>

            <nav className="flex flex-col gap-1">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="mkt-font rounded-lg px-3 py-2 text-sm font-medium text-ds-on-surface hover:bg-ds-muted"
                  onClick={closeMenu}
                >
                  {link.label}
                </Link>
              ))}
            </nav>
            {!showDashboard ? (
              <div className="mt-3 grid grid-cols-2 gap-2 border-t border-ds-outline pt-3">
                <Link
                  href="/login"
                  className="mkt-font rounded-full border border-ds-outline px-3 py-2 text-center text-base font-medium"
                  onClick={closeMenu}
                >
                  Log in
                </Link>
                <Link
                  href="/signup"
                  className="mkt-pill mkt-pill-dark px-3 py-2 text-center"
                  onClick={closeMenu}
                >
                  Start free
                </Link>
              </div>
            ) : (
              <Link
                href="/dashboard"
                className="mkt-pill mkt-pill-dark mt-3 block text-center"
                onClick={closeMenu}
              >
                Open dashboard
              </Link>
            )}
          </aside>
        </div>
      ) : null}
    </header>
  );
}
