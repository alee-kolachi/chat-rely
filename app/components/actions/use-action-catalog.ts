"use client";

import { useCallback, useEffect, useState } from "react";
import { backendFetch } from "@/lib/backend-api";
import type { ApiActionCatalogResponse } from "./action-catalog-types";

export function useActionCatalog(agentId: string | undefined) {
  const [data, setData] = useState<ApiActionCatalogResponse | null>(null);
  /** True on first paint when an agent is selected so detail pages don't 404 before fetch runs. */
  const [loading, setLoading] = useState(() => Boolean(agentId));
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!agentId) {
      setData(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await backendFetch<ApiActionCatalogResponse>(
        `/api/v1/agents/${encodeURIComponent(agentId)}/actions/catalog`
      );
      setData(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load actions");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [agentId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { data, loading, error, refresh };
}
