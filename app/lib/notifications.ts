export type UserNotification = {
  id: string;
  kind: string;
  title: string;
  body: string;
  href: string;
  metadata: Record<string, unknown>;
  read_at: string | null;
  created_at: string;
};

export type NotificationsListResponse = {
  notifications: UserNotification[];
  unread_count: number;
};

/** Relative time for notification lists (compact). */
export function formatNotificationTime(iso: string, localeReady = true): string {
  if (!localeReady) return "—";
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "";
  const diff = Math.max(0, Date.now() - t);
  const m = Math.floor(diff / 60000);
  if (m < 1) return "Just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 48) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}
