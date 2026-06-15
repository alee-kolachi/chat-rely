"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { backendFetch } from "@/lib/backend-api";
import {
  isSitemapScaleImport,
  parseOnboardingIndexingJob,
  type OnboardingIndexingContext,
  type OnboardingIndexingSnapshot,
} from "@/lib/onboarding-indexing";

type OnboardingStatusPayload = {
  website_url: string | null;
  indexing_job: Record<string, unknown> | null;
  knowledge_storage_limit_reached?: boolean;
  knowledge_plan_storage_cap_bytes?: number;
  knowledge_used_storage_bytes?: number;
  knowledge_remaining_storage_bytes?: number;
  knowledge_effective_storage_cap_bytes?: number;
};

const FREE_TIER_CAP_BYTES = 600_000;
const STALL_POLLS_FOR_SITEMAP = 5;

function indexingContextFromStatus(status: OnboardingStatusPayload): OnboardingIndexingContext {
  return {
    knowledge_storage_limit_reached: status.knowledge_storage_limit_reached,
    knowledge_plan_storage_cap_bytes: status.knowledge_plan_storage_cap_bytes,
    knowledge_used_storage_bytes: status.knowledge_used_storage_bytes,
    knowledge_remaining_storage_bytes: status.knowledge_remaining_storage_bytes,
    knowledge_effective_storage_cap_bytes: status.knowledge_effective_storage_cap_bytes,
  };
}

export function useOnboardingIndexingStatus(agentId: string | null | undefined, pollMs = 3000) {
  const [snapshot, setSnapshot] = useState<OnboardingIndexingSnapshot>(() =>
    parseOnboardingIndexingJob(null),
  );
  const [websiteUrl, setWebsiteUrl] = useState<string | null>(null);
  const stallRef = useRef({ pagesProcessed: -1, pct: -1, polls: 0 });

  const refresh = useCallback(async () => {
    if (!agentId) return;
    try {
      const status = await backendFetch<OnboardingStatusPayload>(
        `/api/v1/onboarding/status?agent_id=${encodeURIComponent(agentId)}`,
      );
      setWebsiteUrl(status.website_url);

      const job = status.indexing_job;
      const pagesProcessed = Number(job?.pages_processed) || 0;
      const pagesTotal = Number(job?.pages_total) || 0;
      const pct = Number(job?.progress_pct) || 0;
      const jobStatus = String(job?.status ?? "").toLowerCase();
      const running = jobStatus === "queued" || jobStatus === "running";
      const planCap =
        status.knowledge_plan_storage_cap_bytes || Number(job?.plan_storage_cap_bytes) || 0;

      let stalledSitemapImport = false;
      if (
        running &&
        planCap > 0 &&
        planCap <= FREE_TIER_CAP_BYTES &&
        isSitemapScaleImport(pagesProcessed, pagesTotal) &&
        pct <= 24
      ) {
        if (pagesProcessed === stallRef.current.pagesProcessed && pct === stallRef.current.pct) {
          stallRef.current.polls += 1;
        } else {
          stallRef.current = { pagesProcessed, pct, polls: 0 };
        }
        stalledSitemapImport = stallRef.current.polls >= STALL_POLLS_FOR_SITEMAP;
      } else {
        stallRef.current = { pagesProcessed: -1, pct: -1, polls: 0 };
      }

      const context: OnboardingIndexingContext = {
        ...indexingContextFromStatus(status),
        stalledSitemapImport,
      };
      setSnapshot(parseOnboardingIndexingJob(job, context));
    } catch {
      /* keep last snapshot */
    }
  }, [agentId]);

  useEffect(() => {
    if (!agentId) {
      queueMicrotask(() => {
        setSnapshot(parseOnboardingIndexingJob(null));
        setWebsiteUrl(null);
        stallRef.current = { pagesProcessed: -1, pct: -1, polls: 0 };
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
