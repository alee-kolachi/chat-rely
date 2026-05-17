import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminJsonCell } from "@/components/admin/admin-json-cell";
import { AdminStatusBadge } from "@/components/admin/admin-status-badge";
import {
  AdminApiError,
  getAdminTicket,
  type AdminTicketDetail,
} from "@/lib/admin/api";
import { formatCostUsd } from "@/lib/admin/cost-format";

type Params = Promise<{ id: string }>;

function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

export default async function AdminTicketDetailPage({ params }: { params: Params }) {
  const { id } = await params;

  let ticket: AdminTicketDetail;
  try {
    ticket = await getAdminTicket(id);
  } catch (err) {
    if (err instanceof AdminApiError && err.status === 404) {
      notFound();
    }
    throw err;
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <Link
        href="/admin/tickets"
        className="ds-app-body-muted hover:text-ds-on-surface w-fit"
      >
        ← Back to tickets
      </Link>

      <header className="flex flex-col gap-2">
        <div className="flex flex-wrap items-baseline gap-3">
          <h1 className="text-ds-on-surface text-2xl font-semibold">
            {ticket.subject ?? "(no subject)"}
          </h1>
          <AdminStatusBadge status={ticket.status} />
          <AdminStatusBadge
            status={ticket.priority}
            tone={
              ticket.priority === "high"
                ? "danger"
                : ticket.priority === "low"
                ? "neutral"
                : "warning"
            }
          />
        </div>
        <p className="ds-app-body-muted">
          Owner{" "}
          <Link
            href={`/admin/users/${ticket.user_id}`}
            className="text-ds-primary hover:underline"
          >
            {ticket.user_email}
          </Link>{" "}
          · agent{" "}
          <Link
            href={`/admin/agents/${ticket.agent_id}`}
            className="text-ds-primary hover:underline"
          >
            {ticket.agent_name}
          </Link>{" "}
          · created {formatDateTime(ticket.created_at)} · updated{" "}
          {formatDateTime(ticket.updated_at)}
        </p>
      </header>

      <section className="border-ds-outline grid gap-4 rounded-xl border bg-ds-surface p-4 lg:grid-cols-2">
        <Field label="Customer email" value={ticket.customer_email ?? "—"} mono />
        <Field
          label="External provider"
          value={ticket.external_provider ?? "—"}
          hint={ticket.external_id ? `external id: ${ticket.external_id}` : undefined}
        />
        <div>
          <FieldLabel>Metadata</FieldLabel>
          <AdminJsonCell value={ticket.metadata} label="View metadata" />
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <header className="flex items-center justify-between">
          <h2 className="text-ds-on-surface text-lg font-semibold">Linked conversation</h2>
          <Link
            href={`/admin/conversations/${ticket.conversation.id}`}
            className="text-ds-primary text-sm font-medium hover:underline"
          >
            Open full transcript →
          </Link>
        </header>
        <div className="border-ds-outline grid gap-4 rounded-xl border bg-ds-surface p-4 lg:grid-cols-3">
          <Field label="Started" value={formatDateTime(ticket.conversation.started_at)} />
          <Field
            label="Last activity"
            value={formatDateTime(ticket.conversation.last_activity_at)}
          />
          <Field label="Channel" value={ticket.conversation.channel} mono />
          <Field
            label="Visitor"
            value={ticket.conversation.visitor_id}
            mono
          />
          <Field
            label="Messages"
            value={`${ticket.conversation.customer_message_count}/${ticket.conversation.assistant_message_count} (u/a)`}
          />
          <Field label="Tools" value={ticket.conversation.tool_call_count.toLocaleString()} />
          <Field
            label="Tokens (in/out)"
            value={`${ticket.conversation.total_input_tokens.toLocaleString()}/${ticket.conversation.total_output_tokens.toLocaleString()}`}
          />
          <Field
            label="Conversation cost"
            value={formatCostUsd(ticket.conversation.cost_usd)}
          />
          <div>
            <FieldLabel>Status</FieldLabel>
            <AdminStatusBadge status={ticket.conversation.status} />
            {ticket.conversation.fallback_used && (
              <AdminStatusBadge status="fallback" tone="warning" className="ml-2" />
            )}
          </div>
        </div>
        {ticket.conversation.latest_message_preview && (
          <p className="ds-app-body-muted italic">
            Latest message preview: "{ticket.conversation.latest_message_preview}"
          </p>
        )}
      </section>
    </div>
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
  hint,
  mono,
}: {
  label: string;
  value: string;
  hint?: string;
  mono?: boolean;
}) {
  return (
    <div>
      <FieldLabel>{label}</FieldLabel>
      <div
        className={`text-ds-on-surface mt-1 text-sm ${mono ? "font-mono text-[12px]" : "font-medium"}`}
      >
        {value}
      </div>
      {hint && <div className="text-ds-on-surface-variant mt-0.5 text-[11px]">{hint}</div>}
    </div>
  );
}
