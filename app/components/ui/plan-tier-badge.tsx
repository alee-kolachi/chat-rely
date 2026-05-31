import { Crown } from "lucide-react";
import { cn } from "@/lib/utils";

export type PlanTierBadgeVariant = "standard" | "pro";

type PlanCrownIconProps = {
  className?: string;
  title?: string;
};

/** Solid yellow crown for Pro and other locked-plan hints. */
export function PlanCrownIcon({ className, title }: PlanCrownIconProps) {
  return (
    <span className={cn("inline-flex shrink-0", className)} title={title}>
      <Crown
        className="size-[1em] fill-yellow-400 text-yellow-400 stroke-yellow-600"
        strokeWidth={1.75}
        aria-hidden
      />
    </span>
  );
}

type PlanTierBadgeProps = {
  tier: PlanTierBadgeVariant;
  className?: string;
  title?: string;
};

/** Pro = filled yellow crown. Standard = small text pill. */
export function PlanTierBadge({ tier, className, title }: PlanTierBadgeProps) {
  if (tier === "pro") {
    return (
      <span className={cn("inline-flex shrink-0", className)} title={title ?? "Pro plan"} aria-label="Pro plan">
        <PlanCrownIcon className="size-4" />
      </span>
    );
  }

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-700",
        className
      )}
      title={title ?? "Standard plan"}
    >
      Standard
    </span>
  );
}
