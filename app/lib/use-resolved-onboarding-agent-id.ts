"use client";

import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { useClientOnboardingAgentId } from "@/lib/use-client-onboarding-agent-id";

/** `agentId` query param, else localStorage id (after mount). */
export function useResolvedOnboardingAgentId(): string | null {
  const searchParams = useSearchParams();
  const stored = useClientOnboardingAgentId();
  return useMemo(() => searchParams.get("agentId") ?? stored, [searchParams, stored]);
}
