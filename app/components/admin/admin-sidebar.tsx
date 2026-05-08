"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/agents", label: "Agents" },
  { href: "/admin/conversations", label: "Conversations" },
  { href: "/admin/tickets", label: "Tickets" },
  { href: "/admin/knowledge", label: "Knowledge" },
  { href: "/admin/billing", label: "Billing" },
  { href: "/admin/plans", label: "Plans" },
  { href: "/admin/costing", label: "Costing" },
  { href: "/admin/system", label: "System" },
] as const;

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="border-ds-outline bg-ds-sidebar hidden min-h-0 w-56 shrink-0 flex-col overflow-hidden border-r border-l-4 border-l-ds-primary/45 md:flex">
      <div className="border-ds-outline flex h-14 flex-col justify-center gap-1 border-b px-4 md:h-16">
        <span className="text-ds-on-surface text-sm font-semibold">ChatRely</span>
        <span className="text-ds-on-surface-variant text-xs font-medium tracking-wide uppercase">Admin</span>
      </div>

      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto overscroll-y-contain p-2">
        {navItems.map((item) => {
          // Overview should only match `/admin` exactly so it doesn't light up on
          // `/admin/users`, `/admin/conversations`, etc.
          const active =
            item.href === "/admin"
              ? pathname === "/admin"
              : pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "rounded-lg border border-transparent px-3 py-2 text-sm transition-all",
                "text-ds-on-surface-variant hover:bg-ds-outline/35 hover:text-ds-on-surface",
                active && "border-ds-primary/35 bg-white font-semibold text-ds-primary shadow-sm"
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
