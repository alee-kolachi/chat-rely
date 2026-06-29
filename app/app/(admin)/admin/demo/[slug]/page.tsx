import Link from "next/link";
import { notFound } from "next/navigation";
import { appButtonClassName } from "@/lib/button-styles";
import { AdminDataTable, AdminPagination, type AdminColumn } from "@/components/admin/admin-data-table";
import { AdminStatusBadge } from "@/components/admin/admin-status-badge";
import { formatCostUsd } from "@/lib/admin/cost-format";
import {
  AdminApiError,
  getAdminDemo,
  listAdminDemoConversations,
  type AdminConversationListItem,
} from "@/lib/admin/api";

type RouteParams = Promise<{ slug: string }>;
type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const STATUS_OPTIONS = ["", "open", "idle_closed", "resolved", "escalated"] as const;

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

export default async function AdminDemoDetailPage({
  params,
  searchParams,
}: {
  params: RouteParams;
  searchParams: SearchParams;
}) {
  const { slug } = await params;
  const sp = await searchParams;
  const visitorId = pickString(sp.visitor_id) ?? "";
  const status = pickString(sp.status) ?? "";
  const page = Math.max(1, Number(pickString(sp.page) ?? "1") || 1);
  const pageSize = Math.max(1, Math.min(200, Number(pickString(sp.page_size) ?? "50") || 50));

  let demo;
  try {
    demo = await getAdminDemo(slug);
  } catch (err) {
    if (err instanceof AdminApiError && err.status === 404) {
      notFound();
    }
    throw err;
  }

  const conversations = await listAdminDemoConversations(slug, {
    visitor_id: visitorId || null,
    status: status || null,
    page,
    page_size: pageSize,
  });

  const basePath = `/admin/demo/${encodeURIComponent(slug)}`;

  const buildHref = (overrides: Record<string, string | number | null | undefined>) => {
    const params = new URLSearchParams();
    const merged: Record<string, string | number | null | undefined> = {
      visitor_id: visitorId || undefined,
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
    return qs ? `${basePath}?${qs}` : basePath;
  };

  const columns: AdminColumn<AdminConversationListItem>[] = [
    {
      key: "started",
      label: "Started",
      render: (row) => (
        <div className="flex flex-col">
          <span className="text-ds-on-surface text-sm">{formatDateTime(row.started_at)}</span>
          <span className="text-ds-on-surface-variant text-[11px]">
            last: {formatDateTime(row.last_activity_at)}
          </span>
        </div>
      ),
    },
    {
      key: "status",
      label: "Status",
      render: (row) => <AdminStatusBadge status={row.status} />,
    },
    {
      key: "visitor",
      label: "Visitor",
      render: (row) => (
        <span className="font-mono text-[11px]">{row.visitor_id}</span>
      ),
    },
    {
      key: "messages",
      label: "Msgs (u/a)",
      align: "right",
      render: (row) => `${row.customer_message_count}/${row.assistant_message_count}`,
    },
    {
      key: "cost_usd",
      label: "Cost",
      align: "right",
      render: (row) => formatCostUsd(row.cost_usd),
    },
    {
      key: "preview",
      label: "Preview",
      render: (row) => (
        <span className="ds-app-body-muted block max-w-md truncate">
          {row.latest_message_preview ?? "—"}
        </span>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <Link
          href="/admin/demo"
          className="text-ds-on-surface-variant hover:text-ds-on-surface text-sm"
        >
          ← Back to demo agents
        </Link>
        <div className="flex flex-col gap-1 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-ds-on-surface text-2xl font-semibold">
              {demo.display_name || demo.store_host}
            </h1>
            <p className="text-ds-on-surface-variant text-sm">
              Prospect chats for this demo store.
            </p>
          </div>
          <a
            href={demo.demo_url}
            target="_blank"
            rel="noopener noreferrer"
            className={appButtonClassName("ghost")}
          >
            Open demo page
          </a>
        </div>
      </header>

      <section className="border-ds-outline grid grid-cols-1 gap-4 rounded-xl border bg-ds-surface p-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Status">
          <AdminStatusBadge status={demo.status} />
        </Stat>
        <Stat label="Store URL">
          <a
            href={demo.store_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-ds-primary text-sm hover:underline"
          >
            {demo.store_host}
          </a>
        </Stat>
        <Stat label="Conversations">{demo.conversation_count.toLocaleString()}</Stat>
        <Stat label="Unique visitors">{demo.visitor_count.toLocaleString()}</Stat>
        <Stat label="Lifetime messages">{demo.lifetime_message_count.toLocaleString()}</Stat>
        <Stat label="Products indexed">{demo.product_count.toLocaleString()}</Stat>
        <Stat label="Last chat">{formatDateTime(demo.last_conversation_at)}</Stat>
        <Stat label="Demo slug">
          <span className="font-mono text-[11px]">{demo.slug}</span>
        </Stat>
      </section>

      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-ds-on-surface text-lg font-semibold">Conversations</h2>
          <p className="text-ds-on-surface-variant text-sm">
            {conversations.total.toLocaleString()} chat session
            {conversations.total === 1 ? "" : "s"} from prospects.
          </p>
        </div>

        <form
          action={basePath}
          method="get"
          className="border-ds-outline grid grid-cols-1 gap-3 rounded-xl border bg-ds-surface p-4 sm:grid-cols-3"
        >
          <Field label="Visitor ID">
            <input
              name="visitor_id"
              defaultValue={visitorId}
              placeholder="exact match"
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
          <input type="hidden" name="page_size" value={String(pageSize)} />
          <div className="col-span-full flex items-center gap-3">
            <button type="submit" className={appButtonClassName()}>
              Apply filters
            </button>
            <Link
              href={basePath}
              className="text-ds-on-surface-variant hover:text-ds-on-surface text-sm"
            >
              Clear
            </Link>
          </div>
        </form>

        <AdminDataTable
          columns={columns}
          rows={conversations.items}
          rowKey={(row) => row.id}
          rowHref={(row) =>
            `/admin/conversations/${row.id}?from=${encodeURIComponent(basePath)}`
          }
          emptyMessage="No prospect chats yet for this demo."
        />

        <AdminPagination
          page={conversations.page}
          pageSize={conversations.page_size}
          total={conversations.total}
          buildPageHref={(p) => buildHref({ page: p })}
        />
      </div>
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

function Stat({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-ds-on-surface-variant text-[11px] font-medium uppercase tracking-wide">
        {label}
      </span>
      <div className="text-ds-on-surface text-sm">{children}</div>
    </div>
  );
}
