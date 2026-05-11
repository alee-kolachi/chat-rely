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

/** Row shape from `GET /api/v1/knowledge/website/workspace` sources list (same as `/sources`). */
export type KnowledgeWebsiteSourceRow = {
  id: string;
  title: string;
  source_url: string | null;
  status: string;
  website_mode: string | null;
  link_count: number;
  last_indexed_at: string | null;
  error_message?: string | null;
  latest_job_status: string | null;
  latest_job_phase: string | null;
  job_metrics?: Record<string, unknown> | null;
  job_pages_total?: number | null;
  job_pages_processed?: number | null;
  job_progress_pct?: number | null;
  job_crawl_limit_exceeded?: boolean;
  reindexed_duplicate?: boolean;
  duplicate_reason?: string | null;
  duplicate_of_source_id?: string | null;
};

type KnowledgeWebsiteWorkspacePayload = {
  usage: KnowledgeWebsiteUsage;
  sources: KnowledgeWebsiteSourceRow[];
};

type KnowledgeDataSourcesContextValue = {
  agentId?: string;
  usage: KnowledgeWebsiteUsage | null;
  websiteSources: KnowledgeWebsiteSourceRow[] | null;
  usageLoading: boolean;
  refreshUsage: (opts?: RefreshUsageOptions) => Promise<void>;
};

const KnowledgeDataSourcesContext = createContext<KnowledgeDataSourcesContextValue | null>(null);

async function fetchWorkspace(agentId: string): Promise<KnowledgeWebsiteWorkspacePayload> {
  return backendFetch<KnowledgeWebsiteWorkspacePayload>(
    `/api/v1/knowledge/website/workspace?agent_id=${encodeURIComponent(agentId)}`,
    { networkRetries: 3 }
  );
}

/** Sidebar appears only under `/knowledge/<area>`; skip polling on the hub `/knowledge`. */
const KNOWLEDGE_USAGE_POLL_MS = 3500;

export function KnowledgeDataSourcesProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { selectedAgentId } = useDashboardAgent();
  const [usage, setUsage] = useState<KnowledgeWebsiteUsage | null>(null);
  const [websiteSources, setWebsiteSources] = useState<KnowledgeWebsiteSourceRow[] | null>(null);
  const [usageLoading, setUsageLoading] = useState(false);

  const refreshUsage = useCallback(async (opts?: RefreshUsageOptions) => {
    if (!selectedAgentId) {
      setUsage(null);
      setWebsiteSources(null);
      return;
    }
    const silent = opts?.silent === true;
    if (!silent) {
      setUsageLoading(true);
      setWebsiteSources(null);
    }
    try {
      const next = await fetchWorkspace(selectedAgentId);
      setUsage(next.usage);
      setWebsiteSources(next.sources);
    } catch {
      // Transient network/backend failures: keep prior snapshot; poll / manual refresh will retry.
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
      websiteSources,
      usageLoading,
      refreshUsage,
    }),
    [selectedAgentId, usage, websiteSources, usageLoading, refreshUsage]
  );

  return <KnowledgeDataSourcesContext.Provider value={value}>{children}</KnowledgeDataSourcesContext.Provider>;
}

export function useKnowledgeDataSources() {
  return useContext(KnowledgeDataSourcesContext);
}
