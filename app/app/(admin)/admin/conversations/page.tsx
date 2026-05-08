import Link from "next/link";
import { AdminDataTable, AdminPagination, type AdminColumn } from "@/components/admin/admin-data-table";
import { AdminStatusBadge } from "@/components/admin/admin-status-badge";
import { formatCostUsd } from "@/lib/admin/cost-format";
import {
  listAdminConversations,
  type AdminConversationListItem,
  type ListAdminConversationsParams,
} from "@/lib/admin/api";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const STATUS_OPTIONS = ["", "open", "idle_closed", "resolved", "escalated"] as const;
const CHANNEL_OPTIONS = ["", "widget", "preview", "api", "shopify", "wordpress", "email"] as const;

function pickString(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value || undefined;
}

function pickBool(value: string | string[] | undefined): boolean | null {
  const v = pickString(value);
  if (v === "true") return true;
  if (v === "false") return false;
  return null;
}

function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

export default async function AdminConversationsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  const userEmail = pickString(sp.user_email) ?? "";
  const agentId = pickString(sp.agent_id) ?? "";
  const userId = pickString(sp.user_id) ?? "";
  const status = pickString(sp.status) ?? "";
  const channel = pickString(sp.channel) ?? "";
  const visitorId = pickString(sp.visitor_id) ?? "";
  const startedAfter = pickString(sp.started_after) ?? "";
  const startedBefore = pickString(sp.started_before) ?? "";
  const escalated = pickBool(sp.escalated);
  const fallbackUsed = pickBool(sp.fallback_used);
  const page = Math.max(1, Number(pickString(sp.page) ?? "1") || 1);
  const pageSize = Math.max(1, Math.min(200, Number(pickString(sp.page_size) ?? "50") || 50));

  const filters: ListAdminConversationsParams = {
    user_email: userEmail || null,
    agent_id: agentId || null,
    user_id: userId || null,
    status: status || null,
    channel: channel || null,
    visitor_id: visitorId || null,
    started_after: startedAfter || null,
    started_before: startedBefore || null,
    escalated,
    fallback_used: fallbackUsed,
    page,
    page_size: pageSize,
  };

  const data = await listAdminConversations(filters);

  const buildHref = (overrides: Record<string, string | number | null | undefined>) => {
    const params = new URLSearchParams();
    const merged: Record<string, string | number | null | undefined> = {
      user_email: userEmail || undefined,
      agent_id: agentId || undefined,
      user_id: userId || undefined,
      status: status || undefined,
      channel: channel || undefined,
      visitor_id: visitorId || undefined,
      started_after: startedAfter || undefined,
      started_before: startedBefore || undefined,
      escalated: escalated === null ? undefined : String(escalated),
      fallback_used: fallbackUsed === null ? undefined : String(fallbackUsed),
      page,
      page_size: pageSize,
      ...overrides,
    };
    for (const [k, v] of Object.entries(merged)) {
      if (v === undefined || v === null || v === "") continue;
      params.set(k, String(v));
    }
    const qs = params.toString();
    return qs ? `/admin/conversations?${qs}` : "/admin/conversations";
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
      key: "owner",
      label: "Owner",
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
      render: (row) => (
        <span className="text-ds-on-surface text-sm">{row.agent_name}</span>
      ),
    },
    { key: "channel", label: "Channel", render: (row) => row.channel },
    {
      key: "status",
      label: "Status",
      render: (row) => (
        <div className="flex flex-col gap-1">
          <AdminStatusBadge status={row.status} />
          {row.fallback_used && (
            <AdminStatusBadge status="fallback" tone="warning" className="w-fit" />
          )}
        </div>
      ),
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
      key: "tools",
      label: "Tools",
      align: "right",
      render: (row) => row.tool_call_count.toLocaleString(),
    },
    {
      key: "tokens",
      label: "Tokens (in/out)",
      align: "right",
      render: (row) =>
        `${row.total_input_tokens.toLocaleString()}/${row.total_output_tokens.toLocaleString()}`,
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
        <span className="text-ds-on-surface-variant block max-w-md truncate text-xs">
          {row.latest_message_preview ?? "—"}
        </span>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6 p-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-ds-on-surface text-2xl font-semibold">Conversations</h1>
        <p className="text-ds-on-surface-variant text-sm">
          Cross-tenant conversation feed. {data.total.toLocaleString()} match the current filters.
        </p>
      </header>

      <form
        action="/admin/conversations"
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
          <input
            name="agent_id"
            defaultValue={agentId}
            placeholder="UUID"
            className={inputClass}
          />
        </Field>
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
        <Field label="Channel">
          <select name="channel" defaultValue={channel} className={inputClass}>
            {CHANNEL_OPTIONS.map((c) => (
              <option key={c} value={c}>
                {c || "Any"}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Started after">
          <input
            type="datetime-local"
            name="started_after"
            defaultValue={startedAfter}
            className={inputClass}
          />
        </Field>
        <Field label="Started before">
          <input
            type="datetime-local"
            name="started_before"
            defaultValue={startedBefore}
            className={inputClass}
          />
        </Field>
        <Field label="Flags">
          <div className="flex flex-wrap items-center gap-3 pt-1.5 text-xs">
            <label className="inline-flex items-center gap-1.5">
              <input
                type="checkbox"
                name="escalated"
                value="true"
                defaultChecked={escalated === true}
              />
              <span>escalated</span>
            </label>
            <label className="inline-flex items-center gap-1.5">
              <input
                type="checkbox"
                name="fallback_used"
                value="true"
                defaultChecked={fallbackUsed === true}
              />
              <span>fallback</span>
            </label>
          </div>
        </Field>
        <input type="hidden" name="page_size" value={String(pageSize)} />
        <div className="col-span-full flex items-center gap-3">
          <button
            type="submit"
            className="bg-ds-primary text-ds-on-primary hover:bg-ds-primary/90 rounded-md px-4 py-2 text-sm font-medium"
          >
            Apply filters
          </button>
          <Link
            href="/admin/conversations"
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
        rowHref={(row) => `/admin/conversations/${row.id}`}
        emptyMessage="No conversations match the current filters."
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
