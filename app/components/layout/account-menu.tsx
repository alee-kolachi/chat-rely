"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { initialsFromProfile } from "@/components/account/account-profile-form";
import { useUserProfile } from "@/components/account/user-profile-context";
import { LogoutButton } from "@/components/auth/logout-button";
import { cn } from "@/lib/utils";

const accountLinks = [
  { href: "/account/profile", label: "Profile" },
  { href: "/account/plan", label: "Plan" },
  { href: "/account/billing", label: "Billing" },
];

export function AccountMenu() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const { profile, loading } = useUserProfile();
  const onAccount = pathname === "/account" || pathname.startsWith("/account/");

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClick);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onClick);
    };
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "border-ds-outline text-ds-on-surface hover:bg-ds-sidebar flex size-9 items-center justify-center overflow-hidden rounded-full border bg-white shadow-sm transition-colors",
          onAccount && "border-ds-primary/40 ring-1 ring-ds-primary/20"
        )}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="Account menu"
      >
        {loading ? (
          <IconUserGlyph className="text-ds-primary size-[1.15rem]" />
        ) : profile?.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element -- user avatar URL from Supabase
          <img
            src={profile.avatar_url}
            alt=""
            className="size-full object-cover"
          />
        ) : (
          <span className="text-ds-primary flex size-full items-center justify-center text-[11px] font-bold leading-none tracking-tight">
            {initialsFromProfile(profile ?? { full_name: null, email: "" })}
          </span>
        )}
      </button>

      {open ? (
        <div
          className="border-ds-outline bg-ds-surface absolute right-0 z-[100] mt-2 w-56 overflow-hidden rounded-ds-lg border py-1 shadow-lg"
          role="menu"
        >
          <p className="text-ds-on-surface-variant border-ds-outline/80 border-b px-3 py-2 text-xs font-semibold tracking-wide uppercase">
            Account
          </p>
          {accountLinks.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                role="menuitem"
                onClick={() => setOpen(false)}
                className={cn(
                  "text-ds-on-surface hover:bg-ds-sidebar/80 block px-3 py-2.5 text-sm font-medium",
                  active && "bg-ds-primary/8 text-ds-primary"
                )}
              >
                {item.label}
              </Link>
            );
          })}
          <div className="border-ds-outline/80 border-t p-1">
            <LogoutButton className="text-ds-on-surface hover:bg-ds-sidebar/80 w-full rounded-ds-md px-2 py-2.5 text-left text-sm font-medium" />
          </div>
        </div>
      ) : null}
    </div>
  );
}

function IconUserGlyph({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5 20.5c1.2-3.2 3.6-4.5 7-4.5s5.8 1.3 7 4.5" />
    </svg>
  );
}
