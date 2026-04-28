"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { label: "Onboarding", href: "/onboarding/welcome" },
  { label: "Pricing", href: "/pricing" },
];

function navLinkClass(active: boolean) {
  return `rounded-full px-3 py-1.5 text-sm font-medium transition ${
    active
      ? "bg-ds-primary text-ds-on-primary"
      : "text-ds-on-surface-variant hover:bg-white hover:text-ds-on-surface"
  }`;
}

export function MarketingTopbar() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 border-b border-ds-outline/70 bg-ds-surface/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="text-base font-semibold tracking-tight text-ds-on-surface">
          ChatRely
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={navLinkClass(
                item.href === "/onboarding/welcome"
                  ? pathname === item.href || pathname.startsWith("/onboarding")
                  : pathname === item.href
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
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
        </div>

        <details className="group relative md:hidden">
          <summary className="flex h-10 w-10 list-none items-center justify-center rounded-full border border-ds-outline bg-white text-ds-on-surface marker:content-none">
            <span className="text-lg leading-none group-open:hidden">≡</span>
            <span className="hidden text-lg leading-none group-open:inline">×</span>
          </summary>
          <div className="absolute right-0 top-12 w-[min(22rem,calc(100vw-2rem))] rounded-2xl border border-ds-outline bg-ds-surface p-3 shadow-xl">
            <nav className="flex flex-col gap-2">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={navLinkClass(
                    item.href === "/onboarding/welcome"
                      ? pathname === item.href || pathname.startsWith("/onboarding")
                      : pathname === item.href
                  )}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
            <div className="mt-3 grid grid-cols-2 gap-2">
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
          </div>
        </details>
      </div>
    </header>
  );
}
