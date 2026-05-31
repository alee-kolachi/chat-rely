"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChatRelyWordmark } from "@/components/branding/chat-rely-wordmark";
import {
  dashboardNavLinkClass,
} from "@/lib/dashboard-nav-styles";
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
    <aside className="border-ds-outline bg-ds-sidebar hidden min-h-0 w-64 shrink-0 flex-col overflow-hidden border-r md:flex">
      <div className="border-ds-outline flex h-14 items-center border-b px-4 md:h-16">
        <ChatRelyWordmark
          href="/admin"
          iconClassName="h-5 w-auto"
          textClassName="text-lg font-semibold text-ds-on-surface"
        />
      </div>

      <nav className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto overscroll-y-contain p-2">
        {navItems.map((item) => {
          const active =
            item.href === "/admin"
              ? pathname === "/admin"
              : pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(dashboardNavLinkClass(active))}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
