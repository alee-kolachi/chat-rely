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
import { X } from "lucide-react";
import { useGuardedSubmit } from "@/hooks/use-guarded-submit";
import { backendFetch, consumeBackendSseJson } from "@/lib/backend-api";
import type { NotificationsListResponse, UserNotification } from "@/lib/notifications";
import { cn } from "@/lib/utils";

/** Fallback polling only when the SSE stream is down. */
const POLL_FALLBACK_MS = 60_000;
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
  const sseActiveRef = useRef(false);

  const dismissToast = useCallback(() => {
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
      toastTimerRef.current = null;
    }
    setToast(null);
  }, []);

  const applyNotificationsPayload = useCallback((data: NotificationsListResponse) => {
    setNotifications(data.notifications);
    setUnreadCount(data.unread_count);

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
  }, []);

  const refresh = useCallback(async () => {
    try {
      const data = await backendFetch<NotificationsListResponse>("/api/v1/notifications?limit=50");
      applyNotificationsPayload(data);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load notifications");
    } finally {
      setLoading(false);
    }
  }, [applyNotificationsPayload]);

  useEffect(() => {
    let cancelled = false;
    let fallbackId: ReturnType<typeof setInterval> | null = null;
    let ac: AbortController | null = null;

    const stopFallback = () => {
      if (fallbackId) {
        window.clearInterval(fallbackId);
        fallbackId = null;
      }
    };

    const startFallback = () => {
      if (fallbackId || cancelled) return;
      sseActiveRef.current = false;
      fallbackId = window.setInterval(() => {
        if (document.visibilityState !== "visible") return;
        void refresh();
      }, POLL_FALLBACK_MS);
    };

    const connectSse = async () => {
      stopFallback();
      ac?.abort();
      ac = new AbortController();
      try {
        await consumeBackendSseJson<NotificationsListResponse>(
          "/api/v1/notifications/stream?limit=50",
          (data) => {
            sseActiveRef.current = true;
            applyNotificationsPayload(data);
            setError(null);
            setLoading(false);
          },
          { signal: ac.signal },
        );
        if (!cancelled && !ac.signal.aborted) {
          void connectSse();
        }
      } catch {
        if (ac.signal.aborted || cancelled) return;
        sseActiveRef.current = false;
        void refresh();
        startFallback();
      }
    };

    void connectSse();

    const onVisibility = () => {
      if (document.visibilityState !== "visible" || sseActiveRef.current) return;
      void refresh();
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelled = true;
      ac?.abort();
      stopFallback();
      sseActiveRef.current = false;
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [refresh, applyNotificationsPayload]);

  const { submit: submitMarkRead } = useGuardedSubmit(async (ids: string[]) => {
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
  });

  const { submit: submitMarkAllRead } = useGuardedSubmit(async () => {
    try {
      await backendFetch("/api/v1/notifications/read", {
        method: "POST",
        body: JSON.stringify({ all: true }),
      });
      await refresh();
    } catch {
      /* ignore */
    }
  });

  const markRead = useCallback(
    (ids: string[]) => {
      void submitMarkRead(ids);
    },
    [submitMarkRead]
  );

  const markAllRead = useCallback(() => {
    void submitMarkAllRead();
  }, [submitMarkAllRead]);

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
              <p className="ds-app-card-title">{toast.title}</p>
            </div>
            <p className="ds-app-body-muted line-clamp-3">
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
  return <X className={className} strokeWidth={2} aria-hidden />;
}
