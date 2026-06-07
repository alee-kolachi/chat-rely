import { conversationActivityLabel, visitorPresenceLabel } from "@/lib/visitor-presence";
import { cn } from "@/lib/utils";

export function VisitorPresenceBadges({
  conversationActive,
  visitorOnline,
  status,
  className,
}: {
  conversationActive: boolean;
  visitorOnline: boolean;
  status?: string;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      <span
        className={cn(
          "rounded-ds-md px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase",
          conversationActive ? "bg-emerald-100 text-emerald-900" : "bg-ds-sidebar text-ds-on-surface-variant ring-1 ring-ds-outline"
        )}
      >
        {conversationActivityLabel(conversationActive, status)}
      </span>
      {conversationActive ? (
        <span
          className={cn(
            "rounded-ds-md px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase",
            visitorOnline ? "bg-sky-100 text-sky-900" : "bg-ds-sidebar text-ds-on-surface-variant ring-1 ring-ds-outline"
          )}
        >
          {visitorPresenceLabel(visitorOnline)}
        </span>
      ) : null}
    </div>
  );
}
