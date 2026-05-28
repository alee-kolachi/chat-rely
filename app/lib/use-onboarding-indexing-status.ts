"use client";

import { useCallback, useEffect, useState } from "react";
import { backendFetch } from "@/lib/backend-api";
import { parseOnboardingIndexingJob, type OnboardingIndexingSnapshot } from "@/lib/onboarding-indexing";

type OnboardingStatusPayload = {
  website_url: string | null;
  indexing_job: Record<string, unknown> | null;
};

export function useOnboardingIndexingStatus(agentId: string | null | undefined, pollMs = 3000) {
  const [snapshot, setSnapshot] = useState<OnboardingIndexingSnapshot>(() =>
    parseOnboardingIndexingJob(null),
  );
  const [websiteUrl, setWebsiteUrl] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!agentId) return;
    try {
      const status = await backendFetch<OnboardingStatusPayload>(
        `/api/v1/onboarding/status?agent_id=${encodeURIComponent(agentId)}`,
      );
      setWebsiteUrl(status.website_url);
      setSnapshot(parseOnboardingIndexingJob(status.indexing_job));
    } catch {
      /* keep last snapshot */
    }
  }, [agentId]);

  useEffect(() => {
    if (!agentId) {
      queueMicrotask(() => {
        setSnapshot(parseOnboardingIndexingJob(null));
        setWebsiteUrl(null);
      });
      return;
    }
    queueMicrotask(() => {
      void refresh();
    });
    const timer = setInterval(() => {
      if (document.visibilityState !== "visible") return;
      void refresh();
    }, pollMs);
    return () => clearInterval(timer);
  }, [agentId, pollMs, refresh]);

  const showBanner = Boolean(websiteUrl && snapshot.headline);

  return { snapshot, websiteUrl, showBanner, refresh };
}
