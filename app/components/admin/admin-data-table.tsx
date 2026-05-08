import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type AdminColumn<T> = {
  key: string;
  label: string;
  align?: "left" | "right" | "center";
  className?: string;
  render: (row: T) => ReactNode;
  sortable?: boolean;
  sortKey?: string;
};

export type AdminDataTableProps<T> = {
  columns: AdminColumn<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  rowHref?: (row: T) => string;
  emptyMessage?: string;
  /**
   * Current sort + URL helpers. When provided, sortable columns become links
   * that toggle direction or switch the active column.
   */
  sortBy?: string;
  sortDir?: "asc" | "desc";
  buildSortHref?: (params: { sort_by: string; sort_dir: "asc" | "desc" }) => string;
};

export function AdminDataTable<T>({
  columns,
  rows,
  rowKey,
  rowHref,
  emptyMessage = "No results found.",
  sortBy,
  sortDir,
  buildSortHref,
}: AdminDataTableProps<T>) {
  return (
    <div className="border-ds-outline overflow-hidden rounded-xl border bg-ds-surface">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] border-collapse text-sm">
          <thead>
            <tr className="bg-ds-neutral text-ds-on-surface-variant text-xs font-semibold uppercase tracking-wide">
              {columns.map((col) => {
                const sortKey = col.sortKey ?? col.key;
                const isActive = sortBy === sortKey;
                const nextDir: "asc" | "desc" = isActive && sortDir === "desc" ? "asc" : "desc";
                const cellClass = cn(
                  "border-ds-outline border-b px-4 py-3",
                  col.align === "right" && "text-right",
                  col.align === "center" && "text-center"
                );
                if (col.sortable && buildSortHref) {
                  return (
                    <th key={col.key} className={cellClass}>
                      <Link
                        href={buildSortHref({ sort_by: sortKey, sort_dir: nextDir })}
                        className={cn(
                          "hover:text-ds-primary inline-flex items-center gap-1 transition",
                          isActive && "text-ds-primary"
                        )}
                      >
                        {col.label}
                        {isActive && <span aria-hidden>{sortDir === "asc" ? "↑" : "↓"}</span>}
                      </Link>
                    </th>
                  );
                }
                return (
                  <th key={col.key} className={cellClass}>
                    {col.label}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="text-ds-on-surface-variant px-4 py-12 text-center text-sm"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              rows.map((row) => {
                const href = rowHref?.(row);
                return (
                  <tr
                    key={rowKey(row)}
                    className={cn(
                      "border-ds-outline border-b last:border-b-0",
                      href && "hover:bg-ds-neutral/40 cursor-pointer transition"
                    )}
                  >
                    {columns.map((col) => {
                      const cellClass = cn(
                        "px-4 py-3 align-middle",
                        col.align === "right" && "text-right",
                        col.align === "center" && "text-center",
                        col.className
                      );
                      const content = col.render(row);
                      if (href) {
                        return (
                          <td key={col.key} className={cellClass}>
                            <Link href={href} className="block w-full">
                              {content}
                            </Link>
                          </td>
                        );
                      }
                      return (
                        <td key={col.key} className={cellClass}>
                          {content}
                        </td>
                      );
                    })}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export type AdminPaginationProps = {
  page: number;
  pageSize: number;
  total: number;
  buildPageHref: (page: number) => string;
};

export function AdminPagination({ page, pageSize, total, buildPageHref }: AdminPaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);
  const prevDisabled = page <= 1;
  const nextDisabled = page >= totalPages;

  return (
    <div className="text-ds-on-surface-variant flex items-center justify-between text-xs">
      <span>
        Showing <span className="text-ds-on-surface font-medium">{from}</span>–
        <span className="text-ds-on-surface font-medium">{to}</span> of{" "}
        <span className="text-ds-on-surface font-medium">{total.toLocaleString()}</span>
      </span>
      <div className="flex items-center gap-2">
        <PageLink
          href={buildPageHref(Math.max(1, page - 1))}
          disabled={prevDisabled}
          label="Previous"
        />
        <span className="px-2">
          Page <span className="text-ds-on-surface font-semibold">{page}</span> /{" "}
          {totalPages.toLocaleString()}
        </span>
        <PageLink
          href={buildPageHref(Math.min(totalPages, page + 1))}
          disabled={nextDisabled}
          label="Next"
        />
      </div>
    </div>
  );
}

function PageLink({
  href,
  disabled,
  label,
}: {
  href: string;
  disabled: boolean;
  label: string;
}) {
  if (disabled) {
    return (
      <span className="border-ds-outline text-ds-on-surface-variant/60 cursor-not-allowed rounded-md border px-3 py-1.5">
        {label}
      </span>
    );
  }
  return (
    <Link
      href={href}
      className="border-ds-outline hover:bg-ds-neutral/50 hover:text-ds-on-surface rounded-md border px-3 py-1.5 transition"
    >
      {label}
    </Link>
  );
}
