import { SendHorizontal } from "lucide-react";

/** Paper-plane send icon pointing right (matches Lucide SendHorizontal). */
export function WidgetSendIcon({ className }: { className?: string }) {
  return <SendHorizontal className={className} strokeWidth={1.8} aria-hidden />;
}

/** Inline SVG for the embed bundle (keep in sync with WidgetSendIcon). */
export const WIDGET_SEND_ICON_SVG =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3.714 3.048a.498.498 0 0 0-.683.627l2.843 7.627a2 2 0 0 1 0 1.396l-2.842 7.627a.498.498 0 0 0 .682.627l18-8.5a.5.5 0 0 0 0-.904z"/><path d="M6 12h16"/></svg>';
