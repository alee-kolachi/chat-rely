"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useDashboardAgent } from "@/components/layout/dashboard-agent-context";
import { backendFetch } from "@/lib/backend-api";
import type { KnowledgeWebsiteUsage } from "@/components/knowledge/data-sources-sidebar";

type KnowledgeDataSourcesContextValue = {
  agentId?: string;
  usage: KnowledgeWebsiteUsage | null;
  usageLoading: boolean;
  refreshUsage: () => Promise<void>;
};

const KnowledgeDataSourcesContext = createContext<KnowledgeDataSourcesContextValue | null>(null);

async function fetchUsage(agentId: string): Promise<KnowledgeWebsiteUsage> {
  return backendFetch<KnowledgeWebsiteUsage>(`/api/v1/knowledge/website/usage?agent_id=${encodeURIComponent(agentId)}`);
}

export function KnowledgeDataSourcesProvider({ children }: { children: ReactNode }) {
  const { selectedAgentId } = useDashboardAgent();
  const [usage, setUsage] = useState<KnowledgeWebsiteUsage | null>(null);
  const [usageLoading, setUsageLoading] = useState(false);

  const refreshUsage = useCallback(async () => {
    if (!selectedAgentId) {
      setUsage(null);
      return;
    }
    setUsageLoading(true);
    try {
      const next = await fetchUsage(selectedAgentId);
      setUsage(next);
    } finally {
      setUsageLoading(false);
    }
  }, [selectedAgentId]);

  useEffect(() => {
    const id = window.setTimeout(() => {
      void refreshUsage();
    }, 0);
    return () => window.clearTimeout(id);
  }, [refreshUsage]);

  const value = useMemo<KnowledgeDataSourcesContextValue>(
    () => ({
      agentId: selectedAgentId,
      usage,
      usageLoading,
      refreshUsage,
    }),
    [selectedAgentId, usage, usageLoading, refreshUsage]
  );

  return <KnowledgeDataSourcesContext.Provider value={value}>{children}</KnowledgeDataSourcesContext.Provider>;
}

export function useKnowledgeDataSources() {
  return useContext(KnowledgeDataSourcesContext);
}
