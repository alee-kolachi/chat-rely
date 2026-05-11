import Link from "next/link";
import {
  AdminDataTable,
  AdminPagination,
  type AdminColumn,
} from "@/components/admin/admin-data-table";
import { AdminStatusBadge } from "@/components/admin/admin-status-badge";
import { listAdminTickets, type AdminTicketListItem } from "@/lib/admin/api";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const STATUS_OPTIONS = ["", "open", "pending_customer", "resolved"] as const;
const PRIORITY_OPTIONS = ["", "low", "medium", "high"] as const;

function pickString(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value || undefined;
}

function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

export default async function AdminTicketsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  const userEmail = pickString(sp.user_email) ?? "";
  const status = pickString(sp.status) ?? "";
  const priority = pickString(sp.priority) ?? "";
  const agentId = pickString(sp.agent_id) ?? "";
  const sortByRaw = pickString(sp.sort_by) ?? "updated_at";
  const sortDirRaw = pickString(sp.sort_dir) ?? "desc";
  const page = Math.max(1, Number(pickString(sp.page) ?? "1") || 1);
  const pageSize = Math.max(1, Math.min(200, Number(pickString(sp.page_size) ?? "50") || 50));

  const allowedSorts = new Set(["updated_at", "created_at", "priority", "status"]);
  const sortBy = allowedSorts.has(sortByRaw) ? (sortByRaw as "updated_at") : "updated_at";
  const sortDir: "asc" | "desc" = sortDirRaw === "asc" ? "asc" : "desc";

  const data = await listAdminTickets({
    user_email: userEmail || null,
    status: status || null,
    priority: priority || null,
    agent_id: agentId || null,
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
      priority: priority || undefined,
      agent_id: agentId || undefined,
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
    return qs ? `/admin/tickets?${qs}` : "/admin/tickets";
  };

  const columns: AdminColumn<AdminTicketListItem>[] = [
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
      key: "agent",
      label: "Agent",
      skipRowLinkWrap: true,
      render: (row) => (
        <Link
          href={`/admin/agents/${row.agent_id}`}
          className="text-ds-on-surface text-sm hover:underline"
        >
          {row.agent_name}
        </Link>
      ),
    },
    {
      key: "status",
      label: "Status",
      sortable: true,
      sortKey: "status",
      render: (row) => <AdminStatusBadge status={row.status} />,
    },
    {
      key: "priority",
      label: "Priority",
      sortable: true,
      sortKey: "priority",
      render: (row) => (
        <AdminStatusBadge
          status={row.priority}
          tone={
            row.priority === "high"
              ? "danger"
              : row.priority === "low"
              ? "neutral"
              : "warning"
          }
        />
      ),
    },
    {
      key: "subject",
      label: "Subject",
      render: (row) => (
        <span className="text-ds-on-surface text-sm">
          {row.subject ?? <span className="text-ds-on-surface-variant">—</span>}
        </span>
      ),
    },
    {
      key: "customer_email",
      label: "Customer",
      render: (row) => row.customer_email ?? "—",
    },
    {
      key: "created_at",
      label: "Created",
      sortable: true,
      sortKey: "created_at",
      render: (row) => formatDateTime(row.created_at),
    },
    {
      key: "updated_at",
      label: "Updated",
      sortable: true,
      sortKey: "updated_at",
      render: (row) => formatDateTime(row.updated_at),
    },
  ];

  return (
    <div className="flex flex-col gap-6 p-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-ds-on-surface text-2xl font-semibold">Tickets</h1>
        <p className="text-ds-on-surface-variant text-sm">
          Cross-tenant ticket queue. {data.total.toLocaleString()} match the current filters.
        </p>
      </header>

      <form
        action="/admin/tickets"
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
        <Field label="Agent ID">
          <input name="agent_id" defaultValue={agentId} placeholder="UUID" className={inputClass} />
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
        <Field label="Priority">
          <select name="priority" defaultValue={priority} className={inputClass}>
            {PRIORITY_OPTIONS.map((p) => (
              <option key={p} value={p}>
                {p || "Any"}
              </option>
            ))}
          </select>
        </Field>
        <input type="hidden" name="sort_by" value={sortBy} />
        <input type="hidden" name="sort_dir" value={sortDir} />
        <input type="hidden" name="page_size" value={String(pageSize)} />
        <div className="col-span-full flex items-center gap-3">
          <button
            type="submit"
            className="bg-ds-primary text-ds-on-primary hover:bg-ds-primary-hover rounded-md px-4 py-2 text-sm font-medium"
          >
            Apply filters
          </button>
          <Link
            href="/admin/tickets"
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
        rowHref={(row) => `/admin/tickets/${row.id}`}
        sortBy={sortBy}
        sortDir={sortDir}
        buildSortHref={({ sort_by, sort_dir }) =>
          buildHref({ sort_by, sort_dir, page: 1 })
        }
        emptyMessage="No tickets match the current filters."
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
