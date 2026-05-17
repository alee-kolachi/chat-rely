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
import { useAgentIntegrationsBootstrap } from "@/components/integrations/use-agent-integrations-bootstrap";
import { useDashboardAgent } from "@/components/layout/dashboard-agent-context";
import { useGuardedSubmit } from "@/hooks/use-guarded-submit";
import { BackendApiError, backendFetch } from "@/lib/backend-api";
import { shopifyActionSlugToKey } from "@/lib/shopify-action-keys";
import { cn } from "@/lib/utils";
import type { ShopifyActionStatus } from "@/components/actions/shopify-actions-data";

const FILTER_CHIPS = ["All", "Enabled", "Disabled", "Unavailable"] as const;
type FilterChip = (typeof FILTER_CHIPS)[number];

const SHOPIFY_ANCHOR = "shopify-integration";
const HUMAN_ANCHOR = "human-support";
const ROADMAP_ANCHOR = "integrations-roadmap";
const SHOPIFY_OAUTH_RETURN_TO = `/actions#${SHOPIFY_ANCHOR}`;

const ROADMAP_ACTION_KEYS = ["email.bridge", "zendesk.tickets", "calendly.booking"] as const;

const SECTION_PANEL =
  "border-ds-outline scroll-mt-24 space-y-6 rounded-ds-xl border bg-white p-5 shadow-sm md:scroll-mt-20 md:p-6";

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
      void refreshIntegrations();
    }
    if (q === "error") {
      const msg = searchParams.get("message") ?? "Authorization failed.";
      queueMicrotask(() => setBanner(msg));
    }
  }, [searchParams, refreshIntegrations]);

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

  const { submit: submitToggle, pending: togglePending } = useGuardedSubmit(
    async (actionKey: string, next: boolean) => {
      if (!selectedAgentId) return;
      try {
        await backendFetch(`/api/v1/agents/${selectedAgentId}/actions/${encodeURIComponent(actionKey)}`, {
          method: "PATCH",
          body: JSON.stringify({ enabled: next }),
        });
        await refreshIntegrations();
      } catch (e) {
        const msg =
          e instanceof BackendApiError ? e.message : e instanceof Error ? e.message : "Could not update action";
        setBanner(msg);
      }
    }
  );

  const handleToggle = useCallback(
    (actionKey: string, next: boolean) => {
      void submitToggle(actionKey, next);
    },
    [submitToggle]
  );

  const startOAuth = useCallback(async () => {
    setBanner(null);
    if (!selectedAgentId) {
      setBanner("Select an agent in the header before connecting Shopify.");
      return;
    }
    if (!shopDraft.trim()) {
      setBanner(
        "Enter your Shopify store subdomain (for example your-store for your-store.myshopify.com)."
      );
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

  const totalCount = merged.length;

  const human = catalog?.entries.find((e) => e.action_key === "human.escalate");
  const stubs = (catalog?.entries ?? []).filter((e) =>
    ROADMAP_ACTION_KEYS.includes(e.action_key as (typeof ROADMAP_ACTION_KEYS)[number])
  );
  const showIntegrationSkeleton = Boolean(selectedAgentId && integrationsLoading);
  const showShopifyGridSkeleton = Boolean(selectedAgentId && integrationsLoading);
  const showFilteredEmpty = !showShopifyGridSkeleton && filtered.length === 0 && merged.length > 0;

  const humanBadgeStatus = human ? mapApiStatusForBadge(human.status) : "coming-soon";
  const humanEnabled = human?.enabled ?? false;
  const humanToggleDisabled =
    !human || human.status !== "live" || catalogBusy || !selectedAgentId;

  return (
    <div className="ds-app-shell p-6 md:p-8">
      <div className="w-full space-y-8">
        <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="ds-app-page-title">Actions & integrations</h1>
            <p className="ds-app-page-description ds-app-page-description--wide">
              Connect external apps, then choose which tools your agent can use in chat.
            </p>
          </div>
          <button
            type="button"
            className="border-ds-outline text-ds-on-surface hover:bg-ds-sidebar self-start rounded-ds-md border bg-white px-4 py-2.5 text-sm font-semibold shadow-sm transition-colors md:self-auto disabled:pointer-events-none disabled:opacity-45"
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
          <div className="border-ds-outline flex items-start justify-between gap-3 rounded-ds-lg border bg-white px-4 py-3 text-sm text-slate-800 shadow-sm">
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

        <div className="space-y-8">
          <section id={SHOPIFY_ANCHOR} className={SECTION_PANEL}>
            <div className="flex flex-wrap items-start gap-3 border-b border-ds-outline/70 pb-5">
              <div className="flex size-11 shrink-0 items-center justify-center rounded-ds-md bg-[#95BF47]/15 text-[#5E8E3E]">
                <IconShopifyBag className="size-6" />
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="ds-app-section-title text-lg md:text-xl">Shopify</h2>
                <p className="text-ds-on-surface-variant mt-1 text-sm leading-relaxed">
                  Link your storefront, then turn on catalog and order tools for your agent.
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="ds-app-card-title">Store connection</h3>
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

            <div className="space-y-4 border-t border-ds-outline/70 pt-6">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <h3 className="ds-app-card-title">Agent actions</h3>
                  <p className="ds-app-body-muted mt-0.5">
                    {totalCount} tools available · enable what your plan supports
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {FILTER_CHIPS.map((chip, idx) => (
                    <button
                      key={chip}
                      type="button"
                      onClick={() => handleChipClick(chip, idx)}
                      className={cn(
                        "rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
                        idx === chipIdx
                          ? "border-ds-primary/45 text-ds-primary bg-ds-sidebar shadow-sm"
                          : "text-ds-on-surface-variant hover:text-ds-on-surface border-transparent hover:bg-ds-outline/35"
                      )}
                    >
                      {chip}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                {showShopifyGridSkeleton ? (
                  <ShopifyActionsGridSkeleton count={shopifyActions.length} />
                ) : showFilteredEmpty ? (
                  <p className="text-ds-on-surface-variant col-span-full rounded-ds-lg border border-dashed border-ds-outline bg-ds-surface/50 px-4 py-8 text-center text-sm">
                    No actions match this filter. Try{" "}
                    <button
                      type="button"
                      className="text-ds-primary font-semibold underline-offset-2 hover:underline"
                      onClick={() => {
                        setFilter("All");
                        setChipIdx(0);
                      }}
                    >
                      All
                    </button>
                    .
                  </p>
                ) : (
                  filtered.map(({ static: action, api }) => {
                    const badgeStatus = api ? mapApiStatusForBadge(api.status) : action.status;
                    const enabled = api?.enabled ?? false;
                    const toggleDisabled =
                      !api ||
                      api.status !== "live" ||
                      !api.scopes_satisfied ||
                      catalogBusy ||
                      togglePending ||
                      !selectedAgentId;
                    const key = shopifyActionSlugToKey(action.id);
                    return (
                      <ActionCard
                        key={action.id}
                        action={action}
                        badgeStatus={badgeStatus}
                        enabled={enabled}
                        toggleDisabled={toggleDisabled}
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
                <section id={HUMAN_ANCHOR} className={SECTION_PANEL}>
                  <div className="border-b border-ds-outline/70 pb-5">
                    <h2 className="ds-app-section-title text-lg md:text-xl">Human support</h2>
                    <p className="text-ds-on-surface-variant mt-1 text-sm leading-relaxed">
                      Escalate chats to your team and set when visitors see a live response estimate.
                    </p>
                  </div>
                  <HumanSupportCard
                    entry={human}
                    badgeStatus={humanBadgeStatus}
                    enabled={humanEnabled}
                    toggleDisabled={humanToggleDisabled}
                    onToggle={(next) => void handleToggle("human.escalate", next)}
                  />
                </section>
              ) : null}

              {stubs.length > 0 ? (
                <section id={ROADMAP_ANCHOR} className={SECTION_PANEL}>
                  <div className="border-b border-ds-outline/70 pb-5">
                    <h2 className="ds-app-section-title text-lg md:text-xl">More integrations</h2>
                    <p className="text-ds-on-surface-variant mt-1 text-sm leading-relaxed">
                      Zendesk, WhatsApp, email, and scheduling will appear here as they roll out.
                    </p>
                  </div>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    {stubs.map((entry) => (
                      <IntegrationRoadmapCard key={entry.action_key} entry={entry} />
                    ))}
                  </div>
                </section>
              ) : null}
            </>
          )}
        </div>
      </div>
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
