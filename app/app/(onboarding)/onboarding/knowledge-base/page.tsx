"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { BackendApiError, backendFetch } from "@/lib/backend-api";
import { getOnboardingAgentId, onboardingHref, saveOnboardingAgentId } from "@/lib/onboarding-state";
import { useResolvedOnboardingAgentId } from "@/lib/use-resolved-onboarding-agent-id";
import { useOnboardingIndexingStatus } from "@/lib/use-onboarding-indexing-status";
import {
  buildWebsiteUrl,
  displayPathFromUrl,
  hostnameAccentColor,
  stripUrlScheme,
  type WebsiteScheme,
} from "@/lib/website-url";
import { cn } from "@/lib/utils";
import { OnboardingFrame } from "@/components/onboarding/onboarding-frame";
import {
  OnboardingFieldRow,
  OnboardingMainColumn,
  onboardingSplitBody,
  onboardingSplitCardFilled,
  onboardingSplitGrid,
  onboardingSplitLeftSection,
  onboardingSplitPreviewShell,
  onboardingSplitPreviewWrap,
  onboardingSplitRightSectionCentered,
  onboardingSplitRoot,
  OnboardingStickyFooter,
} from "@/components/onboarding/onboarding-ui";

type CrawlPage = { url: string; path: string; status: string };

type OnboardingWebsiteResponse = {
  source_id: string;
  job_id: string;
  status: string;
  website_url: string;
  pages: CrawlPage[];
};

type WebsitePagesResponse = {
  pages: Array<{ url: string; status: string }>;
  total: number;
};

type OnboardingStatusPayload = {
  website_url: string | null;
  website_title: string | null;
};

type KnowledgeSourceRow = {
  id: string;
  type: string;
  source_url: string | null;
};

const PAGE_REVEAL_MS = 450;
/** ~3 list rows visible; additional pages scroll inside the list. */
const VISIBLE_PAGE_ROWS = 3;
const PAGE_ROW_REM = 1.75;

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
      stepLabel="Step 2 of 5"
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
  const [websiteScheme, setWebsiteScheme] = useState<WebsiteScheme>("https://");
  const [website, setWebsite] = useState("");
  const websiteSeededRef = useRef(false);

  useEffect(() => {
    if (websiteSeededRef.current) return;
    websiteSeededRef.current = true;
    const fromUrl = searchParams.get("website");
    if (!fromUrl) return;
    queueMicrotask(() => {
      const lower = fromUrl.toLowerCase();
      if (lower.startsWith("http://")) {
        setWebsiteScheme("http://");
        setWebsite(fromUrl.slice(7));
      } else if (lower.startsWith("https://")) {
        setWebsiteScheme("https://");
        setWebsite(fromUrl.slice(8));
      } else {
        setWebsite(fromUrl);
      }
    });
  }, [searchParams]);

  const [sourceId, setSourceId] = useState<string | null>(null);
  const [crawlPhase, setCrawlPhase] = useState<"idle" | "submitting" | "active" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [indexedUrl, setIndexedUrl] = useState<string | null>(null);
  const [previewHostname, setPreviewHostname] = useState<string | null>(null);
  const [crawlPages, setCrawlPages] = useState<CrawlPage[]>([]);
  const [revealedCount, setRevealedCount] = useState(0);
  const revealTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pagesListRef = useRef<HTMLUListElement>(null);
  const resumeHydratedRef = useRef(false);
  const agentId = useResolvedOnboardingAgentId();
  const { snapshot: indexingJob } = useOnboardingIndexingStatus(
    crawlPhase === "active" ? agentId : null,
    2500,
  );

  const step1BackHref = useMemo(
    () => onboardingHref("/onboarding", agentId),
    [agentId]
  );

  const visiblePages = useMemo(() => crawlPages.slice(0, revealedCount), [crawlPages, revealedCount]);
  const revealingMore = revealedCount < crawlPages.length;

  const canContinue = Boolean(sourceId);

  const parsedPreview = useMemo(() => {
    if (indexedUrl && previewHostname) {
      return { website_url: indexedUrl, hostname: previewHostname };
    }
    const built = buildWebsiteUrl(websiteScheme, website);
    if (!built.ok) return null;
    return { website_url: built.website_url, hostname: built.hostname };
  }, [indexedUrl, previewHostname, website, websiteScheme]);

  function resolveAgentId(): string | null {
    return searchParams.get("agentId") ?? getOnboardingAgentId() ?? agentId;
  }

  function isValidUuid(value: string): boolean {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
  }

  useEffect(() => {
    const id = resolveAgentId();
    if (!id || !isValidUuid(id) || resumeHydratedRef.current) return;
    let cancelled = false;
    void (async () => {
      try {
        const sourcesRes = await backendFetch<{ sources: KnowledgeSourceRow[] }>(
          `/api/v1/knowledge/sources?agent_id=${encodeURIComponent(id)}`
        );
        let status: OnboardingStatusPayload | null = null;
        try {
          status = await backendFetch<OnboardingStatusPayload>(
            `/api/v1/onboarding/status?agent_id=${encodeURIComponent(id)}`
          );
        } catch {
          status = null;
        }
        if (cancelled) return;
        resumeHydratedRef.current = true;
        saveOnboardingAgentId(id);

        const websiteSource = sourcesRes.sources.find((s) => s.type === "website");
        const siteUrl = status?.website_url ?? websiteSource?.source_url ?? null;
        if (!siteUrl) return;

        const lower = siteUrl.toLowerCase();
        const scheme: WebsiteScheme = lower.startsWith("http://") ? "http://" : "https://";
        setWebsiteScheme(scheme);
        setWebsite(stripUrlScheme(siteUrl));
        setIndexedUrl(siteUrl);
        const built = buildWebsiteUrl(scheme, stripUrlScheme(siteUrl));
        if (built.ok) setPreviewHostname(built.hostname);
        if (websiteSource?.id) {
          setSourceId(websiteSource.id);
          setCrawlPhase("active");
        }
      } catch {
        if (!cancelled) resumeHydratedRef.current = true;
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [agentId, searchParams]);

  useEffect(() => {
    if (revealTimerRef.current) {
      clearTimeout(revealTimerRef.current);
      revealTimerRef.current = null;
    }
    if (revealedCount >= crawlPages.length) return;

    revealTimerRef.current = setTimeout(() => {
      setRevealedCount((c) => Math.min(c + 1, crawlPages.length));
    }, PAGE_REVEAL_MS);

    return () => {
      if (revealTimerRef.current) {
        clearTimeout(revealTimerRef.current);
        revealTimerRef.current = null;
      }
    };
  }, [crawlPages.length, revealedCount]);

  useEffect(() => {
    const el = pagesListRef.current;
    if (!el || visiblePages.length <= VISIBLE_PAGE_ROWS) return;
    el.scrollTop = el.scrollHeight;
  }, [visiblePages.length]);

  useEffect(() => {
    if (!sourceId) return;
    let cancelled = false;

    const pollPages = async () => {
      try {
        const res = await backendFetch<WebsitePagesResponse>(
          `/api/v1/knowledge/website/sources/${encodeURIComponent(sourceId)}/pages?limit=50`
        );
        if (cancelled) return;
        setCrawlPages((prev) => {
          const byUrl = new Map(prev.map((row) => [row.url, row]));
          const ordered: CrawlPage[] = [...prev];
          for (const p of res.pages) {
            const next: CrawlPage = {
              url: p.url,
              path: displayPathFromUrl(p.url),
              status: p.status,
            };
            if (byUrl.has(p.url)) {
              const idx = ordered.findIndex((row) => row.url === p.url);
              if (idx >= 0) ordered[idx] = next;
            } else {
              ordered.push(next);
            }
          }
          return ordered;
        });
      } catch {
        /* keep last list */
      }
    };

    void pollPages();
    const timer = setInterval(() => {
      if (document.visibilityState !== "visible") return;
      void pollPages();
    }, 1500);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [sourceId]);

  async function handleAddWebsite() {
    const id = resolveAgentId();
    if (!website.trim() || crawlPhase === "submitting" || crawlPhase === "active") return;
    if (!id) {
      setError("Missing agent id. Go back to step 1 and try again.");
      return;
    }
    if (!isValidUuid(id)) {
      setError("Go back to step 1, sign in if needed, then continue before adding your website.");
      return;
    }

    const built = buildWebsiteUrl(websiteScheme, website);
    if (!built.ok) {
      setError(built.error);
      return;
    }

    setCrawlPhase("submitting");
    setError(null);
    setCrawlPages([]);
    setRevealedCount(0);

    try {
      const res = await backendFetch<OnboardingWebsiteResponse>("/api/v1/onboarding/website", {
        method: "POST",
        body: JSON.stringify({
          agent_id: id,
          website_url: built.website_url,
          title: built.title,
        }),
      });
      setSourceId(res.source_id);
      setIndexedUrl(res.website_url || built.website_url);
      setPreviewHostname(built.hostname);
      setCrawlPhase("active");
    } catch (e) {
      const msg =
        e instanceof BackendApiError ? e.message : e instanceof Error ? e.message : "Could not add your website";
      setError(msg);
      setCrawlPhase("error");
      setSourceId(null);
      setIndexedUrl(null);
      setPreviewHostname(null);
      setCrawlPages([]);
      setRevealedCount(0);
    }
  }

  function handleContinue() {
    const id = resolveAgentId();
    if (!id) return;
    saveOnboardingAgentId(id);
    router.push(`/onboarding/connection?agentId=${encodeURIComponent(id)}`);
  }

  const previewUrl = parsedPreview?.website_url ?? null;
  const previewHost = parsedPreview?.hostname ?? null;
  const previewFavicon = previewUrl ? faviconServiceUrl(previewUrl) : "";
  const previewAccent = previewHost ? hostnameAccentColor(previewHost) : undefined;

  const addButtonLabel =
    crawlPhase === "submitting" ? "Adding…" : crawlPhase === "active" ? "Website added" : "Add my website";

  return (
    <OnboardingFrame
      activeItem="Knowledge Base"
      completedItems={["Agent Name"]}
      stepLabel="Step 2 of 5"
      linkAgentId={agentId}
      footer={
        <OnboardingStickyFooter
          backHref={step1BackHref}
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

          <div className={onboardingSplitCardFilled}>
            <div className={onboardingSplitGrid}>
              <section className={onboardingSplitLeftSection}>
                <div>
                  <p className="text-ds-on-surface-variant mb-3 text-[11px] font-semibold tracking-[0.18em] uppercase">
                    Step 2
                  </p>
                  <h1 className="text-ds-on-surface text-2xl font-semibold tracking-tight sm:text-3xl lg:text-[2rem]">
                    Add knowledge sources for smarter answers
                  </h1>
                  <p className="text-ds-on-surface-variant mt-2 text-sm leading-relaxed">
                    We start with your website. You can add files and sheets later from the dashboard.
                  </p>

                  <div className="mt-8 space-y-5 sm:mt-10">
                    <div className="border-ds-outline rounded-ds-lg border bg-white p-4">
                      <OnboardingFieldRow
                        id="website-url"
                        label="Primary website"
                        labelClassName="mb-2 text-[14px] leading-[14px] font-medium"
                      >
                        <div className="border-ds-outline focus-within:border-ds-primary focus-within:ring-ds-primary/15 flex overflow-hidden rounded-ds-md border bg-white transition-[box-shadow,border-color] focus-within:ring-2">
                          <select
                            aria-label="Website protocol"
                            value={websiteScheme}
                            onChange={(e) => setWebsiteScheme(e.target.value as WebsiteScheme)}
                            disabled={crawlPhase === "submitting" || crawlPhase === "active"}
                            className="text-ds-on-surface-variant bg-ds-sidebar border-ds-outline max-w-[6.5rem] shrink-0 cursor-pointer border-r px-2 py-3.5 text-sm font-normal outline-none disabled:opacity-60 sm:max-w-none sm:px-3"
                          >
                            <option value="https://">https://</option>
                            <option value="http://">http://</option>
                          </select>
                          <input
                            id="website-url"
                            type="text"
                            value={website}
                            onChange={(e) => {
                              setWebsite(e.target.value);
                              if (error) setError(null);
                            }}
                            placeholder="example.com"
                            inputMode="url"
                            disabled={crawlPhase === "submitting" || crawlPhase === "active"}
                            className="placeholder:text-ds-on-surface-variant/70 text-ds-on-surface w-full border-none bg-transparent px-3 py-3.5 text-sm font-normal outline-none sm:px-4 disabled:opacity-60"
                          />
                        </div>
                      </OnboardingFieldRow>
                      <div className="mt-3 flex justify-end">
                        <button
                          type="button"
                          onClick={() => void handleAddWebsite()}
                          disabled={!website.trim() || crawlPhase === "submitting" || crawlPhase === "active"}
                          className="bg-ds-primary text-ds-on-primary hover:bg-zinc-800 touch-manipulation min-h-11 rounded-ds-md px-5 py-2.5 text-sm font-semibold transition-colors disabled:pointer-events-none disabled:opacity-45 [-webkit-tap-highlight-color:transparent]"
                        >
                          {addButtonLabel}
                        </button>
                      </div>
                      {error ? <p className="mt-2 text-sm text-rose-600">{error}</p> : null}
                    </div>

                    {crawlPhase === "active" ? (
                      <div className="border-ds-outline rounded-ds-lg border bg-white p-4">
                        <p className="text-ds-on-surface text-sm font-medium">
                          {visiblePages.length > 0 ? "Pages found so far" : "Reading your website"}
                        </p>
                        {visiblePages.length > 0 ? (
                          <ul
                            ref={pagesListRef}
                            className="mt-3 space-y-2 overflow-y-auto overscroll-contain pr-1 text-sm"
                            style={{ maxHeight: `${VISIBLE_PAGE_ROWS * PAGE_ROW_REM}rem` }}
                            aria-live="polite"
                          >
                            {visiblePages.map((p) => (
                              <li
                                key={p.url}
                                className="text-ds-on-surface flex items-start gap-2 leading-snug"
                              >
                                <span className="text-emerald-600" aria-hidden>
                                  ✓
                                </span>
                                <span className="min-w-0 break-all font-medium">{p.path || "/"}</span>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-ds-on-surface-variant mt-2 text-sm">
                            Pages will appear here one at a time as we find them.
                          </p>
                        )}
                        <div className="text-ds-on-surface-variant mt-3 flex items-center gap-2 border-t border-ds-outline pt-3 text-sm">
                          <span
                            className="bg-ds-primary size-2 shrink-0 animate-pulse rounded-full"
                            aria-hidden
                          />
                          <span className="font-medium text-ds-on-surface">
                            {indexingJob.headline ||
                              (revealingMore
                                ? "Finding more pages…"
                                : visiblePages.length > 0
                                  ? "Still crawling your site…"
                                  : "Crawling your site…")}
                          </span>
                          {indexingJob.pct > 0 ? (
                            <span className="ml-auto text-xs font-semibold tabular-nums">{indexingJob.pct}%</span>
                          ) : null}
                        </div>
                        {indexingJob.pct > 0 ? (
                          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-ds-outline/70">
                            <div
                              className="bg-ds-primary h-full rounded-full transition-[width] duration-500 ease-out"
                              style={{ width: `${indexingJob.pct}%` }}
                            />
                          </div>
                        ) : null}
                        {indexingJob.detail ? (
                          <p className="text-ds-on-surface-variant mt-2 text-sm leading-relaxed">{indexingJob.detail}</p>
                        ) : null}
                        <p className="text-ds-on-surface-variant mt-2 text-sm leading-relaxed">
                          You can continue setup while we read your site. Step 4 unlocks testing once at least one
                          page is indexed.
                        </p>
                      </div>
                    ) : null}
                  </div>
                </div>
              </section>

              <section className={onboardingSplitRightSectionCentered}>
                <div
                  className="pointer-events-none absolute inset-0 opacity-35"
                  style={{
                    backgroundImage:
                      "radial-gradient(color-mix(in srgb, var(--ds-on-surface-variant) 22%, transparent) 1px, transparent 1px)",
                    backgroundSize: "20px 20px",
                  }}
                  aria-hidden
                />
                <div className={onboardingSplitPreviewWrap}>
                  <div className={cn(onboardingSplitPreviewShell, "h-full min-h-0 flex-1")}>
                    <div className="border-ds-outline flex items-center justify-between border-b bg-white px-4 py-3">
                      <h3 className="ds-app-card-title">Website preview</h3>
                      {previewUrl ? (
                        <a
                          href={previewUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-ds-on-surface-variant hover:text-ds-primary inline-flex size-9 shrink-0 items-center justify-center rounded-md transition-colors"
                          aria-label="Open website in a new tab"
                        >
                          <ExternalLink className="size-4" aria-hidden />
                        </a>
                      ) : null}
                    </div>
                    <div className="flex min-h-0 flex-1 flex-col p-4">
                      <div className="border-ds-outline flex min-h-0 flex-1 flex-col overflow-hidden rounded-ds-md border bg-white">
                        <div className="border-ds-outline flex items-center gap-2 border-b px-3 py-2">
                          <span className="h-2 w-2 rounded-full bg-rose-400" />
                          <span className="h-2 w-2 rounded-full bg-amber-400" />
                          <span className="h-2 w-2 rounded-full bg-emerald-400" />
                          <p
                            className="text-ds-on-surface-variant ml-1 truncate text-[11px]"
                            title={previewUrl ?? undefined}
                          >
                            {previewUrl ?? "Enter your website address"}
                          </p>
                        </div>
                        <div
                          className="relative flex min-h-0 flex-1 flex-col items-center justify-center gap-4 p-8 text-center"
                          style={{ background: previewAccent ?? "var(--ds-sidebar)" }}
                        >
                          {previewUrl && previewHost ? (
                            <>
                              {previewFavicon ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={previewFavicon}
                                  alt=""
                                  className="size-16 rounded-2xl border border-black/5 bg-white p-2 shadow-sm"
                                  width={64}
                                  height={64}
                                />
                              ) : null}
                              <p className="text-ds-on-surface text-lg font-semibold tracking-tight">{previewHost}</p>
                            </>
                          ) : (
                            <p className="text-ds-on-surface-variant text-sm">Your site preview appears here.</p>
                          )}
                        </div>
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
