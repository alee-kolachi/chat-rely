"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ApiActionCatalogResponse } from "@/components/actions/action-catalog-types";
import { backendFetch } from "@/lib/backend-api";
import type { ShopifyConnectionApi } from "@/components/integrations/use-shopify-connection";

export type AgentWebsitePreviewApi = {
  source_url: string;
  website_mode: string | null;
  title: string | null;
};

type BootstrapPayload = {
  catalog: ApiActionCatalogResponse;
  shopify: ShopifyConnectionApi;
  website_preview?: AgentWebsitePreviewApi | null;
};

type UseAgentIntegrationsBootstrapOptions = {
  includeWebsitePreview?: boolean;
};

type BootstrapCacheEntry = BootstrapPayload & {
  updatedAt: number;
};

const bootstrapCache = new Map<string, BootstrapCacheEntry>();
const bootstrapInflight = new Map<string, Promise<BootstrapPayload>>();
type BootstrapCacheListener = (entry: BootstrapCacheEntry) => void;
const bootstrapListeners = new Map<string, Set<BootstrapCacheListener>>();

function cacheKey(agentId: string, includeWebsitePreview: boolean): string {
  return `${agentId}:${includeWebsitePreview ? "with-preview" : "core"}`;
}

function agentCachePrefix(agentId: string): string {
  return `${agentId}:`;
}

function readCache(key: string): BootstrapCacheEntry | null {
  return bootstrapCache.get(key) ?? null;
}

function subscribeBootstrapCache(key: string, listener: BootstrapCacheListener): () => void {
  let listeners = bootstrapListeners.get(key);
  if (!listeners) {
    listeners = new Set();
    bootstrapListeners.set(key, listeners);
  }
  listeners.add(listener);
  return () => {
    listeners!.delete(listener);
    if (listeners!.size === 0) bootstrapListeners.delete(key);
  };
}

function notifyBootstrapCache(key: string) {
  const entry = readCache(key);
  if (!entry) return;
  bootstrapListeners.get(key)?.forEach((listener) => listener(entry));
}

/** Drop cached bootstrap payloads after Shopify connect/disconnect. */
export function invalidateAgentIntegrationsBootstrapCache(agentId: string) {
  const prefix = agentCachePrefix(agentId);
  for (const key of Array.from(bootstrapCache.keys())) {
    if (key.startsWith(prefix)) bootstrapCache.delete(key);
  }
}

/** Keep action catalog in sync across playground (with-preview) and actions (core) cache keys. */
function propagateCatalogForAgent(agentId: string, catalog: ApiActionCatalogResponse) {
  const prefix = agentCachePrefix(agentId);
  const updatedKeys: string[] = [];
  for (const [key, entry] of bootstrapCache.entries()) {
    if (!key.startsWith(prefix)) continue;
    bootstrapCache.set(key, { ...entry, catalog, updatedAt: Date.now() });
    updatedKeys.push(key);
  }
  for (const key of updatedKeys) notifyBootstrapCache(key);
}

async function fetchBootstrap(
  agentId: string,
  includeWebsitePreview: boolean,
  key: string
): Promise<BootstrapPayload> {
  const current = bootstrapInflight.get(key);
  if (current) return current;

  const query = includeWebsitePreview ? "" : "?include_website_preview=false";
  const request = backendFetch<BootstrapPayload>(
    `/api/v1/agents/${encodeURIComponent(agentId)}/integrations/bootstrap${query}`
  ).finally(() => {
    bootstrapInflight.delete(key);
  });
  bootstrapInflight.set(key, request);
  return request;
}

/** One HTTP round-trip for action catalog + Shopify status (Playground, Actions list). */
export function useAgentIntegrationsBootstrap(
  agentId: string | undefined,
  options: UseAgentIntegrationsBootstrapOptions = {}
) {
  const includeWebsitePreview = options.includeWebsitePreview ?? true;
  const key = useMemo(
    () => (agentId ? cacheKey(agentId, includeWebsitePreview) : null),
    [agentId, includeWebsitePreview]
  );
  const initial = key ? readCache(key) : null;
  const [catalog, setCatalog] = useState<ApiActionCatalogResponse | null>(() => initial?.catalog ?? null);
  const [shopify, setShopify] = useState<ShopifyConnectionApi | null>(() => initial?.shopify ?? null);
  const [websitePreview, setWebsitePreview] = useState<AgentWebsitePreviewApi | null>(
    () => initial?.website_preview ?? null
  );
  const [loading, setLoading] = useState(() => Boolean(agentId && !initial));
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async (opts?: { silent?: boolean; force?: boolean }) => {
    if (!agentId) {
      setCatalog(null);
      setShopify(null);
      setWebsitePreview(null);
      setLoading(false);
      return;
    }
    const nextKey = cacheKey(agentId, includeWebsitePreview);
    const cached = opts?.force ? null : readCache(nextKey);
    const silent = opts?.silent === true || (Boolean(cached) && !opts?.force);
    if (cached) {
      setCatalog(cached.catalog);
      setShopify(cached.shopify);
      setWebsitePreview(cached.website_preview ?? null);
    }
    if (!silent) setLoading(true);
    setError(null);
    try {
      const res = await fetchBootstrap(agentId, includeWebsitePreview, nextKey);
      bootstrapCache.set(nextKey, { ...res, updatedAt: Date.now() });
      propagateCatalogForAgent(agentId, res.catalog);
      setCatalog(res.catalog);
      setShopify(res.shopify);
      setWebsitePreview(res.website_preview ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load integrations");
      if (!cached) {
        setCatalog(null);
        setShopify(null);
        setWebsitePreview(null);
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }, [agentId, includeWebsitePreview]);

  useEffect(() => {
    if (!key) return;
    return subscribeBootstrapCache(key, (entry) => {
      setCatalog(entry.catalog);
      setShopify(entry.shopify);
      setWebsitePreview(entry.website_preview ?? null);
    });
  }, [key]);

  useEffect(() => {
    let cancelled = false;
    if (!agentId || !key) {
      queueMicrotask(() => {
        if (cancelled) return;
        setCatalog(null);
        setShopify(null);
        setWebsitePreview(null);
        setLoading(false);
      });
      return () => {
        cancelled = true;
      };
    }

    const cached = readCache(key);
    if (cached) {
      queueMicrotask(() => {
        if (cancelled) return;
        setCatalog(cached.catalog);
        setShopify(cached.shopify);
        setWebsitePreview(cached.website_preview ?? null);
        setLoading(false);
        void refresh({ silent: true });
      });
      return () => {
        cancelled = true;
      };
    }

    queueMicrotask(() => {
      if (!cancelled) void refresh();
    });
    return () => {
      cancelled = true;
    };
  }, [agentId, key, refresh]);

  const disconnect = useCallback(async () => {
    if (!agentId) return;
    await backendFetch<ShopifyConnectionApi>(
      `/api/v1/integrations/shopify?agent_id=${encodeURIComponent(agentId)}`,
      { method: "DELETE" }
    );
    invalidateAgentIntegrationsBootstrapCache(agentId);
    await refresh({ force: true });
  }, [agentId, refresh]);

  return { catalog, shopify, websitePreview, loading, error, refresh, disconnect };
}
