import {
  AdminDataTable,
  type AdminColumn,
} from "@/components/admin/admin-data-table";
import { AdminJsonCell } from "@/components/admin/admin-json-cell";
import { AdminStatusBadge } from "@/components/admin/admin-status-badge";
import { listAdminPlans, type AdminPlanRow } from "@/lib/admin/api";
import { formatCostUsd } from "@/lib/admin/cost-format";
import {
  featureInt,
  formatDisplayOverage,
  formatSmartResolution,
  formatTrainingStorageFromFeatures,
} from "@/lib/admin/plan-feature-display";

function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

export default async function AdminPlansPage() {
  const data = await listAdminPlans();
  const plans = [...data.items].sort((a, b) => {
    if (a.is_active !== b.is_active) return a.is_active ? -1 : 1;
    return a.monthly_price_cents - b.monthly_price_cents;
  });
  const activeCount = plans.filter((p) => p.is_active).length;
  const inactiveCount = plans.length - activeCount;

  const columns: AdminColumn<AdminPlanRow>[] = [
    {
      key: "slug",
      label: "Slug",
      render: (row) => (
        <span className="text-ds-on-surface font-mono text-[12px]">{row.slug}</span>
      ),
    },
    {
      key: "name",
      label: "Name",
      render: (row) => (
        <span className="flex flex-wrap items-center gap-2">
          <span className="text-ds-on-surface font-medium">{row.name}</span>
          {(row.slug === "scale" || !row.public_on_pricing_page) && (
            <AdminStatusBadge status="Legacy" tone="neutral" />
          )}
        </span>
      ),
    },
    {
      key: "public_on_pricing_page",
      label: "Pricing page",
      render: (row) => (
        <AdminStatusBadge
          status={row.public_on_pricing_page ? "Visible" : "Hidden"}
          tone={row.public_on_pricing_page ? "positive" : "neutral"}
        />
      ),
    },
    {
      key: "monthly_price_cents",
      label: "Monthly price",
      align: "right",
      render: (row) =>
        row.monthly_price_cents === 0 ? (
          <span className="text-ds-on-surface-variant">Free</span>
        ) : (
          formatCostUsd(row.monthly_price_cents / 100)
        ),
    },
    {
      key: "included_conversations",
      label: "Included convs",
      align: "right",
      render: (row) => row.included_conversations.toLocaleString(),
    },
    {
      key: "display_overage",
      label: "Display overage",
      align: "right",
      render: (row) => formatDisplayOverage(row.features),
    },
    {
      key: "smart_resolution",
      label: "Smart resolution / mo",
      align: "right",
      render: (row) => {
        const included = featureInt(row.features, "included_premium_turns");
        return formatSmartResolution(0, included);
      },
    },
    {
      key: "max_actions",
      label: "AI actions / agent",
      align: "right",
      render: (row) => {
        const n = featureInt(row.features, "max_enabled_actions_per_agent");
        return n > 0 ? n.toLocaleString() : "—";
      },
    },
    {
      key: "training_storage",
      label: "Training storage",
      align: "right",
      render: (row) => formatTrainingStorageFromFeatures(row.features),
    },
    {
      key: "max_agents",
      label: "Max agents",
      align: "right",
      render: (row) => row.max_agents.toLocaleString(),
    },
    {
      key: "is_active",
      label: "Active",
      render: (row) => (
        <AdminStatusBadge
          status={row.is_active ? "active" : "inactive"}
          tone={row.is_active ? "positive" : "neutral"}
        />
      ),
    },
    {
      key: "subscriptions_count",
      label: "Subs",
      align: "right",
      render: (row) => (
        <span className="text-ds-on-surface font-mono text-[12px]">
          {row.subscriptions_count.toLocaleString()}
        </span>
      ),
    },
    {
      key: "features",
      label: "Features",
      render: (row) => <AdminJsonCell value={row.features} label="View features" />,
    },
    {
      key: "throttle_policy",
      label: "Throttle policy",
      render: (row) => (
        <AdminJsonCell value={row.throttle_policy} label="View policy" />
      ),
    },
    {
      key: "created_at",
      label: "Created",
      render: (row) => formatDateTime(row.created_at),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-ds-on-surface text-2xl font-semibold">Plans</h1>
        <p className="text-ds-on-surface-variant text-sm">
          Catalog of every plan defined in the system, including soft-deleted ones. Subscription
          counts reflect current customers on each plan.
        </p>
        <div className="ds-app-body-muted flex items-center gap-4">
          <span>
            <span className="text-ds-on-surface font-semibold">{plans.length}</span> total plans
          </span>
          <span>
            <span className="text-ds-on-surface font-semibold">{activeCount}</span> active
          </span>
          {inactiveCount > 0 && (
            <span>
              <span className="text-ds-on-surface font-semibold">{inactiveCount}</span> inactive
            </span>
          )}
        </div>
      </header>

      <AdminDataTable
        columns={columns}
        rows={plans}
        rowKey={(row) => row.id}
        emptyMessage="No plans defined."
      />
    </div>
  );
}
