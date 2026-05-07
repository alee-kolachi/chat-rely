"use client";

import type { ReactNode } from "react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import { backendFetch } from "@/lib/backend-api";
import type { NotificationsListResponse, UserNotification } from "@/lib/notifications";
import { cn } from "@/lib/utils";

const POLL_MS = 25_000;
const TOAST_MS = 5200;

type NotificationsContextValue = {
  notifications: UserNotification[];
  unreadCount: number;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  markRead: (ids: string[]) => Promise<void>;
  markAllRead: () => Promise<void>;
  dismissToast: () => void;
  toast: UserNotification | null;
};

const NotificationsContext = createContext<NotificationsContextValue | null>(null);

export function useNotifications(): NotificationsContextValue {
  const ctx = useContext(NotificationsContext);
  if (!ctx) {
    throw new Error("useNotifications must be used within NotificationsProvider");
  }
  return ctx;
}

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<UserNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<UserNotification | null>(null);

  const newestIdOnLastFetchRef = useRef<string | null>(null);
  const initialPollDoneRef = useRef(false);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasLoadedOnceRef = useRef(false);

  const dismissToast = useCallback(() => {
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
      toastTimerRef.current = null;
    }
    setToast(null);
  }, []);

  const refresh = useCallback(async () => {
    try {
      const data = await backendFetch<NotificationsListResponse>("/api/v1/notifications?limit=50");
      setNotifications(data.notifications);
      setUnreadCount(data.unread_count);
      setError(null);

      const newest = data.notifications[0];
      const newestId = newest?.id ?? null;
      const prev = newestIdOnLastFetchRef.current;

      if (
        initialPollDoneRef.current &&
        newestId &&
        newestId !== prev &&
        newest.read_at == null
      ) {
        if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
        setToast(newest);
        toastTimerRef.current = setTimeout(() => setToast(null), TOAST_MS);
      }

      newestIdOnLastFetchRef.current = newestId;
      initialPollDoneRef.current = true;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load notifications");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (hasLoadedOnceRef.current) return;
    hasLoadedOnceRef.current = true;
    const timeoutId = window.setTimeout(() => {
      void refresh();
    }, 1200);
    return () => window.clearTimeout(timeoutId);
  }, [refresh]);

  useEffect(() => {
    const id = window.setInterval(() => void refresh(), POLL_MS);
    return () => window.clearInterval(id);
  }, [refresh]);

  useEffect(() => {
    const onFocus = () => void refresh();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [refresh]);

  const markRead = useCallback(
    async (ids: string[]) => {
      if (!ids.length) return;
      try {
        await backendFetch("/api/v1/notifications/read", {
          method: "POST",
          body: JSON.stringify({ notification_ids: ids }),
        });
        await refresh();
      } catch {
        /* ignore */
      }
    },
    [refresh]
  );

  const markAllRead = useCallback(async () => {
    try {
      await backendFetch("/api/v1/notifications/read", {
        method: "POST",
        body: JSON.stringify({ all: true }),
      });
      await refresh();
    } catch {
      /* ignore */
    }
  }, [refresh]);

  const value = useMemo(
    () => ({
      notifications,
      unreadCount,
      loading,
      error,
      refresh,
      markRead,
      markAllRead,
      dismissToast,
      toast,
    }),
    [notifications, unreadCount, loading, error, refresh, markRead, markAllRead, dismissToast, toast]
  );

  return (
    <NotificationsContext.Provider value={value}>
      {children}
      <NotificationToastHost toast={toast} onDismiss={dismissToast} />
    </NotificationsContext.Provider>
  );
}

function NotificationToastHost({
  toast,
  onDismiss,
}: {
  toast: UserNotification | null;
  onDismiss: () => void;
}) {
  const visible = Boolean(toast);

  return (
    <div
      className={cn(
        "pointer-events-none fixed bottom-5 left-5 z-[140] max-w-[min(92vw,24rem)] transition-opacity duration-300 md:bottom-6 md:left-6",
        visible ? "opacity-100" : "opacity-0"
      )}
      aria-live="polite"
    >
      {toast ? (
        <div
          className={cn(
            "border-ds-outline bg-ds-surface pointer-events-auto relative rounded-ds-xl border shadow-lg",
            visible ? "ds-notification-toast-enter" : "ds-notification-toast-exit"
          )}
        >
          <Link
            href={toast.href}
            className="hover:bg-ds-sidebar/50 block cursor-pointer rounded-ds-xl px-4 py-3 pr-11 transition-colors"
            onClick={() => onDismiss()}
          >
            <div className="mb-1 flex items-center gap-2">
              <span className="bg-ds-primary inline-block size-2 shrink-0 rounded-full" />
              <p className="text-ds-on-surface text-sm font-semibold">{toast.title}</p>
            </div>
            <p className="text-ds-on-surface-variant line-clamp-3 text-xs leading-relaxed">
              {toast.body || "Open to view details."}
            </p>
          </Link>
          <button
            type="button"
            onClick={onDismiss}
            className="text-ds-on-surface-variant hover:text-ds-on-surface absolute top-2.5 right-2 z-[1] cursor-pointer rounded p-1 transition-colors"
            aria-label="Dismiss notification"
          >
            <IconClose className="size-3.5" />
          </button>
        </div>
      ) : null}
    </div>
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
