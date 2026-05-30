import Link from "next/link";
import { cn } from "@/lib/utils";
import { ActionToggle } from "./action-toggle";
import { IconAction, IconChevronRight } from "./action-icons";
import { StatusBadge } from "./status-badge";
import type { ShopifyAction, ShopifyActionStatus } from "./shopify-actions-data";

type ActionCardProps = {
  action: ShopifyAction;
  badgeStatus: ShopifyActionStatus;
  enabled: boolean;
  toggleDisabled: boolean;
  togglePending?: boolean;
  /** Enabled in settings but dropped by plan runtime cap (see shopify-runtime-cap). */
  runtimeInactive?: boolean;
  onToggle?: (next: boolean) => void | Promise<void>;
};

export function ActionCard({
  action,
  badgeStatus,
  enabled,
  toggleDisabled,
  togglePending = false,
  runtimeInactive = false,
  onToggle,
}: ActionCardProps) {
  const isComingSoon = badgeStatus === "coming-soon";

  return (
    <article
      className={cn(
        "border-ds-outline flex flex-col rounded-ds-lg border bg-white transition-colors",
        !isComingSoon && "hover:border-black/20",
        isComingSoon && "opacity-90"
      )}
    >
      <div className="flex gap-3 p-4">
        <div className="bg-ds-sidebar text-ds-on-surface flex size-9 shrink-0 items-center justify-center rounded-ds-md">
          <IconAction iconKey={action.icon} className="size-4.5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="ds-app-card-title">{action.label}</h3>
              <p className="text-ds-on-surface-variant mt-0.5 line-clamp-2 text-sm leading-snug">
                {action.description}
              </p>
              {runtimeInactive ? (
                <p className="mt-1 text-xs font-medium text-amber-800">
                  Enabled, but inactive on your plan until you disable another action or upgrade.
                </p>
              ) : null}
            </div>
            <ActionToggle
              checked={enabled}
              onChange={onToggle}
              disabled={toggleDisabled}
              pending={togglePending}
              label={`Enable ${action.label}`}
              className="mt-0.5 shrink-0"
            />
          </div>
        </div>
      </div>

      <div className="border-ds-outline/70 flex items-center justify-between gap-3 border-t px-4 py-2.5">
        <StatusBadge status={badgeStatus} />
        <Link
          href={`/actions/${action.id}`}
          className="text-ds-on-surface-variant hover:text-ds-interactive-hover inline-flex shrink-0 items-center gap-0.5 text-xs font-semibold transition-colors"
        >
          Details
          <IconChevronRight className="size-3" />
        </Link>
      </div>
    </article>
  );
}
