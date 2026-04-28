import Link from "next/link";
import { cn } from "@/lib/utils";
import { ActionToggle } from "./action-toggle";
import { IconAction, IconChevronRight } from "./action-icons";
import { StatusBadge } from "./status-badge";
import type { ShopifyAction } from "./shopify-actions-data";

type ActionCardProps = {
  action: ShopifyAction;
};

export function ActionCard({ action }: ActionCardProps) {
  const isComingSoon = action.status === "coming-soon";

  return (
    <div
      className={cn(
        "border-ds-outline rounded-ds-xl flex flex-col border bg-white p-5 shadow-sm transition-shadow",
        !isComingSoon && "hover:shadow-md",
        isComingSoon && "opacity-90"
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="border-ds-outline bg-ds-sidebar text-ds-on-surface flex size-10 shrink-0 items-center justify-center rounded-ds-md border">
            <IconAction iconKey={action.icon} className="size-5" />
          </div>
          <div className="min-w-0">
            <h3 className="text-ds-on-surface truncate text-sm font-semibold">
              {action.label}
            </h3>
            <p className="text-ds-on-surface-variant mt-0.5 line-clamp-2 text-xs leading-relaxed">
              {action.description}
            </p>
          </div>
        </div>
        <ActionToggle
          defaultChecked={action.enabled}
          disabled={isComingSoon}
          label={`Enable ${action.label}`}
        />
      </div>

      <div className="border-ds-outline/60 mt-5 border-t pt-4">
        <p className="text-ds-on-surface-variant text-[10px] font-bold tracking-widest uppercase">
          Trigger example
        </p>
        <p className="text-ds-on-surface mt-1.5 line-clamp-1 text-xs italic">
          &ldquo;{action.triggerExamples[0]}&rdquo;
        </p>
      </div>

      <div className="mt-5 flex items-center justify-between">
        <StatusBadge status={action.status} />
        <Link
          href={`/actions/${action.id}`}
          className="text-ds-on-surface hover:text-ds-primary inline-flex items-center gap-1 text-xs font-semibold transition-colors"
        >
          Configure
          <IconChevronRight className="size-3.5" />
        </Link>
      </div>
    </div>
  );
}
