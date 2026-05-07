"use client";

import type { ReactNode } from "react";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { backendFetch } from "@/lib/backend-api";

const STORAGE_KEY = "chatrely:dashboard:selected-agent-id";

export type DashboardAgentRecord = {
  id: string;
  name: string;
  model: string;
  system_prompt: string;
  /** Public embed key for `X-ChatRely-Agent-Key` / `data-chatrely-agent-key` (safe in storefront HTML). */
  public_key: string;
  /** JSON from API — e.g. `tone`, `brand_color`, `widget_position` from onboarding. */
  behavior_settings?: Record<string, unknown> | null;
};

type DashboardAgentContextValue = {
  agents: DashboardAgentRecord[];
  selectedAgentId: string;
  setSelectedAgentId: (id: string) => void;
  selectedAgent: DashboardAgentRecord | null;
  agentsLoading: boolean;
  agentsError: string | null;
  refreshAgents: () => Promise<void>;
};

const DashboardAgentContext = createContext<DashboardAgentContextValue | null>(null);

export function DashboardAgentProvider({ children }: { children: ReactNode }) {
  const [agents, setAgents] = useState<DashboardAgentRecord[]>([]);
  const [selectedAgentId, setSelectedAgentIdState] = useState("");
  const [agentsLoading, setAgentsLoading] = useState(true);
  const [agentsError, setAgentsError] = useState<string | null>(null);

  const refreshAgents = useCallback(async () => {
    setAgentsLoading(true);
    setAgentsError(null);
    try {
      const data = await backendFetch<{ agents: DashboardAgentRecord[] }>("/api/v1/agents");
      const list = data.agents;
      setAgents(list);
      setSelectedAgentIdState((prev) => {
        if (prev && list.some((a) => a.id === prev)) return prev;
        const saved = typeof window !== "undefined" ? window.localStorage.getItem(STORAGE_KEY) : null;
        const fromSaved = saved ? list.find((a) => a.id === saved) : undefined;
        const nextId = fromSaved?.id ?? list[0]?.id ?? "";
        if (nextId && typeof window !== "undefined") window.localStorage.setItem(STORAGE_KEY, nextId);
        return nextId;
      });
    } catch (e) {
      setAgentsError(e instanceof Error ? e.message : "Failed to load agents");
    } finally {
      setAgentsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshAgents();
  }, [refreshAgents]);

  const setSelectedAgentId = useCallback((id: string) => {
    setSelectedAgentIdState(id);
    if (typeof window !== "undefined" && id) window.localStorage.setItem(STORAGE_KEY, id);
  }, []);

  const selectedAgent = useMemo(
    () => agents.find((a) => a.id === selectedAgentId) ?? null,
    [agents, selectedAgentId]
  );

  const value = useMemo(
    () => ({
      agents,
      selectedAgentId,
      setSelectedAgentId,
      selectedAgent,
      agentsLoading,
      agentsError,
      refreshAgents,
    }),
    [agents, selectedAgentId, setSelectedAgentId, selectedAgent, agentsLoading, agentsError, refreshAgents]
  );

  return <DashboardAgentContext.Provider value={value}>{children}</DashboardAgentContext.Provider>;
}

export function useDashboardAgent(): DashboardAgentContextValue {
  const ctx = useContext(DashboardAgentContext);
  if (!ctx) {
    throw new Error("useDashboardAgent must be used within DashboardAgentProvider");
  }
  return ctx;
}
