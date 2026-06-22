"use client";

import { useEffect, useState } from "react";

import { backendFetch } from "@/lib/backend-api";

type OnboardingGatePayload = {
  onboarding_completed: boolean;
  is_admin: boolean;
  test_checkout_enabled: boolean;
};

export function useTestCheckoutEnabled(): { enabled: boolean; ready: boolean } {
  const [enabled, setEnabled] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void backendFetch<OnboardingGatePayload>("/api/v1/me/onboarding-gate")
      .then((gate) => {
        if (!cancelled) setEnabled(Boolean(gate.test_checkout_enabled));
      })
      .catch(() => {
        if (!cancelled) setEnabled(false);
      })
      .finally(() => {
        if (!cancelled) setReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { enabled, ready };
}
