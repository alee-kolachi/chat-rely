"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
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

type KnowledgeWebsiteWorkspaceCache = KnowledgeWebsiteWorkspacePayload & {
  updatedAt: number;
};

export type KnowledgeFileSourceRow = {
  id: string;
  title: string;
  storage_bucket: string | null;
  storage_path: string | null;
  status: string;
  character_count: number;
  last_indexed_at: string | null;
};

export type KnowledgeSnippetRow = {
  id: string;
  title: string;
  status: string;
  character_count: number;
  preview: string;
  last_indexed_at: string | null;
  updated_at: string;
};

export type KnowledgeQARow = {
  id: string;
  title: string;
  question: string;
  answer_preview: string;
  character_count: number;
  status: string;
  last_indexed_at: string | null;
  updated_at: string;
};

type CachedRows<T> = {
  rows: T[] | null;
  loading: boolean;
  error: string | null;
  updatedAt: number | null;
};

type SourceLoadOptions = {
  /** Keep current rows on screen while refreshing them in the background. */
  silent?: boolean;
};

type KnowledgeDataSourcesContextValue = {
  agentId?: string;
  usage: KnowledgeWebsiteUsage | null;
  websiteSources: KnowledgeWebsiteSourceRow[] | null;
  usageLoading: boolean;
  refreshUsage: (opts?: RefreshUsageOptions) => Promise<void>;
  files: CachedRows<KnowledgeFileSourceRow>;
  snippets: CachedRows<KnowledgeSnippetRow>;
  qa: CachedRows<KnowledgeQARow>;
  loadFileSources: (opts?: SourceLoadOptions) => Promise<KnowledgeFileSourceRow[]>;
  loadSnippetSources: (opts?: SourceLoadOptions) => Promise<KnowledgeSnippetRow[]>;
  loadQaSources: (opts?: SourceLoadOptions) => Promise<KnowledgeQARow[]>;
  setFileSources: (rows: KnowledgeFileSourceRow[]) => void;
  setSnippetSources: (rows: KnowledgeSnippetRow[]) => void;
  setQaSources: (rows: KnowledgeQARow[]) => void;
};

const KnowledgeDataSourcesContext = createContext<KnowledgeDataSourcesContextValue | null>(null);

async function fetchWorkspace(agentId: string): Promise<KnowledgeWebsiteWorkspacePayload> {
  return backendFetch<KnowledgeWebsiteWorkspacePayload>(
    `/api/v1/knowledge/website/workspace?agent_id=${encodeURIComponent(agentId)}`,
    { networkRetries: 3 }
  );
}

async function fetchFileSources(agentId: string): Promise<KnowledgeFileSourceRow[]> {
  const data = await backendFetch<{ sources: KnowledgeFileSourceRow[] }>(
    `/api/v1/knowledge/files/sources?agent_id=${encodeURIComponent(agentId)}`
  );
  return data.sources;
}

async function fetchSnippetSources(agentId: string): Promise<KnowledgeSnippetRow[]> {
  const data = await backendFetch<{ sources: KnowledgeSnippetRow[] }>(
    `/api/v1/knowledge/snippets/sources?agent_id=${encodeURIComponent(agentId)}`
  );
  return data.sources;
}

async function fetchQaSources(agentId: string): Promise<KnowledgeQARow[]> {
  const data = await backendFetch<{ sources: KnowledgeQARow[] }>(
    `/api/v1/knowledge/qa/sources?agent_id=${encodeURIComponent(agentId)}`
  );
  return data.sources;
}

function emptyRows<T>(): CachedRows<T> {
  return { rows: null, loading: false, error: null, updatedAt: null };
}

/** Sidebar appears only under `/knowledge/<area>`; skip polling on the hub `/knowledge`. */
const KNOWLEDGE_USAGE_POLL_MS = 3500;

export function KnowledgeDataSourcesProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { selectedAgentId } = useDashboardAgent();
  const [workspaceByAgent, setWorkspaceByAgent] = useState<Record<string, KnowledgeWebsiteWorkspaceCache>>({});
  const workspaceByAgentRef = useRef(workspaceByAgent);
  const [usageLoading, setUsageLoading] = useState(false);
  const [filesByAgent, setFilesByAgent] = useState<Record<string, CachedRows<KnowledgeFileSourceRow>>>({});
  const [snippetsByAgent, setSnippetsByAgent] = useState<Record<string, CachedRows<KnowledgeSnippetRow>>>({});
  const [qaByAgent, setQaByAgent] = useState<Record<string, CachedRows<KnowledgeQARow>>>({});
  const filesByAgentRef = useRef(filesByAgent);
  const snippetsByAgentRef = useRef(snippetsByAgent);
  const qaByAgentRef = useRef(qaByAgent);
  const fileRequestsRef = useRef(new Map<string, Promise<KnowledgeFileSourceRow[]>>());
  const snippetRequestsRef = useRef(new Map<string, Promise<KnowledgeSnippetRow[]>>());
  const qaRequestsRef = useRef(new Map<string, Promise<KnowledgeQARow[]>>());

  const updateFilesBucket = useCallback((
    agentId: string,
    updater: (bucket: CachedRows<KnowledgeFileSourceRow>) => CachedRows<KnowledgeFileSourceRow>
  ) => {
    setFilesByAgent((prev) => {
      const next = { ...prev, [agentId]: updater(prev[agentId] ?? emptyRows()) };
      filesByAgentRef.current = next;
      return next;
    });
  }, []);

  const updateSnippetsBucket = useCallback((
    agentId: string,
    updater: (bucket: CachedRows<KnowledgeSnippetRow>) => CachedRows<KnowledgeSnippetRow>
  ) => {
    setSnippetsByAgent((prev) => {
      const next = { ...prev, [agentId]: updater(prev[agentId] ?? emptyRows()) };
      snippetsByAgentRef.current = next;
      return next;
    });
  }, []);

  const updateQaBucket = useCallback((
    agentId: string,
    updater: (bucket: CachedRows<KnowledgeQARow>) => CachedRows<KnowledgeQARow>
  ) => {
    setQaByAgent((prev) => {
      const next = { ...prev, [agentId]: updater(prev[agentId] ?? emptyRows()) };
      qaByAgentRef.current = next;
      return next;
    });
  }, []);

  const refreshUsage = useCallback(async (opts?: RefreshUsageOptions) => {
    if (!selectedAgentId) {
      setUsageLoading(false);
      return;
    }
    const cached = workspaceByAgentRef.current[selectedAgentId] ?? null;
    const silent = opts?.silent === true || cached !== null;
    if (!silent) {
      setUsageLoading(true);
    }
    try {
      const next = await fetchWorkspace(selectedAgentId);
      setWorkspaceByAgent((prev) => {
        const updated = {
          ...prev,
          [selectedAgentId]: { ...next, updatedAt: Date.now() },
        };
        workspaceByAgentRef.current = updated;
        return updated;
      });
    } catch {
      // Transient network/backend failures: keep prior snapshot; poll / manual refresh will retry.
    } finally {
      if (!silent) {
        setUsageLoading(false);
      }
    }
  }, [selectedAgentId]);

  const selectedWorkspace = selectedAgentId ? (workspaceByAgent[selectedAgentId] ?? null) : null;

  const loadFileSources = useCallback(async (opts?: SourceLoadOptions) => {
    if (!selectedAgentId) return [];
    const cached = filesByAgentRef.current[selectedAgentId]?.rows ?? null;
    const silent = opts?.silent === true || cached !== null;
    if (!silent) {
      updateFilesBucket(selectedAgentId, (bucket) => ({ ...bucket, loading: true, error: null }));
    }

    let request = fileRequestsRef.current.get(selectedAgentId);
    if (!request) {
      request = fetchFileSources(selectedAgentId).finally(() => fileRequestsRef.current.delete(selectedAgentId));
      fileRequestsRef.current.set(selectedAgentId, request);
    }

    try {
      const rows = await request;
      updateFilesBucket(selectedAgentId, () => ({ rows, loading: false, error: null, updatedAt: Date.now() }));
      return rows;
    } catch (e) {
      updateFilesBucket(selectedAgentId, (bucket) => ({
        ...bucket,
        loading: false,
        error: e instanceof Error ? e.message : "Failed to load file sources",
      }));
      return cached ?? [];
    }
  }, [selectedAgentId, updateFilesBucket]);

  const loadSnippetSources = useCallback(async (opts?: SourceLoadOptions) => {
    if (!selectedAgentId) return [];
    const cached = snippetsByAgentRef.current[selectedAgentId]?.rows ?? null;
    const silent = opts?.silent === true || cached !== null;
    if (!silent) {
      updateSnippetsBucket(selectedAgentId, (bucket) => ({ ...bucket, loading: true, error: null }));
    }

    let request = snippetRequestsRef.current.get(selectedAgentId);
    if (!request) {
      request = fetchSnippetSources(selectedAgentId).finally(() => snippetRequestsRef.current.delete(selectedAgentId));
      snippetRequestsRef.current.set(selectedAgentId, request);
    }

    try {
      const rows = await request;
      updateSnippetsBucket(selectedAgentId, () => ({ rows, loading: false, error: null, updatedAt: Date.now() }));
      return rows;
    } catch (e) {
      updateSnippetsBucket(selectedAgentId, (bucket) => ({
        ...bucket,
        loading: false,
        error: e instanceof Error ? e.message : "Failed to load snippets",
      }));
      return cached ?? [];
    }
  }, [selectedAgentId, updateSnippetsBucket]);

  const loadQaSources = useCallback(async (opts?: SourceLoadOptions) => {
    if (!selectedAgentId) return [];
    const cached = qaByAgentRef.current[selectedAgentId]?.rows ?? null;
    const silent = opts?.silent === true || cached !== null;
    if (!silent) {
      updateQaBucket(selectedAgentId, (bucket) => ({ ...bucket, loading: true, error: null }));
    }

    let request = qaRequestsRef.current.get(selectedAgentId);
    if (!request) {
      request = fetchQaSources(selectedAgentId).finally(() => qaRequestsRef.current.delete(selectedAgentId));
      qaRequestsRef.current.set(selectedAgentId, request);
    }

    try {
      const rows = await request;
      updateQaBucket(selectedAgentId, () => ({ rows, loading: false, error: null, updatedAt: Date.now() }));
      return rows;
    } catch (e) {
      updateQaBucket(selectedAgentId, (bucket) => ({
        ...bucket,
        loading: false,
        error: e instanceof Error ? e.message : "Failed to load Q&A",
      }));
      return cached ?? [];
    }
  }, [selectedAgentId, updateQaBucket]);

  const setFileSources = useCallback((rows: KnowledgeFileSourceRow[]) => {
    if (!selectedAgentId) return;
    updateFilesBucket(selectedAgentId, () => ({ rows, loading: false, error: null, updatedAt: Date.now() }));
  }, [selectedAgentId, updateFilesBucket]);

  const setSnippetSources = useCallback((rows: KnowledgeSnippetRow[]) => {
    if (!selectedAgentId) return;
    updateSnippetsBucket(selectedAgentId, () => ({ rows, loading: false, error: null, updatedAt: Date.now() }));
  }, [selectedAgentId, updateSnippetsBucket]);

  const setQaSources = useCallback((rows: KnowledgeQARow[]) => {
    if (!selectedAgentId) return;
    updateQaBucket(selectedAgentId, () => ({ rows, loading: false, error: null, updatedAt: Date.now() }));
  }, [selectedAgentId, updateQaBucket]);

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
      usage: selectedWorkspace?.usage ?? null,
      websiteSources: selectedWorkspace?.sources ?? null,
      usageLoading,
      refreshUsage,
      files: selectedAgentId ? (filesByAgent[selectedAgentId] ?? emptyRows()) : emptyRows(),
      snippets: selectedAgentId ? (snippetsByAgent[selectedAgentId] ?? emptyRows()) : emptyRows(),
      qa: selectedAgentId ? (qaByAgent[selectedAgentId] ?? emptyRows()) : emptyRows(),
      loadFileSources,
      loadSnippetSources,
      loadQaSources,
      setFileSources,
      setSnippetSources,
      setQaSources,
    }),
    [
      selectedAgentId,
      selectedWorkspace,
      usageLoading,
      refreshUsage,
      filesByAgent,
      snippetsByAgent,
      qaByAgent,
      loadFileSources,
      loadSnippetSources,
      loadQaSources,
      setFileSources,
      setSnippetSources,
      setQaSources,
    ]
  );

  return <KnowledgeDataSourcesContext.Provider value={value}>{children}</KnowledgeDataSourcesContext.Provider>;
}

export function useKnowledgeDataSources() {
  return useContext(KnowledgeDataSourcesContext);
}
