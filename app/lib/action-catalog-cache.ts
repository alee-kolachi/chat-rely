import type { ApiActionCatalogResponse } from "@/components/actions/action-catalog-types";

type CatalogCacheEntry = {
  catalog: ApiActionCatalogResponse;
  updatedAt: number;
};

const catalogCache = new Map<string, CatalogCacheEntry>();
type CatalogCacheListener = (entry: CatalogCacheEntry) => void;
const catalogListeners = new Map<string, Set<CatalogCacheListener>>();

export function readActionCatalogCache(agentId: string): CatalogCacheEntry | null {
  return catalogCache.get(agentId) ?? null;
}

export function writeActionCatalogCache(agentId: string, catalog: ApiActionCatalogResponse) {
  const entry = { catalog, updatedAt: Date.now() };
  catalogCache.set(agentId, entry);
  catalogListeners.get(agentId)?.forEach((listener) => listener(entry));
}

export function subscribeActionCatalogCache(
  agentId: string,
  listener: CatalogCacheListener
): () => void {
  let listeners = catalogListeners.get(agentId);
  if (!listeners) {
    listeners = new Set();
    catalogListeners.set(agentId, listeners);
  }
  listeners.add(listener);
  return () => {
    listeners!.delete(listener);
    if (listeners!.size === 0) catalogListeners.delete(agentId);
  };
}

export function invalidateActionCatalogCache(agentId: string) {
  catalogCache.delete(agentId);
}
