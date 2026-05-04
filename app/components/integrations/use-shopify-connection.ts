"use client";

import { useCallback, useEffect, useState } from "react";
import { backendFetch } from "@/lib/backend-api";

export type ShopifyConnectionApi = {
  connected: boolean;
  shop_domain: string | null;
  scopes: string[];
  status: string;
  last_synced_at: string | null;
};

export function useShopifyConnection(agentId: string | undefined) {
  const [data, setData] = useState<ShopifyConnectionApi | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!agentId) {
      setData(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await backendFetch<ShopifyConnectionApi>(
        `/api/v1/integrations/shopify?agent_id=${encodeURIComponent(agentId)}`
      );
      setData(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load Shopify connection");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [agentId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const disconnect = useCallback(async () => {
    if (!agentId) return;
    await backendFetch<ShopifyConnectionApi>(
      `/api/v1/integrations/shopify?agent_id=${encodeURIComponent(agentId)}`,
      { method: "DELETE" }
    );
    await refresh();
  }, [agentId, refresh]);

  return { data, loading, error, refresh, disconnect };
}
