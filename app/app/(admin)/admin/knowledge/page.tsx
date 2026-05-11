import Link from "next/link";
import {
  AdminDataTable,
  AdminPagination,
  type AdminColumn,
} from "@/components/admin/admin-data-table";
import { AdminStatusBadge } from "@/components/admin/admin-status-badge";
import { AdminTabs } from "@/components/admin/admin-tabs";
import {
  listAdminIndexingJobs,
  listAdminKnowledgeSources,
  type AdminIndexingJobRow,
  type AdminKnowledgeSourceRow,
} from "@/lib/admin/api";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const SOURCE_TYPE_OPTIONS = ["", "website", "file", "text_snippet", "q_and_a"] as const;
const SOURCE_STATUS_OPTIONS = ["", "pending", "indexing", "ready", "failed"] as const;
const JOB_STATUS_OPTIONS = ["queued", "running", "succeeded", "failed", "cancelled"] as const;

function pickString(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value || undefined;
}

function pickStringArray(value: string | string[] | undefined): string[] {
  if (value === undefined) return [];
  if (Array.isArray(value)) return value.filter(Boolean);
  return value ? [value] : [];
}

function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

function formatDuration(ms: number | null | undefined): string {
  if (ms === null || ms === undefined) return "—";
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.floor(ms / 60_000)}m ${Math.round((ms % 60_000) / 1000)}s`;
}

export default async function AdminKnowledgePage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  const tab = pickString(sp.tab) === "jobs" ? "jobs" : "sources";

  if (tab === "jobs") {
    return <IndexingJobsTab sp={sp} />;
  }
  return <SourcesTab sp={sp} />;
}

async function SourcesTab({
  sp,
}: {
  sp: Record<string, string | string[] | undefined>;
}) {
  const userEmail = pickString(sp.user_email) ?? "";
  const agentId = pickString(sp.agent_id) ?? "";
  const type = pickString(sp.type) ?? "";
  const status = pickString(sp.status) ?? "";
  const page = Math.max(1, Number(pickString(sp.page) ?? "1") || 1);
  const pageSize = Math.max(1, Math.min(200, Number(pickString(sp.page_size) ?? "50") || 50));

  const data = await listAdminKnowledgeSources({
    user_email: userEmail || null,
    agent_id: agentId || null,
    type: type || null,
    status: status || null,
    page,
    page_size: pageSize,
  });

  const buildHref = (overrides: Record<string, string | number | null | undefined>) => {
    const params = new URLSearchParams();
    const merged: Record<string, string | number | null | undefined> = {
      tab: "sources",
      user_email: userEmail || undefined,
      agent_id: agentId || undefined,
      type: type || undefined,
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
    return qs ? `/admin/knowledge?${qs}` : "/admin/knowledge";
  };

  const columns: AdminColumn<AdminKnowledgeSourceRow>[] = [
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
        <Link
          href={`/admin/agents/${row.agent_id}`}
          className="text-ds-on-surface text-sm hover:underline"
        >
          {row.agent_name}
        </Link>
      ),
    },
    {
      key: "type",
      label: "Type",
      render: (row) => row.type,
    },
    {
      key: "title",
      label: "Title",
      render: (row) => (
        <Link
          href={`/admin/knowledge/sources/${row.id}`}
          className="text-ds-primary hover:underline"
        >
          {row.title}
        </Link>
      ),
    },
    {
      key: "status",
      label: "Status",
      render: (row) => <AdminStatusBadge status={row.status} />,
    },
    {
      key: "chunks_count",
      label: "Chunks",
      align: "right",
      render: (row) => row.chunks_count.toLocaleString(),
    },
    {
      key: "tokens",
      label: "Tokens",
      align: "right",
      render: (row) => row.chunks_total_tokens.toLocaleString(),
    },
    {
      key: "last_indexed_at",
      label: "Last indexed",
      render: (row) => formatDateTime(row.last_indexed_at),
    },
    {
      key: "error_message",
      label: "Error",
      render: (row) =>
        row.error_message ? (
          <span
            className="text-rose-700 block max-w-xs truncate text-[12px]"
            title={row.error_message}
          >
            {row.error_message}
          </span>
        ) : (
          <span className="text-ds-on-surface-variant text-xs">—</span>
        ),
    },
  ];

  return (
    <KnowledgeShell tab="sources">
      <form
        action="/admin/knowledge"
        method="get"
        className="border-ds-outline grid grid-cols-1 gap-3 rounded-xl border bg-ds-surface p-4 sm:grid-cols-3 lg:grid-cols-4"
      >
        <input type="hidden" name="tab" value="sources" />
        <Field label="Owner email">
          <input name="user_email" defaultValue={userEmail} placeholder="alice@…" className={inputClass} />
        </Field>
        <Field label="Agent ID">
          <input name="agent_id" defaultValue={agentId} placeholder="UUID" className={inputClass} />
        </Field>
        <Field label="Type">
          <select name="type" defaultValue={type} className={inputClass}>
            {SOURCE_TYPE_OPTIONS.map((t) => (
              <option key={t} value={t}>
                {t || "Any"}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Status">
          <select name="status" defaultValue={status} className={inputClass}>
            {SOURCE_STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s || "Any"}
              </option>
            ))}
          </select>
        </Field>
        <input type="hidden" name="page_size" value={String(pageSize)} />
        <div className="col-span-full flex items-center gap-3">
          <button
            type="submit"
            className="bg-ds-primary text-ds-on-primary hover:bg-ds-primary-hover rounded-md px-4 py-2 text-sm font-medium"
          >
            Apply filters
          </button>
          <Link
            href="/admin/knowledge?tab=sources"
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
        emptyMessage="No knowledge sources match the current filters."
      />

      <AdminPagination
        page={data.page}
        pageSize={data.page_size}
        total={data.total}
        buildPageHref={(p) => buildHref({ page: p })}
      />
    </KnowledgeShell>
  );
}

async function IndexingJobsTab({
  sp,
}: {
  sp: Record<string, string | string[] | undefined>;
}) {
  const userEmail = pickString(sp.user_email) ?? "";
  const agentId = pickString(sp.agent_id) ?? "";
  const startedAfter = pickString(sp.started_after) ?? "";
  const startedBefore = pickString(sp.started_before) ?? "";
  const page = Math.max(1, Number(pickString(sp.page) ?? "1") || 1);
  const pageSize = Math.max(1, Math.min(200, Number(pickString(sp.page_size) ?? "50") || 50));

  // Default view: live work queue (queued + running + failed). User can clear or change.
  const statusFromUrl = pickStringArray(sp.status);
  const statuses = statusFromUrl.length > 0 ? statusFromUrl : ["queued", "running", "failed"];

  const data = await listAdminIndexingJobs({
    status: statuses,
    user_email: userEmail || null,
    agent_id: agentId || null,
    started_after: startedAfter || null,
    started_before: startedBefore || null,
    page,
    page_size: pageSize,
  });

  const buildHref = (overrides: Record<string, string | number | null | undefined>) => {
    const params = new URLSearchParams();
    params.set("tab", "jobs");
    if (statusFromUrl.length > 0) {
      for (const s of statusFromUrl) params.append("status", s);
    }
    const merged: Record<string, string | number | null | undefined> = {
      user_email: userEmail || undefined,
      agent_id: agentId || undefined,
      started_after: startedAfter || undefined,
      started_before: startedBefore || undefined,
      page,
      page_size: pageSize,
      ...overrides,
    };
    for (const [k, v] of Object.entries(merged)) {
      if (v === undefined || v === null || v === "") continue;
      params.set(k, String(v));
    }
    const qs = params.toString();
    return qs ? `/admin/knowledge?${qs}` : "/admin/knowledge";
  };

  const columns: AdminColumn<AdminIndexingJobRow>[] = [
    {
      key: "status",
      label: "Status",
      render: (row) => <AdminStatusBadge status={row.status} />,
    },
    {
      key: "title",
      label: "Source",
      render: (row) => (
        <Link
          href={`/admin/knowledge/sources/${row.knowledge_source_id}`}
          className="text-ds-primary hover:underline"
        >
          {row.knowledge_source_title}
        </Link>
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
      render: (row) => row.agent_name,
    },
    {
      key: "attempt",
      label: "Attempt",
      align: "right",
      render: (row) => row.attempt.toLocaleString(),
    },
    {
      key: "started_at",
      label: "Started",
      render: (row) => formatDateTime(row.started_at),
    },
    {
      key: "finished_at",
      label: "Finished",
      render: (row) => formatDateTime(row.finished_at),
    },
    {
      key: "duration_ms",
      label: "Duration",
      align: "right",
      render: (row) => formatDuration(row.duration_ms),
    },
    {
      key: "error_message",
      label: "Error",
      render: (row) =>
        row.error_message ? (
          <span
            className="text-rose-700 block max-w-xs truncate text-[12px]"
            title={row.error_message}
          >
            {row.error_message}
          </span>
        ) : (
          <span className="text-ds-on-surface-variant text-xs">—</span>
        ),
    },
  ];

  return (
    <KnowledgeShell tab="jobs">
      <form
        action="/admin/knowledge"
        method="get"
        className="border-ds-outline grid grid-cols-1 gap-3 rounded-xl border bg-ds-surface p-4 sm:grid-cols-3 lg:grid-cols-5"
      >
        <input type="hidden" name="tab" value="jobs" />
        <Field label="Owner email">
          <input name="user_email" defaultValue={userEmail} placeholder="alice@…" className={inputClass} />
        </Field>
        <Field label="Agent ID">
          <input name="agent_id" defaultValue={agentId} placeholder="UUID" className={inputClass} />
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
        <Field label="Status">
          <div className="flex flex-wrap items-center gap-2 pt-1.5 text-xs">
            {JOB_STATUS_OPTIONS.map((s) => (
              <label key={s} className="inline-flex items-center gap-1">
                <input
                  type="checkbox"
                  name="status"
                  value={s}
                  defaultChecked={statuses.includes(s)}
                />
                <span>{s}</span>
              </label>
            ))}
          </div>
        </Field>
        <input type="hidden" name="page_size" value={String(pageSize)} />
        <div className="col-span-full flex items-center gap-3">
          <button
            type="submit"
            className="bg-ds-primary text-ds-on-primary hover:bg-ds-primary-hover rounded-md px-4 py-2 text-sm font-medium"
          >
            Apply filters
          </button>
          <Link
            href="/admin/knowledge?tab=jobs"
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
        emptyMessage="No indexing jobs match the current filters."
      />

      <AdminPagination
        page={data.page}
        pageSize={data.page_size}
        total={data.total}
        buildPageHref={(p) => buildHref({ page: p })}
      />
    </KnowledgeShell>
  );
}

function KnowledgeShell({
  tab,
  children,
}: {
  tab: "sources" | "jobs";
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-6 p-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-ds-on-surface text-2xl font-semibold">Knowledge / Indexing</h1>
        <p className="text-ds-on-surface-variant text-sm">
          Cross-tenant knowledge sources and the live indexing queue.
        </p>
      </header>
      <AdminTabs
        tabs={[
          { id: "sources", label: "Sources" },
          { id: "jobs", label: "Indexing Jobs" },
        ]}
        activeId={tab}
        buildHref={(id) => `/admin/knowledge?tab=${id}`}
      />
      {children}
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
