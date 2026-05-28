"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell } from "lucide-react";
import { useNotifications } from "@/components/layout/notifications-context";
import { formatNotificationTime } from "@/lib/notifications";
import { useClientMounted } from "@/lib/use-client-mounted";
import { cn } from "@/lib/utils";

const MENU_LIMIT = 8;

export function NotificationsMenu() {
  const pathname = usePathname();
  const localeReady = useClientMounted();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { notifications, unreadCount, markRead, markAllRead } = useNotifications();
  const hasUnread = localeReady && unreadCount > 0;
  const onNotificationsPage = pathname === "/notifications" || pathname.startsWith("/notifications/");
  const preview = notifications.slice(0, MENU_LIMIT);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    const onClick = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
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
        onClick={() => setOpen((prev) => !prev)}
        className={cn(
          "border-ds-outline text-ds-on-surface-variant hover:bg-ds-sidebar hover:text-ds-on-surface relative inline-flex size-9 cursor-pointer items-center justify-center rounded-full border bg-white shadow-sm transition-colors",
          onNotificationsPage && "border-ds-primary/40 ring-1 ring-ds-primary/20"
        )}
        aria-label="Notifications"
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <IconBell className="size-[1.1rem]" />
        {hasUnread ? (
          <span className="bg-ds-primary text-ds-on-primary absolute -top-1 -right-1 min-w-[1.05rem] rounded-full px-1 text-center text-[10px] font-bold leading-4 tabular-nums">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <div
          className="border-ds-outline bg-ds-surface absolute right-0 z-[100] mt-2 w-[min(92vw,24rem)] overflow-hidden rounded-ds-lg border shadow-lg"
          role="menu"
        >
          <div className="border-ds-outline/80 flex items-center justify-between gap-2 border-b px-3 py-2.5">
            <p className="ds-app-card-title">Notifications</p>
            {hasUnread ? (
              <button
                type="button"
                onClick={() => void markAllRead()}
                className="text-ds-primary hover:text-ds-primary/80 shrink-0 cursor-pointer text-sm font-semibold transition-colors"
              >
                Mark all as read
              </button>
            ) : null}
          </div>
          <div className="max-h-[24rem] overflow-y-auto">
            {preview.length === 0 ? (
              <p className="text-ds-on-surface-variant px-3 py-4 text-sm">No notifications yet.</p>
            ) : (
              preview.map((notification) => (
                <Link
                  key={notification.id}
                  href={notification.href}
                  role="menuitem"
                  onClick={() => {
                    if (!notification.read_at) void markRead([notification.id]);
                    setOpen(false);
                  }}
                  className="border-ds-outline/70 hover:bg-ds-sidebar/60 block cursor-pointer border-b px-3 py-3 text-left transition-colors last:border-b-0"
                >
                  <div className="mb-1 flex items-start justify-between gap-2">
                    <p className="ds-app-card-title">{notification.title}</p>
                    <span className="ds-app-caption shrink-0">
                      {formatNotificationTime(notification.created_at, localeReady)}
                    </span>
                  </div>
                  <p className="ds-app-body-muted line-clamp-2">
                    {notification.body}
                  </p>
                </Link>
              ))
            )}
          </div>
          <div className="border-ds-outline/80 border-t px-3 py-2.5">
            <Link
              href="/notifications"
              role="menuitem"
              onClick={() => setOpen(false)}
              className="text-ds-primary hover:text-ds-primary/80 block cursor-pointer text-center text-sm font-semibold transition-colors"
            >
              See all notifications
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function IconBell({ className }: { className?: string }) {
  return <Bell className={className} strokeWidth={1.9} aria-hidden />;
}
