import Link from "next/link";
import { AdminApiErrorPanel } from "@/components/admin/admin-api-error-panel";
import {
  AdminDataTable,
  type AdminColumn,
} from "@/components/admin/admin-data-table";
import {
  formatCostUsd,
  formatDeltaUsd,
  formatMarginPct,
  marginBadgeTone,
  marginToneClass,
  type MarginTone,
} from "@/lib/admin/cost-format";
import {
  AdminApiError,
  getCostingLeaderboard,
  getPlatformCostingOverview,
  type AdminCostByModelRow,
  type AdminCostingPeriod,
  type AdminPlatformCosting,
  type AdminUserCostingRow,
} from "@/lib/admin/api";

export const dynamic = "force-dynamic";

export default async function AdminCostingPage() {
  try {
    const [overview, worstMargin, topSpend] = await Promise.all([
      getPlatformCostingOverview(),
      getCostingLeaderboard("worst_margin", 20),
      getCostingLeaderboard("top_spend", 20),
    ]);

    return (
      <div className="flex flex-col gap-6 p-6">
        <header className="flex flex-col gap-2">
          <h1 className="text-ds-on-surface text-2xl font-semibold">Costing</h1>
          <p className="text-ds-on-surface-variant text-sm">
            Platform-wide LLM and embedding spend, revenue, and margin. Numbers refresh every{" "}
            {overview.cache_ttl_seconds}s; last refreshed{" "}
            {new Date(overview.cached_at).toLocaleString()}.
          </p>
        </header>

        {(overview.unknown_models.length > 0 || !overview.embedding_model_priced) && (
          <PricingGapsBanner overview={overview} />
        )}

        <KpiRow current={overview.current} prior={overview.prior} />

        <ByModelTable rows={overview.by_model} totalLlmCost={overview.current.llm_cost_usd} />

        <LeaderboardSection
          title="Worst margin (MTD)"
          subtitle="Users where revenue minus our cost is most negative — investigate before they churn or before we keep losing money."
          rows={worstMargin.items}
          emptyMessage="No users with computable margin yet."
          showMargin
        />

        <LeaderboardSection
          title="Top spenders (MTD)"
          subtitle="Users by total LLM + embedding cost. Useful for capacity planning."
          rows={topSpend.items}
          emptyMessage="No usage recorded this month."
        />
      </div>
    );
  } catch (err) {
    if (err instanceof AdminApiError) {
      return <AdminApiErrorPanel title="Could not load costing" message={err.message} />;
    }
    throw err;
  }
}

// ---------- KPI cards ----------------------------------------------------------

function KpiRow({
  current,
  prior,
}: {
  current: AdminCostingPeriod;
  prior: AdminCostingPeriod;
}) {
  const llmDelta = current.llm_cost_usd - prior.llm_cost_usd;
  const embedDelta = current.embedding_cost_usd - prior.embedding_cost_usd;
  const revenueDelta = current.revenue_usd - prior.revenue_usd;
  const marginDelta =
    current.gross_margin_pct !== null && prior.gross_margin_pct !== null
      ? current.gross_margin_pct - prior.gross_margin_pct
      : null;

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <KpiCard
        label="LLM cost MTD"
        value={formatCostUsd(current.llm_cost_usd)}
        helper={`vs prior ${formatDeltaUsd(llmDelta)}`}
      />
      <KpiCard
        label="Embedding cost MTD"
        value={formatCostUsd(current.embedding_cost_usd)}
        helper={`vs prior ${formatDeltaUsd(embedDelta)}`}
      />
      <KpiCard
        label="Revenue MTD"
        value={formatCostUsd(current.revenue_usd)}
        helper={`vs prior ${formatDeltaUsd(revenueDelta)}`}
      />
      <KpiCard
        label="Gross margin %"
        value={formatMarginPct(current.gross_margin_pct)}
        helper={
          marginDelta === null
            ? `vs prior —`
            : `vs prior ${marginDelta > 0 ? "+" : ""}${marginDelta.toFixed(1)}pp`
        }
        tone={marginBadgeTone(current.gross_margin_usd, current.gross_margin_pct)}
      />
    </div>
  );
}

function KpiCard({
  label,
  value,
  helper,
  tone,
}: {
  label: string;
  value: string;
  helper?: string;
  tone?: MarginTone;
}) {
  return (
    <section className="border-ds-outline rounded-xl border bg-ds-surface p-4">
      <h3 className="text-ds-on-surface-variant text-[11px] font-medium uppercase tracking-wide">
        {label}
      </h3>
      <div
        className={cnPill(
          "mt-2 inline-flex items-center rounded-md px-1 text-2xl font-semibold",
          tone
        )}
      >
        {value}
      </div>
      {helper && <p className="ds-app-body-muted mt-1">{helper}</p>}
    </section>
  );
}

// Tiny inline cn() so this page doesn't pull a client-only util.
function cnPill(base: string, tone?: MarginTone): string {
  if (!tone || tone === "neutral") return `${base} text-ds-on-surface`;
  return `${base} ${marginToneClass(tone)}`;
}

// ---------- By-model table ------------------------------------------------------

function ByModelTable({
  rows,
  totalLlmCost,
}: {
  rows: AdminCostByModelRow[];
  totalLlmCost: number;
}) {
  const columns: AdminColumn<AdminCostByModelRow>[] = [
    {
      key: "model",
      label: "Model",
      render: (row) => (
        <span className="text-ds-on-surface font-mono text-xs">{row.model}</span>
      ),
    },
    {
      key: "input_tokens",
      label: "Input tokens",
      align: "right",
      render: (row) => row.input_tokens.toLocaleString(),
    },
    {
      key: "output_tokens",
      label: "Output tokens",
      align: "right",
      render: (row) => row.output_tokens.toLocaleString(),
    },
    {
      key: "cost_usd",
      label: "Cost (USD)",
      align: "right",
      render: (row) => formatCostUsd(row.cost_usd),
    },
    {
      key: "pct_of_total",
      label: "% of LLM cost",
      align: "right",
      render: (row) => `${row.pct_of_total.toFixed(1)}%`,
    },
  ];

  return (
    <section className="flex flex-col gap-3">
      <header className="flex items-baseline justify-between">
        <h2 className="text-ds-on-surface text-lg font-semibold">By model (MTD)</h2>
        <span className="ds-app-body-muted">
          Total LLM cost {formatCostUsd(totalLlmCost)}
        </span>
      </header>
      <AdminDataTable
        columns={columns}
        rows={rows}
        rowKey={(row) => row.model}
        emptyMessage="No priced LLM activity this month."
      />
    </section>
  );
}

// ---------- Leaderboard --------------------------------------------------------

function LeaderboardSection({
  title,
  subtitle,
  rows,
  emptyMessage,
  showMargin = false,
}: {
  title: string;
  subtitle: string;
  rows: AdminUserCostingRow[];
  emptyMessage: string;
  showMargin?: boolean;
}) {
  const columns: AdminColumn<AdminUserCostingRow>[] = [
    {
      key: "email",
      label: "User",
      render: (row) => (
        <Link
          href={`/admin/users/${row.user_id}`}
          className="text-ds-primary hover:underline"
        >
          {row.email}
        </Link>
      ),
    },
    {
      key: "plan",
      label: "Plan",
      render: (row) =>
        row.plan_name ? (
          <span className="text-ds-on-surface text-sm">{row.plan_name}</span>
        ) : (
          <span className="ds-app-body-muted">No plan</span>
        ),
    },
    {
      key: "revenue_usd",
      label: "Revenue",
      align: "right",
      render: (row) => formatCostUsd(row.revenue_usd),
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
      label: "Total cost",
      align: "right",
      render: (row) => formatCostUsd(row.total_cost_usd),
    },
  ];

  if (showMargin) {
    columns.push({
      key: "margin_usd",
      label: "Margin USD",
      align: "right",
      render: (row) => formatCostUsd(row.margin_usd),
    });
    columns.push({
      key: "margin_pct",
      label: "Margin %",
      align: "right",
      render: (row) => {
        const tone = marginBadgeTone(row.margin_usd, row.margin_pct);
        return (
          <span
            className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${marginToneClass(
              tone
            )}`}
          >
            {formatMarginPct(row.margin_pct)}
          </span>
        );
      },
    });
  }

  return (
    <section className="flex flex-col gap-3">
      <header className="flex flex-col gap-1">
        <h2 className="text-ds-on-surface text-lg font-semibold">{title}</h2>
        <p className="ds-app-body-muted">{subtitle}</p>
      </header>
      <AdminDataTable
        columns={columns}
        rows={rows}
        rowKey={(row) => row.user_id}
        emptyMessage={emptyMessage}
      />
    </section>
  );
}

// ---------- Pricing gaps banner ------------------------------------------------

function PricingGapsBanner({ overview }: { overview: AdminPlatformCosting }) {
  const lines: string[] = [];
  if (overview.unknown_models.length > 0) {
    lines.push(
      `LLM models seen in messages but missing from env: ${overview.unknown_models
        .map((m) => `'${m}'`)
        .join(", ")}.`
    );
  }
  if (!overview.embedding_model_priced) {
    lines.push(
      `Embedding model '${overview.embedding_model}' is missing from EMBEDDING_PRICE_PER_MILLION_USD — embedding cost reported as $0.`
    );
  }
  return (
    <div className="border-amber-200/60 bg-amber-50/60 text-amber-900 flex flex-col gap-1 rounded-md border px-4 py-3 text-sm">
      <strong className="text-amber-900">Pricing gaps</strong>
      {lines.map((line) => (
        <p key={line} className="text-amber-900/90 text-[13px]">
          {line}
        </p>
      ))}
      <p className="text-amber-900/80 mt-1 text-[12px]">
        Add the missing models to <code>LLM_INPUT_PRICE_PER_MILLION_USD</code>,{" "}
        <code>LLM_OUTPUT_PRICE_PER_MILLION_USD</code>, or{" "}
        <code>EMBEDDING_PRICE_PER_MILLION_USD</code> in <code>backend/.env</code> and restart.
      </p>
    </div>
  );
}
