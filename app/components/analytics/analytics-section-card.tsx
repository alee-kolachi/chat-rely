import type { ReactNode } from "react";
import { PlanGatedBlock } from "@/components/ui/plan-unlock-footer";
import { PlanTierBadge, type PlanTierBadgeVariant } from "@/components/ui/plan-tier-badge";
import { cn } from "@/lib/utils";

type AnalyticsSectionCardProps = {
  title: string;
  locked?: boolean;
  requiredTier?: PlanTierBadgeVariant;
  footnote?: string;
  children: ReactNode;
  className?: string;
};

/** Analytics panel with optional plan gate (crown, callout, non-interactive preview). */
export function AnalyticsSectionCard({
  title,
  locked = false,
  requiredTier = "standard",
  footnote,
  children,
  className,
}: AnalyticsSectionCardProps) {
  return (
    <article
      className={cn("border-ds-outline bg-ds-surface rounded-ds-xl border p-6 shadow-sm", className)}
    >
      <div className="mb-5 flex flex-wrap items-center gap-2">
        <h2 className="ds-app-section-title">{title}</h2>
        {locked ? <PlanTierBadge tier={requiredTier} /> : null}
      </div>
      {locked ? (
        <PlanGatedBlock locked tier={requiredTier} inset calloutMessage="Upgrade to unlock this analytics section">
          {children}
        </PlanGatedBlock>
      ) : (
        children
      )}
      {footnote && !locked ? <p className="ds-app-body-muted mt-4">{footnote}</p> : null}
    </article>
  );
}
