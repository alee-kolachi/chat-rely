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
  getAdminAgent,
  type AdminAgentActionRow,
  type AdminAgentDetail,
  type AdminConversationListItem,
  type AdminKnowledgeSourceRow,
} from "@/lib/admin/api";
import { formatCostUsd } from "@/lib/admin/cost-format";

type Params = Promise<{ id: string }>;

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

export default async function AdminAgentDetailPage({ params }: { params: Params }) {
  const { id } = await params;

  let agent: AdminAgentDetail;
  try {
    agent = await getAdminAgent(id);
  } catch (err) {
    if (err instanceof AdminApiError && err.status === 404) {
      notFound();
    }
    throw err;
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <Link
        href="/admin/agents"
        className="text-ds-on-surface-variant hover:text-ds-on-surface w-fit text-xs"
      >
        ← Back to agents
      </Link>

      <header className="flex flex-col gap-3">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <div>
            <h1 className="text-ds-on-surface text-2xl font-semibold">{agent.name}</h1>
            <p className="text-ds-on-surface-variant text-xs">
              Owner{" "}
              <Link
                href={`/admin/users/${agent.user_id}`}
                className="text-ds-primary hover:underline"
              >
                {agent.user_email}
              </Link>{" "}
              · slug <span className="font-mono">{agent.slug}</span> · public key{" "}
              <span className="font-mono">{agent.public_key}</span>
            </p>
          </div>
          <div className="flex items-center gap-2">
            <AdminStatusBadge status={agent.status} />
            <span className="text-ds-on-surface-variant font-mono text-[11px]">
              {agent.model}
            </span>
          </div>
        </div>
        <div className="border-ds-outline grid gap-3 rounded-xl border bg-ds-surface p-4 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Conversations total" value={agent.conversations_total.toLocaleString()} />
          <Stat label="Conversations MTD" value={agent.conversations_mtd.toLocaleString()} />
          <Stat
            label="Knowledge sources"
            value={agent.knowledge_sources_count.toLocaleString()}
          />
          <Stat
            label="Actions enabled"
            value={agent.actions_enabled_count.toLocaleString()}
          />
        </div>
        <p className="text-ds-on-surface-variant text-xs">
          Created {formatDate(agent.created_at)}
          {agent.archived_at && ` · archived ${formatDate(agent.archived_at)}`}
        </p>
      </header>

      <SettingsSection agent={agent} />
      <KnowledgeSection sources={agent.knowledge_sources} />
      <ActionsSection actions={agent.actions} />
      <RecentConversationsSection conversations={agent.recent_conversations} />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-ds-on-surface-variant text-[11px] font-medium uppercase tracking-wide">
        {label}
      </div>
      <div className="text-ds-on-surface mt-1 text-base font-semibold">{value}</div>
    </div>
  );
}

function SettingsSection({ agent }: { agent: AdminAgentDetail }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-ds-on-surface text-lg font-semibold">Settings</h2>
      <div className="border-ds-outline grid gap-4 rounded-xl border bg-ds-surface p-4 lg:grid-cols-2">
        <div>
          <h3 className="text-ds-on-surface-variant text-[11px] font-medium uppercase tracking-wide">
            System prompt
          </h3>
          <pre className="text-ds-on-surface bg-ds-neutral border-ds-outline mt-2 max-h-80 overflow-auto whitespace-pre-wrap break-words rounded-md border p-3 text-[12px] leading-snug">
            {agent.system_prompt || "(empty)"}
          </pre>
        </div>
        <div>
          <h3 className="text-ds-on-surface-variant text-[11px] font-medium uppercase tracking-wide">
            Behavior settings
          </h3>
          <div className="mt-2">
            <AdminJsonCell
              value={agent.behavior_settings}
              label="Toggle JSON"
              maxHeight={320}
              emptyPlaceholder="(none)"
            />
          </div>
        </div>
      </div>
    </section>
  );
}

function KnowledgeSection({ sources }: { sources: AdminKnowledgeSourceRow[] }) {
  const columns: AdminColumn<AdminKnowledgeSourceRow>[] = [
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
    { key: "type", label: "Type", render: (row) => row.type },
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
      key: "chunks_total_tokens",
      label: "Tokens",
      align: "right",
      render: (row) => row.chunks_total_tokens.toLocaleString(),
    },
    {
      key: "last_indexed_at",
      label: "Last indexed",
      render: (row) => formatDateTime(row.last_indexed_at),
    },
  ];
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-ds-on-surface text-lg font-semibold">Knowledge sources</h2>
      <AdminDataTable
        columns={columns}
        rows={sources}
        rowKey={(row) => row.id}
        emptyMessage="No knowledge sources for this agent."
      />
    </section>
  );
}

function ActionsSection({ actions }: { actions: AdminAgentActionRow[] }) {
  const columns: AdminColumn<AdminAgentActionRow>[] = [
    {
      key: "action_key",
      label: "Action key",
      render: (row) => (
        <span className="font-mono text-[12px]">{row.action_key}</span>
      ),
    },
    {
      key: "enabled",
      label: "Enabled",
      render: (row) => (
        <AdminStatusBadge
          status={row.enabled ? "enabled" : "disabled"}
          tone={row.enabled ? "positive" : "neutral"}
        />
      ),
    },
    {
      key: "config",
      label: "Config",
      render: (row) => <AdminJsonCell value={row.config} label="View config" />,
    },
    {
      key: "safety_policy",
      label: "Safety policy",
      render: (row) => (
        <AdminJsonCell value={row.safety_policy} label="View policy" />
      ),
    },
  ];
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-ds-on-surface text-lg font-semibold">Actions</h2>
      <AdminDataTable
        columns={columns}
        rows={actions}
        rowKey={(row) => row.id}
        emptyMessage="No actions configured."
      />
    </section>
  );
}

function RecentConversationsSection({
  conversations,
}: {
  conversations: AdminConversationListItem[];
}) {
  const columns: AdminColumn<AdminConversationListItem>[] = [
    {
      key: "started_at",
      label: "Started",
      render: (row) => formatDateTime(row.started_at),
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
    { key: "channel", label: "Channel", render: (row) => row.channel },
    {
      key: "status",
      label: "Status",
      render: (row) => <AdminStatusBadge status={row.status} />,
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
  ];
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-ds-on-surface text-lg font-semibold">
        Recent conversations (last 20)
      </h2>
      <AdminDataTable
        columns={columns}
        rows={conversations}
        rowKey={(row) => row.id}
        rowHref={(row) => `/admin/conversations/${row.id}`}
        emptyMessage="No conversations yet for this agent."
      />
    </section>
  );
}
