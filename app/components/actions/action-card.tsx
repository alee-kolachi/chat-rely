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
  onToggle?: (next: boolean) => void | Promise<void>;
};

export function ActionCard({ action, badgeStatus, enabled, toggleDisabled, onToggle }: ActionCardProps) {
  const isComingSoon = badgeStatus === "coming-soon";

  return (
    <article
      className={cn(
        "border-ds-outline overflow-hidden rounded-ds-xl border bg-ds-surface shadow-sm transition-shadow",
        !isComingSoon && "hover:shadow-md",
        isComingSoon && "opacity-90"
      )}
    >
      <div className="p-5">
        <div className="flex gap-3">
          <div className="border-ds-outline bg-ds-sidebar text-ds-on-surface flex size-10 shrink-0 items-center justify-center rounded-ds-md border">
            <IconAction iconKey={action.icon} className="size-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-3">
              <h3 className="ds-app-card-title min-w-0 pr-1">{action.label}</h3>
              <ActionToggle
                checked={enabled}
                onChange={onToggle}
                disabled={toggleDisabled}
                label={`Enable ${action.label}`}
                className="mt-0.5"
              />
            </div>
            <p className="ds-app-body-muted mt-1.5 text-sm leading-relaxed">{action.description}</p>
          </div>
        </div>

        <div className="border-ds-outline/60 mt-4 border-t pt-4">
          <p className="ds-app-kicker">Trigger example</p>
          <p className="text-ds-on-surface mt-1 text-sm italic leading-relaxed">
            &ldquo;{action.triggerExamples[0]}&rdquo;
          </p>
        </div>
      </div>

      <div className="border-ds-outline/60 bg-ds-sidebar/30 flex items-center justify-between gap-3 border-t px-5 py-3">
        <StatusBadge status={badgeStatus} />
        <Link
          href={`/actions/${action.id}`}
          className="text-ds-on-surface hover:text-ds-interactive-hover inline-flex shrink-0 items-center gap-1 text-sm font-semibold transition-colors"
        >
          Configure
          <IconChevronRight className="size-3.5" />
        </Link>
      </div>
    </article>
  );
}
