"use client";

import { useEffect, useState } from "react";
import { getOnboardingAgentId } from "@/lib/onboarding-state";

/**
 * Reads onboarding agent id from localStorage only after mount so the first
 * client render matches SSR (both see `null`). Calling `getOnboardingAgentId()`
 * during the initial render causes hydration mismatches when the URL omits
 * `agentId` but storage has a value — on real devices that can break React's
 * event wiring for the whole subtree.
 */
export function useClientOnboardingAgentId(): string | null {
  const [id, setId] = useState<string | null>(null);
  useEffect(() => {
    queueMicrotask(() => setId(getOnboardingAgentId()));
  }, []);
  return id;
}
