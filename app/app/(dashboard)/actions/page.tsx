"use client";

import {
  Suspense,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
} from "react";
import { usePathname, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ActionCard } from "@/components/actions/action-card";
import { IconShopifyBag } from "@/components/actions/action-icons";
import type { ApiActionCatalogEntry } from "@/components/actions/action-catalog-types";
import {
  ActionsPageShellSkeleton,
  IntegrationSectionsSkeleton,
  ShopifyActionsGridSkeleton,
} from "@/components/actions/actions-page-skeleton";
import { ConnectionCard } from "@/components/actions/connection-card";
import { HumanSupportCard } from "@/components/actions/human-support-card";
import { IntegrationRoadmapCard } from "@/components/actions/integration-roadmap-card";
import { shopifyActions } from "@/components/actions/shopify-actions-data";
import { useAgentIntegrationsBootstrap, invalidateAgentIntegrationsBootstrapCache } from "@/components/integrations/use-agent-integrations-bootstrap";
import { useDashboardAgent } from "@/components/layout/dashboard-agent-context";
import { InfoHint } from "@/components/ui/info-hint";
import { UnsavedChangesActionBar } from "@/components/ui/unsaved-changes-action-bar";
import { useActionDrafts } from "@/hooks/use-action-drafts";
import { unsavedChangesMessage } from "@/lib/action-draft-utils";
import { BackendApiError, backendFetch } from "@/lib/backend-api";
import { shopifyActionSlugToKey } from "@/lib/shopify-action-keys";
import { SHOPIFY_ADMIN_STOREFRONT_HINT } from "@/lib/shopify-connection-copy";
import { partitionShopifyActionsForRuntime } from "@/lib/shopify-runtime-cap";
import { appButtonClassName } from "@/lib/button-styles";
import { cn } from "@/lib/utils";
import type { ShopifyActionStatus } from "@/components/actions/shopify-actions-data";

const FILTER_CHIPS = ["All", "Enabled", "Disabled", "Unavailable"] as const;
type FilterChip = (typeof FILTER_CHIPS)[number];

const SHOPIFY_ANCHOR = "shopify-integration";
const HUMAN_ANCHOR = "human-support";
const ROADMAP_ANCHOR = "integrations-roadmap";
const SHOPIFY_OAUTH_RETURN_TO = `/actions#${SHOPIFY_ANCHOR}`;

const ROADMAP_ACTION_KEYS = ["email.bridge", "zendesk.tickets", "calendly.booking"] as const;

const PANEL =
  "border-ds-outline scroll-mt-24 overflow-hidden rounded-ds-xl border bg-ds-surface shadow-sm md:scroll-mt-20";

function mapApiStatusForBadge(status: ApiActionCatalogEntry["status"]): ShopifyActionStatus {
  if (status === "live") return "live";
  if (status === "blocked_by_plan") return "disabled";
  return "coming-soon";
}

function scrollToHashAnchor(hash: string) {
  const id = hash.startsWith("#") ? hash.slice(1) : hash;
  if (!id) return;
  requestAnimationFrame(() => {
    document.getElementById(id)?.scrollIntoView({ block: "start" });
  });
}

function ActionsPageContent() {
  const pathname = usePathname();
  const { selectedAgentId, agentsLoading } = useDashboardAgent();
  const searchParams = useSearchParams();
  const {
    catalog,
    shopify,
    loading: integrationsLoading,
    error: integrationsError,
    refresh: refreshIntegrations,
    disconnect,
  } = useAgentIntegrationsBootstrap(selectedAgentId || undefined, { includeWebsitePreview: false });

  const [filter, setFilter] = useState<FilterChip>("All");
  const [chipIdx, setChipIdx] = useState(0);
  const [shopDraft, setShopDraft] = useState("");
  const [banner, setBanner] = useState<string | null>(null);
  const [connectBusy, setConnectBusy] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const catalogBusy = agentsLoading || integrationsLoading;
  const shopifyBusy = agentsLoading || integrationsLoading;
  const connectUiReady = Boolean(selectedAgentId) && !agentsLoading;
  const refreshDisabled = agentsLoading || (!selectedAgentId && !agentsLoading);
  const refreshAriaBusy = Boolean(selectedAgentId && integrationsLoading);

  useLayoutEffect(() => {
    if (pathname !== "/actions") return;
    if (typeof window === "undefined") return;
    const hash = window.location.hash;
    if (!hash) return;
    scrollToHashAnchor(hash);
  }, [pathname, searchParams]);

  useEffect(() => {
    const onHashChange = () => {
      if (pathname !== "/actions") return;
      scrollToHashAnchor(window.location.hash);
    };
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, [pathname]);

  useEffect(() => {
    const q = searchParams.get("shopify");
    if (q === "connected") {
      queueMicrotask(() => setBanner("Shopify connected successfully."));
      if (selectedAgentId) invalidateAgentIntegrationsBootstrapCache(selectedAgentId);
      void refreshIntegrations({ force: true });
    }
    if (q === "error") {
      const msg = searchParams.get("message") ?? "Authorization failed.";
      queueMicrotask(() => setBanner(msg));
    }
  }, [searchParams, refreshIntegrations, selectedAgentId]);

  const merged = useMemo(() => {
    const entries = catalog?.entries ?? [];
    const byKey = new Map(entries.map((e) => [e.action_key, e]));
    return shopifyActions.map((sa) => {
      const key = shopifyActionSlugToKey(sa.id);
      const api = byKey.get(key);
      return { static: sa, api };
    });
  }, [catalog]);

  const filtered = useMemo(() => {
    return merged.filter(({ api }) => {
      const status = api?.status ?? "coming_soon";
      const enabled = api?.enabled ?? false;
      if (filter === "All") return true;
      if (filter === "Enabled") return enabled && status === "live";
      if (filter === "Disabled") return !enabled && status === "live";
      if (filter === "Unavailable") return status !== "live";
      return true;
    });
  }, [merged, filter]);

  const handleChipClick = (chip: FilterChip, idx: number) => {
    setFilter(chip);
    setChipIdx(idx);
  };

  const {
    resolveEnabled,
    setEnabledDraft,
    isDirty: actionsDirty,
    changeCount,
    cancelAll,
    saveAll,
  } = useActionDrafts(selectedAgentId || undefined, catalog?.entries);

  const handleToggle = useCallback(
    (actionKey: string, next: boolean) => {
      setEnabledDraft(actionKey, next);
    },
    [setEnabledDraft]
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

  const startOAuth = useCallback(async () => {
    setBanner(null);
    if (!selectedAgentId) {
      setBanner("Select an agent in the header before connecting Shopify.");
      return;
    }
    if (!shopDraft.trim()) {
      setBanner("Enter your store name (the part before .myshopify.com).");
      return;
    }
    setConnectBusy(true);
    try {
      const returnTo = encodeURIComponent(SHOPIFY_OAUTH_RETURN_TO);
      const res = await backendFetch<{ authorization_url: string }>(
        `/api/v1/integrations/shopify/oauth/start?agent_id=${encodeURIComponent(selectedAgentId)}&shop=${encodeURIComponent(
          shopDraft.trim()
        )}&return_to=${returnTo}`
      );
      window.location.href = res.authorization_url;
    } catch (e) {
      const msg =
        e instanceof BackendApiError ? e.message : e instanceof Error ? e.message : "Could not start OAuth";
      setBanner(msg);
      setConnectBusy(false);
    }
  }, [selectedAgentId, shopDraft]);

  const reconnect = useCallback(async () => {
    await startOAuth();
  }, [startOAuth]);

  useEffect(() => {
    if (shopify?.connected && shopify.shop_domain) {
      const sub = shopify.shop_domain.replace(/\.myshopify\.com$/i, "");
      queueMicrotask(() => setShopDraft((prev) => (prev.trim() ? prev : sub)));
    }
  }, [shopify?.connected, shopify?.shop_domain]);

  const handleDisconnect = useCallback(async () => {
    setConnectBusy(true);
    setBanner(null);
    try {
      await disconnect();
    } catch (e) {
      const msg =
        e instanceof BackendApiError ? e.message : e instanceof Error ? e.message : "Disconnect failed";
      setBanner(msg);
    } finally {
      setConnectBusy(false);
    }
  }, [disconnect]);

  const human = catalog?.entries.find((e) => e.action_key === "human.escalate");
  const stubs = (catalog?.entries ?? []).filter((e) =>
    ROADMAP_ACTION_KEYS.includes(e.action_key as (typeof ROADMAP_ACTION_KEYS)[number])
  );
  const showIntegrationSkeleton = Boolean(selectedAgentId && integrationsLoading);
  const showShopifyGridSkeleton = Boolean(selectedAgentId && integrationsLoading);
  const showShopifyConnectPrompt =
    Boolean(selectedAgentId) && !integrationsLoading && !shopify?.connected;
  const showFilteredEmpty =
    !showShopifyGridSkeleton && !showShopifyConnectPrompt && filtered.length === 0 && merged.length > 0;

  const humanBadgeStatus = human ? mapApiStatusForBadge(human.status) : "coming-soon";
  const humanEnabled = resolveEnabled("human.escalate", human?.enabled ?? false);
  const humanToggleDisabled = !human || human.status !== "live" || catalogBusy || !selectedAgentId;

  const liveMerged = useMemo(
    () => merged.filter(({ api }) => (api?.status ?? "coming_soon") === "live"),
    [merged]
  );

  const enabledLiveKeys = useMemo(() => {
    return liveMerged
      .filter(({ static: action, api }) => {
        const actionKey = shopifyActionSlugToKey(action.id);
        return resolveEnabled(actionKey, api?.enabled ?? false);
      })
      .map(({ static: action }) => shopifyActionSlugToKey(action.id));
  }, [liveMerged, resolveEnabled]);

  const planActionCap = catalog?.max_enabled_shopify_actions ?? 0;
  const { inactiveKeys: runtimeInactiveKeys } = useMemo(
    () => partitionShopifyActionsForRuntime(enabledLiveKeys, planActionCap),
    [enabledLiveKeys, planActionCap]
  );

  const enabledCount = enabledLiveKeys.length;
  const liveToolCount = liveMerged.length;
  const exceedsRuntimeCap = planActionCap > 0 && enabledCount > planActionCap;

  return (
    <div className="ds-app-shell">
      <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-6">
        <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="ds-app-page-title">Actions & integrations</h1>
            <p className="ds-app-page-description ds-app-page-description--wide">
              Connect apps, then turn individual tools on or off for this agent.
            </p>
          </div>
          <button
            type="button"
            className={appButtonClassName("default", { className: "self-start md:self-auto" })}
            onClick={() => {
              void refreshIntegrations();
            }}
            disabled={refreshDisabled}
            aria-busy={refreshAriaBusy}
            aria-label="Reload integrations and catalog status"
          >
            Reload status
          </button>
        </header>

        {banner ? (
          <div className="border-ds-outline bg-ds-surface flex items-start justify-between gap-3 rounded-ds-lg border px-4 py-3 text-sm text-ds-on-surface shadow-sm">
            <span className="min-w-0 flex-1">{banner}</span>
            <button
              type="button"
              className="ds-app-body-muted hover:text-ds-on-surface shrink-0 rounded-ds-md px-2 py-0.5 font-semibold"
              aria-label="Dismiss message"
              onClick={() => setBanner(null)}
            >
              Dismiss
            </button>
          </div>
        ) : null}

        {integrationsError ? (
          <div role="alert" className="text-sm text-rose-600">
            <p>{integrationsError}</p>
          </div>
        ) : null}

        {!selectedAgentId && !agentsLoading ? (
          <p className="text-ds-on-surface-variant text-sm">Select an agent in the header to manage actions.</p>
        ) : null}

        <section id={SHOPIFY_ANCHOR} className={PANEL}>
          <div className="border-ds-outline flex items-center gap-3 border-b px-5 py-4 md:px-6">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-ds-md bg-[#95BF47]/15 text-[#5E8E3E]">
              <IconShopifyBag className="size-5" />
            </div>
            <div className="min-w-0">
              <h2 className="ds-app-section-title inline-flex items-center">
                Shopify
                <InfoHint text={SHOPIFY_ADMIN_STOREFRONT_HINT} labelFor="Shopify connection" />
              </h2>
              <p className="text-ds-on-surface-variant text-sm">Products, orders, and inventory from your store.</p>
            </div>
          </div>

          <div className="px-5 py-4 md:px-6">
            <ConnectionCard
              embedded
              connected={Boolean(shopify?.connected)}
              shopDomain={shopify?.shop_domain}
              scopes={shopify?.scopes ?? []}
              lastSyncedAt={shopify?.last_synced_at}
              busy={connectBusy || shopifyBusy}
              connectEnabled={connectUiReady}
              shopDraft={shopDraft}
              onShopDraftChange={setShopDraft}
              onConnect={startOAuth}
              onReconnect={reconnect}
              onDisconnect={handleDisconnect}
            />
          </div>

          <div className="border-ds-outline border-t px-5 py-3 md:px-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-ds-on-surface-variant text-sm">
                <p>
                  <span className="text-ds-on-surface font-semibold">{enabledCount}</span> of {liveToolCount} live
                  tools enabled
                  {planActionCap > 0 ? (
                    <>
                      {" "}
                      · plan limit{" "}
                      <span className="text-ds-on-surface font-semibold">{planActionCap}</span> active at a time
                    </>
                  ) : null}
                </p>
                {exceedsRuntimeCap ? (
                  <p className="mt-1 text-xs font-medium text-amber-800">
                    {runtimeInactiveKeys.size} enabled{" "}
                    {runtimeInactiveKeys.size === 1 ? "action is" : "actions are"} inactive on your plan. The agent
                    uses the highest-priority tools up to your limit.
                  </p>
                ) : null}
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                {FILTER_CHIPS.map((chip, idx) => (
                  <button
                    key={chip}
                    type="button"
                    onClick={() => handleChipClick(chip, idx)}
                    className={cn(
                      "rounded-full border px-2.5 py-1 text-xs font-semibold transition-colors",
                      idx === chipIdx
                        ? "border-ds-primary/45 text-ds-primary bg-ds-sidebar"
                        : "text-ds-on-surface-variant hover:text-ds-on-surface border-transparent hover:bg-ds-outline/35"
                    )}
                  >
                    {chip}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="border-ds-outline border-t bg-ds-sidebar/20 px-5 py-4 md:px-6">
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
              {showShopifyGridSkeleton ? (
                <ShopifyActionsGridSkeleton count={shopifyActions.length} />
              ) : showShopifyConnectPrompt ? (
                <div className="border-ds-outline bg-ds-sidebar/30 col-span-full rounded-ds-lg border border-dashed px-4 py-6 text-center text-sm">
                  <p className="text-ds-on-surface-variant">
                    This agent has no Shopify store linked. Connect a store above to turn on product, order, and
                    inventory tools.
                  </p>
                  <p className="text-ds-on-surface-variant mt-2">
                    After linking, open{" "}
                    <Link href="/deploy" className="text-ds-primary font-semibold underline-offset-2 hover:underline">
                      Deploy
                    </Link>{" "}
                    to add the chat widget.
                  </p>
                </div>
              ) : showFilteredEmpty ? (
                <p className="text-ds-on-surface-variant border-ds-outline bg-ds-sidebar/30 col-span-full rounded-ds-lg border border-dashed px-4 py-6 text-center text-sm">
                  No actions match this filter.{" "}
                  <button
                    type="button"
                    className="text-ds-primary font-semibold underline-offset-2 hover:underline"
                    onClick={() => {
                      setFilter("All");
                      setChipIdx(0);
                    }}
                  >
                    Show all
                  </button>
                </p>
              ) : (
                filtered.map(({ static: action, api }) => {
                  const badgeStatus = api ? mapApiStatusForBadge(api.status) : action.status;
                  const key = shopifyActionSlugToKey(action.id);
                  const enabled = resolveEnabled(key, api?.enabled ?? false);
                  const toggleDisabled =
                    !api ||
                    api.status !== "live" ||
                    !api.scopes_satisfied ||
                    catalogBusy ||
                    !selectedAgentId;
                  const runtimeInactive = enabled && runtimeInactiveKeys.has(key);
                  return (
                    <ActionCard
                      key={action.id}
                      action={action}
                      badgeStatus={badgeStatus}
                      enabled={enabled}
                      toggleDisabled={toggleDisabled}
                      togglePending={false}
                      runtimeInactive={runtimeInactive}
                      onToggle={(next) => void handleToggle(key, next)}
                    />
                  );
                })
              )}
            </div>
          </div>
        </section>

        {showIntegrationSkeleton ? (
          <IntegrationSectionsSkeleton />
        ) : (
          <>
            {human ? (
              <section id={HUMAN_ANCHOR} className={PANEL}>
                <div className="border-ds-outline border-b px-5 py-4 md:px-6">
                  <h2 className="ds-app-section-title">Human handoff</h2>
                  <p className="text-ds-on-surface-variant mt-0.5 text-sm">
                    Let the agent escalate to your team when it cannot resolve a chat.
                  </p>
                </div>
                <div className="px-5 py-4 md:px-6">
                  <HumanSupportCard
                    entry={human}
                    badgeStatus={humanBadgeStatus}
                    enabled={humanEnabled}
                    toggleDisabled={humanToggleDisabled}
                    togglePending={false}
                    onToggle={(next) => void handleToggle("human.escalate", next)}
                  />
                </div>
              </section>
            ) : null}

            {stubs.length > 0 ? (
              <section id={ROADMAP_ANCHOR} className={PANEL}>
                <div className="border-ds-outline border-b px-5 py-4 md:px-6">
                  <h2 className="ds-app-section-title">Coming soon</h2>
                </div>
                <div className="grid grid-cols-1 gap-2 px-5 py-4 sm:grid-cols-2 md:px-6 lg:grid-cols-3">
                  {stubs.map((entry) => (
                    <IntegrationRoadmapCard key={entry.action_key} entry={entry} />
                  ))}
                </div>
              </section>
            ) : null}
          </>
        )}
      </div>

      <UnsavedChangesActionBar
        open={actionsDirty}
        isSaving={isSaving}
        saveDisabled={!selectedAgentId}
        onSave={handleSave}
        onCancel={handleCancel}
        message={unsavedChangesMessage(changeCount)}
      />
    </div>
  );
}

export default function ActionsPage() {
  return (
    <Suspense fallback={<ActionsPageShellSkeleton />}>
      <ActionsPageContent />
    </Suspense>
  );
}
