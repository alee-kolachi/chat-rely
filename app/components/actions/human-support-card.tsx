import Link from "next/link";
import type { ApiActionCatalogEntry } from "@/components/actions/action-catalog-types";
import { ActionToggle } from "@/components/actions/action-toggle";
import { actionKeyToSlug } from "@/lib/action-keys";
import { StatusBadge } from "@/components/actions/status-badge";
import type { ShopifyActionStatus } from "@/components/actions/shopify-actions-data";
import { IconChevronRight } from "@/components/actions/action-icons";

type HumanSupportCardProps = {
  entry: ApiActionCatalogEntry;
  badgeStatus: ShopifyActionStatus;
  enabled: boolean;
  toggleDisabled: boolean;
  togglePending?: boolean;
  onToggle?: (next: boolean) => void | Promise<void>;
};

export function HumanSupportCard({
  entry,
  badgeStatus,
  enabled,
  toggleDisabled,
  togglePending = false,
  onToggle,
}: HumanSupportCardProps) {
  return (
    <article className="border-ds-outline flex flex-col gap-3 rounded-ds-lg border bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="ds-app-card-title">{entry.label}</h3>
          <StatusBadge status={badgeStatus} />
        </div>
        <p className="text-ds-on-surface-variant mt-1 line-clamp-2 text-sm leading-snug">{entry.description}</p>
        <Link
          href={`/actions/${actionKeyToSlug(entry.action_key)}`}
          className="text-ds-on-surface-variant hover:text-ds-interactive-hover mt-2 inline-flex items-center gap-0.5 text-xs font-semibold transition-colors"
        >
          Details
          <IconChevronRight className="size-3" />
        </Link>
      </div>
      <ActionToggle
        checked={enabled}
        onChange={onToggle}
        disabled={toggleDisabled}
        pending={togglePending}
        label={`Enable ${entry.label}`}
        className="shrink-0 sm:ml-4"
      />
    </article>
  );
}
