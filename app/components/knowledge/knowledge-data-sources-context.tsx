"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";
import { useDashboardAgent } from "@/components/layout/dashboard-agent-context";
import { backendFetch } from "@/lib/backend-api";
import type { KnowledgeWebsiteUsage } from "@/components/knowledge/data-sources-sidebar";

export type RefreshUsageOptions = {
  /** When true, skip usageLoading — use for background polls so the sidebar keeps showing previous numbers. */
  silent?: boolean;
};

type KnowledgeDataSourcesContextValue = {
  agentId?: string;
  usage: KnowledgeWebsiteUsage | null;
  usageLoading: boolean;
  refreshUsage: (opts?: RefreshUsageOptions) => Promise<void>;
};

const KnowledgeDataSourcesContext = createContext<KnowledgeDataSourcesContextValue | null>(null);

async function fetchUsage(agentId: string): Promise<KnowledgeWebsiteUsage> {
  return backendFetch<KnowledgeWebsiteUsage>(`/api/v1/knowledge/website/usage?agent_id=${encodeURIComponent(agentId)}`);
}

/** Sidebar appears only under `/knowledge/<area>`; skip polling on the hub `/knowledge`. */
const KNOWLEDGE_USAGE_POLL_MS = 3500;

export function KnowledgeDataSourcesProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { selectedAgentId } = useDashboardAgent();
  const [usage, setUsage] = useState<KnowledgeWebsiteUsage | null>(null);
  const [usageLoading, setUsageLoading] = useState(false);

  const refreshUsage = useCallback(async (opts?: RefreshUsageOptions) => {
    if (!selectedAgentId) {
      setUsage(null);
      return;
    }
    const silent = opts?.silent === true;
    if (!silent) {
      setUsageLoading(true);
    }
    try {
      const next = await fetchUsage(selectedAgentId);
      setUsage(next);
    } finally {
      if (!silent) {
        setUsageLoading(false);
      }
    }
  }, [selectedAgentId]);

  useEffect(() => {
    const id = window.setTimeout(() => {
      void refreshUsage();
    }, 0);
    return () => window.clearTimeout(id);
  }, [refreshUsage]);

  /** Keep counts + byte totals fresh during background indexing on any knowledge sub-route. */
  useEffect(() => {
    if (!selectedAgentId) return;
    const workspaceRoute =
      pathname.startsWith("/knowledge") && pathname !== "/knowledge" && pathname !== "";
    if (!workspaceRoute) return;

    const tick = () => {
      if (typeof document !== "undefined" && document.visibilityState === "hidden") return;
      void refreshUsage({ silent: true });
    };

    const intervalId = window.setInterval(tick, KNOWLEDGE_USAGE_POLL_MS);
    return () => window.clearInterval(intervalId);
  }, [selectedAgentId, pathname, refreshUsage]);

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
