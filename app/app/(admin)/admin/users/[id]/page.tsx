import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminDataTable, type AdminColumn } from "@/components/admin/admin-data-table";
import { AdminStatusBadge } from "@/components/admin/admin-status-badge";
import {
  AdminApiError,
  getAdminUser,
  getUserCosting,
  type AdminAgentSummary,
  type AdminConversationListItem,
  type AdminCostByAgentRow,
  type AdminSubscriptionSummary,
  type AdminUsageSnapshotSummary,
  type AdminUserCosting,
  type AdminUserDetail,
} from "@/lib/admin/api";
import {
  formatCostUsd,
  formatMarginPct,
  marginBadgeTone,
  marginToneClass,
} from "@/lib/admin/cost-format";

type RouteParams = Promise<{ id: string }>;

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

function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export default async function AdminUserDetailPage({ params }: { params: RouteParams }) {
  const { id } = await params;

  let user: AdminUserDetail;
  try {
    user = await getAdminUser(id);
  } catch (err) {
    if (err instanceof AdminApiError && err.status === 404) {
      notFound();
    }
    throw err;
  }

  // Costing card pulls per-agent breakdown from the dedicated endpoint so the main
  // detail page stays fast even if the platform-wide cost service is slow. We tolerate
  // a 404 here as well in case the user was deleted between the two calls.
  let costing: AdminUserCosting | null = null;
  try {
    costing = await getUserCosting(id);
  } catch (err) {
    if (!(err instanceof AdminApiError && err.status === 404)) {
      throw err;
    }
  }

  const subscriptionColumns: AdminColumn<AdminSubscriptionSummary>[] = [
    {
      key: "plan",
      label: "Plan",
      render: (row) => (
        <div className="flex flex-col">
          <span className="text-ds-on-surface font-medium">{row.plan_name}</span>
          <span className="text-ds-on-surface-variant text-xs">
            {row.plan_slug} · {formatCents(row.monthly_price_cents)}/mo
          </span>
        </div>
      ),
    },
    {
      key: "status",
      label: "Status",
      render: (row) => <AdminStatusBadge status={row.status} />,
    },
    { key: "provider", label: "Provider", render: (row) => row.provider },
    {
      key: "period",
      label: "Current period",
      render: (row) => (
        <span className="text-ds-on-surface-variant text-xs">
          {formatDate(row.current_period_start)} – {formatDate(row.current_period_end)}
        </span>
      ),
    },
    {
      key: "cancel",
      label: "Cancel @ end",
      render: (row) =>
        row.cancel_at_period_end ? (
          <AdminStatusBadge status="cancel scheduled" tone="warning" />
        ) : (
          <span className="text-ds-on-surface-variant text-xs">no</span>
        ),
    },
  ];

  const agentColumns: AdminColumn<AdminAgentSummary>[] = [
    {
      key: "name",
      label: "Name",
      render: (row) => (
        <div className="flex flex-col">
          <Link
            href={`/admin/conversations?agent_id=${row.id}`}
            className="text-ds-primary text-sm font-medium hover:underline"
          >
            {row.name}
          </Link>
          <span className="text-ds-on-surface-variant font-mono text-[11px]">{row.slug}</span>
        </div>
      ),
    },
    { key: "model", label: "Model", render: (row) => <span className="font-mono text-xs">{row.model}</span> },
    { key: "status", label: "Status", render: (row) => <AdminStatusBadge status={row.status} /> },
    {
      key: "conversations_total",
      label: "Conv (total)",
      align: "right",
      render: (row) => row.conversations_total.toLocaleString(),
    },
    {
      key: "conversations_mtd",
      label: "Conv (MTD)",
      align: "right",
      render: (row) => row.conversations_mtd.toLocaleString(),
    },
    {
      key: "created_at",
      label: "Created",
      render: (row) => formatDate(row.created_at),
    },
  ];

  const conversationColumns: AdminColumn<AdminConversationListItem>[] = [
    {
      key: "started",
      label: "Started",
      render: (row) => formatDateTime(row.started_at),
    },
    {
      key: "agent",
      label: "Agent",
      render: (row) => row.agent_name,
    },
    { key: "channel", label: "Channel", render: (row) => row.channel },
    { key: "status", label: "Status", render: (row) => <AdminStatusBadge status={row.status} /> },
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
        <span className="text-ds-on-surface-variant block max-w-md truncate text-xs">
          {row.latest_message_preview ?? "—"}
        </span>
      ),
    },
  ];

  const snapshotColumns: AdminColumn<AdminUsageSnapshotSummary>[] = [
    {
      key: "period",
      label: "Period",
      render: (row) => `${formatDate(row.period_start)} – ${formatDate(row.period_end)}`,
    },
    {
      key: "included",
      label: "Included",
      align: "right",
      render: (row) => row.included_conversations.toLocaleString(),
    },
    {
      key: "conversations_used",
      label: "Used",
      align: "right",
      render: (row) => row.conversations_used.toLocaleString(),
    },
    {
      key: "overage",
      label: "Overage",
      align: "right",
      render: (row) => row.overage_conversations.toLocaleString(),
    },
    {
      key: "estimated_overage_cents",
      label: "Overage $",
      align: "right",
      render: (row) => formatCents(row.estimated_overage_cents),
    },
    {
      key: "projected",
      label: "Projected",
      align: "right",
      render: (row) => row.projected_conversations.toLocaleString(),
    },
    {
      key: "throttle_tier",
      label: "Throttle",
      render: (row) => <AdminStatusBadge status={row.throttle_tier} />,
    },
  ];

  const knowledgeKinds = Object.entries(user.knowledge_summary.by_kind);

  return (
    <div className="flex flex-col gap-8 p-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          {user.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={user.avatar_url}
              alt=""
              className="border-ds-outline h-14 w-14 rounded-full border object-cover"
            />
          ) : (
            <div className="bg-ds-primary/15 text-ds-primary flex h-14 w-14 items-center justify-center rounded-full text-lg font-semibold">
              {user.email.slice(0, 1).toUpperCase()}
            </div>
          )}
          <div className="flex flex-col gap-1">
            <h1 className="text-ds-on-surface text-2xl font-semibold">
              {user.full_name ?? user.email}
            </h1>
            <span className="text-ds-on-surface-variant text-sm">{user.email}</span>
            <span className="text-ds-on-surface-variant text-xs">
              Signed up {formatDateTime(user.signed_up_at)} · {user.timezone}
            </span>
          </div>
        </div>
        <Link
          href="/admin/users"
          className="text-ds-on-surface-variant hover:text-ds-on-surface text-sm"
        >
          ← Back to users
        </Link>
      </header>

      <Section
        title="Costing (MTD)"
        subtitle="Revenue from active plan minus our LLM and embedding cost this calendar month."
      >
        <CostingCard user={user} costing={costing} />
      </Section>

      <Section title="Subscriptions" subtitle={`${user.subscriptions.length} record(s)`}>
        <AdminDataTable
          columns={subscriptionColumns}
          rows={user.subscriptions}
          rowKey={(row) => row.id}
          emptyMessage="No subscriptions on record."
        />
      </Section>

      <Section title="Agents" subtitle={`${user.agents.length} agent(s)`}>
        <AdminDataTable
          columns={agentColumns}
          rows={user.agents}
          rowKey={(row) => row.id}
          emptyMessage="This user hasn't created any agents."
        />
      </Section>

      <Section
        title="Recent conversations"
        subtitle={`Showing latest ${user.recent_conversations.length} (most recent activity)`}
      >
        <AdminDataTable
          columns={conversationColumns}
          rows={user.recent_conversations}
          rowKey={(row) => row.id}
          rowHref={(row) => `/admin/conversations/${row.id}`}
          emptyMessage="No conversations yet."
        />
      </Section>

      <Section title="Knowledge" subtitle="Sources and chunks across all agents">
        <div className="border-ds-outline grid grid-cols-1 gap-4 rounded-xl border bg-ds-surface p-5 sm:grid-cols-3">
          <Stat label="Total sources" value={user.knowledge_summary.total_sources.toLocaleString()} />
          <Stat label="Total chunks" value={user.knowledge_summary.total_chunks.toLocaleString()} />
          <div className="flex flex-col gap-1">
            <span className="text-ds-on-surface-variant text-xs uppercase tracking-wide">
              By kind
            </span>
            {knowledgeKinds.length === 0 ? (
              <span className="text-ds-on-surface-variant text-sm">—</span>
            ) : (
              <ul className="text-ds-on-surface flex flex-col gap-0.5 text-sm">
                {knowledgeKinds.map(([kind, count]) => (
                  <li key={kind}>
                    <span className="font-mono text-xs">{kind}</span>{" "}
                    <span className="text-ds-on-surface-variant">·</span>{" "}
                    <span className="font-medium">{count.toLocaleString()}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </Section>

      <Section title="Usage snapshots" subtitle="Last 6 calendar months">
        <AdminDataTable
          columns={snapshotColumns}
          rows={user.recent_usage_snapshots}
          rowKey={(row) => row.id}
          emptyMessage="No usage snapshots yet."
        />
      </Section>
    </div>
  );
}

function Section({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-ds-on-surface text-base font-semibold">{title}</h2>
        {subtitle && (
          <span className="text-ds-on-surface-variant text-xs">{subtitle}</span>
        )}
      </div>
      {children}
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-ds-on-surface-variant text-xs uppercase tracking-wide">
        {label}
      </span>
      <span className="text-ds-on-surface text-2xl font-semibold">{value}</span>
    </div>
  );
}

function CostingCard({
  user,
  costing,
}: {
  user: AdminUserDetail;
  costing: AdminUserCosting | null;
}) {
  const tone = marginBadgeTone(user.margin_mtd_usd, user.margin_pct_mtd);
  const byAgent = costing?.by_agent ?? [];

  const byAgentColumns: AdminColumn<AdminCostByAgentRow>[] = [
    {
      key: "agent_name",
      label: "Agent",
      render: (row) => (
        <Link
          href={`/admin/conversations?agent_id=${row.agent_id}`}
          className="text-ds-primary hover:underline"
        >
          {row.agent_name}
        </Link>
      ),
    },
    {
      key: "messages",
      label: "Messages",
      align: "right",
      render: (row) => row.messages.toLocaleString(),
    },
    {
      key: "conversations",
      label: "Conversations",
      align: "right",
      render: (row) => row.conversations.toLocaleString(),
    },
    {
      key: "llm_cost_usd",
      label: "LLM cost",
      align: "right",
      render: (row) => formatCostUsd(row.llm_cost_usd),
    },
    {
      key: "embedding_cost_usd",
      label: "Embed cost",
      align: "right",
      render: (row) => formatCostUsd(row.embedding_cost_usd),
    },
    {
      key: "total_cost_usd",
      label: "Total",
      align: "right",
      render: (row) => formatCostUsd(row.total_cost_usd),
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="border-ds-outline grid grid-cols-2 gap-4 rounded-xl border bg-ds-surface p-5 sm:grid-cols-4">
        <Stat label="Revenue" value={formatCostUsd(user.revenue_mtd_usd)} />
        <Stat label="LLM cost" value={formatCostUsd(user.llm_cost_mtd_usd)} />
        <Stat label="Embed cost" value={formatCostUsd(user.embedding_cost_mtd_usd)} />
        <div className="flex flex-col gap-1">
          <span className="text-ds-on-surface-variant text-xs uppercase tracking-wide">
            Margin
          </span>
          <span
            className={`inline-flex w-fit items-center rounded-full px-2 py-0.5 text-base font-semibold ${marginToneClass(
              tone
            )}`}
          >
            {formatCostUsd(user.margin_mtd_usd)} · {formatMarginPct(user.margin_pct_mtd)}
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <h3 className="text-ds-on-surface-variant text-xs font-semibold uppercase tracking-wide">
          Per-agent breakdown
        </h3>
        <AdminDataTable
          columns={byAgentColumns}
          rows={byAgent}
          rowKey={(row) => row.agent_id}
          emptyMessage={
            costing === null
              ? "Costing service unavailable."
              : "No agent activity this month."
          }
        />
      </div>
    </div>
  );
}
