import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminMessageBubble } from "@/components/admin/admin-message-bubble";
import { AdminStatusBadge } from "@/components/admin/admin-status-badge";
import { formatCostUsd } from "@/lib/admin/cost-format";
import {
  AdminApiError,
  getAdminConversation,
  getConversationCost,
  type AdminConversationCost,
  type AdminCostByModelRow,
  type AdminCostEventRow,
  type AdminCostKindRollup,
} from "@/lib/admin/api";

type RouteParams = Promise<{ id: string }>;

function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

export default async function AdminConversationDetailPage({
  params,
}: {
  params: RouteParams;
}) {
  const { id } = await params;

  let conversation;
  try {
    conversation = await getAdminConversation(id);
  } catch (err) {
    if (err instanceof AdminApiError && err.status === 404) {
      notFound();
    }
    throw err;
  }

  // Pull the by-model breakdown alongside the transcript. Tolerate 404 here too in case
  // the conversation was deleted between the two calls — we still render the transcript.
  let costBreakdown: AdminConversationCost | null = null;
  try {
    costBreakdown = await getConversationCost(id);
  } catch (err) {
    if (!(err instanceof AdminApiError && err.status === 404)) {
      throw err;
    }
  }

  const showByModel =
    costBreakdown !== null && costBreakdown.by_model.length > 0;
  const costEvents = costBreakdown?.cost_events ?? [];
  const showEventLedger = costEvents.length > 0;

  return (
    <div className="grid grid-cols-1 gap-6 p-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <main className="flex min-w-0 flex-col gap-4">
        <header className="flex flex-col gap-2">
          <Link
            href="/admin/conversations"
            className="text-ds-on-surface-variant hover:text-ds-on-surface text-sm"
          >
            ← Back to conversations
          </Link>
          <h1 className="text-ds-on-surface text-2xl font-semibold">Conversation transcript</h1>
          <p className="ds-app-body-muted">{conversation.id}</p>
        </header>

        {conversation.truncated && (
          <div className="border-amber-200/60 bg-amber-50/60 text-amber-900 rounded-md border px-4 py-3 text-sm">
            Showing the first {conversation.messages.length.toLocaleString()} of{" "}
            {conversation.total_message_count.toLocaleString()} messages (transcript capped at{" "}
            {conversation.transcript_message_cap.toLocaleString()}).
          </div>
        )}

        {costBreakdown?.has_unknown_event_pricing && (
          <div className="border-amber-200/60 bg-amber-50/60 text-amber-900 rounded-md border px-4 py-2 text-xs">
            One or more cost events use a model missing from env pricing — ledger total is hidden
            until prices are configured.
          </div>
        )}

        {showByModel && costBreakdown && <CostByModelTable rows={costBreakdown.by_model} />}

        {showEventLedger && costBreakdown && (
          <TrueCostEventsTable events={costEvents} />
        )}

        {showEventLedger && costBreakdown && costBreakdown.by_kind && costBreakdown.by_kind.length > 0 && (
          <CostByKindTable rows={costBreakdown.by_kind} />
        )}

        {costBreakdown?.has_unknown_models && (
          <div className="border-amber-200/60 bg-amber-50/60 text-amber-900 rounded-md border px-4 py-2 text-xs">
            One or more messages used a model with no env pricing — total cost may understate the
            real spend.
          </div>
        )}

        <div className="flex flex-col gap-4">
          {conversation.messages.length === 0 ? (
            <div className="border-ds-outline text-ds-on-surface-variant rounded-xl border bg-ds-surface px-4 py-8 text-center text-sm">
              This conversation has no messages.
            </div>
          ) : (
            conversation.messages.map((message, index) => (
              <AdminMessageBubble
                key={message.id}
                message={message}
                index={index}
                total={conversation.messages.length}
              />
            ))
          )}
        </div>
      </main>

      <aside className="flex min-w-0 flex-col gap-4 lg:sticky lg:top-4 lg:h-fit">
        <SidebarCard title="Conversation">
          <KV label="Status">
            <div className="flex flex-wrap gap-1">
              <AdminStatusBadge status={conversation.status} />
              {conversation.fallback_used && (
                <AdminStatusBadge status="fallback" tone="warning" />
              )}
            </div>
          </KV>
          <KV label="Channel">{conversation.channel}</KV>
          <KV label="Visitor ID">
            <span className="font-mono text-[11px]">{conversation.visitor_id}</span>
          </KV>
          <KV label="Started at">{formatDateTime(conversation.started_at)}</KV>
          <KV label="Last activity">{formatDateTime(conversation.last_activity_at)}</KV>
          <KV label="Closed at">{formatDateTime(conversation.closed_at)}</KV>
        </SidebarCard>

        <SidebarCard title="Owner">
          <KV label="Email">
            <Link
              href={`/admin/users/${conversation.user_id}`}
              className="text-ds-primary hover:underline"
            >
              {conversation.user_email}
            </Link>
          </KV>
          <KV label="User ID">
            <span className="font-mono text-[11px] break-all">{conversation.user_id}</span>
          </KV>
        </SidebarCard>

        <SidebarCard title="Agent">
          <KV label="Name">{conversation.agent_name}</KV>
          <KV label="Agent ID">
            <span className="font-mono text-[11px] break-all">{conversation.agent_id}</span>
          </KV>
        </SidebarCard>

        <SidebarCard title="Totals">
          <KV label="Customer msgs">{conversation.customer_message_count.toLocaleString()}</KV>
          <KV label="Assistant msgs">
            {conversation.assistant_message_count.toLocaleString()}
          </KV>
          <KV label="Tool calls">{conversation.tool_call_count.toLocaleString()}</KV>
          <KV label="Tokens in / out">
            {conversation.total_input_tokens.toLocaleString()} /{" "}
            {conversation.total_output_tokens.toLocaleString()}
          </KV>
          <KV label="Total cost">
            <span className="text-ds-on-surface font-semibold">
              {formatCostUsd(costBreakdown?.total_cost_usd ?? null)}
            </span>
          </KV>
          {(costBreakdown?.cost_events?.length ?? 0) > 0 && (
            <>
              <KV label="Ledger total (API)">
                <span className="text-ds-on-surface font-semibold">
                  {formatCostUsd(costBreakdown?.events_total_cost_usd ?? null)}
                </span>
              </KV>
              <KV label="Avg / customer message">
                {costBreakdown?.avg_cost_per_customer_message_usd != null
                  ? formatCostUsd(costBreakdown.avg_cost_per_customer_message_usd)
                  : "—"}
              </KV>
            </>
          )}
        </SidebarCard>

        <SidebarCard title="Metadata">
          <details className="border-ds-outline/60 rounded-md border bg-white/60">
            <summary className="ds-app-body-muted cursor-pointer px-2 py-1 font-medium">
              Raw conversation.metadata JSON
            </summary>
            <pre className="text-ds-on-surface max-h-80 overflow-auto px-3 py-2 text-[11px] leading-snug">
              {JSON.stringify(conversation.metadata, null, 2)}
            </pre>
          </details>
        </SidebarCard>
      </aside>
    </div>
  );
}

function SidebarCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-ds-outline rounded-xl border bg-ds-surface p-4">
      <h2 className="text-ds-on-surface mb-3 text-sm font-semibold">{title}</h2>
      <dl className="flex flex-col gap-2 text-sm">{children}</dl>
    </section>
  );
}

function KV({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-ds-on-surface-variant text-[11px] font-medium uppercase tracking-wide">
        {label}
      </dt>
      <dd className="text-ds-on-surface text-sm break-words">{children}</dd>
    </div>
  );
}

function CostByModelTable({ rows }: { rows: AdminCostByModelRow[] }) {
  const showEmb = rows.some((r) => (r.embedding_tokens ?? 0) > 0);
  return (
    <section className="border-ds-outline rounded-xl border bg-ds-surface p-4">
      <header className="mb-3 flex items-baseline justify-between">
        <h2 className="ds-app-card-title">Cost by model</h2>
        <span className="text-ds-on-surface-variant text-[11px]">
          Multiple models in this conversation
        </span>
      </header>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-ds-on-surface-variant text-[11px] uppercase tracking-wide">
            <th className="border-ds-outline border-b px-2 py-1.5 text-left font-semibold">
              Model
            </th>
            <th className="border-ds-outline border-b px-2 py-1.5 text-right font-semibold">
              In
            </th>
            <th className="border-ds-outline border-b px-2 py-1.5 text-right font-semibold">
              Out
            </th>
            {showEmb && (
              <th className="border-ds-outline border-b px-2 py-1.5 text-right font-semibold">
                Embed
              </th>
            )}
            <th className="border-ds-outline border-b px-2 py-1.5 text-right font-semibold">
              Cost
            </th>
            <th className="border-ds-outline border-b px-2 py-1.5 text-right font-semibold">
              %
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.model} className="border-ds-outline border-b last:border-b-0">
              <td className="px-2 py-1.5 font-mono text-xs">{row.model}</td>
              <td className="px-2 py-1.5 text-right">{row.input_tokens.toLocaleString()}</td>
              <td className="px-2 py-1.5 text-right">{row.output_tokens.toLocaleString()}</td>
              {showEmb && (
                <td className="px-2 py-1.5 text-right">
                  {(row.embedding_tokens ?? 0).toLocaleString()}
                </td>
              )}
              <td className="px-2 py-1.5 text-right">{formatCostUsd(row.cost_usd)}</td>
              <td className="text-ds-on-surface-variant px-2 py-1.5 text-right">
                {row.pct_of_total.toFixed(1)}%
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

function CostByKindTable({ rows }: { rows: AdminCostKindRollup[] }) {
  return (
    <section className="border-ds-outline rounded-xl border bg-ds-surface p-4">
      <header className="mb-3">
        <h2 className="ds-app-card-title">Cost by operation kind</h2>
        <p className="text-ds-on-surface-variant mt-1 text-[11px]">
          Roll-up from the API ledger (LLM rounds, embeddings, tools).
        </p>
      </header>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-ds-on-surface-variant text-[11px] uppercase tracking-wide">
            <th className="border-ds-outline border-b px-2 py-1.5 text-left font-semibold">Kind</th>
            <th className="border-ds-outline border-b px-2 py-1.5 text-right font-semibold">Events</th>
            <th className="border-ds-outline border-b px-2 py-1.5 text-right font-semibold">Cost</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.kind} className="border-ds-outline border-b last:border-b-0">
              <td className="px-2 py-1.5 font-mono text-xs">{row.kind}</td>
              <td className="px-2 py-1.5 text-right">{row.count.toLocaleString()}</td>
              <td className="px-2 py-1.5 text-right">{formatCostUsd(row.cost_usd)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

function TrueCostEventsTable({ events }: { events: AdminCostEventRow[] }) {
  return (
    <section className="border-ds-outline rounded-xl border bg-ds-surface p-4">
      <header className="mb-3">
        <h2 className="ds-app-card-title">True cost ledger</h2>
        <p className="text-ds-on-surface-variant mt-1 text-[11px]">
          One row per billed API operation (including RAG embeddings and each LLM round). Shopify
          tool rows are $0 (Admin API, not OpenAI metered).
        </p>
      </header>
      <div className="max-h-[28rem] overflow-auto rounded-md border border-black/10">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="bg-ds-neutral sticky top-0">
            <tr className="text-ds-on-surface-variant text-[11px] uppercase tracking-wide">
              <th className="border-b px-2 py-1.5 text-left font-semibold">Time</th>
              <th className="border-b px-2 py-1.5 text-left font-semibold">Kind</th>
              <th className="border-b px-2 py-1.5 text-left font-semibold">Model</th>
              <th className="border-b px-2 py-1.5 text-right font-semibold">In / out</th>
              <th className="border-b px-2 py-1.5 text-right font-semibold">Embed tok</th>
              <th className="border-b px-2 py-1.5 text-right font-semibold">Cost</th>
            </tr>
          </thead>
          <tbody>
            {events.map((ev) => (
              <tr key={ev.id} className="border-ds-outline border-b last:border-b-0">
                <td className="text-ds-on-surface-variant px-2 py-1.5 whitespace-nowrap text-[11px]">
                  {formatDateTime(ev.created_at)}
                </td>
                <td className="px-2 py-1.5 font-mono text-[11px]">{ev.kind}</td>
                <td className="px-2 py-1.5 font-mono text-[11px]">
                  {ev.provider_model ?? "—"}
                </td>
                <td className="px-2 py-1.5 text-right font-mono text-[11px]">
                  {ev.input_tokens.toLocaleString()} / {ev.output_tokens.toLocaleString()}
                </td>
                <td className="px-2 py-1.5 text-right font-mono text-[11px]">
                  {ev.embedding_tokens.toLocaleString()}
                </td>
                <td className="px-2 py-1.5 text-right font-mono text-[11px]">
                  {formatCostUsd(ev.cost_usd)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
