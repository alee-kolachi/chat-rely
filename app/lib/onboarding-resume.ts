"use client";

import { backendFetch, BackendApiError } from "@/lib/backend-api";

type AgentRow = { id: string; name: string };

/** First non-archived agent for the signed-in user, if any. */
export async function fetchFirstUserAgent(): Promise<AgentRow | null> {
  try {
    const res = await backendFetch<{ agents: AgentRow[] }>("/api/v1/agents");
    return res.agents[0] ?? null;
  } catch {
    return null;
  }
}

export function isPlanAgentLimitError(err: unknown): boolean {
  return err instanceof BackendApiError && err.status === 409 && err.code === "plan.limit_exceeded";
}
