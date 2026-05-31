"use client";

import Link from "next/link";
import { notFound, useParams } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import { ActionDetailTabs } from "@/components/actions/action-detail-tabs";
import type { ApiActionCatalogEntry } from "@/components/actions/action-catalog-types";
import { ActionToggle } from "@/components/actions/action-toggle";
import { IconAction, IconArrowLeft, IconWarning } from "@/components/actions/action-icons";
import { StatusBadge } from "@/components/actions/status-badge";
import {
  HumanEscalationSettings,
  humanEscalationConfigToPayload,
  parseHumanEscalationConfig,
} from "@/components/actions/human-escalation-settings";
import { getShopifyAction } from "@/components/actions/shopify-actions-data";
import type { ShopifyActionStatus } from "@/components/actions/shopify-actions-data";
import { useActionCatalog } from "@/components/actions/use-action-catalog";
import { useDashboardAgent } from "@/components/layout/dashboard-agent-context";
import { UnsavedChangesActionBar } from "@/components/ui/unsaved-changes-action-bar";
import { useActionDrafts } from "@/hooks/use-action-drafts";
import { unsavedChangesMessage } from "@/lib/action-draft-utils";
import { actionSlugToKey } from "@/lib/action-keys";
import { appButtonClassName } from "@/lib/button-styles";

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
  const [isSaving, setIsSaving] = useState(false);

  const actionKey = actionSlugToKey(actionId);
  const apiEntry = useMemo(
    () => catalog?.entries.find((e) => e.action_key === actionKey),
    [catalog, actionKey]
  );

  const {
    resolveEnabled,
    setEnabledDraft,
    getConfigDraft,
    setConfigDraft,
    isDirty,
    changeCount,
    cancelAll,
    saveAll,
  } = useActionDrafts(selectedAgentId || undefined, catalog?.entries);

  const badgeStatus = apiEntry
    ? mapApiStatusForBadge(apiEntry.status)
    : shopifyAction
      ? shopifyAction.status
      : "coming-soon";

  const enabled = resolveEnabled(actionKey, apiEntry?.enabled ?? false);
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
  const awaitingCatalog = Boolean(needsCatalog && selectedAgentId && catalog === null && !catalogError);
  const missingAgent = Boolean(needsCatalog && !selectedAgentId);

  const handleToggle = useCallback(
    (next: boolean) => {
      setEnabledDraft(actionKey, next);
    },
    [setEnabledDraft, actionKey]
  );

  const escalationConfigRaw = getConfigDraft("human.escalate");
  const escalationConfig = useMemo(
    () => parseHumanEscalationConfig(escalationConfigRaw),
    [escalationConfigRaw]
  );

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    setBanner(null);
    await saveAll((msg) => setBanner(msg));
    setIsSaving(false);
  }, [saveAll]);

  const handleCancel = useCallback(() => {
    cancelAll();
    setBanner(null);
  }, [cancelAll]);

  const saveBar = (
    <UnsavedChangesActionBar
      open={isDirty}
      isSaving={isSaving}
      saveDisabled={!selectedAgentId}
      onSave={handleSave}
      onCancel={handleCancel}
      message={unsavedChangesMessage(changeCount)}
    />
  );

  if (needsCatalog && missingAgent) {
    return (
      <div className="ds-app-shell">
        <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-6">
          <Link
            href="/actions"
            className="text-ds-primary hover:text-ds-secondary inline-flex items-center gap-1 text-sm font-medium"
          >
            <IconArrowLeft className="size-3.5" aria-hidden />
            Actions & integrations
          </Link>
          <div>
            <h1 className="ds-app-page-title">Select an agent</h1>
            <p className="ds-app-page-description ds-app-page-description--wide">
              Choose a chatbot in the header dropdown to load action settings.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (needsCatalog && catalogError) {
    return (
      <div className="ds-app-shell">
        <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-6">
          <Link href="/actions" className="text-ds-primary inline-block text-sm font-semibold">
            ← Back to Actions & integrations
          </Link>
          <p className="text-rose-600 text-sm">{catalogError}</p>
        </div>
      </div>
    );
  }

  if (needsCatalog && awaitingCatalog) {
    return (
      <div className="ds-app-shell">
        <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-6">
          <p className="text-ds-on-surface-variant text-sm">Loading action catalog…</p>
        </div>
      </div>
    );
  }

  if (!shopifyAction && !apiEntry) notFound();

  if (!shopifyAction && apiEntry) {
    return (
      <>
        <div className="ds-app-shell ds-app-shell--save-bar">
          <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-6">
            <nav className="ds-app-body-muted flex flex-wrap items-center gap-2 font-medium">
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
              <div className="border-ds-outline rounded-ds-lg border bg-rose-50 px-4 py-3 text-sm text-rose-900">
                {banner}
              </div>
            ) : null}

            <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-3">
                  <h1 className="ds-app-page-title">{apiEntry.label}</h1>
                  <StatusBadge status={badgeStatus} />
                </div>
                <p className="ds-app-page-description ds-app-page-description--wide">
                  {apiEntry.description}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <span className="ds-app-kicker font-semibold">Enable</span>
                <ActionToggle
                  checked={enabled}
                  onChange={handleToggle}
                  disabled={toggleDisabled}
                  pending={false}
                  size="md"
                  label={`Enable ${apiEntry.label}`}
                />
              </div>
            </header>

            {isComingSoon && (
              <div className="flex items-start gap-3 rounded-ds-md border border-amber-200 bg-amber-50 p-4">
                <IconWarning className="mt-0.5 size-4 shrink-0 text-amber-700" aria-hidden />
                <div className="text-sm text-amber-950">
                  <p className="font-semibold">This integration isn&apos;t available yet.</p>
                </div>
              </div>
            )}

            {actionKey === "human.escalate" && apiEntry.status === "live" ? (
              <HumanEscalationSettings
                value={escalationConfig}
                onChange={(next) =>
                  setConfigDraft("human.escalate", humanEscalationConfigToPayload(next))
                }
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
        {saveBar}
      </>
    );
  }

  if (!shopifyAction) notFound();

  const action = shopifyAction;
  const displayLabel = apiEntry?.label ?? action.label;
  const displayDescription = apiEntry?.description ?? action.description;

  return (
    <>
      <div className="ds-app-shell ds-app-shell--save-bar">
        <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-6">
          <nav className="ds-app-body-muted flex flex-wrap items-center gap-2 font-medium">
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
            <span className="text-ds-on-surface truncate">{displayLabel}</span>
          </nav>

          {banner ? (
            <div className="border-ds-outline rounded-ds-lg border bg-rose-50 px-4 py-3 text-sm text-rose-900">
              {banner}
            </div>
          ) : null}

          <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div className="flex items-start gap-4">
              <div className="border-ds-outline bg-ds-sidebar text-ds-on-surface flex size-12 shrink-0 items-center justify-center rounded-ds-md border shadow-sm">
                <IconAction iconKey={action.icon} className="size-6" />
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-3">
                  <h1 className="ds-app-page-title">{displayLabel}</h1>
                  <StatusBadge status={badgeStatus} />
                </div>
                <p className="ds-app-page-description ds-app-page-description--wide">
                  {displayDescription}
                </p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-3">
              <span className="ds-app-kicker font-semibold">Enable</span>
              <ActionToggle
                checked={enabled}
                onChange={handleToggle}
                disabled={toggleDisabled}
                pending={false}
                size="md"
                label={`Enable ${displayLabel}`}
              />
            </div>
          </header>

          {isComingSoon && (
            <div className="flex items-start gap-3 rounded-ds-md border border-amber-200 bg-amber-50 p-4">
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
            <div className="border-ds-outline flex items-start gap-3 rounded-ds-md border bg-sky-50 p-4">
              <IconWarning className="text-ds-primary mt-0.5 size-4 shrink-0" aria-hidden />
              <div className="text-sm text-slate-900">
                <p className="font-semibold">Connect Shopify to use this action</p>
                <p className="mt-1 leading-relaxed text-slate-700">
                  This tool is available for your plan, but your agent needs a store connection that includes the
                  required store access from Shopify sign-in before you can enable it or run a test.
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
          <div className="mx-auto flex w-full max-w-[1200px] items-center justify-end gap-3 px-6 md:px-8">
            <Link href="/actions" className={appButtonClassName()}>
              Back to actions
            </Link>
          </div>
        </div>
      </div>
      {saveBar}
    </>
  );
}
