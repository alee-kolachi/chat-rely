"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getOnboardingAgentId } from "@/lib/onboarding-state";
import { OnboardingFrame } from "@/components/onboarding/onboarding-frame";
import {
  OnboardingMainColumn,
  OnboardingFieldRow,
  OnboardingStickyFooter,
} from "@/components/onboarding/onboarding-ui";

export default function KnowledgeBaseOnboardingPage() {
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
  const [website, setWebsite] = useState(searchParams.get("website") ?? "");
  const [sourceId, setSourceId] = useState<string | null>(null);
  const [isIndexing, setIsIndexing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [prepStepIndex, setPrepStepIndex] = useState<number>(-1);
  const [isStreamingLogs, setIsStreamingLogs] = useState(false);
  const [showContinue, setShowContinue] = useState(false);
  const [streamItems, setStreamItems] = useState<CrawlStreamItem[]>([]);
  const [activeStreamId, setActiveStreamId] = useState<string | null>(null);
  const logCursorRef = useRef(0);
  const agentId = useMemo(() => searchParams.get("agentId") ?? getOnboardingAgentId(), [searchParams]);

  async function handleStartCrawl() {
    if (!agentId || !website.trim() || isIndexing) return;
    setPrepStepIndex(0);
    setIsStreamingLogs(false);
    setShowContinue(false);
    setStreamItems([]);
    setActiveStreamId(null);
    logCursorRef.current = 0;
    setIsIndexing(true);
    setError(null);
    // Frontend-only demo flow: keep backend calls disabled for onboarding animation preview.
    setSourceId(`demo-source-${Date.now()}`);
    setIsIndexing(false);
  }

  useEffect(() => {
    if (prepStepIndex < 0 || isStreamingLogs) return;

    const currentId = `prep-${prepStepIndex}`;
    setStreamItems([{ id: currentId, text: prepSteps[prepStepIndex], done: false }]);
    setActiveStreamId(currentId);

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
      <OnboardingMainColumn className="max-w-6xl flex h-full items-center pt-3 pb-24 md:pt-4 md:pb-28">
        <div className="relative flex h-full w-full min-h-0 items-center">
          <div
            className="pointer-events-none absolute inset-0 -z-10 rounded-[36px] opacity-80"
            style={{
              background:
                "radial-gradient(circle at 15% 20%, rgba(56,189,248,0.16), transparent 36%), radial-gradient(circle at 85% 80%, rgba(167,139,250,0.14), transparent 40%), linear-gradient(180deg, rgba(248,250,252,0.92), rgba(244,244,245,0.65))",
            }}
            aria-hidden
          />

          <div className="border-ds-outline h-full w-full overflow-hidden rounded-[28px] border bg-white shadow-[0_20px_55px_rgba(15,23,42,0.06)]">
            <div className="grid h-full lg:grid-cols-2">
              <section className="flex h-full min-h-0 flex-col justify-center p-6 sm:p-8 lg:p-10">
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
                          disabled={!agentId || !website.trim() || isIndexing || isStreamingLogs || prepStepIndex >= 0}
                          className="bg-ds-primary text-ds-on-primary hover:bg-zinc-800 rounded-ds-md px-5 py-2.5 text-sm font-semibold transition-colors disabled:pointer-events-none disabled:opacity-45"
                        >
                          {isIndexing || prepStepIndex >= 0 || isStreamingLogs ? "Crawling..." : "Start crawl"}
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
                              className="stream-item text-ds-on-surface flex items-center justify-between gap-3 text-sm leading-relaxed"
                            >
                              <p>{item.text}</p>
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
                          {showContinue
                            ? "You can continue—crawling keeps running in the background."
                            : "Continue below unlocks when this first pass completes."}
                        </p>
                      </div>
                    ) : null}
                  </div>
                </div>
              </section>

              <section className="bg-ds-sidebar border-ds-outline relative flex h-full min-h-0 items-center justify-center border-t p-6 sm:p-8 lg:border-t-0 lg:border-l lg:p-10">
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
                  <div className="border-ds-outline flex min-h-[520px] flex-col overflow-hidden rounded-2xl border bg-ds-surface shadow-xl">
                    <div className="border-ds-outline flex items-center justify-between border-b bg-white px-4 py-3">
                      <div>
                        <h3 className="text-ds-on-surface text-sm font-semibold">Website preview</h3>
                        <p className="text-ds-secondary text-[11px]">Homepage snapshot (dummy for now)</p>
                      </div>
                      <span className="text-ds-on-surface-variant text-sm" aria-hidden>
                        ⋮
                      </span>
                    </div>
                    <div className="flex flex-1 flex-col gap-3 p-4">
                      <div className="border-ds-outline flex flex-1 flex-col overflow-hidden rounded-ds-md border bg-white">
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
                          {isIndexing ? "Indexing in progress..." : sourceId ? "Crawl queued successfully" : "Not started"}
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

      <OnboardingStickyFooter
        backHref="/onboarding"
        backLabel="Back"
        primaryAsButton
        onPrimaryClick={handleContinue}
        primaryDisabled={!agentId || !showContinue}
        primaryLabel="Continue"
      />
    </OnboardingFrame>
  );
}
