import { cn } from "@/lib/utils";

export type AdminJsonCellProps = {
  value: unknown;
  /** Visible label on the disclosure toggle. Defaults to "View JSON". */
  label?: string;
  /** Maximum height before the inner pre starts scrolling. */
  maxHeight?: number;
  /** Empty-state placeholder rendered when the value is empty/null. */
  emptyPlaceholder?: string;
  className?: string;
};

function isEmpty(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === "string") return value.trim().length === 0;
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === "object") return Object.keys(value as object).length === 0;
  return false;
}

/**
 * Collapsible `<details>` cell for free-form JSON columns (`features`, `throttle_policy`,
 * conversation/ticket `metadata`). Server-rendered, no client JS — `<details>` handles
 * open/close natively.
 */
export function AdminJsonCell({
  value,
  label = "View JSON",
  maxHeight = 240,
  emptyPlaceholder = "—",
  className,
}: AdminJsonCellProps) {
  if (isEmpty(value)) {
    return (
      <span className="ds-app-body-muted">{emptyPlaceholder}</span>
    );
  }
  let serialized: string;
  try {
    serialized = JSON.stringify(value, null, 2);
  } catch {
    serialized = String(value);
  }
  return (
    <details className={cn("group inline-block max-w-md", className)}>
      <summary
        className={cn(
          "text-ds-primary cursor-pointer list-none text-xs hover:underline",
          "select-none"
        )}
      >
        {label}
      </summary>
      <pre
        className="border-ds-outline bg-ds-neutral text-ds-on-surface mt-2 overflow-auto rounded-md border p-2 text-[11px] leading-snug"
        style={{ maxHeight }}
      >
        {serialized}
      </pre>
    </details>
  );
}
