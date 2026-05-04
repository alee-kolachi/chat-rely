"use client";

import Link from "next/link";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ActionCard } from "@/components/actions/action-card";
import type { ApiActionCatalogEntry } from "@/components/actions/action-catalog-types";
import { ConnectionCard } from "@/components/actions/connection-card";
import { shopifyActions } from "@/components/actions/shopify-actions-data";
import { useActionCatalog } from "@/components/actions/use-action-catalog";
import { useShopifyConnection } from "@/components/integrations/use-shopify-connection";
import { useDashboardAgent } from "@/components/layout/dashboard-agent-context";
import { BackendApiError, backendFetch } from "@/lib/backend-api";
import { shopifyActionSlugToKey } from "@/lib/shopify-action-keys";
import { actionKeyToSlug } from "@/lib/action-keys";
import { cn } from "@/lib/utils";
import type { ShopifyActionStatus } from "@/components/actions/shopify-actions-data";

const FILTER_CHIPS = ["All", "Enabled", "Disabled", "Coming soon"] as const;
type FilterChip = (typeof FILTER_CHIPS)[number];

function mapApiStatusForBadge(status: ApiActionCatalogEntry["status"]): ShopifyActionStatus {
  if (status === "live") return "live";
  if (status === "blocked_by_plan") return "disabled";
  return "coming-soon";
}

function ActionsPageContent() {
  const { selectedAgentId, agentsLoading } = useDashboardAgent();
  const searchParams = useSearchParams();
  const { data: catalog, loading: catalogLoading, error: catalogError, refresh: refreshCatalog } =
    useActionCatalog(selectedAgentId || undefined);
  const {
    data: shopify,
    loading: shopifyLoading,
    error: shopifyError,
    refresh: refreshShopify,
    disconnect,
  } = useShopifyConnection(selectedAgentId || undefined);

  const [filter, setFilter] = useState<FilterChip>("All");
  const [chipIdx, setChipIdx] = useState(0);
  const [shopDraft, setShopDraft] = useState("");
  const [banner, setBanner] = useState<string | null>(null);
  const [connectBusy, setConnectBusy] = useState(false);

  useEffect(() => {
    const q = searchParams.get("shopify");
    if (q === "connected") {
      setBanner("Shopify connected successfully.");
      void refreshShopify();
      void refreshCatalog();
    }
    if (q === "error") {
      const msg = searchParams.get("message") ?? "Authorization failed.";
      setBanner(msg);
    }
  }, [searchParams, refreshShopify, refreshCatalog]);

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
      if (filter === "Coming soon") return status !== "live";
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
        await refreshCatalog();
      } catch (e) {
        const msg =
          e instanceof BackendApiError ? e.message : e instanceof Error ? e.message : "Could not update action";
        setBanner(msg);
      }
    },
    [selectedAgentId, refreshCatalog]
  );

  const startOAuth = useCallback(async () => {
    if (!selectedAgentId || !shopDraft.trim()) return;
    setConnectBusy(true);
    setBanner(null);
    try {
      const res = await backendFetch<{ authorization_url: string }>(
        `/api/v1/integrations/shopify/oauth/start?agent_id=${encodeURIComponent(selectedAgentId)}&shop=${encodeURIComponent(
          shopDraft.trim()
        )}`
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
      setShopDraft((prev) => (prev.trim() ? prev : sub));
    }
  }, [shopify?.connected, shopify?.shop_domain]);

  const handleDisconnect = useCallback(async () => {
    setConnectBusy(true);
    setBanner(null);
    try {
      await disconnect();
      await refreshCatalog();
    } catch (e) {
      const msg =
        e instanceof BackendApiError ? e.message : e instanceof Error ? e.message : "Disconnect failed";
      setBanner(msg);
    } finally {
      setConnectBusy(false);
    }
  }, [disconnect, refreshCatalog]);

  const loading = agentsLoading || catalogLoading || shopifyLoading;
  const totalCount = merged.length;

  return (
    <div className="ds-app-shell p-6 md:p-8">
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
            className="border-ds-outline text-ds-on-surface hover:bg-ds-sidebar self-start rounded-ds-md border bg-white px-4 py-2.5 text-sm font-semibold shadow-sm transition-colors md:self-auto"
            onClick={() => {
              void refreshShopify();
              void refreshCatalog();
            }}
            disabled={loading}
          >
            Manage connection
          </button>
        </header>

        {banner ? (
          <div className="border-ds-outline mb-6 rounded-ds-lg border bg-white px-4 py-3 text-sm text-slate-800 shadow-sm">
            {banner}
          </div>
        ) : null}

        {(catalogError || shopifyError) && (
          <p className="text-rose-600 mb-4 text-sm">{catalogError ?? shopifyError}</p>
        )}

        {!selectedAgentId && !agentsLoading ? (
          <p className="text-ds-on-surface-variant text-sm">Select an agent in the header to manage actions.</p>
        ) : null}

        <section id="shopify-integration" className="scroll-mt-24">
          <ConnectionCard
            connected={Boolean(shopify?.connected)}
            shopDomain={shopify?.shop_domain}
            scopes={shopify?.scopes ?? []}
            lastSyncedAt={shopify?.last_synced_at}
            busy={connectBusy || loading}
            shopDraft={shopDraft}
            onShopDraftChange={setShopDraft}
            onConnect={startOAuth}
            onReconnect={reconnect}
            onDisconnect={handleDisconnect}
          />
        </section>

        {(() => {
          const human = catalog?.entries.find((e) => e.action_key === "human.escalate");
          const stubs = (catalog?.entries ?? []).filter((e) =>
            ["email.bridge", "zendesk.tickets", "calendly.booking"].includes(e.action_key)
          );
          if (!human && stubs.length === 0) return null;
          return (
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
                          {human.status.replace("_", " ")}
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
          );
        })()}

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
          {filtered.map(({ static: action, api }) => {
            const badgeStatus = api ? mapApiStatusForBadge(api.status) : "coming-soon";
            const enabled = api?.enabled ?? false;
            const toggleDisabled =
              !api || api.status !== "live" || loading || !selectedAgentId;
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
          })}
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
    <Suspense
      fallback={
        <div className="ds-app-shell text-ds-on-surface-variant p-6 text-sm md:p-8">Loading…</div>
      }
    >
      <ActionsPageContent />
    </Suspense>
  );
}
