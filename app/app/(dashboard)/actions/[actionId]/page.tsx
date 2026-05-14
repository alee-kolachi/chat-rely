"use client";

import Link from "next/link";
import { notFound, useParams } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import { ActionDetailTabs } from "@/components/actions/action-detail-tabs";
import type { ApiActionCatalogEntry } from "@/components/actions/action-catalog-types";
import { ActionToggle } from "@/components/actions/action-toggle";
import { IconAction, IconArrowLeft, IconWarning } from "@/components/actions/action-icons";
import { StatusBadge } from "@/components/actions/status-badge";
import { HumanEscalationSettings } from "@/components/actions/human-escalation-settings";
import { getShopifyAction } from "@/components/actions/shopify-actions-data";
import type { ShopifyActionStatus } from "@/components/actions/shopify-actions-data";
import { useActionCatalog } from "@/components/actions/use-action-catalog";
import { useDashboardAgent } from "@/components/layout/dashboard-agent-context";
import { BackendApiError, backendFetch } from "@/lib/backend-api";
import { actionSlugToKey } from "@/lib/action-keys";

function mapApiStatusForBadge(status: ApiActionCatalogEntry["status"]): ShopifyActionStatus {
  if (status === "live") return "live";
  if (status === "blocked_by_plan") return "disabled";
  return "coming-soon";
}

export default function ActionDetailPage() {
  const params = useParams();
  const actionId = typeof params?.actionId === "string" ? params.actionId : "";
  const shopifyAction = getShopifyAction(actionId);
  const { selectedAgentId } = useDashboardAgent();
  const { data: catalog, loading, error: catalogError, refresh } = useActionCatalog(selectedAgentId || undefined);
  const [banner, setBanner] = useState<string | null>(null);

  const actionKey = actionSlugToKey(actionId);
  const apiEntry = useMemo(
    () => catalog?.entries.find((e) => e.action_key === actionKey),
    [catalog, actionKey]
  );

  const badgeStatus = apiEntry
    ? mapApiStatusForBadge(apiEntry.status)
    : shopifyAction
      ? shopifyAction.status
      : "coming-soon";
  const enabled = apiEntry?.enabled ?? false;
  const isComingSoon = badgeStatus === "coming-soon";
  const needsShopifyConnection = Boolean(
    shopifyAction && apiEntry && apiEntry.status === "live" && !apiEntry.scopes_satisfied
  );
  const toggleDisabled =
    !apiEntry ||
    apiEntry.status !== "live" ||
    !apiEntry.scopes_satisfied ||
    loading ||
    !selectedAgentId;

  const needsCatalog = !shopifyAction;
  /** Catalog fetch returns null until success; avoids notFound() on first paint before the hook runs. */
  const awaitingCatalog = Boolean(needsCatalog && selectedAgentId && catalog === null && !catalogError);
  const missingAgent = Boolean(needsCatalog && !selectedAgentId);

  const handleToggle = useCallback(
    async (next: boolean) => {
      if (!selectedAgentId) return;
      try {
        await backendFetch(`/api/v1/agents/${selectedAgentId}/actions/${encodeURIComponent(actionKey)}`, {
          method: "PATCH",
          body: JSON.stringify({ enabled: next }),
        });
        await refresh();
      } catch (e) {
        const msg =
          e instanceof BackendApiError ? e.message : e instanceof Error ? e.message : "Could not update action";
        setBanner(msg);
      }
    },
    [selectedAgentId, actionKey, refresh]
  );

  if (needsCatalog && missingAgent) {
    return (
      <div className="ds-app-shell p-6 md:p-8">
        <div className="mx-auto max-w-4xl">
          <Link
            href="/actions"
            className="text-ds-primary hover:text-ds-secondary mb-6 inline-flex items-center gap-1 text-xs font-medium"
          >
            <IconArrowLeft className="size-3.5" aria-hidden />
            Actions & integrations
          </Link>
          <h1 className="ds-app-page-title">Select an agent</h1>
          <p className="text-ds-on-surface-variant mt-2 text-sm">
            Choose a chatbot in the header dropdown to load action settings.
          </p>
        </div>
      </div>
    );
  }

  if (needsCatalog && catalogError) {
    return (
      <div className="ds-app-shell p-6 md:p-8">
        <div className="mx-auto max-w-4xl">
          <Link href="/actions" className="text-ds-primary mb-4 inline-block text-sm font-semibold">
            ← Back to Actions & integrations
          </Link>
          <p className="text-rose-600 text-sm">{catalogError}</p>
        </div>
      </div>
    );
  }

  if (needsCatalog && awaitingCatalog) {
    return (
      <div className="ds-app-shell p-6 md:p-8">
        <div className="mx-auto max-w-4xl">
          <p className="text-ds-on-surface-variant text-sm">Loading action catalog…</p>
        </div>
      </div>
    );
  }

  if (!shopifyAction && !apiEntry) notFound();

  if (!shopifyAction && apiEntry) {
    return (
      <div className="ds-app-shell p-6 pb-36 md:p-8 md:pb-40">
        <div className="mx-auto w-full max-w-4xl">
          <nav className="text-ds-on-surface-variant mb-6 flex flex-wrap items-center gap-2 text-xs font-medium">
            <Link
              href="/actions"
              className="text-ds-primary hover:text-ds-secondary inline-flex max-w-full items-center gap-1 transition-colors"
            >
              <IconArrowLeft className="size-3.5 shrink-0" aria-hidden />
              <span className="min-w-0">Actions & integrations</span>
            </Link>
            <span className="text-ds-outline" aria-hidden>
              /
            </span>
            <span className="text-ds-on-surface truncate">{apiEntry.label}</span>
          </nav>

          {banner ? (
            <div className="border-ds-outline mb-4 rounded-ds-lg border bg-rose-50 px-4 py-3 text-sm text-rose-900">
              {banner}
            </div>
          ) : null}

          <header className="mb-8 flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="ds-app-page-title">{apiEntry.label}</h1>
                <StatusBadge status={badgeStatus} />
              </div>
              <p className="ds-app-page-description ds-app-page-description--wide mt-2 max-w-2xl">
                {apiEntry.description}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-3">
              <span className="ds-app-kicker font-semibold">Enable</span>
              <ActionToggle
                checked={enabled}
                onChange={(n) => void handleToggle(n)}
                disabled={toggleDisabled}
                size="md"
                label={`Enable ${apiEntry.label}`}
              />
            </div>
          </header>

          {isComingSoon && (
            <div className="mb-6 flex items-start gap-3 rounded-ds-md border border-amber-200 bg-amber-50 p-4">
              <IconWarning className="mt-0.5 size-4 shrink-0 text-amber-700" aria-hidden />
              <div className="text-sm text-amber-950">
                <p className="font-semibold">This integration isn&apos;t available yet.</p>
              </div>
            </div>
          )}

          {actionKey === "human.escalate" && selectedAgentId && apiEntry.status === "live" ? (
            <HumanEscalationSettings
              agentId={selectedAgentId}
              catalogEntry={apiEntry}
              onSaved={() => void refresh()}
            />
          ) : null}

          {actionKey === "human.escalate" && apiEntry.status !== "live" ? (
            <p className="text-ds-on-surface-variant text-sm">
              Enable this action above to configure availability and response time.
            </p>
          ) : null}
          {actionKey !== "human.escalate" ? (
            <p className="text-ds-on-surface-variant mt-4 text-sm">
              Detailed configuration will appear when this integration ships.
            </p>
          ) : null}
        </div>
      </div>
    );
  }

  if (!shopifyAction) notFound();

  const action = shopifyAction;

  return (
    <div className="ds-app-shell p-6 pb-36 md:p-8 md:pb-40">
      <div className="mx-auto w-full max-w-4xl">
        <nav className="text-ds-on-surface-variant mb-6 flex flex-wrap items-center gap-2 text-xs font-medium">
          <Link
            href="/actions"
            className="text-ds-primary hover:text-ds-secondary inline-flex max-w-full items-center gap-1 transition-colors"
          >
            <IconArrowLeft className="size-3.5 shrink-0" aria-hidden />
            <span className="min-w-0">Actions & integrations</span>
          </Link>
          <span className="text-ds-outline" aria-hidden>
            /
          </span>
          <span className="text-ds-on-surface truncate">{action.label}</span>
        </nav>

        {banner ? (
          <div className="border-ds-outline mb-4 rounded-ds-lg border bg-rose-50 px-4 py-3 text-sm text-rose-900">
            {banner}
          </div>
        ) : null}

        <header className="mb-8 flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
          <div className="flex items-start gap-4">
            <div className="border-ds-outline bg-ds-sidebar text-ds-on-surface flex size-12 shrink-0 items-center justify-center rounded-ds-md border shadow-sm">
              <IconAction iconKey={action.icon} className="size-6" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="ds-app-page-title">{action.label}</h1>
                <StatusBadge status={badgeStatus} />
              </div>
              <p className="ds-app-page-description ds-app-page-description--wide mt-2 max-w-2xl">
                {action.description}
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <span className="ds-app-kicker font-semibold">Enable</span>
            <ActionToggle
              checked={enabled}
              onChange={(n) => void handleToggle(n)}
              disabled={toggleDisabled}
              size="md"
              label={`Enable ${action.label}`}
            />
          </div>
        </header>

        {isComingSoon && (
          <div className="mb-6 flex items-start gap-3 rounded-ds-md border border-amber-200 bg-amber-50 p-4">
            <IconWarning className="mt-0.5 size-4 shrink-0 text-amber-700" aria-hidden />
            <div className="text-sm text-amber-950">
              <p className="font-semibold">This action isn&apos;t available yet.</p>
              <p className="mt-1 text-amber-900/90 leading-relaxed">
                Upgrade your plan if needed, or wait until this capability launches.
              </p>
            </div>
          </div>
        )}

        {needsShopifyConnection && !isComingSoon ? (
          <div className="border-ds-outline mb-6 flex items-start gap-3 rounded-ds-md border bg-sky-50 p-4">
            <IconWarning className="text-ds-primary mt-0.5 size-4 shrink-0" aria-hidden />
            <div className="text-sm text-slate-900">
              <p className="font-semibold">Connect Shopify to use this action</p>
              <p className="mt-1 leading-relaxed text-slate-700">
                This tool is available for your plan, but your agent needs a store connection that includes the
                required OAuth scopes before you can enable it or run a test.
              </p>
              <Link
                href="/actions#shopify-integration"
                className="text-ds-primary mt-3 inline-block text-sm font-semibold underline-offset-2 hover:underline"
              >
                Open Shopify connection
              </Link>
            </div>
          </div>
        ) : null}

        <ActionDetailTabs
          action={action}
          catalogEntry={apiEntry ?? null}
          selectedAgentId={selectedAgentId ?? null}
        />
      </div>

      <div className="border-ds-outline bg-ds-surface/95 fixed right-0 bottom-0 left-0 z-10 border-t backdrop-blur-sm pb-[max(0.75rem,env(safe-area-inset-bottom,0px))] pt-3 md:left-64">
        <div className="mx-auto flex w-full max-w-4xl items-center justify-between gap-3 px-6 md:px-8">
          <span className="text-ds-on-surface-variant text-xs">
            Toggle enables this action for chat immediately. Configuration below is optional.
          </span>
          <div className="flex shrink-0 items-center gap-2">
            <Link
              href="/actions"
              className="border-ds-outline text-ds-on-surface hover:bg-ds-sidebar rounded-ds-md border bg-white px-4 py-2 text-sm font-semibold transition-colors"
            >
              Back to actions
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
