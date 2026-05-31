"use client";

import { useCallback, useEffect, useState } from "react";
import { backendFetch } from "@/lib/backend-api";
import {
  readActionCatalogCache,
  subscribeActionCatalogCache,
  writeActionCatalogCache,
} from "@/lib/action-catalog-cache";
import type { ApiActionCatalogResponse } from "./action-catalog-types";

export function useActionCatalog(agentId: string | undefined) {
  const initial = agentId ? readActionCatalogCache(agentId) : null;
  const [data, setData] = useState<ApiActionCatalogResponse | null>(() => initial?.catalog ?? null);
  const [loading, setLoading] = useState(() => Boolean(agentId && !initial));
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async (opts?: { silent?: boolean }) => {
    if (!agentId) {
      setData(null);
      setLoading(false);
      return;
    }
    const cached = readActionCatalogCache(agentId);
    const silent = opts?.silent === true || Boolean(cached);
    if (cached) setData(cached.catalog);
    if (!silent) setLoading(true);
    setError(null);
    try {
      const res = await backendFetch<ApiActionCatalogResponse>(
        `/api/v1/agents/${encodeURIComponent(agentId)}/actions/catalog`
      );
      writeActionCatalogCache(agentId, res);
      setData(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load actions");
      if (!cached && !silent) setData(null);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [agentId]);

  useEffect(() => {
    if (!agentId) return;
    return subscribeActionCatalogCache(agentId, (entry) => {
      setData(entry.catalog);
    });
  }, [agentId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { data, loading, error, refresh };
}
