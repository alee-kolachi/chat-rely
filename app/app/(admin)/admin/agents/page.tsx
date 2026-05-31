import Link from "next/link";
import { appButtonClassName } from "@/lib/button-styles";
import {
  AdminDataTable,
  AdminPagination,
  type AdminColumn,
} from "@/components/admin/admin-data-table";
import { AdminStatusBadge } from "@/components/admin/admin-status-badge";
import {
  listAdminAgents,
  type AdminAgentListItem,
  type AdminAgentSortBy,
} from "@/lib/admin/api";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const STATUS_OPTIONS = ["", "active", "paused", "archived"] as const;

const ALLOWED_SORTS = new Set<AdminAgentSortBy>([
  "created_at",
  "name",
  "conversations_total",
  "conversations_mtd",
  "knowledge_sources_count",
]);

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

export default async function AdminAgentsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  const userEmail = pickString(sp.user_email) ?? "";
  const status = pickString(sp.status) ?? "";
  const model = pickString(sp.model) ?? "";
  const sortByRaw = pickString(sp.sort_by) ?? "created_at";
  const sortDirRaw = pickString(sp.sort_dir) ?? "desc";
  const page = Math.max(1, Number(pickString(sp.page) ?? "1") || 1);
  const pageSize = Math.max(1, Math.min(200, Number(pickString(sp.page_size) ?? "50") || 50));

  const sortBy: AdminAgentSortBy = ALLOWED_SORTS.has(sortByRaw as AdminAgentSortBy)
    ? (sortByRaw as AdminAgentSortBy)
    : "created_at";
  const sortDir: "asc" | "desc" = sortDirRaw === "asc" ? "asc" : "desc";

  const data = await listAdminAgents({
    user_email: userEmail || null,
    status: status || null,
    model: model || null,
    sort_by: sortBy,
    sort_dir: sortDir,
    page,
    page_size: pageSize,
  });

  const buildHref = (overrides: Record<string, string | number | null | undefined>) => {
    const params = new URLSearchParams();
    const merged: Record<string, string | number | null | undefined> = {
      user_email: userEmail || undefined,
      status: status || undefined,
      model: model || undefined,
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
    return qs ? `/admin/agents?${qs}` : "/admin/agents";
  };

  const columns: AdminColumn<AdminAgentListItem>[] = [
    {
      key: "owner",
      label: "Owner",
      skipRowLinkWrap: true,
      render: (row) => (
        <Link
          href={`/admin/users/${row.user_id}`}
          className="text-ds-primary text-sm hover:underline"
        >
          {row.user_email}
        </Link>
      ),
    },
    {
      key: "name",
      label: "Name",
      sortable: true,
      sortKey: "name",
      render: (row) => (
        <div className="flex flex-col">
          <span className="text-ds-on-surface font-medium">{row.name}</span>
          <span className="text-ds-on-surface-variant text-[11px]">{row.slug}</span>
        </div>
      ),
    },
    {
      key: "status",
      label: "Status",
      render: (row) => <AdminStatusBadge status={row.status} />,
    },
    {
      key: "model",
      label: "Model",
      render: (row) => (
        <span className="font-mono text-[11px]">{row.model}</span>
      ),
    },
    {
      key: "conversations_total",
      label: "Conv (total)",
      align: "right",
      sortable: true,
      sortKey: "conversations_total",
      render: (row) => row.conversations_total.toLocaleString(),
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
      key: "knowledge_sources_count",
      label: "Knowledge",
      align: "right",
      sortable: true,
      sortKey: "knowledge_sources_count",
      render: (row) => row.knowledge_sources_count.toLocaleString(),
    },
    {
      key: "actions_enabled_count",
      label: "Actions",
      align: "right",
      render: (row) => row.actions_enabled_count.toLocaleString(),
    },
    {
      key: "created_at",
      label: "Created",
      sortable: true,
      sortKey: "created_at",
      render: (row) => formatDate(row.created_at),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-ds-on-surface text-2xl font-semibold">Agents</h1>
        <p className="text-ds-on-surface-variant text-sm">
          Cross-tenant agent directory. {data.total.toLocaleString()} match the current
          filters.
        </p>
      </header>

      <form
        action="/admin/agents"
        method="get"
        className="border-ds-outline grid grid-cols-1 gap-3 rounded-xl border bg-ds-surface p-4 sm:grid-cols-3 lg:grid-cols-4"
      >
        <Field label="Owner email">
          <input
            name="user_email"
            defaultValue={userEmail}
            placeholder="alice@…"
            className={inputClass}
          />
        </Field>
        <Field label="Status">
          <select name="status" defaultValue={status} className={inputClass}>
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s || "Any"}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Model">
          <input
            name="model"
            defaultValue={model}
            placeholder="gpt-4o-mini"
            className={inputClass}
          />
        </Field>
        <input type="hidden" name="sort_by" value={sortBy} />
        <input type="hidden" name="sort_dir" value={sortDir} />
        <input type="hidden" name="page_size" value={String(pageSize)} />
        <div className="col-span-full flex items-center gap-3">
          <button
            type="submit"
            className={appButtonClassName()}
          >
            Apply filters
          </button>
          <Link
            href="/admin/agents"
            className="text-ds-on-surface-variant hover:text-ds-on-surface text-sm"
          >
            Clear
          </Link>
        </div>
      </form>

      <AdminDataTable
        columns={columns}
        rows={data.items}
        rowKey={(row) => row.id}
        rowHref={(row) => `/admin/agents/${row.id}`}
        sortBy={sortBy}
        sortDir={sortDir}
        buildSortHref={({ sort_by, sort_dir }) =>
          buildHref({ sort_by, sort_dir, page: 1 })
        }
        emptyMessage="No agents match the current filters."
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

const inputClass =
  "border-ds-outline focus:border-ds-primary text-ds-on-surface w-full rounded-md border bg-ds-surface px-3 py-2 text-sm focus:outline-none";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-ds-on-surface-variant text-[11px] font-medium uppercase tracking-wide">
        {label}
      </span>
      {children}
    </label>
  );
}
