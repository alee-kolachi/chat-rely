"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { BackendApiError, backendFetch } from "@/lib/backend-api";
import { getOnboardingAgentId } from "@/lib/onboarding-state";
import { useResolvedOnboardingAgentId } from "@/lib/use-resolved-onboarding-agent-id";
import { OnboardingFrame } from "@/components/onboarding/onboarding-frame";
import {
  OnboardingFieldRow,
  OnboardingMainColumn,
  onboardingSplitBody,
  onboardingSplitCard,
  onboardingSplitGrid,
  onboardingSplitRoot,
  OnboardingStickyFooter,
} from "@/components/onboarding/onboarding-ui";

type OnboardingWebsiteResponse = {
  source_id: string;
  job_id: string;
  status: string;
  website_url: string;
  pages: Array<{ url: string; path: string; status: string }>;
  preview_image_url: string | null;
};

function faviconServiceUrl(siteUrl: string): string {
  try {
    const host = new URL(siteUrl).hostname;
    return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(host)}&sz=128`;
  } catch {
    return "";
  }
}

function KnowledgeBaseOnboardingFallback() {
  return (
    <OnboardingFrame
      activeItem="Knowledge Base"
      completedItems={["Agent Name"]}
      stepLabel="Step 2 of 6"
      footer={
        <OnboardingStickyFooter
          backHref="/onboarding"
          backLabel="Back"
          primaryAsButton
          onPrimaryClick={() => {}}
          primaryDisabled
          primaryLabel="Continue"
        />
      }
    >
      <OnboardingMainColumn className={onboardingSplitRoot}>
        <p className="text-ds-on-surface-variant text-sm">Loading…</p>
      </OnboardingMainColumn>
    </OnboardingFrame>
  );
}

function KnowledgeBaseOnboardingPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [website, setWebsite] = useState("");
  const websiteSeededRef = useRef(false);

  useEffect(() => {
    if (websiteSeededRef.current) return;
    websiteSeededRef.current = true;
    const fromUrl = searchParams.get("website");
    if (!fromUrl) return;
    queueMicrotask(() => setWebsite(fromUrl));
  }, [searchParams]);

  const [sourceId, setSourceId] = useState<string | null>(null);
  const [crawlPhase, setCrawlPhase] = useState<"idle" | "working" | "done" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [indexedUrl, setIndexedUrl] = useState<string | null>(null);
  const [crawlPages, setCrawlPages] = useState<OnboardingWebsiteResponse["pages"]>([]);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const [previewImageFailed, setPreviewImageFailed] = useState(false);
  const agentId = useResolvedOnboardingAgentId();

  const canContinue = useMemo(() => crawlPhase === "done" && !!sourceId, [crawlPhase, sourceId]);

  function resolveAgentId(): string | null {
    return searchParams.get("agentId") ?? getOnboardingAgentId() ?? agentId;
  }

  function isValidUuid(value: string): boolean {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
  }

  function normalizeWebsiteUrl(input: string): { website_url: string; title: string } {
    const raw = input.trim().replace(/^https?:\/\//i, "");
    const host = raw.split("/")[0] ?? "";
    const website_url = `https://${raw}`;
    const title = (host || "website").slice(0, 255) || "Website";
    return { website_url, title };
  }

  const previewTargetUrl = useMemo(() => {
    if (indexedUrl) return indexedUrl;
    const t = website.trim();
    if (!t) return null;
    return normalizeWebsiteUrl(t).website_url;
  }, [indexedUrl, website]);

  async function handleStartCrawl() {
    const id = resolveAgentId();
    if (!website.trim() || crawlPhase === "working") return;
    if (!id) {
      setError("Missing agent id. Go back to step 1 or open this step from the setup link with ?agentId=…");
      return;
    }
    if (!isValidUuid(id)) {
      setError(
        "This session is using a demo agent id. Sign in and complete step 1 with a real agent to crawl and index your site."
      );
      return;
    }
    setCrawlPhase("working");
    setError(null);
    setSourceId(null);
    setIndexedUrl(null);
    setCrawlPages([]);
    setPreviewImageUrl(null);
    setPreviewImageFailed(false);

    const { website_url, title } = normalizeWebsiteUrl(website);

    try {
      const res = await backendFetch<OnboardingWebsiteResponse>("/api/v1/onboarding/website", {
        method: "POST",
        body: JSON.stringify({
          agent_id: id,
          website_url,
          title,
        }),
      });
      setSourceId(res.source_id);
      setIndexedUrl(res.website_url || website_url);
      setCrawlPages(res.pages ?? []);
      setPreviewImageUrl(res.preview_image_url ?? null);
      setPreviewImageFailed(false);
      setCrawlPhase("done");
    } catch (e) {
      const msg =
        e instanceof BackendApiError ? e.message : e instanceof Error ? e.message : "Could not crawl and index site";
      setError(msg);
      setCrawlPhase("error");
      setSourceId(null);
      setIndexedUrl(null);
      setCrawlPages([]);
      setPreviewImageUrl(null);
      setPreviewImageFailed(false);
    }
  }

  function handleContinue() {
    const id = resolveAgentId();
    if (!id) return;
    const params = new URLSearchParams({ agentId: id });
    if (sourceId) params.set("sourceId", sourceId);
    router.push(`/onboarding/knowledge-base/training?${params.toString()}`);
  }

  return (
    <OnboardingFrame
      activeItem="Knowledge Base"
      completedItems={["Agent Name"]}
      stepLabel="Step 2 of 6"
      linkAgentId={agentId}
      footer={
        <OnboardingStickyFooter
          backHref="/onboarding"
          backLabel="Back"
          primaryAsButton
          onPrimaryClick={handleContinue}
          primaryDisabled={!canContinue}
          primaryLabel="Continue"
        />
      }
    >
      <OnboardingMainColumn className={onboardingSplitRoot}>
        <div className={onboardingSplitBody}>
          <div
            className="pointer-events-none absolute inset-0 -z-10 rounded-[36px] opacity-80"
            style={{
              background:
                "radial-gradient(circle at 15% 20%, rgba(56,189,248,0.16), transparent 36%), radial-gradient(circle at 85% 80%, rgba(167,139,250,0.14), transparent 40%), linear-gradient(180deg, rgba(248,250,252,0.92), rgba(244,244,245,0.65))",
            }}
            aria-hidden
          />

          <div className={onboardingSplitCard}>
            <div className={onboardingSplitGrid}>
              <section className="flex flex-col justify-center p-6 sm:p-8 max-lg:min-h-min lg:min-h-0 lg:h-full lg:p-10">
                <div>
                  <p className="text-ds-on-surface-variant mb-3 text-[11px] font-semibold tracking-[0.18em] uppercase">
                    Step 2
                  </p>
                  <h1 className="text-ds-on-surface text-2xl font-semibold tracking-tight sm:text-3xl lg:text-[2rem]">
                    Add knowledge sources for smarter answers
                  </h1>
                  <p className="text-ds-on-surface-variant mt-2 text-sm leading-relaxed">
                    During onboarding, we only use your website. Documents and Google Sheets can be connected later
                    from the dashboard.
                  </p>

                  <div className="mt-8 space-y-5 sm:mt-10">
                    <div className="border-ds-outline rounded-ds-lg border bg-white p-4">
                      <OnboardingFieldRow
                        id="website-url"
                        label="Primary website"
                        labelClassName="mb-2 text-[14px] leading-[14px] font-medium"
                      >
                        <div className="border-ds-outline focus-within:border-ds-primary focus-within:ring-ds-primary/15 flex overflow-hidden rounded-ds-md border bg-white transition-[box-shadow,border-color] focus-within:ring-2">
                          <span className="text-ds-on-surface-variant bg-ds-sidebar border-ds-outline inline-flex items-center border-r px-3 text-sm font-normal sm:px-4">
                            https://
                          </span>
                          <input
                            id="website-url"
                            type="text"
                            value={website}
                            onChange={(e) => setWebsite(e.target.value)}
                            onInput={(e) => setWebsite((e.target as HTMLInputElement).value)}
                            placeholder="example.com"
                            inputMode="url"
                            disabled={crawlPhase === "working" || crawlPhase === "done"}
                            className="placeholder:text-ds-on-surface-variant/70 text-ds-on-surface w-full border-none bg-transparent px-3 py-3.5 text-sm font-normal outline-none sm:px-4 disabled:opacity-60"
                          />
                        </div>
                      </OnboardingFieldRow>
                      <div className="mt-3 flex justify-end">
                        <button
                          type="button"
                          onClick={handleStartCrawl}
                          disabled={!website.trim() || crawlPhase === "working" || crawlPhase === "done"}
                          className="bg-ds-primary text-ds-on-primary hover:bg-zinc-800 touch-manipulation min-h-11 rounded-ds-md px-5 py-2.5 text-sm font-semibold transition-colors disabled:pointer-events-none disabled:opacity-45 [-webkit-tap-highlight-color:transparent]"
                        >
                          {crawlPhase === "working"
                            ? "Crawling & indexing…"
                            : crawlPhase === "done"
                              ? "Crawl complete"
                              : "Start crawl"}
                        </button>
                      </div>
                      {error ? <p className="mt-2 text-sm text-rose-600">{error}</p> : null}
                    </div>

                    {crawlPhase === "working" ? (
                      <div className="border-ds-outline rounded-ds-lg border bg-white p-4">
                        <p className="text-ds-on-surface text-sm font-medium">Indexing your site</p>
                        <p className="text-ds-on-surface-variant mt-2 text-sm leading-relaxed">
                          Fetching up to five pages on your domain, extracting text, chunking, and embedding for search.
                          This usually takes under a minute.
                        </p>
                        <div className="mt-4 flex items-center gap-2 text-sm text-ds-on-surface-variant">
                          <span
                            className="border-ds-outline size-4 shrink-0 animate-spin rounded-full border-2 border-t-ds-primary"
                            aria-hidden
                          />
                          Working…
                        </div>
                      </div>
                    ) : null}

                    {crawlPhase === "done" && crawlPages.length > 0 ? (
                      <div className="border-ds-outline rounded-ds-lg border bg-white p-4">
                        <p className="text-ds-on-surface text-sm font-semibold">Pages indexed</p>
                        <ul className="mt-3 max-h-48 space-y-2 overflow-y-auto pr-1 text-sm">
                          {crawlPages.map((p) => (
                            <li key={p.url} className="text-ds-on-surface flex items-start gap-2 leading-snug">
                              <span className="text-emerald-600" aria-hidden>
                                ✓
                              </span>
                              <span className="min-w-0 break-all">
                                <span className="font-medium">{p.path || "/"}</span>
                                {p.status !== "parsed" ? (
                                  <span className="text-ds-on-surface-variant ml-1 text-xs">({p.status})</span>
                                ) : null}
                              </span>
                            </li>
                          ))}
                        </ul>
                        <p className="text-ds-on-surface-variant border-ds-outline mt-3 border-t pt-3 text-xs leading-relaxed">
                          You can continue—training and the playground use this knowledge next.
                        </p>
                      </div>
                    ) : null}
                  </div>
                </div>
              </section>

              <section className="bg-ds-sidebar border-ds-outline relative flex flex-col items-center justify-center border-t p-6 sm:p-8 max-lg:min-h-min lg:min-h-0 lg:h-full lg:border-t-0 lg:border-l lg:p-10">
                <div
                  className="pointer-events-none absolute inset-0 opacity-35"
                  style={{
                    backgroundImage:
                      "radial-gradient(color-mix(in srgb, var(--ds-on-surface-variant) 22%, transparent) 1px, transparent 1px)",
                    backgroundSize: "20px 20px",
                  }}
                  aria-hidden
                />
                <div className="relative mx-auto w-full max-w-[400px]">
                  <div className="border-ds-outline flex min-h-[18rem] w-full flex-col overflow-hidden rounded-2xl border bg-ds-surface shadow-xl sm:min-h-[24rem] lg:min-h-[520px]">
                    <div className="border-ds-outline flex items-center justify-between border-b bg-white px-4 py-3">
                      <div>
                        <h3 className="text-ds-on-surface text-sm font-semibold">Website preview</h3>
                        <p className="text-ds-secondary text-[11px]">
                          Social preview image when available — live iframes are usually blocked
                        </p>
                      </div>
                      {previewTargetUrl ? (
                        <a
                          href={previewTargetUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-ds-primary shrink-0 text-xs font-semibold hover:underline"
                        >
                          Open
                        </a>
                      ) : (
                        <span className="text-ds-on-surface-variant text-sm" aria-hidden>
                          ⋮
                        </span>
                      )}
                    </div>
                    <div className="flex min-h-0 flex-1 flex-col gap-3 p-4">
                      <div className="border-ds-outline flex min-h-0 flex-1 flex-col overflow-hidden rounded-ds-md border bg-white">
                        <div className="border-ds-outline flex items-center gap-2 border-b px-3 py-2">
                          <span className="h-2 w-2 rounded-full bg-rose-400" />
                          <span className="h-2 w-2 rounded-full bg-amber-400" />
                          <span className="h-2 w-2 rounded-full bg-emerald-400" />
                          <p className="text-ds-on-surface-variant ml-1 truncate text-[11px]" title={previewTargetUrl ?? undefined}>
                            {previewTargetUrl ?? "Enter a URL and start crawl"}
                          </p>
                        </div>
                        <div className="relative min-h-0 flex-1 bg-zinc-100">
                          {previewTargetUrl && (crawlPhase === "working" || crawlPhase === "done") ? (
                            <>
                              {crawlPhase === "done" &&
                              previewImageUrl &&
                              !previewImageFailed ? (
                                // eslint-disable-next-line @next/next/no-img-element -- remote og:image from crawled site
                                <img
                                  src={previewImageUrl}
                                  alt=""
                                  className="size-full max-h-[min(420px,55vh)] min-h-[200px] border-0 object-cover object-top sm:min-h-[280px]"
                                  referrerPolicy="no-referrer"
                                  onError={() => setPreviewImageFailed(true)}
                                />
                              ) : (
                                <div className="text-ds-on-surface flex size-full min-h-[200px] flex-col items-center justify-center gap-3 p-6 text-center sm:min-h-[280px]">
                                  {faviconServiceUrl(previewTargetUrl) ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img
                                      src={faviconServiceUrl(previewTargetUrl)}
                                      alt=""
                                      className="size-16 rounded-xl border border-black/5 bg-white shadow-sm"
                                      width={64}
                                      height={64}
                                    />
                                  ) : null}
                                  <p className="max-w-[280px] text-sm leading-snug">
                                    {crawlPhase === "working"
                                      ? "Crawling and indexing on the server…"
                                      : previewImageUrl && previewImageFailed
                                        ? "Could not load the preview image (hotlink or CORS)."
                                        : "No og:image / Twitter card image on the first page. Your pages were still indexed."}
                                  </p>
                                </div>
                              )}
                              {crawlPhase === "working" ? (
                                <div className="bg-ds-surface/90 absolute inset-0 flex flex-col items-center justify-center gap-2 p-4 text-center text-sm text-ds-on-surface">
                                  <span
                                    className="border-ds-outline size-8 animate-spin rounded-full border-2 border-t-ds-primary"
                                    aria-hidden
                                  />
                                  Crawling and embedding…
                                </div>
                              ) : null}
                            </>
                          ) : (
                            <div
                              className="text-ds-on-surface-variant flex size-full min-h-[200px] flex-col items-center justify-center gap-2 p-6 text-center text-sm sm:min-h-[280px]"
                              role="status"
                            >
                              <p>Your preview will appear here after you start a crawl.</p>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="border-ds-outline rounded-ds-md border bg-white p-3">
                        <p className="text-ds-on-surface text-sm font-semibold">Crawl status</p>
                        <p className="text-ds-on-surface-variant mt-1 text-xs">
                          {crawlPhase === "idle"
                            ? "Not started"
                            : crawlPhase === "working"
                              ? "Crawling up to 5 pages, then chunking and embedding"
                              : crawlPhase === "error"
                                ? "Failed—see message on the left"
                                : crawlPages.length
                                  ? `Indexed ${crawlPages.length} page${crawlPages.length === 1 ? "" : "s"}`
                                  : "Complete"}
                        </p>
                      </div>
                      <div className="border-ds-outline rounded-ds-md border bg-white p-3">
                        <p className="text-ds-on-surface text-sm font-semibold">Next after onboarding</p>
                        <p className="text-ds-on-surface-variant mt-1 text-xs">
                          Add Documents and Google Sheets from the dashboard knowledge section.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            </div>
          </div>
        </div>
      </OnboardingMainColumn>
    </OnboardingFrame>
  );
}

export default function KnowledgeBaseOnboardingPage() {
  return (
    <Suspense fallback={<KnowledgeBaseOnboardingFallback />}>
      <KnowledgeBaseOnboardingPageInner />
    </Suspense>
  );
}
