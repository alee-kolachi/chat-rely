import Link from "next/link";
import {
  AdminDataTable,
  AdminPagination,
  type AdminColumn,
} from "@/components/admin/admin-data-table";
import { AdminStatusBadge } from "@/components/admin/admin-status-badge";
import { AdminTabs } from "@/components/admin/admin-tabs";
import {
  listAdminStripeEvents,
  listAdminSubscriptions,
  listAdminUsageSnapshots,
  type AdminStripeEventRow,
  type AdminSubscriptionRow,
  type AdminUsageSnapshotRow,
} from "@/lib/admin/api";
import { formatCostUsd } from "@/lib/admin/cost-format";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;
type ParsedSp = Record<string, string | string[] | undefined>;

const SUB_STATUS_OPTIONS = [
  "",
  "trialing",
  "active",
  "past_due",
  "canceled",
  "unpaid",
  "incomplete",
] as const;
const THROTTLE_OPTIONS = ["", "normal", "soft", "strong"] as const;

type Tab = "subscriptions" | "usage" | "events";

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

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString();
  } catch {
    return iso;
  }
}

export default async function AdminBillingPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  const tabRaw = pickString(sp.tab);
  const tab: Tab =
    tabRaw === "usage" ? "usage" : tabRaw === "events" ? "events" : "subscriptions";

  if (tab === "usage") return <UsageSnapshotsTab sp={sp} />;
  if (tab === "events") return <StripeEventsTab sp={sp} />;
  return <SubscriptionsTab sp={sp} />;
}

async function SubscriptionsTab({ sp }: { sp: ParsedSp }) {
  const userEmail = pickString(sp.user_email) ?? "";
  const planSlug = pickString(sp.plan_slug) ?? "";
  const status = pickString(sp.status) ?? "";
  const page = Math.max(1, Number(pickString(sp.page) ?? "1") || 1);
  const pageSize = Math.max(1, Math.min(200, Number(pickString(sp.page_size) ?? "50") || 50));

  const data = await listAdminSubscriptions({
    user_email: userEmail || null,
    plan_slug: planSlug || null,
    status: status || null,
    page,
    page_size: pageSize,
  });

  const buildHref = (overrides: Record<string, string | number | null | undefined>) => {
    const params = new URLSearchParams({ tab: "subscriptions" });
    const merged: Record<string, string | number | null | undefined> = {
      user_email: userEmail || undefined,
      plan_slug: planSlug || undefined,
      status: status || undefined,
      page,
      page_size: pageSize,
      ...overrides,
    };
    for (const [k, v] of Object.entries(merged)) {
      if (v === undefined || v === null || v === "") continue;
      params.set(k, String(v));
    }
    return `/admin/billing?${params.toString()}`;
  };

  const columns: AdminColumn<AdminSubscriptionRow>[] = [
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
      key: "plan",
      label: "Plan",
      render: (row) => (
        <div className="flex flex-col">
          <span className="text-ds-on-surface font-medium">{row.plan_name}</span>
          <span className="text-ds-on-surface-variant text-[11px] font-mono">
            {row.plan_slug}
          </span>
        </div>
      ),
    },
    {
      key: "price",
      label: "Price",
      align: "right",
      render: (row) => formatCostUsd(row.monthly_price_cents / 100),
    },
    {
      key: "status",
      label: "Status",
      render: (row) => <AdminStatusBadge status={row.status} />,
    },
    {
      key: "period",
      label: "Period",
      render: (row) => (
        <span className="text-[12px]">
          {formatDate(row.current_period_start)} – {formatDate(row.current_period_end)}
        </span>
      ),
    },
    {
      key: "cancel_at_period_end",
      label: "Cancel @ end",
      render: (row) => (row.cancel_at_period_end ? "yes" : "—"),
    },
    {
      key: "provider_subscription_id",
      label: "Stripe sub id",
      render: (row) =>
        row.provider_subscription_id ? (
          <span className="font-mono text-[11px]">{row.provider_subscription_id}</span>
        ) : (
          "—"
        ),
    },
    {
      key: "created_at",
      label: "Created",
      render: (row) => formatDateTime(row.created_at),
    },
  ];

  return (
    <BillingShell tab="subscriptions">
      <form
        action="/admin/billing"
        method="get"
        className="border-ds-outline grid grid-cols-1 gap-3 rounded-xl border bg-ds-surface p-4 sm:grid-cols-3 lg:grid-cols-4"
      >
        <input type="hidden" name="tab" value="subscriptions" />
        <Field label="Owner email">
          <input name="user_email" defaultValue={userEmail} placeholder="alice@…" className={inputClass} />
        </Field>
        <Field label="Plan slug">
          <input name="plan_slug" defaultValue={planSlug} placeholder="growth" className={inputClass} />
        </Field>
        <Field label="Status">
          <select name="status" defaultValue={status} className={inputClass}>
            {SUB_STATUS_OPTIONS.map((s) => (
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
            className="bg-ds-primary text-ds-on-primary hover:bg-ds-primary/90 rounded-md px-4 py-2 text-sm font-medium"
          >
            Apply filters
          </button>
          <Link
            href="/admin/billing?tab=subscriptions"
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
        emptyMessage="No subscriptions match the current filters."
      />

      <AdminPagination
        page={data.page}
        pageSize={data.page_size}
        total={data.total}
        buildPageHref={(p) => buildHref({ page: p })}
      />
    </BillingShell>
  );
}

async function UsageSnapshotsTab({ sp }: { sp: ParsedSp }) {
  const userEmail = pickString(sp.user_email) ?? "";
  const throttleTier = pickString(sp.throttle_tier) ?? "";
  const periodStartAfter = pickString(sp.period_start_after) ?? "";
  const page = Math.max(1, Number(pickString(sp.page) ?? "1") || 1);
  const pageSize = Math.max(1, Math.min(200, Number(pickString(sp.page_size) ?? "50") || 50));

  const data = await listAdminUsageSnapshots({
    user_email: userEmail || null,
    throttle_tier: throttleTier || null,
    period_start_after: periodStartAfter || null,
    page,
    page_size: pageSize,
  });

  const buildHref = (overrides: Record<string, string | number | null | undefined>) => {
    const params = new URLSearchParams({ tab: "usage" });
    const merged: Record<string, string | number | null | undefined> = {
      user_email: userEmail || undefined,
      throttle_tier: throttleTier || undefined,
      period_start_after: periodStartAfter || undefined,
      page,
      page_size: pageSize,
      ...overrides,
    };
    for (const [k, v] of Object.entries(merged)) {
      if (v === undefined || v === null || v === "") continue;
      params.set(k, String(v));
    }
    return `/admin/billing?${params.toString()}`;
  };

  const columns: AdminColumn<AdminUsageSnapshotRow>[] = [
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
      key: "billable",
      label: "Billable",
      align: "right",
      render: (row) => row.billable_conversations.toLocaleString(),
    },
    {
      key: "overage",
      label: "Overage",
      align: "right",
      render: (row) => row.overage_conversations.toLocaleString(),
    },
    {
      key: "estimated_overage_cents",
      label: "Est. overage",
      align: "right",
      render: (row) => formatCostUsd(row.estimated_overage_cents / 100),
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
      render: (row) => (
        <AdminStatusBadge
          status={row.throttle_tier}
          tone={
            row.throttle_tier === "strong"
              ? "danger"
              : row.throttle_tier === "soft"
              ? "warning"
              : "neutral"
          }
        />
      ),
    },
    {
      key: "last_computed_at",
      label: "Last computed",
      render: (row) => formatDateTime(row.last_computed_at),
    },
  ];

  return (
    <BillingShell tab="usage">
      <form
        action="/admin/billing"
        method="get"
        className="border-ds-outline grid grid-cols-1 gap-3 rounded-xl border bg-ds-surface p-4 sm:grid-cols-3 lg:grid-cols-4"
      >
        <input type="hidden" name="tab" value="usage" />
        <Field label="Owner email">
          <input name="user_email" defaultValue={userEmail} placeholder="alice@…" className={inputClass} />
        </Field>
        <Field label="Throttle tier">
          <select name="throttle_tier" defaultValue={throttleTier} className={inputClass}>
            {THROTTLE_OPTIONS.map((t) => (
              <option key={t} value={t}>
                {t || "Any"}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Period start ≥">
          <input
            type="date"
            name="period_start_after"
            defaultValue={periodStartAfter}
            className={inputClass}
          />
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
            href="/admin/billing?tab=usage"
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
        emptyMessage="No usage snapshots match the current filters."
      />

      <AdminPagination
        page={data.page}
        pageSize={data.page_size}
        total={data.total}
        buildPageHref={(p) => buildHref({ page: p })}
      />
    </BillingShell>
  );
}

async function StripeEventsTab({ sp }: { sp: ParsedSp }) {
  const eventType = pickString(sp.event_type) ?? "";
  const processedAfter = pickString(sp.processed_after) ?? "";
  const page = Math.max(1, Number(pickString(sp.page) ?? "1") || 1);
  const pageSize = Math.max(1, Math.min(200, Number(pickString(sp.page_size) ?? "50") || 50));

  const data = await listAdminStripeEvents({
    event_type: eventType || null,
    processed_after: processedAfter || null,
    page,
    page_size: pageSize,
  });

  const buildHref = (overrides: Record<string, string | number | null | undefined>) => {
    const params = new URLSearchParams({ tab: "events" });
    const merged: Record<string, string | number | null | undefined> = {
      event_type: eventType || undefined,
      processed_after: processedAfter || undefined,
      page,
      page_size: pageSize,
      ...overrides,
    };
    for (const [k, v] of Object.entries(merged)) {
      if (v === undefined || v === null || v === "") continue;
      params.set(k, String(v));
    }
    return `/admin/billing?${params.toString()}`;
  };

  const columns: AdminColumn<AdminStripeEventRow>[] = [
    {
      key: "stripe_event_id",
      label: "Stripe event id",
      render: (row) => <span className="font-mono text-[11px]">{row.stripe_event_id}</span>,
    },
    {
      key: "event_type",
      label: "Type",
      render: (row) => <span className="font-mono text-[12px]">{row.event_type}</span>,
    },
    {
      key: "processed_at",
      label: "Processed",
      render: (row) => formatDateTime(row.processed_at),
    },
  ];

  return (
    <BillingShell tab="events">
      <form
        action="/admin/billing"
        method="get"
        className="border-ds-outline grid grid-cols-1 gap-3 rounded-xl border bg-ds-surface p-4 sm:grid-cols-3 lg:grid-cols-4"
      >
        <input type="hidden" name="tab" value="events" />
        <Field label="Event type">
          <input
            name="event_type"
            defaultValue={eventType}
            placeholder="customer.subscription.updated"
            className={inputClass}
          />
        </Field>
        <Field label="Processed after">
          <input
            type="datetime-local"
            name="processed_after"
            defaultValue={processedAfter}
            className={inputClass}
          />
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
            href="/admin/billing?tab=events"
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
        emptyMessage="No Stripe events match the current filters."
      />

      <AdminPagination
        page={data.page}
        pageSize={data.page_size}
        total={data.total}
        buildPageHref={(p) => buildHref({ page: p })}
      />
    </BillingShell>
  );
}

function BillingShell({ tab, children }: { tab: Tab; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-6 p-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-ds-on-surface text-2xl font-semibold">Billing</h1>
        <p className="text-ds-on-surface-variant text-sm">
          Cross-tenant billing artifacts: subscriptions, usage roll-ups, and the Stripe webhook
          ack log.
        </p>
      </header>
      <AdminTabs
        tabs={[
          { id: "subscriptions", label: "Subscriptions" },
          { id: "usage", label: "Usage Snapshots" },
          { id: "events", label: "Stripe Events" },
        ]}
        activeId={tab}
        buildHref={(id) => `/admin/billing?tab=${id}`}
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
