"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { UsagePlanBanner } from "@/components/dashboard/usage-plan-banner";
import { useDashboardAgent } from "@/components/layout/dashboard-agent-context";
import { useMeContext } from "@/components/layout/me-context-provider";
import { backendFetch } from "@/lib/backend-api";
import { appButtonClassName } from "@/lib/button-styles";
import { formatLocaleDate, formatLocaleNumber } from "@/lib/format-locale-datetime";
import { formatStorageBytes } from "@/lib/plan-entitlements";
import { useClientMounted } from "@/lib/use-client-mounted";

function formatThrottleTier(tier: string): string {
  return tier.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

type KnowledgeUsage = {
  used_storage_bytes: number;
  included_storage_bytes: number;
  total_links: number;
  total_files?: number;
  total_snippets?: number;
  total_qa_pairs?: number;
};

function UsageMetricCard({
  label,
  hint,
  usedLabel,
  includedLabel,
  loading,
  pct,
  overIncluded,
}: {
  label: string;
  hint: string;
  usedLabel: string;
  includedLabel: string;
  loading: boolean;
  pct: number;
  overIncluded: boolean;
}) {
  return (
    <article className="border-ds-outline bg-ds-surface flex min-h-0 flex-col rounded-ds-xl border p-5 shadow-sm sm:p-6">
      <h2 className="text-ds-on-surface-variant text-sm font-semibold leading-snug">{label}</h2>
      <div className="mt-2 flex min-h-[2.75rem] flex-wrap items-end justify-between gap-2">
        {loading ? (
          <>
            <span className="bg-ds-sidebar inline-block h-9 w-20 animate-pulse rounded-md" />
            <span className="bg-ds-sidebar inline-block h-5 w-28 animate-pulse rounded-md" />
          </>
        ) : (
          <>
            <p className="ds-app-metric-value min-w-0 break-words">{usedLabel}</p>
            <span className="text-ds-on-surface-variant shrink-0 text-sm">/ {includedLabel} included</span>
          </>
        )}
      </div>
      <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-ds-sidebar">
        <div
          className={`h-full transition-[width] ${overIncluded ? "bg-amber-500" : "bg-ds-primary"}`}
          style={{ width: loading ? "0%" : `${pct}%` }}
        />
      </div>
      <p className="ds-app-body-muted mt-auto pt-3 text-pretty break-words">{hint}</p>
    </article>
  );
}

export default function UsagePage() {
  const localeReady = useClientMounted();
  const { data: ctx, error, loading } = useMeContext();
  const { agents, agentsLoading, selectedAgentId } = useDashboardAgent();
  const [knowledgeUsage, setKnowledgeUsage] = useState<KnowledgeUsage | null>(null);
  const [knowledgeLoading, setKnowledgeLoading] = useState(false);

  const snap = ctx?.usage_snapshot;
  const includedConversations = snap?.included_conversations ?? ctx?.plan.included_conversations ?? 0;
  const usedConversations = snap?.conversations_used ?? 0;
  const beyondConversations = Math.max(0, usedConversations - includedConversations);
  const conversationsPct = includedConversations
    ? Math.min(100, (usedConversations / includedConversations) * 100)
    : 0;

  const maxAgents = ctx?.plan.max_agents ?? 0;
  const usedAgents = agents.length;
  const agentsPct = maxAgents ? Math.min(100, (usedAgents / maxAgents) * 100) : 0;

  const includedKnowledge = knowledgeUsage?.included_storage_bytes ?? ctx?.plan.limits?.max_total_knowledge_bytes ?? 0;
  const usedKnowledge = knowledgeUsage?.used_storage_bytes ?? 0;
  const knowledgePct = includedKnowledge ? Math.min(100, (usedKnowledge / includedKnowledge) * 100) : 0;
  const overKnowledge = includedKnowledge > 0 && usedKnowledge > includedKnowledge;

  useEffect(() => {
    if (!selectedAgentId) {
      queueMicrotask(() => {
        setKnowledgeUsage(null);
        setKnowledgeLoading(false);
      });
      return;
    }
    let cancelled = false;
    queueMicrotask(() => setKnowledgeLoading(true));
    void backendFetch<KnowledgeUsage>(`/api/v1/knowledge/website/usage?agent_id=${encodeURIComponent(selectedAgentId)}`)
      .then((data) => {
        if (!cancelled) setKnowledgeUsage(data);
      })
      .catch(() => {
        if (!cancelled) setKnowledgeUsage(null);
      })
      .finally(() => {
        if (!cancelled) setKnowledgeLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedAgentId]);

  const throttleTier = snap?.throttle_tier ?? null;

  const knowledgeHint = useMemo(() => {
    const parts: string[] = ["Indexed content for the selected agent."];
    if (!selectedAgentId) {
      parts.push("Select an agent in the header to load storage totals.");
      return parts.join(" ");
    }
    const summary: string[] = [];
    const qa = knowledgeUsage?.total_qa_pairs ?? 0;
    const snippets = knowledgeUsage?.total_snippets ?? 0;
    const files = knowledgeUsage?.total_files ?? 0;
    const links = knowledgeUsage?.total_links ?? 0;
    if (qa > 0) summary.push(`${qa} Q&A`);
    if (snippets > 0) summary.push(`${snippets} snippets`);
    if (files > 0) summary.push(`${files} files`);
    if (links > 0) summary.push(`${links} pages`);
    if (summary.length) parts.push(summary.join(" · "));
    return parts.join(" ");
  }, [knowledgeUsage, selectedAgentId]);

  const periodLabel =
    snap && localeReady
      ? `${formatLocaleDate(snap.period_start, localeReady, {
          month: "short",
          day: "numeric",
          year: "numeric",
        })} – ${formatLocaleDate(snap.period_end, localeReady, {
          month: "short",
          day: "numeric",
          year: "numeric",
        })}`
      : null;

  return (
    <div className="ds-app-shell">
      <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="ds-app-page-title">Usage</h1>
            <p className="ds-app-page-description ds-app-page-description--wide">
              Plan limits and consumption for your account this billing period.
            </p>
            {ctx?.plan.name ? (
              <p className="ds-app-body-muted mt-2 text-sm">
                <span className="text-ds-on-surface font-semibold">{ctx.plan.name}</span>
                {periodLabel ? <> · {periodLabel}</> : null}
              </p>
            ) : null}
          </div>
          <Link
            href="/account/plan"
            className={appButtonClassName("default", { className: "self-start md:self-auto" })}
          >
            Manage plan
          </Link>
        </div>

        {error ? <p className="text-sm text-rose-600">{error}</p> : null}

        <UsagePlanBanner />

        <section
          className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4"
          aria-busy={loading || agentsLoading || knowledgeLoading}
        >
          <UsageMetricCard
            label="Included conversations"
            hint="Premium models on paid plans within this allowance, then normal models. Free uses normal models only. Counts closed chats with visitor messages, replies, or tool use."
            usedLabel={formatLocaleNumber(usedConversations, localeReady)}
            includedLabel={formatLocaleNumber(includedConversations, localeReady)}
            loading={loading}
            pct={conversationsPct}
            overIncluded={beyondConversations > 0}
          />

          <UsageMetricCard
            label="AI agents"
            hint="Workspaces in this account."
            usedLabel={formatLocaleNumber(usedAgents, localeReady)}
            includedLabel={formatLocaleNumber(maxAgents, localeReady)}
            loading={loading || agentsLoading}
            pct={agentsPct}
            overIncluded={maxAgents > 0 && usedAgents > maxAgents}
          />


          {includedKnowledge > 0 ? (
            <UsageMetricCard
              label="Knowledge storage"
              hint={knowledgeHint}
              usedLabel={formatStorageBytes(usedKnowledge)}
              includedLabel={formatStorageBytes(includedKnowledge)}
              loading={loading || knowledgeLoading}
              pct={knowledgePct}
              overIncluded={overKnowledge}
            />
          ) : null}
        </section>

        {snap ? (
          <article className="border-ds-outline bg-ds-surface rounded-ds-xl border p-6 shadow-sm">
            <h2 className="ds-app-section-title">This billing period</h2>
            <p className="ds-app-body-muted mt-1">
              Throttle status and any usage above your included conversation allowance.
            </p>
            <dl className="mt-5 grid gap-4 sm:grid-cols-2">
              <div className="border-ds-outline rounded-ds-lg border bg-ds-sidebar/40 px-4 py-3">
                <dt className="text-ds-on-surface-variant text-sm">Throttle tier</dt>
                <dd className="text-ds-on-surface mt-1 text-lg font-semibold tabular-nums">
                  {loading ? "…" : throttleTier ? formatThrottleTier(throttleTier) : "Normal"}
                </dd>
              </div>
              <div className="border-ds-outline rounded-ds-lg border bg-ds-sidebar/40 px-4 py-3">
                <dt className="text-ds-on-surface-variant text-sm">Above included conversations</dt>
                <dd className="text-ds-on-surface mt-1 text-lg font-semibold tabular-nums">
                  {loading ? "…" : formatLocaleNumber(beyondConversations, localeReady)}
                </dd>
              </div>
            </dl>
            {throttleTier === "strong" ? (
              <p className="ds-app-body-muted mt-4 text-sm leading-relaxed">
                Heavy usage this period: chat stays on, but replies may take longer until your cycle resets or you
                upgrade.
              </p>
            ) : null}
          </article>
        ) : null}
      </div>
    </div>
  );
}
