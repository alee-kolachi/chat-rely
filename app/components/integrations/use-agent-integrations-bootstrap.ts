"use client";

import { useCallback, useEffect, useState } from "react";
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

/** One HTTP round-trip for action catalog + Shopify status (Playground, Actions list). */
export function useAgentIntegrationsBootstrap(
  agentId: string | undefined,
  options: UseAgentIntegrationsBootstrapOptions = {}
) {
  const includeWebsitePreview = options.includeWebsitePreview ?? true;
  const [catalog, setCatalog] = useState<ApiActionCatalogResponse | null>(null);
  const [shopify, setShopify] = useState<ShopifyConnectionApi | null>(null);
  const [websitePreview, setWebsitePreview] = useState<AgentWebsitePreviewApi | null>(null);
  const [loading, setLoading] = useState(() => Boolean(agentId));
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!agentId) {
      setCatalog(null);
      setShopify(null);
      setWebsitePreview(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const query = includeWebsitePreview ? "" : "?include_website_preview=false";
      const res = await backendFetch<BootstrapPayload>(
        `/api/v1/agents/${encodeURIComponent(agentId)}/integrations/bootstrap${query}`
      );
      setCatalog(res.catalog);
      setShopify(res.shopify);
      setWebsitePreview(res.website_preview ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load integrations");
      setCatalog(null);
      setShopify(null);
      setWebsitePreview(null);
    } finally {
      setLoading(false);
    }
  }, [agentId, includeWebsitePreview]);

  useEffect(() => {
    queueMicrotask(() => void refresh());
  }, [refresh]);

  const disconnect = useCallback(async () => {
    if (!agentId) return;
    await backendFetch<ShopifyConnectionApi>(
      `/api/v1/integrations/shopify?agent_id=${encodeURIComponent(agentId)}`,
      { method: "DELETE" }
    );
    await refresh();
  }, [agentId, refresh]);

  return { catalog, shopify, websitePreview, loading, error, refresh, disconnect };
}
