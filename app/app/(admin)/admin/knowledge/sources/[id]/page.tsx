import Link from "next/link";
import { notFound } from "next/navigation";
import {
  AdminDataTable,
  type AdminColumn,
} from "@/components/admin/admin-data-table";
import { AdminJsonCell } from "@/components/admin/admin-json-cell";
import { AdminStatusBadge } from "@/components/admin/admin-status-badge";
import {
  AdminApiError,
  getAdminKnowledgeSource,
  type AdminIndexingJobRow,
  type AdminKnowledgeChunkPreview,
  type AdminKnowledgeSourceDetail,
} from "@/lib/admin/api";

type Params = Promise<{ id: string }>;

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

export default async function AdminKnowledgeSourceDetailPage({
  params,
}: {
  params: Params;
}) {
  const { id } = await params;

  let src: AdminKnowledgeSourceDetail;
  try {
    src = await getAdminKnowledgeSource(id);
  } catch (err) {
    if (err instanceof AdminApiError && err.status === 404) {
      notFound();
    }
    throw err;
  }

  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/admin/knowledge?tab=sources"
        className="ds-app-body-muted hover:text-ds-on-surface w-fit"
      >
        ← Back to knowledge sources
      </Link>

      <header className="flex flex-col gap-2">
        <div className="flex flex-wrap items-baseline gap-3">
          <h1 className="text-ds-on-surface text-2xl font-semibold">{src.title}</h1>
          <AdminStatusBadge status={src.status} />
        </div>
        <p className="ds-app-body-muted">
          Owner{" "}
          <Link
            href={`/admin/users/${src.user_id}`}
            className="text-ds-primary hover:underline"
          >
            {src.user_email}
          </Link>{" "}
          · agent{" "}
          <Link
            href={`/admin/agents/${src.agent_id}`}
            className="text-ds-primary hover:underline"
          >
            {src.agent_name}
          </Link>{" "}
          · type {src.type} · created {formatDateTime(src.created_at)}
        </p>
      </header>

      <section className="border-ds-outline grid gap-4 rounded-xl border bg-ds-surface p-4 lg:grid-cols-3">
        <Field label="Source URL" value={src.source_url ?? "—"} mono link={src.source_url ?? undefined} />
        <Field label="Storage bucket" value={src.storage_bucket ?? "—"} mono />
        <Field label="Storage path" value={src.storage_path ?? "—"} mono />
        <Field label="Chunks" value={src.chunks_count.toLocaleString()} />
        <Field label="Total tokens" value={src.chunks_total_tokens.toLocaleString()} />
        <Field label="Last indexed" value={formatDateTime(src.last_indexed_at)} />
        <div className="lg:col-span-3">
          <FieldLabel>Metadata</FieldLabel>
          <AdminJsonCell value={src.metadata} label="View metadata" />
        </div>
        {src.error_message && (
          <div className="lg:col-span-3">
            <FieldLabel>Error message</FieldLabel>
            <pre className="text-rose-700 bg-rose-50 border-rose-200 mt-1 max-h-40 overflow-auto whitespace-pre-wrap break-words rounded-md border p-3 text-[12px] leading-snug">
              {src.error_message}
            </pre>
          </div>
        )}
      </section>

      <RecentJobsSection jobs={src.recent_jobs} />
      <SampleChunksSection chunks={src.sample_chunks} />
    </div>
  );
}

function RecentJobsSection({ jobs }: { jobs: AdminIndexingJobRow[] }) {
  const columns: AdminColumn<AdminIndexingJobRow>[] = [
    {
      key: "status",
      label: "Status",
      render: (row) => <AdminStatusBadge status={row.status} />,
    },
    {
      key: "attempt",
      label: "Attempt",
      align: "right",
      render: (row) => row.attempt.toLocaleString(),
    },
    {
      key: "triggered_by",
      label: "Triggered by",
      render: (row) => row.triggered_by,
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
      key: "duration",
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
          <span className="ds-app-body-muted">—</span>
        ),
    },
  ];
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-ds-on-surface text-lg font-semibold">Recent indexing jobs</h2>
      <AdminDataTable
        columns={columns}
        rows={jobs}
        rowKey={(row) => row.id}
        emptyMessage="No indexing jobs for this source yet."
      />
    </section>
  );
}

function SampleChunksSection({ chunks }: { chunks: AdminKnowledgeChunkPreview[] }) {
  if (chunks.length === 0) {
    return (
      <section className="flex flex-col gap-3">
        <h2 className="text-ds-on-surface text-lg font-semibold">Sample chunks</h2>
        <p className="ds-app-body-muted italic">
          No chunks indexed yet.
        </p>
      </section>
    );
  }
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-ds-on-surface text-lg font-semibold">
        Sample chunks (first {chunks.length})
      </h2>
      <div className="flex flex-col gap-3">
        {chunks.map((c) => (
          <article
            key={c.id}
            className="border-ds-outline rounded-xl border bg-ds-surface p-3"
          >
            <header className="text-ds-on-surface-variant flex items-center justify-between text-[11px] font-medium uppercase tracking-wide">
              <span>chunk #{c.chunk_index}</span>
              <span>{c.token_count.toLocaleString()} tokens</span>
            </header>
            <pre className="text-ds-on-surface mt-2 whitespace-pre-wrap break-words text-[12px] leading-snug">
              {c.content_preview}
            </pre>
          </article>
        ))}
      </div>
    </section>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-ds-on-surface-variant text-[11px] font-medium uppercase tracking-wide">
      {children}
    </div>
  );
}

function Field({
  label,
  value,
  mono,
  link,
}: {
  label: string;
  value: string;
  mono?: boolean;
  link?: string;
}) {
  return (
    <div>
      <FieldLabel>{label}</FieldLabel>
      <div
        className={`text-ds-on-surface mt-1 text-sm ${
          mono ? "font-mono text-[12px] break-all" : "font-medium"
        }`}
      >
        {link ? (
          <a
            href={link}
            target="_blank"
            rel="noreferrer"
            className="text-ds-primary hover:underline"
          >
            {value}
          </a>
        ) : (
          value
        )}
      </div>
    </div>
  );
}
