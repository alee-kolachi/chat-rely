"use client";

import { useEffect, useState } from "react";
import { BackendApiError, backendFetch } from "@/lib/backend-api";

export type PublicPlanFromApi = {
  slug: string;
  name: string;
  monthly_price_cents: number;
  included_conversations: number;
  overage_conversation_cents: number;
  max_agents: number;
  features: Record<string, unknown>;
  throttle_policy: Record<string, unknown>;
  sort_order: number;
};

export function usePublicPlans(): {
  plans: PublicPlanFromApi[] | null;
  error: string | null;
  loading: boolean;
} {
  const [plans, setPlans] = useState<PublicPlanFromApi[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await backendFetch<PublicPlanFromApi[]>("/api/v1/plans/public");
        if (!cancelled) {
          setPlans(data);
        }
      } catch (e) {
        if (!cancelled) {
          const msg =
            e instanceof BackendApiError ? e.message : e instanceof Error ? e.message : "Could not load plans";
          setError(msg);
          setPlans(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return { plans, error, loading };
}

export function formatMonthlyPrice(monthlyPriceCents: number): { price: string; period?: string } {
  if (monthlyPriceCents <= 0) {
    return { price: "$0" };
  }
  const dollars = monthlyPriceCents / 100;
  const rounded = Number.isInteger(dollars) ? String(dollars) : dollars.toFixed(2).replace(/\.?0+$/, "");
  return { price: `$${rounded}`, period: "/mo" };
}
