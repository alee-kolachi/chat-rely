"use client";

import { Suspense, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useDashboardAgent } from "@/components/layout/dashboard-agent-context";

function DashboardAgentUrlSyncInner() {
  const searchParams = useSearchParams();
  const agent = searchParams.get("agent");
  const { agents, selectedAgentId, setSelectedAgentId } = useDashboardAgent();

  useEffect(() => {
    const id = agent?.trim();
    if (!id) return;
    const match = agents.some((a) => a.id === id);
    if (match && id !== selectedAgentId) {
      setSelectedAgentId(id);
    }
  }, [agent, agents, selectedAgentId, setSelectedAgentId]);

  return null;
}

export function DashboardAgentUrlSync() {
  return (
    <Suspense fallback={null}>
      <DashboardAgentUrlSyncInner />
    </Suspense>
  );
}
