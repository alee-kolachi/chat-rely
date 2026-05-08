import Link from "next/link";
import { AdminKpiCard } from "@/components/admin/admin-kpi-card";
import { AdminStatusBadge } from "@/components/admin/admin-status-badge";
import { getAdminOverview, type AdminOverview } from "@/lib/admin/api";
import { formatCostUsd, formatMarginPct } from "@/lib/admin/cost-format";
import { formatRelative, isStale } from "@/lib/admin/relative-time";

export const dynamic = "force-dynamic";

// If the indexing-worker hasn't reported a heartbeat in this long while jobs are
// queued, the worker strip turns red. Keep in lockstep with the plan's threshold.
const INDEXING_STALL_MS = 10 * 60 * 1_000;

export default async function AdminOverviewPage() {
  const overview = await getAdminOverview();

  return (
    <div className="flex flex-col gap-6 p-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-ds-on-surface text-2xl font-semibold">Overview</h1>
        <p className="text-ds-on-surface-variant text-sm">
          Platform-wide pulse: signups, MRR, conversation volume, indexing queue health, and
          recent activity. All numbers cross-tenant.
        </p>
      </header>

      {overview.pricing_unknown_models.length > 0 && (
        <PricingGapsHint models={overview.pricing_unknown_models} />
      )}

      <KpiRow overview={overview} />

      <CostingSummaryCard overview={overview} />

      <RecentActivity overview={overview} />

      <WorkerHeartbeats overview={overview} />

      <RecentStripeEvents overview={overview} />
    </div>
  );
}

function PricingGapsHint({ models }: { models: string[] }) {
  return (
    <div className="border-amber-200/60 bg-amber-50/60 text-amber-900 flex flex-col gap-1 rounded-md border px-4 py-3 text-sm">
      <strong className="text-amber-900">Pricing gaps</strong>
      <p className="text-amber-900/90 text-[13px]">
        {models.length} model
        {models.length === 1 ? "" : "s"} appearing in <code>messages.model</code> are not
        priced in env: {models.map((m) => `'${m}'`).join(", ")}. They count $0 in the
        costing roll-ups until added to{" "}
        <code>LLM_INPUT_PRICE_PER_MILLION_USD</code> /{" "}
        <code>LLM_OUTPUT_PRICE_PER_MILLION_USD</code>.
      </p>
      <Link
        href="/admin/system"
        className="text-amber-900 hover:text-amber-950 mt-1 text-[12px] font-medium underline"
      >
        View System → Pricing status →
      </Link>
    </div>
  );
}

function KpiRow({ overview }: { overview: AdminOverview }) {
  const { kpis } = overview;
  const indexingStalled = isStale(
    overview.workers.indexing_last_attempt_at,
    INDEXING_STALL_MS
  );
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <AdminKpiCard
        label="Total users"
        value={kpis.total_users}
        helper={`+${kpis.signups_today.toLocaleString()} today · +${kpis.signups_last_7d.toLocaleString()} last 7d`}
      />
      <AdminKpiCard
        label="MRR"
        value={formatCostUsd(kpis.mrr_usd)}
        helper={`${kpis.active_subscriptions.toLocaleString()} active subscriptions`}
      />
      <AdminKpiCard
        label="Conversations today"
        value={kpis.conversations_today}
        helper={`MTD ${kpis.conversations_mtd.toLocaleString()}`}
      />
      <AdminKpiCard
        label="Indexing queue"
        value={kpis.indexing_queue_depth}
        helper={
          kpis.indexing_failed_24h > 0
            ? `${kpis.indexing_failed_24h.toLocaleString()} failed in last 24h`
            : "no failures in last 24h"
        }
        tone={
          indexingStalled && kpis.indexing_queue_depth > 0
            ? "bad"
            : kpis.indexing_failed_24h > 0
            ? "warn"
            : "neutral"
        }
      />
    </div>
  );
}

function CostingSummaryCard({ overview }: { overview: AdminOverview }) {
  return (
    <section className="border-ds-outline rounded-xl border bg-ds-surface p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <h2 className="text-ds-on-surface text-lg font-semibold">Costing (MTD)</h2>
          <p className="text-ds-on-surface-variant text-xs">
            Reuses the platform Costing roll-up. Detail and leaderboards on{" "}
            <Link
              href="/admin/costing"
              className="text-ds-primary hover:underline"
            >
              the Costing page
            </Link>
            .
          </p>
        </div>
        <Link
          href="/admin/costing"
          className="text-ds-primary text-sm font-medium hover:underline"
        >
          View costing →
        </Link>
      </div>
      <dl className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <CostingStat label="LLM cost" value={formatCostUsd(overview.llm_cost_mtd_usd)} />
        <CostingStat
          label="Embedding cost"
          value={formatCostUsd(overview.embedding_cost_mtd_usd)}
        />
        <CostingStat label="Revenue" value={formatCostUsd(overview.revenue_mtd_usd)} />
        <CostingStat
          label="Gross margin"
          value={`${formatCostUsd(overview.gross_margin_mtd_usd)} · ${formatMarginPct(
            overview.gross_margin_mtd_pct
          )}`}
        />
      </dl>
    </section>
  );
}

function CostingStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-ds-on-surface-variant text-[11px] font-medium uppercase tracking-wide">
        {label}
      </dt>
      <dd className="text-ds-on-surface mt-1 text-base font-semibold">{value}</dd>
    </div>
  );
}

function RecentActivity({ overview }: { overview: AdminOverview }) {
  return (
    <section className="grid gap-4 lg:grid-cols-3">
      <ActivityColumn
        title="Recent signups"
        emptyMessage="No signups yet."
        viewAllHref="/admin/users"
      >
        {overview.recent_signups.map((u) => (
          <Link
            key={u.id}
            href={`/admin/users/${u.id}`}
            className="border-ds-outline hover:bg-ds-neutral/40 flex flex-col gap-1 rounded-md border bg-ds-surface px-3 py-2 transition"
          >
            <span className="text-ds-on-surface text-sm font-medium">{u.email}</span>
            <span className="text-ds-on-surface-variant text-[11px]">
              {u.full_name ? `${u.full_name} · ` : ""}signed up{" "}
              {formatRelative(u.signed_up_at, "—")}
            </span>
          </Link>
        ))}
      </ActivityColumn>

      <ActivityColumn
        title="Recent conversations"
        emptyMessage="No conversations yet."
        viewAllHref="/admin/conversations"
      >
        {overview.recent_conversations.map((c) => (
          <Link
            key={c.id}
            href={`/admin/conversations/${c.id}`}
            className="border-ds-outline hover:bg-ds-neutral/40 flex flex-col gap-1 rounded-md border bg-ds-surface px-3 py-2 transition"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-ds-on-surface text-sm font-medium">
                {c.agent_name}
              </span>
              <AdminStatusBadge status={c.status} />
            </div>
            <span className="text-ds-on-surface-variant text-[11px]">
              {c.user_email} · {formatRelative(c.last_activity_at, "—")} ·{" "}
              {formatCostUsd(c.cost_usd)}
            </span>
            {c.latest_message_preview && (
              <span className="text-ds-on-surface-variant truncate text-[11px] italic">
                "{c.latest_message_preview}"
              </span>
            )}
          </Link>
        ))}
      </ActivityColumn>

      <ActivityColumn
        title="Recent indexing failures"
        emptyMessage="No failed indexing jobs in the last 24h. Nice."
        viewAllHref="/admin/knowledge?tab=jobs&status=failed"
      >
        {overview.recent_indexing_failures.slice(0, 5).map((j) => (
          <Link
            key={j.id}
            href={`/admin/knowledge/sources/${j.knowledge_source_id}`}
            className="border-ds-outline hover:bg-ds-neutral/40 flex flex-col gap-1 rounded-md border bg-ds-surface px-3 py-2 transition"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-ds-on-surface text-sm font-medium">
                {j.knowledge_source_title}
              </span>
              <AdminStatusBadge status={j.status} />
            </div>
            <span className="text-ds-on-surface-variant text-[11px]">
              {j.user_email} · {j.agent_name} · attempt {j.attempt} ·{" "}
              {formatRelative(j.created_at, "—")}
            </span>
            {j.error_message && (
              <span className="text-rose-700 truncate text-[11px]" title={j.error_message}>
                {j.error_message}
              </span>
            )}
          </Link>
        ))}
      </ActivityColumn>
    </section>
  );
}

function ActivityColumn({
  title,
  emptyMessage,
  viewAllHref,
  children,
}: {
  title: string;
  emptyMessage: string;
  viewAllHref: string;
  children: React.ReactNode;
}) {
  // We can't reliably check `children.length` without React.Children, but the parent
  // collapses to an array via `.map`, so an empty list renders an empty fragment. We
  // detect that with a CSS-only fallback by rendering the empty message after children
  // and hiding it when there are siblings via :has(). For SSR predictability we render
  // it as a separate placeholder row; in practice it's always either the only line or
  // not visible underneath real rows, so we keep things simple.
  const childArray = Array.isArray(children) ? children : children ? [children] : [];
  return (
    <section className="border-ds-outline flex flex-col gap-2 rounded-xl border bg-ds-surface p-4">
      <header className="flex items-center justify-between">
        <h3 className="text-ds-on-surface text-sm font-semibold">{title}</h3>
        <Link
          href={viewAllHref}
          className="text-ds-primary text-xs font-medium hover:underline"
        >
          View all →
        </Link>
      </header>
      <div className="flex flex-col gap-2">
        {childArray.length === 0 ? (
          <p className="text-ds-on-surface-variant text-xs italic">{emptyMessage}</p>
        ) : (
          childArray
        )}
      </div>
    </section>
  );
}

function WorkerHeartbeats({ overview }: { overview: AdminOverview }) {
  const w = overview.workers;
  const indexingStalled =
    w.indexing_queue_depth > 0 && isStale(w.indexing_last_attempt_at, INDEXING_STALL_MS);
  return (
    <section className="border-ds-outline rounded-xl border bg-ds-surface p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-ds-on-surface text-sm font-semibold">Worker heartbeats</h2>
        <Link href="/admin/system" className="text-ds-primary text-xs hover:underline">
          System health →
        </Link>
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Heartbeat
          label="Indexing — last success"
          value={formatRelative(w.indexing_last_success_at)}
          tone={w.indexing_last_success_at ? "good" : "neutral"}
        />
        <Heartbeat
          label="Indexing — last attempt"
          value={formatRelative(w.indexing_last_attempt_at)}
          tone={indexingStalled ? "bad" : "neutral"}
        />
        <Heartbeat
          label="Indexing — queue depth"
          value={w.indexing_queue_depth.toLocaleString()}
          tone={
            indexingStalled
              ? "bad"
              : w.indexing_queue_depth > 0
              ? "info"
              : "good"
          }
        />
        <Heartbeat
          label="Maintenance — last computed"
          value={formatRelative(w.maintenance_last_computed_at)}
          tone={w.maintenance_last_computed_at ? "neutral" : "warn"}
        />
      </div>
      {indexingStalled && (
        <p className="text-rose-700 mt-3 text-[12px]">
          Worker stalled? Indexing has not run in the last{" "}
          {Math.round(INDEXING_STALL_MS / 60_000)} minutes while {w.indexing_queue_depth}{" "}
          job(s) are queued.
        </p>
      )}
    </section>
  );
}

function Heartbeat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "good" | "warn" | "bad" | "info" | "neutral";
}) {
  const dot = {
    good: "bg-emerald-500",
    warn: "bg-amber-500",
    bad: "bg-rose-500",
    info: "bg-sky-500",
    neutral: "bg-ds-outline",
  }[tone];
  return (
    <div className="border-ds-outline rounded-md border bg-ds-surface p-3">
      <div className="text-ds-on-surface-variant flex items-center gap-2 text-[11px] font-medium uppercase tracking-wide">
        <span className={`inline-block h-2 w-2 rounded-full ${dot}`} aria-hidden />
        {label}
      </div>
      <div className="text-ds-on-surface mt-1 text-base font-semibold">{value}</div>
    </div>
  );
}

function RecentStripeEvents({ overview }: { overview: AdminOverview }) {
  if (overview.recent_stripe_events.length === 0) {
    return null;
  }
  return (
    <details className="border-ds-outline rounded-xl border bg-ds-surface p-4">
      <summary className="text-ds-on-surface cursor-pointer text-sm font-semibold">
        Recent Stripe events ({overview.recent_stripe_events.length})
      </summary>
      <table className="mt-3 w-full text-left text-xs">
        <thead className="text-ds-on-surface-variant">
          <tr>
            <th className="py-1 pr-2 font-medium">Stripe event id</th>
            <th className="py-1 pr-2 font-medium">Type</th>
            <th className="py-1 font-medium">Processed</th>
          </tr>
        </thead>
        <tbody>
          {overview.recent_stripe_events.map((e) => (
            <tr key={e.id} className="border-ds-outline border-t">
              <td className="py-1 pr-2 font-mono">{e.stripe_event_id}</td>
              <td className="py-1 pr-2">{e.event_type}</td>
              <td className="text-ds-on-surface-variant py-1">
                {formatRelative(e.processed_at, "—")}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </details>
  );
}
