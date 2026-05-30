"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useDashboardAgent } from "@/components/layout/dashboard-agent-context";
import { useMeContext } from "@/components/layout/me-context-provider";
import { backendFetch } from "@/lib/backend-api";
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

function UsageMetric({
  label,
  hint,
  used,
  included,
  loading,
  localeReady,
  pct,
  overIncluded,
}: {
  label: string;
  hint?: string;
  used: number;
  included: number;
  loading: boolean;
  localeReady: boolean;
  pct: number;
  overIncluded: boolean;
}) {
  return (
    <div className="border-ds-outline/70 border-b py-6 last:border-b-0">
      <h2 className="ds-app-section-title">{label}</h2>
      {hint ? <p className="ds-app-body-muted mt-1 max-w-2xl">{hint}</p> : null}
      <div className="mt-4">
        <div className="text-ds-on-surface flex flex-wrap items-baseline justify-between gap-2 text-2xl font-semibold tabular-nums">
          {loading ? (
            <>
              <span className="bg-ds-sidebar inline-block h-8 w-20 animate-pulse rounded-md" />
              <span className="bg-ds-sidebar inline-block h-6 w-36 animate-pulse rounded-md" />
            </>
          ) : (
            <>
              <span>{formatLocaleNumber(used, localeReady)}</span>
              <span className="text-ds-on-surface-variant text-base font-normal">
                / {formatLocaleNumber(included, localeReady)} included
              </span>
            </>
          )}
        </div>
        <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-ds-sidebar">
          <div
            className={`h-full transition-[width] ${overIncluded ? "bg-amber-500" : "bg-ds-primary"}`}
            style={{ width: loading ? "0%" : `${pct}%` }}
          />
        </div>
      </div>
    </div>
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

  const includedPremium = snap?.included_premium_turns ?? 0;
  const usedPremium = snap?.premium_turns_used ?? 0;
  const premiumPct = includedPremium ? Math.min(100, (usedPremium / includedPremium) * 100) : 0;

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

  const knowledgeSummary = useMemo(() => {
    if (!knowledgeUsage) return null;
    const parts: string[] = [];
    const qa = knowledgeUsage.total_qa_pairs ?? 0;
    const snippets = knowledgeUsage.total_snippets ?? 0;
    const files = knowledgeUsage.total_files ?? 0;
    const links = knowledgeUsage.total_links ?? 0;
    if (qa > 0) parts.push(`${qa} Q&A`);
    if (snippets > 0) parts.push(`${snippets} snippets`);
    if (files > 0) parts.push(`${files} files`);
    if (links > 0) parts.push(`${links} pages`);
    return parts.length ? parts.join(" · ") : null;
  }, [knowledgeUsage]);

  return (
    <div className="ds-app-shell px-6 pt-6 pb-16 md:px-8 md:pt-8 md:pb-20">
      <div className="mx-auto w-full max-w-3xl">
        <div className="mb-8">
          <h1 className="ds-app-page-title">Usage</h1>
          <p className="ds-app-body-muted mt-1">
            Current period for <strong className="text-ds-on-surface font-semibold">{ctx?.plan.name ?? "your plan"}</strong>
            {snap ? (
              <>
                {" "}
                ·{" "}
                {formatLocaleDate(snap.period_start, localeReady, {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}{" "}
                –{" "}
                {formatLocaleDate(snap.period_end, localeReady, {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </>
            ) : null}
          </p>
        </div>

        {error ? <p className="mb-6 text-sm text-rose-600">{error}</p> : null}

        <section>
          <UsageMetric
            label="Conversations"
            hint="Closed chats with visitor messages, assistant replies, or tool activity."
            used={usedConversations}
            included={includedConversations}
            loading={loading}
            localeReady={localeReady}
            pct={conversationsPct}
            overIncluded={beyondConversations > 0}
          />

          <UsageMetric
            label="AI agents"
            hint="Workspaces in this account."
            used={usedAgents}
            included={maxAgents}
            loading={loading || agentsLoading}
            localeReady={localeReady}
            pct={agentsPct}
            overIncluded={maxAgents > 0 && usedAgents > maxAgents}
          />

          {includedPremium > 0 ? (
            <UsageMetric
              label="Smart resolution turns"
              hint="Advanced resolution uses this allowance each billing cycle."
              used={usedPremium}
              included={includedPremium}
              loading={loading}
              localeReady={localeReady}
              pct={premiumPct}
              overIncluded={usedPremium > includedPremium}
            />
          ) : null}

          {includedKnowledge > 0 ? (
            <div className="border-ds-outline/70 border-b py-6 last:border-b-0">
              <h2 className="ds-app-section-title">Knowledge storage</h2>
              <p className="ds-app-body-muted mt-1">
                Indexed content for the selected agent
                {selectedAgentId ? "" : ". Select an agent in the header to load storage totals."}
                {knowledgeSummary ? <> · {knowledgeSummary}</> : null}
              </p>
              <div className="mt-4">
                <div className="text-ds-on-surface flex flex-wrap items-baseline justify-between gap-2 text-2xl font-semibold tabular-nums">
                  {loading || knowledgeLoading ? (
                    <>
                      <span className="bg-ds-sidebar inline-block h-8 w-24 animate-pulse rounded-md" />
                      <span className="bg-ds-sidebar inline-block h-6 w-32 animate-pulse rounded-md" />
                    </>
                  ) : (
                    <>
                      <span>{formatStorageBytes(usedKnowledge)}</span>
                      <span className="text-ds-on-surface-variant text-base font-normal">
                        / {formatStorageBytes(includedKnowledge)} included
                      </span>
                    </>
                  )}
                </div>
                <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-ds-sidebar">
                  <div
                    className={`h-full transition-[width] ${overKnowledge ? "bg-amber-500" : "bg-ds-primary"}`}
                    style={{ width: loading || knowledgeLoading ? "0%" : `${knowledgePct}%` }}
                  />
                </div>
              </div>
            </div>
          ) : null}
        </section>

        {snap ? (
          <dl className="mt-6 grid gap-3 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-ds-on-surface-variant">Throttle tier</dt>
              <dd className="font-medium tabular-nums">
                {loading ? "…" : throttleTier ? formatThrottleTier(throttleTier) : "-"}
              </dd>
            </div>
            {beyondConversations > 0 ? (
              <div className="flex justify-between gap-4">
                <dt className="text-ds-on-surface-variant">Above included conversations</dt>
                <dd className="font-medium tabular-nums">{formatLocaleNumber(beyondConversations, localeReady)}</dd>
              </div>
            ) : null}
          </dl>
        ) : null}

        {throttleTier === "strong" ? (
          <p className="ds-app-body-muted mt-4 text-sm leading-relaxed">
            Heavy usage this period: chat stays on, but replies may take longer until your cycle resets or you upgrade.
          </p>
        ) : null}

        <p className="ds-app-body-muted mt-8 text-sm">
          Plan limits and upgrades are on{" "}
          <Link href="/account/plan" className="text-ds-primary font-semibold hover:underline">
            Plan
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
