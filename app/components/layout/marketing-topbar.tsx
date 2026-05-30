"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChatRelyWordmark } from "@/components/branding/chat-rely-wordmark";
import { useSessionPresent } from "@/hooks/use-session-present";

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
              Open dashboard →
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
                Start free →
              </Link>
            </>
          )}

          <details className="group relative md:hidden">
            <summary className="flex h-10 w-10 list-none items-center justify-center rounded-full border border-ds-outline bg-white text-ds-on-surface marker:content-none">
              <span className="text-lg leading-none group-open:hidden">≡</span>
              <span className="hidden text-lg leading-none group-open:inline">×</span>
            </summary>
            <div className="absolute right-0 top-12 w-[min(20rem,calc(100vw-2rem))] rounded-2xl border border-ds-outline bg-white p-4 shadow-ds-lg">
              <nav className="flex flex-col gap-1">
                {navLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="mkt-font rounded-lg px-3 py-2 text-sm font-medium text-ds-on-surface hover:bg-ds-muted"
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
                  >
                    Log in
                  </Link>
                  <Link
                    href="/signup"
                    className="mkt-pill mkt-pill-dark px-3 py-2 text-center"
                  >
                    Start free
                  </Link>
                </div>
              ) : (
                <Link href="/dashboard" className="mkt-pill mkt-pill-dark mt-3 block text-center">
                  Open dashboard
                </Link>
              )}
            </div>
          </details>
        </div>
      </div>
    </header>
  );
}
