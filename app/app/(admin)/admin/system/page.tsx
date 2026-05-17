import { AdminKpiCard } from "@/components/admin/admin-kpi-card";
import { getAdminSystemHealth, type AdminSystemHealth } from "@/lib/admin/api";
import { formatRelative, isStale } from "@/lib/admin/relative-time";
import { cn } from "@/lib/utils";

const STALE_INDEXING_MS = 30 * 60 * 1000;
const STALE_MAINTENANCE_MS = 6 * 60 * 60 * 1000;

export default async function AdminSystemPage() {
  const health = await getAdminSystemHealth();
  const unknown = health.pricing_configured.unknown_models_in_messages;

  return (
    <div className="flex flex-col gap-6 p-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-ds-on-surface text-2xl font-semibold">System</h1>
        <p className="text-ds-on-surface-variant text-sm">
          App version, database probe, worker heartbeats, and pricing configuration. Use this
          page to triage outages and missing pricing data.
        </p>
      </header>

      {unknown.length > 0 && <MissingPricingBanner models={unknown} />}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <AppCard health={health} />
        <DatabaseCard health={health} />
        <WorkersCard health={health} />
      </div>

      <PricingCard health={health} />
    </div>
  );
}

function MissingPricingBanner({ models }: { models: string[] }) {
  return (
    <section className="rounded-xl border border-rose-300 bg-rose-50 p-4 text-rose-900">
      <h2 className="text-sm font-semibold uppercase tracking-wide">
        Missing pricing for {models.length} model{models.length === 1 ? "" : "s"}
      </h2>
      <p className="mt-1 text-sm">
        Messages were observed using models that are not configured in pricing env vars. Costing
        for these messages renders as <span className="font-mono">null</span> until you add prices.
      </p>
      <ul className="mt-2 flex flex-wrap gap-2">
        {models.map((m) => (
          <li
            key={m}
            className="inline-flex items-center rounded-md border border-rose-300 bg-white/60 px-2 py-1 font-mono text-[11px]"
          >
            {m}
          </li>
        ))}
      </ul>
      <p className="mt-3 text-[11px] text-rose-900/80">
        Add prices to{" "}
        <code className="rounded bg-rose-100 px-1 font-mono">
          LLM_INPUT_PRICE_PER_MILLION_USD
        </code>
        ,{" "}
        <code className="rounded bg-rose-100 px-1 font-mono">
          LLM_OUTPUT_PRICE_PER_MILLION_USD
        </code>
        , or{" "}
        <code className="rounded bg-rose-100 px-1 font-mono">
          EMBEDDING_PRICE_PER_MILLION_USD
        </code>{" "}
        and restart the API.
      </p>
    </section>
  );
}

function AppCard({ health }: { health: AdminSystemHealth }) {
  const envTone =
    health.app_env === "production" ? "good" : health.app_env === "staging" ? "info" : "warn";
  return (
    <section className="border-ds-outline flex flex-col gap-4 rounded-xl border bg-ds-surface p-4">
      <h2 className="text-ds-on-surface text-sm font-semibold uppercase tracking-wide">
        Application
      </h2>
      <div className="grid grid-cols-1 gap-3">
        <Row label="Name">
          <span className="text-ds-on-surface font-medium">{health.app_name}</span>
        </Row>
        <Row label="Version">
          <span className="font-mono text-[12px]">{health.app_version}</span>
        </Row>
        <Row label="Environment">
          <span
            className={cn(
              "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide",
              envTone === "good" && "bg-emerald-500/15 text-emerald-700",
              envTone === "info" && "bg-sky-500/15 text-sky-700",
              envTone === "warn" && "bg-amber-500/15 text-amber-700"
            )}
          >
            {health.app_env}
          </span>
        </Row>
      </div>
    </section>
  );
}

function DatabaseCard({ health }: { health: AdminSystemHealth }) {
  const ready = health.database_ready;
  const latencyTone: "good" | "warn" | "bad" =
    !ready
      ? "bad"
      : health.database_latency_ms > 200
      ? "warn"
      : "good";

  return (
    <AdminKpiCard
      label="Database"
      value={ready ? "Ready" : "Down"}
      tone={ready ? "good" : "bad"}
      helper={`Round-trip ${health.database_latency_ms.toLocaleString()}ms`}
      hint={
        latencyTone === "warn"
          ? "Slow probe — investigate primary"
          : latencyTone === "bad"
          ? "DB not responding"
          : "Healthy"
      }
    />
  );
}

function WorkersCard({ health }: { health: AdminSystemHealth }) {
  const w = health.workers;
  const indexingStale = isStale(w.indexing_last_success_at, STALE_INDEXING_MS);
  const maintenanceStale = isStale(w.maintenance_last_computed_at, STALE_MAINTENANCE_MS);

  return (
    <section className="border-ds-outline flex flex-col gap-4 rounded-xl border bg-ds-surface p-4">
      <h2 className="text-ds-on-surface text-sm font-semibold uppercase tracking-wide">
        Workers
      </h2>
      <ul className="flex flex-col gap-3 text-sm">
        <WorkerRow
          name="Indexing worker"
          stale={indexingStale}
          subtitle={`last success ${formatRelative(w.indexing_last_success_at)}`}
          extra={
            <>
              <span>last attempt {formatRelative(w.indexing_last_attempt_at)}</span>
              <span className="text-ds-on-surface-variant">·</span>
              <span>queue depth {w.indexing_queue_depth.toLocaleString()}</span>
            </>
          }
        />
        <WorkerRow
          name="Maintenance / usage worker"
          stale={maintenanceStale}
          subtitle={`last run ${formatRelative(w.maintenance_last_computed_at)}`}
        />
      </ul>
    </section>
  );
}

function PricingCard({ health }: { health: AdminSystemHealth }) {
  const p = health.pricing_configured;
  const inputCount = p.llm_input_models.length;
  const outputCount = p.llm_output_models.length;
  const embeddingCount = p.embedding_models.length;

  return (
    <section className="border-ds-outline flex flex-col gap-4 rounded-xl border bg-ds-surface p-4">
      <header className="flex flex-col gap-1">
        <h2 className="text-ds-on-surface text-sm font-semibold uppercase tracking-wide">
          Pricing configuration
        </h2>
        <p className="ds-app-body-muted">
          Models loaded from env vars. The <span className="font-mono">unknown</span> list shows
          model names observed in messages but missing from pricing config.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <ModelGroup label="Input pricing" count={inputCount} models={p.llm_input_models} />
        <ModelGroup label="Output pricing" count={outputCount} models={p.llm_output_models} />
        <ModelGroup
          label="Embedding pricing"
          count={embeddingCount}
          models={p.embedding_models}
          activeModel={p.embedding_active_model}
          activeModelPriced={p.embedding_active_model_priced}
        />
      </div>

      <div className="border-ds-outline rounded-md border bg-ds-neutral/50 p-3">
        <h3 className="text-ds-on-surface-variant text-[11px] font-semibold uppercase tracking-wide">
          Unknown models in messages
        </h3>
        {p.unknown_models_in_messages.length === 0 ? (
          <p className="ds-app-body-muted mt-1">
            None — every observed model has prices configured.
          </p>
        ) : (
          <ul className="mt-2 flex flex-wrap gap-2">
            {p.unknown_models_in_messages.map((m) => (
              <li
                key={m}
                className="inline-flex items-center rounded-md border border-rose-300 bg-rose-50 px-2 py-1 font-mono text-[11px] text-rose-900"
              >
                {m}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

function ModelGroup({
  label,
  count,
  models,
  activeModel,
  activeModelPriced,
}: {
  label: string;
  count: number;
  models: string[];
  activeModel?: string;
  activeModelPriced?: boolean;
}) {
  return (
    <div className="border-ds-outline flex flex-col gap-2 rounded-md border bg-ds-surface p-3">
      <div className="flex items-center justify-between">
        <h3 className="text-ds-on-surface-variant text-[11px] font-semibold uppercase tracking-wide">
          {label}
        </h3>
        <span className="ds-app-body-muted">{count}</span>
      </div>
      {activeModel !== undefined && (
        <div className="text-[12px]">
          <span className="text-ds-on-surface-variant">Active: </span>
          <span className="font-mono">{activeModel}</span>
          {!activeModelPriced && (
            <span className="ml-2 inline-flex items-center rounded bg-rose-500/15 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-rose-700">
              Unpriced
            </span>
          )}
        </div>
      )}
      {models.length === 0 ? (
        <p className="ds-app-body-muted">No models configured.</p>
      ) : (
        <ul className="flex flex-wrap gap-1">
          {models.map((m) => (
            <li
              key={m}
              className="border-ds-outline inline-flex items-center rounded border bg-ds-neutral px-1.5 py-0.5 font-mono text-[11px]"
            >
              {m}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function WorkerRow({
  name,
  stale,
  subtitle,
  extra,
}: {
  name: string;
  stale: boolean;
  subtitle: string;
  extra?: React.ReactNode;
}) {
  return (
    <li className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <span
          aria-hidden
          className={cn(
            "h-2.5 w-2.5 rounded-full",
            stale ? "bg-rose-500" : "bg-emerald-500"
          )}
        />
        <span className="text-ds-on-surface font-medium">{name}</span>
        <span
          className={cn(
            "ml-auto inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide",
            stale ? "bg-rose-500/15 text-rose-700" : "bg-emerald-500/15 text-emerald-700"
          )}
        >
          {stale ? "Stale" : "OK"}
        </span>
      </div>
      <div className="ds-app-body-muted ml-[1.125rem]">{subtitle}</div>
      {extra && (
        <div className="text-ds-on-surface-variant ml-[1.125rem] flex items-center gap-2 text-[11px]">
          {extra}
        </div>
      )}
    </li>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="ds-app-body-muted">{label}</span>
      <div className="text-right text-sm">{children}</div>
    </div>
  );
}
