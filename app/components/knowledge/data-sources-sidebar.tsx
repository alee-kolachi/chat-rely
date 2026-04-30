import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type KnowledgeWebsiteUsage = {
  plan_slug: string;
  plan_name: string;
  included_storage_bytes: number;
  used_storage_bytes: number;
  total_links: number;
  show_upgrade: boolean;
  website_crawl_budget_bytes?: number;
  website_crawl_last_job_bytes?: number | null;
};

type DataSourcesSidebarProps = {
  className?: string;
  mobile?: boolean;
  agentId?: string;
  usage?: KnowledgeWebsiteUsage | null;
  usageLoading?: boolean;
};

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb < 10 ? kb.toFixed(1) : Math.round(kb)} KB`;
  const mb = kb / 1024;
  return `${mb < 10 ? mb.toFixed(1) : Math.round(mb)} MB`;
}

export function DataSourcesSidebar({
  className,
  mobile = false,
  agentId,
  usage,
  usageLoading = false,
}: DataSourcesSidebarProps) {
  const crawlSuffix =
    usage && !usageLoading && (usage.website_crawl_budget_bytes ?? 0) > 0
      ? ` · Crawl ${formatBytes(usage.website_crawl_budget_bytes ?? 0)}`
      : "";
  const summaryLine =
    usage && !usageLoading
      ? `${usage.total_links.toLocaleString()} pages indexed · ${formatBytes(usage.used_storage_bytes)} used${crawlSuffix}`
      : usageLoading && agentId
        ? "Loading…"
        : "— pages indexed · — used";

  const planLine = usage && !usageLoading ? `${usage.plan_name} plan` : "Plan";

  const used = usage?.used_storage_bytes ?? 0;
  const cap = Math.max(1, usage?.included_storage_bytes ?? 1);
  const pct = Math.min(100, Math.round((used / cap) * 100));
  const overCap = usage ? used > usage.included_storage_bytes : false;
  const showLimitBlock = Boolean(usage && !usageLoading);
  const showUpgrade = Boolean(usage?.show_upgrade);

  if (mobile) {
    return (
      <section
        className={cn(
          "border-ds-outline bg-ds-surface/95 fixed right-0 bottom-0 left-0 z-40 border-t p-3 shadow-lg backdrop-blur-sm",
          "pb-[max(0.75rem,env(safe-area-inset-bottom,0px))]",
          className
        )}
      >
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="ds-app-kicker text-ds-on-surface font-semibold">Data sources</p>
            <div className="text-ds-on-surface-variant mt-0.5 flex items-center gap-2 text-xs">
              <IconLanguage className="size-4 shrink-0" aria-hidden />
              <span className="truncate">{summaryLine}</span>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              className="border-ds-outline text-ds-on-surface cursor-pointer rounded-ds-md border bg-white px-3 py-1.5 text-xs font-semibold shadow-sm transition-colors hover:bg-ds-sidebar"
            >
              Retrain
            </button>
            {showUpgrade ? (
              <Link
                href="/pricing"
                className="bg-ds-primary text-ds-on-primary hover:bg-ds-secondary inline-flex cursor-pointer rounded-ds-md px-3 py-1.5 text-xs font-semibold transition-colors"
              >
                Upgrade
              </Link>
            ) : null}
          </div>
        </div>
      </section>
    );
  }

  return (
    <aside
      className={cn(
        "border-ds-outline bg-ds-sidebar sticky top-0 h-[calc(100vh-3.5rem)] w-[clamp(16rem,30vw,31.25rem)] min-w-[16rem] shrink-0 overflow-y-auto border-l p-6 md:p-8",
        className
      )}
    >
      <h2 className="ds-app-section-title mb-6 text-base">Data sources</h2>
      <div className="space-y-4">
        <div className="border-ds-outline flex items-center justify-between rounded-ds-lg border bg-ds-surface p-4 shadow-sm">
          <div className="flex items-center gap-2">
            <IconLanguage className="text-ds-primary size-5 shrink-0" aria-hidden />
            <span className="text-ds-on-surface text-sm font-medium">{summaryLine}</span>
          </div>
          {usage && !usageLoading ? (
            <span className="text-ds-on-surface text-sm font-semibold">{planLine}</span>
          ) : null}
        </div>

        <div className="border-ds-outline rounded-ds-lg border bg-ds-surface p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between text-sm">
            <span className="text-ds-on-surface-variant">Total size</span>
            <span className="text-ds-on-surface text-right font-semibold">
              {usage && !usageLoading ? (
                <>
                  {formatBytes(used)} / {formatBytes(cap)}
                </>
              ) : (
                "—"
              )}
            </span>
          </div>
          {showLimitBlock ? (
            <div className="mb-6 h-2.5 w-full overflow-hidden rounded-full bg-ds-outline/55">
              <div
                className={cn(
                  "from-ds-primary to-ds-secondary h-full bg-gradient-to-r transition-all",
                  overCap ? "from-amber-500 to-amber-600" : "",
                )}
                style={{ width: `${pct}%` }}
              />
            </div>
          ) : (
            <div className="mb-6 h-2.5 w-full rounded-full bg-ds-outline/30" />
          )}
          {usage && !usageLoading && (usage.website_crawl_budget_bytes ?? 0) > 0 ? (
            <div className="text-ds-on-surface-variant mb-4 space-y-1 text-xs leading-relaxed">
              <p>
                Crawl budget:{" "}
                <span className="text-ds-on-surface font-semibold">
                  {formatBytes(usage.website_crawl_budget_bytes ?? 0)}
                </span>{" "}
                (plan)
              </p>
              {usage.website_crawl_last_job_bytes != null && usage.website_crawl_last_job_bytes !== undefined ? (
                <p>
                  Crawl used:{" "}
                  <span className="text-ds-on-surface font-semibold tabular-nums">
                    {formatBytes(usage.website_crawl_last_job_bytes)} /{" "}
                    {formatBytes(usage.website_crawl_budget_bytes ?? 0)}
                  </span>
                </p>
              ) : null}
            </div>
          ) : null}
          <button
            type="button"
            className="bg-ds-primary text-ds-on-primary hover:bg-ds-secondary w-full cursor-pointer rounded-ds-md py-2.5 text-sm font-semibold transition-colors"
          >
            Retrain agent
          </button>
        </div>

        {showLimitBlock && (overCap || showUpgrade) ? (
          <div className="mt-6 space-y-3">
            <div className="flex items-start gap-2">
              <div className="mt-1.5 size-2 shrink-0 rounded-full bg-amber-500" />
              <div>
                <p className="text-sm font-semibold text-amber-800">
                  {overCap ? "Limit exceeded" : "Upgrade available"}
                </p>
                <p className="text-ds-on-surface-variant text-sm leading-relaxed">
                  {overCap
                    ? `You are using ${formatBytes(used)} of ${formatBytes(cap)} included on your ${usage?.plan_name ?? ""} plan.`
                    : `You are on the ${usage?.plan_name ?? ""} plan. Upgrade for more knowledge storage and features.`}
                </p>
              </div>
            </div>
            {showUpgrade ? (
              <Link
                href="/pricing"
                className="border-ds-outline hover:border-ds-primary/40 group flex w-full cursor-pointer items-center justify-between rounded-ds-lg border bg-ds-surface p-3 text-left shadow-sm transition-colors"
              >
                <div className="flex items-center gap-2">
                  <IconArrowUp className="text-ds-primary size-4.5 shrink-0" aria-hidden />
                  <span className="text-ds-on-surface text-sm font-semibold">Upgrade for more data</span>
                </div>
                <IconChevron
                  className="text-ds-on-surface-variant group-hover:text-ds-on-surface size-4 shrink-0"
                  aria-hidden
                />
              </Link>
            ) : null}
          </div>
        ) : null}
      </div>
    </aside>
  );
}

function IconBase({
  className,
  children,
  fill = "none",
  strokeWidth = "1.8",
}: {
  className?: string;
  children: ReactNode;
  fill?: string;
  strokeWidth?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill={fill}
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      {children}
    </svg>
  );
}

function IconChevron({ className }: { className?: string }) {
  return (
    <IconBase className={className}>
      <path d="m9 18 6-6-6-6" />
    </IconBase>
  );
}

function IconLanguage({ className }: { className?: string }) {
  return (
    <IconBase className={className}>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18" />
    </IconBase>
  );
}

function IconArrowUp({ className }: { className?: string }) {
  return (
    <IconBase className={className}>
      <path d="M12 19V5" />
      <path d="m7 10 5-5 5 5" />
    </IconBase>
  );
}
