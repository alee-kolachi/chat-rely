"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { backendFetch } from "@/lib/backend-api";
import { getOnboardingAgentId } from "@/lib/onboarding-state";
import { OnboardingFrame } from "@/components/onboarding/onboarding-frame";
import {
  OnboardingMainColumn,
  OnboardingPageHeader,
  OnboardingSectionCard,
  OnboardingStickyFooter,
  onboardingType,
} from "@/components/onboarding/onboarding-ui";

export default function KnowledgeBaseOnboardingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [website, setWebsite] = useState(searchParams.get("website") ?? "");
  const [sourceId, setSourceId] = useState<string | null>(null);
  const [isIndexing, setIsIndexing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const agentId = useMemo(() => searchParams.get("agentId") ?? getOnboardingAgentId(), [searchParams]);

  async function handleStartCrawl() {
    if (!agentId || !website.trim() || isIndexing) return;
    setIsIndexing(true);
    setError(null);
    try {
      const created = await backendFetch<{ source: { id: string } }>("/api/v1/knowledge/sources", {
        method: "POST",
        body: JSON.stringify({
          agent_id: agentId,
          type: "website",
          title: "Primary Website",
          source_url: website.trim(),
        }),
      });
      setSourceId(created.source.id);
      await backendFetch(`/api/v1/knowledge/sources/${created.source.id}/index`, { method: "POST" });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to start crawl");
    } finally {
      setIsIndexing(false);
    }
  }

  function handleContinue() {
    if (!agentId) return;
    const params = new URLSearchParams({ agentId });
    if (sourceId) params.set("sourceId", sourceId);
    router.push(`/onboarding/knowledge-base/training?${params.toString()}`);
  }

  return (
    <OnboardingFrame
      activeItem="Knowledge Base"
      completedItems={["Agent Name"]}
      stepLabel="Step 2 of 6"
    >
      <OnboardingMainColumn className="max-w-4xl">
        <div className="mb-6 flex justify-end">
          <button
            type="button"
            className="text-ds-on-surface-variant hover:text-ds-on-surface text-xs font-semibold tracking-wide uppercase transition-colors"
          >
            Skip for now
          </button>
        </div>

        <OnboardingPageHeader
          kicker="Step 2 · Knowledge"
          title="Add sources your agent can learn from"
          subtitle="Start with your website, then layer files or a live sheet. More sources mean better answers— you can always add more in the dashboard."
        />

        <div className="space-y-6">
          <OnboardingSectionCard>
            <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
              <div className="bg-ds-sidebar text-ds-on-surface flex size-12 shrink-0 items-center justify-center rounded-ds-md border border-ds-outline text-lg font-semibold">
                Web
              </div>
              <div className="min-w-0 flex-1">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <h2 className="text-ds-on-surface text-base font-semibold">Website crawl</h2>
                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-800">
                    Added
                  </span>
                </div>
                <p className={onboardingType.body}>
                  We index public pages for FAQs, policies, and product copy. Crawls run in the background.
                </p>
                <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
                  <input
                    type="url"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                    className="border-ds-outline focus:border-ds-primary focus:ring-ds-primary/15 flex-1 rounded-ds-md border bg-white px-4 py-3 text-sm outline-none focus:ring-2"
                    placeholder="https://example.com"
                  />
                  <button
                    type="button"
                    onClick={handleStartCrawl}
                    disabled={!agentId || !website.trim() || isIndexing}
                    className="bg-ds-primary text-ds-on-primary hover:bg-zinc-800 shrink-0 rounded-ds-md px-5 py-3 text-xs font-semibold tracking-wide uppercase transition-colors"
                  >
                    {isIndexing ? "Indexing..." : "Start crawl"}
                  </button>
                </div>
                {error ? <p className="mt-2 text-xs text-rose-600">{error}</p> : null}
              </div>
            </div>
          </OnboardingSectionCard>

          <OnboardingSectionCard>
            <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
              <div className="bg-ds-sidebar text-ds-on-surface flex size-12 shrink-0 items-center justify-center rounded-ds-md border border-ds-outline text-lg font-semibold">
                Doc
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-ds-on-surface mb-2 text-base font-semibold">Documents</h2>
                <p className={onboardingType.body}>
                  PDFs, DOCX, or CSVs for manuals, rate cards, or internal policies not on the web.
                </p>
                <button
                  type="button"
                  className="border-ds-outline hover:border-ds-primary hover:bg-ds-sidebar/80 mt-4 flex w-full flex-col items-center justify-center rounded-ds-lg border-2 border-dashed bg-ds-sidebar/50 px-6 py-10 transition-colors"
                >
                  <span className="text-ds-on-surface-variant text-sm font-medium">
                    Drop files here or <span className="text-ds-on-surface font-semibold underline">browse</span>
                  </span>
                  <span className="text-ds-on-surface-variant mt-2 text-[11px] font-medium uppercase tracking-wider">
                    Max 50 MB per file
                  </span>
                </button>
              </div>
            </div>
          </OnboardingSectionCard>

          <OnboardingSectionCard>
            <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
              <div className="bg-ds-sidebar text-ds-on-surface flex size-12 shrink-0 items-center justify-center rounded-ds-md border border-ds-outline text-lg font-semibold">
                Sheet
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-ds-on-surface mb-2 text-base font-semibold">Google Sheets</h2>
                <p className={`${onboardingType.body} mb-4`}>
                  Optional live rows for pricing, inventory, or seasonal FAQs that change often.
                </p>
                <button
                  type="button"
                  className="border-ds-outline hover:bg-ds-outline/40 inline-flex items-center gap-2 rounded-ds-md border bg-white px-4 py-2.5 text-sm font-semibold transition-colors"
                >
                  Connect Google Sheets
                </button>
              </div>
            </div>
          </OnboardingSectionCard>
        </div>

        <p className="text-ds-on-surface-variant mt-8 flex items-start gap-2 text-xs leading-relaxed">
          <span className="text-ds-on-surface-variant mt-0.5 shrink-0" aria-hidden>
            ℹ
          </span>
          You can add or remove sources anytime from Knowledge in the dashboard.
        </p>
      </OnboardingMainColumn>

      <OnboardingStickyFooter
        backHref="/onboarding"
        backLabel="Back"
        primaryAsButton
        onPrimaryClick={handleContinue}
        primaryDisabled={!agentId}
        primaryLabel="Continue"
      />
    </OnboardingFrame>
  );
}
