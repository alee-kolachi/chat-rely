"use client";

import type { ReactNode } from "react";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { backendFetch } from "@/lib/backend-api";

type UsageSnapshot = {
  period_start: string;
  period_end: string;
  included_conversations: number;
  billable_conversations: number;
  overage_conversations: number;
  estimated_overage_cents: number;
  throttle_tier: string;
};

export type MeContextPayload = {
  profile: { id: string; full_name: string | null };
  subscription: {
    id: string;
    status: string;
    current_period_start: string;
    current_period_end: string;
    cancel_at_period_end: boolean;
    provider_customer_id: string | null;
    provider_subscription_id: string | null;
  };
  plan: {
    slug: string;
    name: string;
    monthly_price_cents: number;
    included_conversations: number;
    max_agents: number;
    overage_conversation_cents: number;
  };
  usage_snapshot: UsageSnapshot | null;
};

type MeContextValue = {
  data: MeContextPayload | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
};

const MeContext = createContext<MeContextValue | null>(null);

export function MeContextProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<MeContextPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [, meContext] = await Promise.all([
        backendFetch("/api/v1/bootstrap/me", { method: "POST" }),
        backendFetch<MeContextPayload>("/api/v1/me/context"),
      ]);
      setData(meContext);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load account context");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const value = useMemo(
    () => ({
      data,
      loading,
      error,
      refresh,
    }),
    [data, loading, error, refresh]
  );

  return <MeContext.Provider value={value}>{children}</MeContext.Provider>;
}

export function useMeContext() {
  const ctx = useContext(MeContext);
  if (!ctx) {
    throw new Error("useMeContext must be used within MeContextProvider");
  }
  return ctx;
}
