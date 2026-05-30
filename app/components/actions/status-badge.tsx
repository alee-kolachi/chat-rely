import { cn } from "@/lib/utils";
import type { ShopifyActionStatus } from "./shopify-actions-data";

const STATUS_LABEL: Record<ShopifyActionStatus, string> = {
  live: "Available",
  disabled: "Disabled",
  "coming-soon": "Coming soon",
};

const STATUS_CLASSES: Record<ShopifyActionStatus, string> = {
  live: "border-emerald-200 bg-emerald-50 text-emerald-700",
  disabled: "border-ds-outline bg-ds-sidebar text-ds-on-surface-variant",
  "coming-soon": "border-amber-200 bg-amber-50 text-amber-700",
};

type StatusBadgeProps = {
  status: ShopifyActionStatus;
  className?: string;
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold",
        STATUS_CLASSES[status],
        className
      )}
    >
      {STATUS_LABEL[status]}
    </span>
  );
}
