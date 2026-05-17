import Link from "next/link";
import { AdminDataTable, AdminPagination, type AdminColumn } from "@/components/admin/admin-data-table";
import { AdminStatusBadge } from "@/components/admin/admin-status-badge";
import {
  formatCostUsd,
  formatMarginPct,
  marginBadgeTone,
  marginToneClass,
} from "@/lib/admin/cost-format";
import {
  listAdminUsers,
  type AdminUserListItem,
  type AdminUserSortBy,
} from "@/lib/admin/api";

const ALLOWED_SORTS = new Set<AdminUserSortBy>([
  "signed_up_at",
  "last_activity_at",
  "conversations_mtd",
  "email",
  "margin_mtd_usd",
  "total_cost_mtd_usd",
  "revenue_mtd_usd",
]);

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function pickString(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value || undefined;
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString();
  } catch {
    return iso;
  }
}

function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

export default async function AdminUsersPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const q = pickString(sp.q) ?? "";
  const sortByRaw = pickString(sp.sort_by) ?? "signed_up_at";
  const sortDirRaw = pickString(sp.sort_dir) ?? "desc";
  const page = Math.max(1, Number(pickString(sp.page) ?? "1") || 1);
  const pageSize = Math.max(1, Math.min(200, Number(pickString(sp.page_size) ?? "50") || 50));

  const sortBy: AdminUserSortBy = ALLOWED_SORTS.has(sortByRaw as AdminUserSortBy)
    ? (sortByRaw as AdminUserSortBy)
    : "signed_up_at";
  const sortDir: "asc" | "desc" = sortDirRaw === "asc" ? "asc" : "desc";

  const data = await listAdminUsers({
    q: q || null,
    sort_by: sortBy,
    sort_dir: sortDir,
    page,
    page_size: pageSize,
  });

  const buildHref = (overrides: Record<string, string | number | null | undefined>) => {
    const params = new URLSearchParams();
    const merged: Record<string, string | number | null | undefined> = {
      q: q || undefined,
      sort_by: sortBy,
      sort_dir: sortDir,
      page,
      page_size: pageSize,
      ...overrides,
    };
    for (const [k, v] of Object.entries(merged)) {
      if (v === undefined || v === null || v === "") continue;
      params.set(k, String(v));
    }
    const qs = params.toString();
    return qs ? `/admin/users?${qs}` : "/admin/users";
  };

  const columns: AdminColumn<AdminUserListItem>[] = [
    {
      key: "email",
      label: "Email",
      sortable: true,
      sortKey: "email",
      render: (row) => (
        <div className="flex flex-col">
          <span className="text-ds-on-surface font-medium">{row.email}</span>
          {row.full_name && (
            <span className="ds-app-body-muted">{row.full_name}</span>
          )}
        </div>
      ),
    },
    {
      key: "plan",
      label: "Plan",
      render: (row) =>
        row.plan_name ? (
          <span className="text-ds-on-surface text-sm">{row.plan_name}</span>
        ) : (
          <span className="ds-app-body-muted">No plan</span>
        ),
    },
    {
      key: "status",
      label: "Status",
      render: (row) =>
        row.subscription_status ? (
          <AdminStatusBadge status={row.subscription_status} />
        ) : (
          <span className="ds-app-body-muted">—</span>
        ),
    },
    {
      key: "agents",
      label: "Agents",
      align: "right",
      render: (row) => row.agents_count.toLocaleString(),
    },
    {
      key: "conversations_mtd",
      label: "Conv (MTD)",
      align: "right",
      sortable: true,
      sortKey: "conversations_mtd",
      render: (row) => row.conversations_mtd.toLocaleString(),
    },
    {
      key: "revenue_mtd_usd",
      label: "Revenue (MTD)",
      align: "right",
      sortable: true,
      sortKey: "revenue_mtd_usd",
      render: (row) => formatCostUsd(row.revenue_mtd_usd),
    },
    {
      key: "total_cost_mtd_usd",
      label: "Cost (MTD)",
      align: "right",
      sortable: true,
      sortKey: "total_cost_mtd_usd",
      render: (row) => formatCostUsd(row.total_cost_mtd_usd),
    },
    {
      key: "margin_mtd_usd",
      label: "Margin",
      align: "right",
      sortable: true,
      sortKey: "margin_mtd_usd",
      render: (row) => {
        const tone = marginBadgeTone(row.margin_mtd_usd, row.margin_pct_mtd);
        return (
          <span
            className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${marginToneClass(
              tone
            )}`}
          >
            {formatCostUsd(row.margin_mtd_usd)} · {formatMarginPct(row.margin_pct_mtd)}
          </span>
        );
      },
    },
    {
      key: "last_activity_at",
      label: "Last activity",
      sortable: true,
      sortKey: "last_activity_at",
      render: (row) => formatDateTime(row.last_activity_at),
    },
    {
      key: "signed_up_at",
      label: "Signed up",
      sortable: true,
      sortKey: "signed_up_at",
      render: (row) => formatDate(row.signed_up_at),
    },
  ];

  return (
    <div className="flex flex-col gap-6 p-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-ds-on-surface text-2xl font-semibold">Users</h1>
        <p className="text-ds-on-surface-variant text-sm">
          Cross-tenant directory. {data.total.toLocaleString()} total users.
        </p>
      </header>

      <form action="/admin/users" method="get" className="flex flex-wrap items-center gap-3">
        <input
          name="q"
          defaultValue={q}
          placeholder="Search email or name…"
          className="border-ds-outline focus:border-ds-primary text-ds-on-surface w-72 rounded-md border bg-ds-surface px-3 py-2 text-sm focus:outline-none"
        />
        <input type="hidden" name="sort_by" value={sortBy} />
        <input type="hidden" name="sort_dir" value={sortDir} />
        <input type="hidden" name="page_size" value={String(pageSize)} />
        <button
          type="submit"
          className="bg-ds-primary text-ds-on-primary hover:bg-ds-primary-hover rounded-md px-4 py-2 text-sm font-medium"
        >
          Search
        </button>
        {q && (
          <Link
            href="/admin/users"
            className="text-ds-on-surface-variant hover:text-ds-on-surface text-sm"
          >
            Clear
          </Link>
        )}
      </form>

      <AdminDataTable
        columns={columns}
        rows={data.items}
        rowKey={(row) => row.id}
        rowHref={(row) => `/admin/users/${row.id}`}
        sortBy={sortBy}
        sortDir={sortDir}
        buildSortHref={({ sort_by, sort_dir }) =>
          buildHref({ sort_by, sort_dir, page: 1 })
        }
        emptyMessage={q ? `No users match "${q}".` : "No users yet."}
      />

      <AdminPagination
        page={data.page}
        pageSize={data.page_size}
        total={data.total}
        buildPageHref={(p) => buildHref({ page: p })}
      />
    </div>
  );
}
