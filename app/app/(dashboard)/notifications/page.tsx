"use client";

import Link from "next/link";
import { useNotifications } from "@/components/layout/notifications-context";
import { formatNotificationTime } from "@/lib/notifications";
import { useClientMounted } from "@/lib/use-client-mounted";
import { appButtonClassName } from "@/lib/button-styles";
import { cn } from "@/lib/utils";

export default function NotificationsPage() {
  const localeReady = useClientMounted();
  const { notifications, markRead, markAllRead } = useNotifications();

  return (
    <div className="ds-app-shell px-6 pt-6 pb-24 md:px-8 md:pt-8 md:pb-28">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="ds-app-page-title">Notifications</h1>
            <p className="ds-app-page-description ds-app-page-description--wide">
              Recent account and workspace updates.
            </p>
          </div>
          {notifications.some((n) => n.read_at == null) ? (
            <button
              type="button"
              onClick={() => void markAllRead()}
              className={appButtonClassName("default", { className: "cursor-pointer self-start sm:self-auto" })}
            >
              Mark all read
            </button>
          ) : null}
        </header>

        <section className="border-ds-outline bg-ds-surface overflow-hidden rounded-ds-xl border shadow-sm">
          {notifications.length === 0 ? (
            <p className="text-ds-on-surface-variant px-5 py-8 text-sm">No notifications yet.</p>
          ) : (
            <ul className="divide-ds-outline divide-y">
              {notifications.map((notification) => (
                <li key={notification.id} className="border-ds-outline/70 border-b last:border-b-0">
                  <Link
                    href={notification.href}
                    className="hover:bg-ds-sidebar/60 block cursor-pointer px-5 py-4 transition-colors md:px-6"
                    onClick={() => {
                      if (!notification.read_at) void markRead([notification.id]);
                    }}
                  >
                    <div className="mb-1.5 flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-2">
                        <p className="text-ds-on-surface truncate text-sm font-semibold md:text-base">
                          {notification.title}
                        </p>
                        <span
                          className={cn(
                            "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                            notification.read_at == null
                              ? "bg-ds-primary/12 text-ds-primary"
                              : "bg-ds-sidebar text-ds-on-surface-variant"
                          )}
                        >
                          {notification.read_at == null ? "New" : "Read"}
                        </span>
                      </div>
                      <span className="ds-app-body-muted shrink-0">
                        {formatNotificationTime(notification.created_at, localeReady)}
                      </span>
                    </div>
                    <p className="text-ds-on-surface-variant text-sm leading-relaxed">{notification.body}</p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
