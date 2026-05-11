"use client";

import Link from "next/link";
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
import type { ApiActionCatalogEntry } from "@/components/actions/action-catalog-types";
import {
  ActionsPageShellSkeleton,
  IntegrationSectionsSkeleton,
  ShopifyActionsGridSkeleton,
} from "@/components/actions/actions-page-skeleton";
import { ConnectionCard } from "@/components/actions/connection-card";
import { shopifyActions } from "@/components/actions/shopify-actions-data";
import { useAgentIntegrationsBootstrap } from "@/components/integrations/use-agent-integrations-bootstrap";
import { useDashboardAgent } from "@/components/layout/dashboard-agent-context";
import { BackendApiError, backendFetch } from "@/lib/backend-api";
import { shopifyActionSlugToKey } from "@/lib/shopify-action-keys";
import { actionKeyToSlug } from "@/lib/action-keys";
import { cn } from "@/lib/utils";
import type { ShopifyActionStatus } from "@/components/actions/shopify-actions-data";

const FILTER_CHIPS = ["All", "Enabled", "Disabled", "Unavailable"] as const;
type FilterChip = (typeof FILTER_CHIPS)[number];

const SHOPIFY_ANCHOR = "shopify-integration";
const SHOPIFY_OAUTH_RETURN_TO = `/actions#${SHOPIFY_ANCHOR}`;

function mapApiStatusForBadge(status: ApiActionCatalogEntry["status"]): ShopifyActionStatus {
  if (status === "live") return "live";
  if (status === "blocked_by_plan") return "disabled";
  return "coming-soon";
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
    if (window.location.hash !== `#${SHOPIFY_ANCHOR}`) return;
    requestAnimationFrame(() => {
      document.getElementById(SHOPIFY_ANCHOR)?.scrollIntoView({ block: "start" });
    });
  }, [pathname, searchParams]);

  useEffect(() => {
    const onHashChange = () => {
      if (pathname !== "/actions") return;
      if (window.location.hash !== `#${SHOPIFY_ANCHOR}`) return;
      requestAnimationFrame(() => {
        document.getElementById(SHOPIFY_ANCHOR)?.scrollIntoView({ block: "start" });
      });
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

  const handleToggle = useCallback(
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
    },
    [selectedAgentId, refreshIntegrations]
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
    ["email.bridge", "zendesk.tickets", "calendly.booking"].includes(e.action_key)
  );
  const showIntegrationSkeleton = Boolean(selectedAgentId && integrationsLoading);
  const hasIntegrationContent = Boolean(human || stubs.length > 0);

  const integrationBlock =
    showIntegrationSkeleton ? (
      <IntegrationSectionsSkeleton />
    ) : hasIntegrationContent ? (
      <div className="mt-10 space-y-6">
        {human ? (
          <section>
            <h2 className="ds-app-section-title mb-4 text-base md:text-lg">Human support</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
              <div className="border-ds-outline rounded-ds-xl flex flex-col border bg-ds-surface p-5 shadow-sm">
                <h3 className="text-ds-on-surface text-sm font-semibold">{human.label}</h3>
                <p className="text-ds-on-surface-variant mt-2 line-clamp-3 text-xs leading-relaxed">
                  {human.description}
                </p>
                <div className="mt-4 flex items-center justify-between gap-2">
                  <span className="text-ds-on-surface-variant text-[11px] font-semibold uppercase">
                    {human.status.replaceAll("_", " ")}
                  </span>
                  <Link
                    href={`/actions/${actionKeyToSlug(human.action_key)}`}
                    className="text-ds-primary text-xs font-semibold hover:underline"
                  >
                    Configure
                  </Link>
                </div>
              </div>
            </div>
          </section>
        ) : null}
        {stubs.length > 0 ? (
          <section>
            <h2 className="ds-app-section-title mb-4 text-base md:text-lg">More integrations</h2>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              {stubs.map((e) => (
                <div
                  key={e.action_key}
                  className="border-ds-outline rounded-ds-xl flex flex-col border bg-ds-surface/80 p-5 opacity-90 shadow-sm"
                >
                  <h3 className="text-ds-on-surface text-sm font-semibold">{e.label}</h3>
                  <p className="text-ds-on-surface-variant mt-2 text-xs leading-relaxed">{e.description}</p>
                  <p className="text-ds-on-surface-variant mt-4 text-[11px] font-semibold tracking-wide uppercase">
                    Coming soon
                  </p>
                </div>
              ))}
            </div>
          </section>
        ) : null}
      </div>
    ) : null;

  const showShopifyGridSkeleton = Boolean(selectedAgentId && integrationsLoading);
  const showFilteredEmpty = !showShopifyGridSkeleton && filtered.length === 0 && merged.length > 0;

  return (
    <div className="ds-app-shell py-4 md:py-6">
      <div className="mx-auto w-full max-w-6xl">
        <header className="mb-8 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="ds-app-page-title">Actions & integrations</h1>
            <p className="ds-app-page-description ds-app-page-description--wide">
              Connect apps (e.g. Shopify) and choose which tools your agent can use in conversations.
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
          <div className="border-ds-outline mb-6 flex items-start justify-between gap-3 rounded-ds-lg border bg-white px-4 py-3 text-sm text-slate-800 shadow-sm">
            <span className="min-w-0 flex-1">{banner}</span>
            <button
              type="button"
              className="text-ds-on-surface-variant hover:text-ds-on-surface shrink-0 rounded-ds-md px-2 py-0.5 text-xs font-semibold"
              aria-label="Dismiss message"
              onClick={() => setBanner(null)}
            >
              Dismiss
            </button>
          </div>
        ) : null}

        {integrationsError ? (
          <div role="alert" className="mb-4 text-sm text-rose-600">
            <p>{integrationsError}</p>
          </div>
        ) : null}

        {!selectedAgentId && !agentsLoading ? (
          <p className="text-ds-on-surface-variant text-sm">Select an agent in the header to manage actions.</p>
        ) : null}

        <section id={SHOPIFY_ANCHOR} className="scroll-mt-28 md:scroll-mt-24">
          <ConnectionCard
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
        </section>

        {integrationBlock}

        <div className="mt-10 mb-5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-baseline gap-3">
            <h2 className="ds-app-section-title text-base md:text-lg">Shopify actions</h2>
            <span className="text-ds-on-surface-variant text-xs font-medium">{totalCount} available</span>
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
                    ? "border-ds-primary/45 text-ds-primary bg-white shadow-sm"
                    : "text-ds-on-surface-variant hover:text-ds-on-surface border-transparent hover:bg-ds-outline/35"
                )}
              >
                {chip}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
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
              const badgeStatus = api ? mapApiStatusForBadge(api.status) : "coming-soon";
              const enabled = api?.enabled ?? false;
              const toggleDisabled =
                !api || api.status !== "live" || catalogBusy || !selectedAgentId;
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

        <p className="ds-app-kicker text-ds-on-surface-variant mt-12 pb-8 text-center text-xs">
          Additional integrations are listed above as they become available.
        </p>
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
