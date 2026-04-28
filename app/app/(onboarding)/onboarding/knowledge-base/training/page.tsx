"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { backendFetch } from "@/lib/backend-api";
import { OnboardingFrame } from "@/components/onboarding/onboarding-frame";
import {
  OnboardingPageHeader,
  OnboardingSectionCard,
  OnboardingStatusBlock,
  OnboardingStickyFooter,
  onboardingType,
} from "@/components/onboarding/onboarding-ui";

export default function KnowledgeBaseTrainingPage() {
  const searchParams = useSearchParams();
  const agentId = searchParams.get("agentId");
  const sourceId = searchParams.get("sourceId");
  const [status, setStatus] = useState<"processing" | "success" | "pending">(sourceId ? "processing" : "pending");
  const [description, setDescription] = useState(
    sourceId
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
          `/api/v1/knowledge/sources/${sourceId}/indexing-jobs`
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
    const timer = setInterval(() => void poll(), 4000);
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
      stepLabel="Step 2 of 6"
    >
      <div className="flex min-h-[calc(100vh-3.5rem)] flex-col items-center justify-center px-4 pb-24 pt-10 md:px-8">
        <div className="w-full max-w-lg text-center">
          <OnboardingPageHeader
            kicker="Indexing"
            title="We’re building your knowledge base"
            subtitle="Crawling and processing run in the background. You can continue setup— we’ll notify you when sources are ready to query in the playground."
          />
        </div>

        <div className="mt-8 w-full max-w-md space-y-4">
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

      <OnboardingStickyFooter
        backHref="/onboarding/knowledge-base"
        backLabel="Back"
        primaryHref={continueHref}
        primaryLabel="Continue setup"
      />

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
