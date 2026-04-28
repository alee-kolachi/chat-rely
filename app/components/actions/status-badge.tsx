import { cn } from "@/lib/utils";
import type { ShopifyActionStatus } from "./shopify-actions-data";

const STATUS_LABEL: Record<ShopifyActionStatus, string> = {
  live: "Live",
  disabled: "Disabled",
  "coming-soon": "Coming soon",
};

const STATUS_CLASSES: Record<ShopifyActionStatus, string> = {
  live: "border-emerald-200 bg-emerald-50 text-emerald-700",
  disabled: "border-zinc-200 bg-zinc-100 text-zinc-600",
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
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold tracking-widest uppercase",
        STATUS_CLASSES[status],
        className
      )}
    >
      {STATUS_LABEL[status]}
    </span>
  );
}
