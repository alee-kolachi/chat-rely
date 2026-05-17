import Link from "next/link";
import type { ApiActionCatalogEntry } from "@/components/actions/action-catalog-types";
import { ActionToggle } from "@/components/actions/action-toggle";
import { actionKeyToSlug } from "@/lib/action-keys";
import { StatusBadge } from "@/components/actions/status-badge";
import type { ShopifyActionStatus } from "@/components/actions/shopify-actions-data";

type HumanSupportCardProps = {
  entry: ApiActionCatalogEntry;
  badgeStatus: ShopifyActionStatus;
  enabled: boolean;
  toggleDisabled: boolean;
  onToggle?: (next: boolean) => void | Promise<void>;
};

export function HumanSupportCard({
  entry,
  badgeStatus,
  enabled,
  toggleDisabled,
  onToggle,
}: HumanSupportCardProps) {
  return (
    <article className="border-ds-outline overflow-hidden rounded-ds-xl border bg-ds-surface shadow-sm">
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h3 className="ds-app-card-title">{entry.label}</h3>
            <p className="ds-app-body-muted mt-1.5 text-sm leading-relaxed">{entry.description}</p>
          </div>
          <ActionToggle
            checked={enabled}
            onChange={onToggle}
            disabled={toggleDisabled}
            label={`Enable ${entry.label}`}
            className="mt-0.5 shrink-0"
          />
        </div>
      </div>

      <div className="border-ds-outline/60 bg-ds-sidebar/30 flex items-center justify-between gap-3 border-t px-5 py-3">
        <StatusBadge status={badgeStatus} />
        <Link
          href={`/actions/${actionKeyToSlug(entry.action_key)}`}
          className="text-ds-on-surface hover:text-ds-interactive-hover inline-flex shrink-0 items-center gap-1 text-sm font-semibold transition-colors"
        >
          Configure
        </Link>
      </div>
    </article>
  );
}
