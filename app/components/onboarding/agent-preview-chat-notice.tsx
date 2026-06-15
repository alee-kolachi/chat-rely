"use client";

import { OnboardingIndexingProgress } from "@/components/onboarding/onboarding-indexing-progress";
import type { OnboardingIndexingSnapshot } from "@/lib/onboarding-indexing";
import { cn } from "@/lib/utils";

export function agentPreviewChatStatusLine(snapshot: OnboardingIndexingSnapshot): string | undefined {
  if (snapshot.storageLimitReached) {
    return "Partial import · answers may be limited";
  }
  if (snapshot.running) {
    return "Importing site · not-sure answers are normal";
  }
  if (snapshot.failed) {
    return "Import incomplete · answers may be limited";
  }
  return undefined;
}

export function AgentPreviewChatNotice({
  snapshot,
  siteName,
  className,
}: {
  snapshot: OnboardingIndexingSnapshot;
  siteName: string;
  className?: string;
}) {
  const site = siteName.trim() || "your site";

  if (snapshot.storageLimitReached) {
    return (
      <div
        className={cn(
          "rounded-ds-lg border border-amber-300/80 bg-amber-50 px-3.5 py-3 shadow-sm sm:px-4",
          className,
        )}
        role="status"
        aria-live="polite"
      >
        <p className="text-sm font-semibold text-amber-950">Partial site import</p>
        <p className="mt-1 text-sm leading-relaxed text-amber-900/90">
          Only part of {site} was imported on your plan. If the agent says it is not sure, that often
          means those pages were not imported yet.
        </p>
        <OnboardingIndexingProgress snapshot={snapshot} variant="card" className="border-amber-200/80" />
      </div>
    );
  }

  if (snapshot.running) {
    return (
      <div
        className={cn(
          "rounded-ds-lg border border-sky-300/90 bg-sky-50 px-3.5 py-3 shadow-sm sm:px-4",
          className,
        )}
        role="status"
        aria-live="polite"
      >
        <p className="text-sm font-semibold text-sky-950">Still reading your site</p>
        <p className="mt-1 text-sm leading-relaxed text-sky-900/90">
          We are importing {site}. Until more pages are ready, the agent may say it is not sure about
          policies or products. That is expected while import runs, not a sign the bot is broken.
        </p>
        <OnboardingIndexingProgress snapshot={snapshot} variant="card" className="border-sky-200/80" />
      </div>
    );
  }

  if (snapshot.failed) {
    return (
      <div
        className={cn(
          "rounded-ds-lg border border-amber-300/80 bg-amber-50 px-3.5 py-3 shadow-sm sm:px-4",
          className,
        )}
        role="status"
        aria-live="polite"
      >
        <p className="text-sm font-semibold text-amber-950">Site import incomplete</p>
        <p className="mt-1 text-sm leading-relaxed text-amber-900/90">
          Import hit a snag, so answers may stay limited until you retry from Knowledge Base. Not-sure
          replies can be normal until more of {site} is ready.
        </p>
      </div>
    );
  }

  return null;
}
