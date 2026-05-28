"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useKnowledgeDataSources } from "@/components/knowledge/knowledge-data-sources-context";
import {
  IconArrowUp,
  IconFile,
  IconLanguage,
  IconQuestion,
  IconQuote,
  IconRefresh,
} from "@/components/knowledge/knowledge-icons";
import { useClientMounted } from "@/lib/use-client-mounted";
import { cn } from "@/lib/utils";

export type KnowledgeWebsiteUsage = {
  plan_slug: string;
  plan_name: string;
  included_storage_bytes: number;
  used_storage_bytes: number;
  total_links: number;
  total_files?: number;
  total_snippets?: number;
  total_qa_pairs?: number;
  website_used_bytes?: number;
  files_used_bytes?: number;
  snippets_used_bytes?: number;
  qa_used_bytes?: number;
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
  const localeReady = useClientMounted();
  const shared = useKnowledgeDataSources();
  const resolvedAgentId = agentId ?? shared?.agentId;
  const resolvedUsage = usage ?? shared?.usage ?? null;
  const resolvedUsageLoading =
    !localeReady || (usage === undefined ? (shared?.usageLoading ?? usageLoading) : usageLoading);

  const persistedUsedBytes = resolvedUsage?.used_storage_bytes ?? 0;
  const shownUsedBytes = persistedUsedBytes;

  const summaryLine = (() => {
    if (resolvedUsage && !resolvedUsageLoading) {
      const parts: string[] = [];
      const files = resolvedUsage.total_files ?? 0;
      const snippets = resolvedUsage.total_snippets ?? 0;
      const qaPairs = resolvedUsage.total_qa_pairs ?? 0;
      if (qaPairs > 0) parts.push(`${qaPairs.toLocaleString()} Q&A pair${qaPairs === 1 ? "" : "s"}`);
      if (snippets > 0) parts.push(`${snippets.toLocaleString()} snippet${snippets === 1 ? "" : "s"}`);
      if (files > 0) parts.push(`${files.toLocaleString()} file${files === 1 ? "" : "s"}`);
      if (resolvedUsage.total_links > 0) {
        parts.push(`${resolvedUsage.total_links.toLocaleString()} page${resolvedUsage.total_links === 1 ? "" : "s"} indexed`);
      }
      parts.push(`${formatBytes(shownUsedBytes)} used`);
      return parts.join(" · ");
    }
    return resolvedUsageLoading && resolvedAgentId ? "Loading…" : "- used";
  })();

  const used = shownUsedBytes;
  const cap = Math.max(1, resolvedUsage?.included_storage_bytes ?? 1);
  const pct = Math.min(100, Math.round((used / cap) * 100));
  const overCap = resolvedUsage ? persistedUsedBytes > resolvedUsage.included_storage_bytes : false;
  const showLimitBlock = Boolean(resolvedUsage && !resolvedUsageLoading);
  const showUpgrade = Boolean(resolvedUsage?.show_upgrade);

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
            <div className="ds-app-body-muted mt-0.5 flex items-center gap-2">
              <IconLanguage className="size-4 shrink-0" />
              <span className="truncate">{summaryLine}</span>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              className="border-ds-outline text-ds-on-surface cursor-pointer rounded-ds-md border bg-white px-3 py-1.5 text-sm font-semibold shadow-sm transition-colors hover:bg-ds-sidebar"
            >
              Retrain
            </button>
            {showUpgrade ? (
              <Link
                href="/pricing"
                className="bg-ds-primary text-ds-on-primary hover:bg-ds-primary-hover inline-flex cursor-pointer rounded-ds-md px-3 py-1.5 text-sm font-semibold transition-colors"
              >
                Upgrade
              </Link>
            ) : null}
          </div>
        </div>
      </section>
    );
  }

  const qaCount = resolvedUsage?.total_qa_pairs ?? 0;
  const snippetCount = resolvedUsage?.total_snippets ?? 0;
  const fileCount = resolvedUsage?.total_files ?? 0;
  const websiteSources = shared?.websiteSources ?? null;
  const sourceLinkPages =
    websiteSources?.reduce((sum, source) => sum + Math.max(0, source.link_count ?? 0), 0) ?? 0;
  const websitePages = Math.max(resolvedUsage?.total_links ?? 0, sourceLinkPages);

  return (
    <aside
      className={cn(
        "border-ds-outline bg-ds-sidebar sticky top-0 h-[calc(100vh-3.5rem)] w-[clamp(16rem,30vw,31.25rem)] min-w-[16rem] shrink-0 overflow-y-auto border-l p-6 md:p-8",
        className
      )}
    >
      <h2 className="ds-app-section-title mb-6 text-base">Data sources</h2>
      <div className="space-y-2">
        <div className="border-ds-outline divide-ds-outline/60 rounded-ds-md border bg-ds-surface shadow-sm">
          <SourceTypeRow
            icon={<IconQuestion className="text-ds-primary size-4 shrink-0" strokeWidth={1.6} />}
            label="Q&A"
            count={qaCount}
            bytes={resolvedUsage?.qa_used_bytes ?? 0}
            loading={resolvedUsageLoading}
          />
          <SourceTypeRow
            icon={<IconQuote className="text-ds-primary size-4 shrink-0" strokeWidth={1.6} />}
            label="Snippets"
            count={snippetCount}
            bytes={resolvedUsage?.snippets_used_bytes ?? 0}
            loading={resolvedUsageLoading}
            withDivider
          />
          <SourceTypeRow
            icon={<IconFile className="text-ds-primary size-4 shrink-0" strokeWidth={1.6} />}
            label="Files"
            count={fileCount}
            bytes={resolvedUsage?.files_used_bytes ?? 0}
            loading={resolvedUsageLoading}
            withDivider
          />
          <SourceTypeRow
            icon={<IconLanguage className="text-ds-primary size-4 shrink-0" strokeWidth={1.6} />}
            label="Links"
            count={websitePages}
            bytes={resolvedUsage?.website_used_bytes ?? 0}
            loading={resolvedUsageLoading}
            withDivider
          />
        </div>

        <div className="border-ds-outline rounded-ds-md border bg-ds-surface p-3.5 shadow-sm">
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="text-ds-on-surface-variant">Total size</span>
            <span className="text-ds-on-surface text-right font-semibold">
              {resolvedUsage && !resolvedUsageLoading ? (
                <>
                  {formatBytes(used)} / {formatBytes(cap)}
                </>
              ) : (
                "-"
              )}
            </span>
          </div>
          {showLimitBlock ? (
            <div className="mb-2 h-2 w-full overflow-hidden rounded-full bg-ds-outline/55">
              <div
                className={cn(
                  "from-ds-primary to-ds-secondary h-full bg-gradient-to-r transition-all",
                  overCap ? "from-amber-500 to-amber-600" : "",
                )}
                style={{ width: `${pct}%` }}
              />
            </div>
          ) : (
            <div className="mb-2 h-2 w-full rounded-full bg-ds-outline/30" />
          )}
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
                    ? `You are using ${formatBytes(used)} of ${formatBytes(cap)} included on your ${resolvedUsage?.plan_name ?? ""} plan.`
                    : `You are on the ${resolvedUsage?.plan_name ?? ""} plan. Upgrade for more knowledge storage and features.`}
                </p>
              </div>
            </div>
            {showUpgrade ? (
              <Link
                href="/pricing"
                className="border-ds-outline hover:border-black/40 group flex w-full cursor-pointer items-center justify-between rounded-ds-md border bg-ds-surface p-3 text-left shadow-sm transition-colors"
              >
                <div className="flex items-center gap-2">
                  <IconArrowUp className="text-ds-primary size-4 shrink-0" strokeWidth={1.6} />
                  <span className="ds-app-card-title">Upgrade for more data</span>
                </div>
              </Link>
            ) : null}
          </div>
        ) : null}
      </div>
    </aside>
  );
}

function SourceTypeRow({
  icon,
  label,
  count,
  bytes,
  loading,
  withDivider = false,
}: {
  icon: ReactNode;
  label: string;
  count: number;
  bytes: number;
  loading: boolean;
  withDivider?: boolean;
}) {
  return (
    <div className={cn("flex items-center gap-2 px-3 py-2.5", withDivider ? "border-t border-ds-outline/60" : "")}>
      {icon}
      <div className="min-w-0 flex-1">
        <p className="ds-app-card-title">
          {loading ? "…" : `${count.toLocaleString()} ${label}`}
        </p>
      </div>
      <span className="ds-app-body-muted font-medium">{loading ? "…" : formatBytes(bytes)}</span>
      <button
        type="button"
        aria-label={`Retrain ${label.toLowerCase()}`}
        title="Retrain source"
        className="text-ds-on-surface-variant hover:text-ds-on-surface cursor-pointer rounded-ds-md p-0.5 transition-colors"
      >
        <IconRefresh className="size-3.5" strokeWidth={1.6} />
      </button>
    </div>
  );
}
