import Link from "next/link";
import { appButtonClassName } from "@/lib/button-styles";
import { AdminApiErrorPanel } from "@/components/admin/admin-api-error-panel";
import { AdminDataTable, AdminPagination, type AdminColumn } from "@/components/admin/admin-data-table";
import { AdminStatusBadge } from "@/components/admin/admin-status-badge";
import {
  AdminApiError,
  listAdminDemos,
  type AdminDemoListItem,
} from "@/lib/admin/api";

export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const STATUS_OPTIONS = [
  "",
  "pending",
  "indexing",
  "qa_running",
  "ready",
  "needs_review",
  "failed",
  "expired",
] as const;

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

export default async function AdminDemoPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  const q = pickString(sp.q) ?? "";
  const status = pickString(sp.status) ?? "";
  const page = Math.max(1, Number(pickString(sp.page) ?? "1") || 1);
  const pageSize = Math.max(1, Math.min(200, Number(pickString(sp.page_size) ?? "50") || 50));

  let data;
  try {
    data = await listAdminDemos({
      q: q || null,
      status: status || null,
      page,
      page_size: pageSize,
    });
  } catch (err) {
    if (err instanceof AdminApiError) {
      return (
        <AdminApiErrorPanel title="Could not load demo agents" message={err.message} />
      );
    }
    throw err;
  }

  const buildHref = (overrides: Record<string, string | number | null | undefined>) => {
    const params = new URLSearchParams();
    const merged: Record<string, string | number | null | undefined> = {
      q: q || undefined,
      status: status || undefined,
      page,
      page_size: pageSize,
      ...overrides,
    };
    for (const [k, v] of Object.entries(merged)) {
      if (v === undefined || v === null || v === "") continue;
      params.set(k, String(v));
    }
    const qs = params.toString();
    return qs ? `/admin/demo?${qs}` : "/admin/demo";
  };

  const columns: AdminColumn<AdminDemoListItem>[] = [
    {
      key: "store",
      label: "Store",
      skipRowLinkWrap: true,
      render: (row) => (
        <Link
          href={`/admin/demo/${encodeURIComponent(row.slug)}`}
          className="flex flex-col hover:underline"
        >
          <span className="text-ds-on-surface font-medium">
            {row.display_name || row.store_host}
          </span>
          <span className="text-ds-primary text-[11px]">{row.store_host}</span>
        </Link>
      ),
    },
    {
      key: "status",
      label: "Status",
      render: (row) => <AdminStatusBadge status={row.status} />,
    },
    {
      key: "conversations",
      label: "Chats",
      align: "right",
      render: (row) => row.conversation_count.toLocaleString(),
    },
    {
      key: "visitors",
      label: "Visitors",
      align: "right",
      render: (row) => row.visitor_count.toLocaleString(),
    },
    {
      key: "messages",
      label: "Messages",
      align: "right",
      render: (row) => row.lifetime_message_count.toLocaleString(),
    },
    {
      key: "last_chat",
      label: "Last chat",
      render: (row) => (
        <span className="text-ds-on-surface text-sm">
          {formatDateTime(row.last_conversation_at)}
        </span>
      ),
    },
    {
      key: "demo_link",
      label: "Demo link",
      skipRowLinkWrap: true,
      render: (row) => (
        <a
          href={row.demo_url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-ds-primary font-mono text-[11px] hover:underline"
        >
          /demo/{row.slug}
        </a>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-ds-on-surface text-2xl font-semibold">Demo agents</h1>
        <p className="text-ds-on-surface-variant text-sm">
          Prospect demo chatbots by store. {data.total.toLocaleString()} match the current
          filters.
        </p>
      </header>

      <form
        action="/admin/demo"
        method="get"
        className="border-ds-outline grid grid-cols-1 gap-3 rounded-xl border bg-ds-surface p-4 sm:grid-cols-3"
      >
        <Field label="Store name or URL">
          <input
            name="q"
            defaultValue={q}
            placeholder="acme.com or Acme Store"
            className={inputClass}
          />
        </Field>
        <Field label="Status">
          <select name="status" defaultValue={status} className={inputClass}>
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s ? s.replace(/_/g, " ") : "Any"}
              </option>
            ))}
          </select>
        </Field>
        <input type="hidden" name="page_size" value={String(pageSize)} />
        <div className="col-span-full flex items-center gap-3">
          <button type="submit" className={appButtonClassName()}>
            Apply filters
          </button>
          <Link
            href="/admin/demo"
            className="text-ds-on-surface-variant hover:text-ds-on-surface text-sm"
          >
            Clear
          </Link>
        </div>
      </form>

      <AdminDataTable
        columns={columns}
        rows={data.items}
        rowKey={(row) => row.slug}
        rowHref={(row) => `/admin/demo/${encodeURIComponent(row.slug)}`}
        emptyMessage="No demo stores match the current filters."
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
