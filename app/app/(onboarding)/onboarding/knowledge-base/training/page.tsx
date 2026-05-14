"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { backendFetch } from "@/lib/backend-api";
import { useClientOnboardingAgentId } from "@/lib/use-client-onboarding-agent-id";
import { OnboardingFrame } from "@/components/onboarding/onboarding-frame";
import {
  OnboardingPageHeader,
  OnboardingSectionCard,
  OnboardingStatusBlock,
  OnboardingStickyFooter,
  onboardingType,
} from "@/components/onboarding/onboarding-ui";

function KnowledgeBaseTrainingFallback() {
  return (
    <OnboardingFrame activeItem="Knowledge Base" completedItems={["Agent Name"]} stepLabel="Step 2 of 5">
      <div className="flex min-h-0 w-full min-w-0 flex-col items-center justify-center px-4 py-8 pt-6 pb-[max(6.5rem,calc(4.5rem+env(safe-area-inset-bottom,0px)))] md:min-h-[calc(100dvh-3.5rem)] md:px-8 md:py-10 md:pb-24">
        <p className="text-ds-on-surface-variant text-sm">Loading…</p>
      </div>
    </OnboardingFrame>
  );
}

function looksLikeKnowledgeSourceId(value: string): boolean {
  return /^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i.test(value);
}

function KnowledgeBaseTrainingPageInner() {
  const searchParams = useSearchParams();
  const storedAgentId = useClientOnboardingAgentId();
  const agentId = searchParams.get("agentId") ?? storedAgentId;
  const rawSourceId = searchParams.get("sourceId");
  const sourceId = rawSourceId && looksLikeKnowledgeSourceId(rawSourceId) ? rawSourceId : null;
  const [status, setStatus] = useState<"processing" | "success" | "pending">(sourceId ? "processing" : "pending");
  const [description, setDescription] = useState(
    rawSourceId && !sourceId
      ? "That link is missing a valid knowledge source. Go back to step 2 and run “Start crawl” again."
      : sourceId
        ? "Extracting text from linked pages and normalizing for search."
        : "No source selected. Go back to start a website crawl."
  );

  useEffect(() => {
    if (!sourceId) {
      return;
    }

    let cancelled = false;
    const poll = async () => {
      try {
        const jobs = await backendFetch<{ jobs: Array<{ status: string; error_message?: string | null }> }>(
          `/api/v1/knowledge/sources/${encodeURIComponent(sourceId)}/indexing-jobs`
        );
        if (cancelled) return;
        const latest = jobs.jobs[0];
        if (!latest) return;
        if (latest.status === "succeeded") {
          setStatus("success");
          setDescription("Indexing complete. Your knowledge source is ready for preview.");
        } else if (latest.status === "failed") {
          setStatus("pending");
          setDescription(latest.error_message || "Indexing failed. Try re-running crawl.");
        } else {
          setStatus("processing");
          setDescription("Extracting text from linked pages and normalizing for search.");
        }
      } catch {
        if (!cancelled) {
          setStatus("pending");
          setDescription("Unable to load indexing status right now.");
        }
      }
    };
    void poll();
    const timer = setInterval(() => {
      if (document.visibilityState !== "visible") return;
      void poll();
    }, 4000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [sourceId]);

  const continueHref = useMemo(() => {
    if (!agentId) return "/onboarding/connection";
    return `/onboarding/connection?agentId=${encodeURIComponent(agentId)}`;
  }, [agentId]);

  return (
    <OnboardingFrame
      activeItem="Knowledge Base"
      completedItems={["Agent Name"]}
      stepLabel="Step 2 of 5"
      linkAgentId={agentId}
      footer={
        <OnboardingStickyFooter
          backHref="/onboarding/knowledge-base"
          backLabel="Back"
          primaryHref={continueHref}
          primaryLabel="Continue"
        />
      }
    >
      <div className="flex min-h-0 w-full min-w-0 flex-col items-center justify-center px-4 py-8 pt-6 pb-[max(6.5rem,calc(4.5rem+env(safe-area-inset-bottom,0px)))] md:min-h-[calc(100dvh-3.5rem)] md:px-8 md:py-10 md:pb-24">
        <div className="w-full min-w-0 max-w-lg text-center">
          <OnboardingPageHeader
            kicker="Indexing"
            title="We’re building your knowledge base"
            subtitle="Crawling and processing run in the background. You can continue setup— we’ll notify you when sources are ready to query in the playground."
          />
        </div>

        <div className="mt-6 w-full min-w-0 max-w-md space-y-4 md:mt-8">
          <OnboardingStatusBlock
            variant={status}
            title="Current activity"
            description={description}
          >
            <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-ds-outline/80">
              <div className="onboarding-progress-indeterminate bg-ds-primary h-full rounded-full" />
            </div>
          </OnboardingStatusBlock>

          <OnboardingSectionCard padding="p-4 md:p-5" className="text-left">
            <p className={onboardingType.body}>
              <span className="text-ds-on-surface font-medium">Tip:</span> finish Shopify connection and tone settings
              while indexing completes—you won’t lose progress.
            </p>
          </OnboardingSectionCard>
        </div>
      </div>

      <style jsx>{`
        @keyframes onboarding-indeterminate {
          0% {
            transform: translateX(-100%);
            width: 40%;
          }
          50% {
            transform: translateX(80%);
            width: 55%;
          }
          100% {
            transform: translateX(200%);
            width: 40%;
          }
        }
        .onboarding-progress-indeterminate {
          animation: onboarding-indeterminate 2.2s ease-in-out infinite;
        }
      `}</style>
    </OnboardingFrame>
  );
}

export default function KnowledgeBaseTrainingPage() {
  return (
    <Suspense fallback={<KnowledgeBaseTrainingFallback />}>
      <KnowledgeBaseTrainingPageInner />
    </Suspense>
  );
}
