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
  type CrawlStreamItem = { id: string; text: string; done: boolean };
  const prepSteps = [
    "Initializing crawler",
    "Analyzing website structure",
    "Preparing resources",
    "Starting crawl",
  ] as const;
  const dummyLogs = [
    "✔ Crawled /about",
    "✔ Crawled /pricing",
    "⏳ Crawling /blog/page-2",
    "✔ Crawled /blog/page-1",
    "✔ Crawled /faq",
    "⏳ Crawling /docs/getting-started",
  ] as const;

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
  const [crawlSubmitting, setCrawlSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [prepStepIndex, setPrepStepIndex] = useState<number>(-1);
  const [isStreamingLogs, setIsStreamingLogs] = useState(false);
  /** True once the intro crawl animation reaches the “streaming logs” phase (Continue may still wait on `sourceId`). */
  const [showContinue, setShowContinue] = useState(false);
  const [streamItems, setStreamItems] = useState<CrawlStreamItem[]>([]);
  const [activeStreamId, setActiveStreamId] = useState<string | null>(null);
  const logCursorRef = useRef(0);
  const agentId = useResolvedOnboardingAgentId();

  const canContinue = useMemo(() => showContinue && !!sourceId, [showContinue, sourceId]);

  /** URL + hook can lag on mobile; read storage at action time so the UI is not stuck disabled. */
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

  async function handleStartCrawl() {
    const id = resolveAgentId();
    if (!website.trim() || crawlSubmitting || isStreamingLogs || prepStepIndex >= 0) return;
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
    setPrepStepIndex(0);
    setIsStreamingLogs(false);
    setShowContinue(false);
    setStreamItems([]);
    setActiveStreamId(null);
    logCursorRef.current = 0;
    setCrawlSubmitting(true);
    setError(null);
    setSourceId(null);

    const { website_url, title } = normalizeWebsiteUrl(website);

    try {
      const res = await backendFetch<{ source_id: string; job_id: string; status: string }>(
        "/api/v1/onboarding/website",
        {
          method: "POST",
          body: JSON.stringify({
            agent_id: id,
            website_url,
            title,
          }),
        }
      );
      setSourceId(res.source_id);
    } catch (e) {
      const msg =
        e instanceof BackendApiError ? e.message : e instanceof Error ? e.message : "Could not start crawl";
      setError(msg);
      setPrepStepIndex(-1);
      setIsStreamingLogs(false);
      setShowContinue(false);
      setStreamItems([]);
      setActiveStreamId(null);
    } finally {
      setCrawlSubmitting(false);
    }
  }

  useEffect(() => {
    if (prepStepIndex < 0 || isStreamingLogs) return;

    const currentId = `prep-${prepStepIndex}`;
    queueMicrotask(() => {
      setStreamItems([{ id: currentId, text: prepSteps[prepStepIndex], done: false }]);
      setActiveStreamId(currentId);
    });

    const completeTimer = setTimeout(() => {
      setStreamItems((current) =>
        current.map((item) => (item.id === currentId ? { ...item, done: true } : item))
      );
      setActiveStreamId(null);
    }, 1300);

    const nextTimer = setTimeout(() => {
      if (prepStepIndex >= prepSteps.length - 1) {
        const firstLogId = `log-${Date.now()}-seed`;
        setPrepStepIndex(-1);
        setIsStreamingLogs(true);
        setShowContinue(true);
        setStreamItems([{ id: firstLogId, text: "Crawled /about", done: false }]);
        setActiveStreamId(firstLogId);
        logCursorRef.current = 1;
        setTimeout(() => {
          setStreamItems((current) => current.map((item) => (item.id === firstLogId ? { ...item, done: true } : item)));
          setActiveStreamId((current) => (current === firstLogId ? null : current));
        }, 800);
        return;
      }
      setPrepStepIndex((current) => current + 1);
    }, 2200);

    return () => {
      clearTimeout(completeTimer);
      clearTimeout(nextTimer);
    };
  }, [isStreamingLogs, prepStepIndex]);

  useEffect(() => {
    if (!isStreamingLogs) return;
    const timer = setInterval(() => {
      const raw = dummyLogs[logCursorRef.current % dummyLogs.length];
      const next = raw.replace(/^[✔⏳]\s*/, "");
      const id = `log-${Date.now()}-${logCursorRef.current}`;
      logCursorRef.current += 1;
      setStreamItems([{ id, text: next, done: false }]);
      setActiveStreamId(id);
      setTimeout(() => {
        setStreamItems((current) => current.map((item) => (item.id === id ? { ...item, done: true } : item)));
        setActiveStreamId((current) => (current === id ? null : current));
      }, 1200);
    }, 2200);

    return () => clearInterval(timer);
  }, [isStreamingLogs]);

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
                            className="placeholder:text-ds-on-surface-variant/70 text-ds-on-surface w-full border-none bg-transparent px-3 py-3.5 text-sm font-normal outline-none sm:px-4"
                          />
                        </div>
                      </OnboardingFieldRow>
                      <div className="mt-3 flex justify-end">
                        <button
                          type="button"
                          onClick={handleStartCrawl}
                          disabled={
                            !website.trim() ||
                            crawlSubmitting ||
                            isStreamingLogs ||
                            prepStepIndex >= 0 ||
                            !!sourceId
                          }
                          className="bg-ds-primary text-ds-on-primary hover:bg-zinc-800 touch-manipulation min-h-11 rounded-ds-md px-5 py-2.5 text-sm font-semibold transition-colors disabled:pointer-events-none disabled:opacity-45 [-webkit-tap-highlight-color:transparent]"
                        >
                          {crawlSubmitting || prepStepIndex >= 0 || isStreamingLogs
                            ? "Crawling..."
                            : sourceId
                              ? "Crawl started"
                              : "Start crawl"}
                        </button>
                      </div>
                      {error ? <p className="mt-2 text-sm text-rose-600">{error}</p> : null}
                    </div>

                    {prepStepIndex >= 0 || isStreamingLogs ? (
                      <div className="border-ds-outline rounded-ds-lg border bg-white p-4">
                        <div className="space-y-2 pr-1">
                          {streamItems.slice(-1).map((item) => (
                            <div
                              key={item.id}
                              className="stream-item text-ds-on-surface flex min-w-0 items-center justify-between gap-3 text-sm leading-relaxed"
                            >
                              <p className="min-w-0 break-words">{item.text}</p>
                              <span
                                className={`inline-flex size-5 shrink-0 items-center justify-center rounded-full text-[11px] ${
                                  item.done
                                    ? "bg-emerald-100 text-emerald-700"
                                    : activeStreamId === item.id
                                      ? "bg-amber-100 text-amber-700 animate-pulse"
                                      : "bg-ds-sidebar text-ds-on-surface-variant"
                                }`}
                              >
                                {item.done ? "✓" : "…"}
                              </span>
                            </div>
                          ))}
                        </div>
                        <p className="text-ds-on-surface-variant border-ds-outline mt-3 border-t pt-3 text-sm leading-relaxed">
                          {!showContinue
                            ? "Continue below unlocks when this first pass completes."
                            : !sourceId
                              ? "Almost done—confirming the crawl with the server…"
                              : "You can continue—indexing keeps running in the background."}
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
                        <p className="text-ds-secondary text-[11px]">Homepage snapshot (dummy for now)</p>
                      </div>
                      <span className="text-ds-on-surface-variant text-sm" aria-hidden>
                        ⋮
                      </span>
                    </div>
                    <div className="flex min-h-0 flex-1 flex-col gap-3 p-4">
                      <div className="border-ds-outline flex min-h-0 flex-1 flex-col overflow-hidden rounded-ds-md border bg-white">
                        <div className="border-ds-outline flex items-center gap-2 border-b px-3 py-2">
                          <span className="h-2 w-2 rounded-full bg-rose-400" />
                          <span className="h-2 w-2 rounded-full bg-amber-400" />
                          <span className="h-2 w-2 rounded-full bg-emerald-400" />
                          <p className="text-ds-on-surface-variant ml-1 truncate text-[11px]">
                            {website.trim() ? `https://${website.trim().replace(/^https?:\/\//, "")}` : "https://yourwebsite.com"}
                          </p>
                        </div>
                        <div
                          className="w-full flex-1 p-3"
                          aria-label="Website homepage preview placeholder"
                          role="img"
                        >
                          <div className="flex h-full flex-col gap-2 rounded-md bg-gradient-to-br from-sky-100 via-indigo-50 to-fuchsia-100 p-3">
                            <div className="rounded-md bg-white/80 p-2">
                              <div className="mb-2 h-3 w-2/3 rounded bg-slate-200/80" />
                              <div className="mb-1.5 h-2 w-full rounded bg-slate-200/70" />
                              <div className="h-2 w-5/6 rounded bg-slate-200/70" />
                            </div>
                            <div className="grid grid-cols-3 gap-2">
                              <div className="h-10 rounded-md bg-white/80" />
                              <div className="h-10 rounded-md bg-white/80" />
                              <div className="h-10 rounded-md bg-white/80" />
                            </div>
                            <div className="grid flex-1 grid-cols-2 gap-2">
                              <div className="rounded-md bg-white/80 p-2">
                                <div className="mb-2 h-2.5 w-3/4 rounded bg-slate-200/75" />
                                <div className="mb-1.5 h-2 w-full rounded bg-slate-200/65" />
                                <div className="h-2 w-4/5 rounded bg-slate-200/65" />
                              </div>
                              <div className="rounded-md bg-white/80 p-2">
                                <div className="mb-2 h-2.5 w-3/4 rounded bg-slate-200/75" />
                                <div className="mb-1.5 h-2 w-full rounded bg-slate-200/65" />
                                <div className="h-2 w-4/5 rounded bg-slate-200/65" />
                              </div>
                            </div>
                            <div className="rounded-md bg-white/80 p-2">
                              <div className="mb-2 h-2.5 w-1/3 rounded bg-slate-200/75" />
                              <div className="mb-1.5 h-2 w-full rounded bg-slate-200/65" />
                              <div className="h-2 w-2/3 rounded bg-slate-200/65" />
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="border-ds-outline rounded-ds-md border bg-white p-3">
                        <p className="text-ds-on-surface text-sm font-semibold">Crawl status</p>
                        <p className="text-ds-on-surface-variant mt-1 text-xs">
                          {crawlSubmitting
                            ? "Contacting server…"
                            : sourceId
                              ? "Crawl queued on the server"
                              : "Not started"}
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
      <style jsx>{`
        @keyframes fade-slide-up {
          0% {
            opacity: 0;
            transform: translateY(10px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes stream-item-cycle {
          0% {
            opacity: 0;
            transform: translateY(14px) scale(0.985);
          }
          14% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
          78% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
          100% {
            opacity: 0;
            transform: translateY(-8px) scale(0.99);
          }
        }
        .stream-item {
          animation: stream-item-cycle 2.2s ease-in-out both;
          will-change: opacity, transform;
        }
      `}</style>
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
