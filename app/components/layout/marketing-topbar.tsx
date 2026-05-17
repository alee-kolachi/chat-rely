"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChatRelyWordmark } from "@/components/branding/chat-rely-wordmark";
import { useSessionPresent } from "@/hooks/use-session-present";

function pricingLinkClass(active: boolean) {
  return `text-sm font-medium transition ${
    active
      ? "text-ds-on-surface"
      : "text-ds-on-surface-variant hover:text-ds-on-surface"
  }`;
}

export function MarketingTopbar() {
  const pathname = usePathname();
  const { ready: sessionReady, hasSession } = useSessionPresent();
  const showDashboard = sessionReady && hasSession;
  const showAuthActions = !showDashboard;

  return (
    <header className="sticky top-0 z-50 border-b border-ds-outline/70 bg-ds-surface/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-4 sm:px-6">
        <ChatRelyWordmark
          href="/"
          className="text-lg font-semibold tracking-tight text-ds-on-surface"
          iconClassName="h-6 w-auto"
          textClassName="text-lg font-semibold tracking-tight text-ds-on-surface"
        />

        <div className="flex items-center gap-2 sm:gap-3">
          <Link href="/pricing" className={pricingLinkClass(pathname === "/pricing")}>
            Pricing
          </Link>

          <div className="hidden items-center gap-2 md:flex">
            {showAuthActions ? (
              <>
                <Link
                  href="/login"
                  className="rounded-full px-4 py-2 text-sm font-medium text-ds-on-surface-variant transition hover:bg-white hover:text-ds-on-surface"
                >
                  Log in
                </Link>
                <Link
                  href="/signup"
                  className="rounded-full bg-ds-primary px-4 py-2 text-sm font-semibold text-ds-on-primary transition hover:opacity-90"
                >
                  Sign up
                </Link>
              </>
            ) : null}
            {showDashboard ? (
              <Link
                href="/dashboard"
                className="rounded-full bg-ds-primary px-4 py-2 text-sm font-semibold text-ds-on-primary transition hover:opacity-90"
              >
                Open dashboard
              </Link>
            ) : null}
          </div>

          <details className="group relative md:hidden">
            <summary className="flex h-10 w-10 list-none items-center justify-center rounded-full border border-ds-outline bg-white text-ds-on-surface marker:content-none">
              <span className="text-lg leading-none group-open:hidden">≡</span>
              <span className="hidden text-lg leading-none group-open:inline">×</span>
            </summary>
            <div className="absolute right-0 top-12 w-[min(22rem,calc(100vw-2rem))] rounded-2xl border border-ds-outline bg-ds-surface p-3 shadow-xl">
              {showAuthActions ? (
                <div className="grid grid-cols-2 gap-2">
                  <Link
                    href="/login"
                    className="rounded-full border border-ds-outline bg-white px-4 py-2 text-center text-sm font-medium text-ds-on-surface"
                  >
                    Log in
                  </Link>
                  <Link
                    href="/signup"
                    className="rounded-full bg-ds-primary px-4 py-2 text-center text-sm font-semibold text-ds-on-primary"
                  >
                    Sign up
                  </Link>
                </div>
              ) : null}
              {showDashboard ? (
                <Link
                  href="/dashboard"
                  className={`${showAuthActions ? "mt-3" : ""} block rounded-full bg-ds-primary px-4 py-2 text-center text-sm font-semibold text-ds-on-primary`}
                >
                  Open dashboard
                </Link>
              ) : null}
            </div>
          </details>
        </div>
      </div>
    </header>
  );
}
