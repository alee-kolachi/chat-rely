"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { DataSourcesSidebar } from "@/components/knowledge/data-sources-sidebar";
import {
  ConfirmDialog,
  KnowledgeSearchInput,
  KnowledgeSortMenu,
  StatusPill,
  pageStatusPill,
} from "@/components/knowledge/knowledge-controls";
import {
  IconChevron,
  IconInfo,
  IconLanguage,
  IconMore,
} from "@/components/knowledge/knowledge-icons";
import { KnowledgeMobileSubnav } from "@/components/knowledge/knowledge-mobile-subnav";
import { KnowledgeWorkspaceShell } from "@/components/knowledge/knowledge-workspace-shell";
import {
  makeSortComparator,
  useSortPreference,
} from "@/components/knowledge/use-sort-preference";
import { KnowledgeWebsiteSourceListSkeleton } from "@/components/knowledge/knowledge-list-skeleton";
import { DashboardSelectAgentEmptyState } from "@/components/dashboard/dashboard-page-skeleton";
import { useDashboardAgent } from "@/components/layout/dashboard-agent-context";
import { backendFetch } from "@/lib/backend-api";
import { cn } from "@/lib/utils";

type SourceType = "crawl" | "sitemap" | "individual";

type PathOperatorApi =
  | "starts_with"
  | "ends_with"
  | "contains"
  | "exact_match"
  | "wildcard";

type PathChip = {
  id: string;
  operator: PathOperatorApi;
  pattern: string;
};

type WebsiteSourceListRow = {
  id: string;
  title: string;
  source_url: string | null;
  status: string;
  website_mode: string | null;
  link_count: number;
  last_indexed_at: string | null;
  error_message?: string | null;
  latest_job_status: string | null;
  latest_job_phase: string | null;
  job_metrics?: Record<string, unknown> | null;
  job_pages_total?: number | null;
  job_pages_processed?: number | null;
  job_progress_pct?: number | null;
  job_crawl_limit_exceeded?: boolean;
  reindexed_duplicate?: boolean;
  duplicate_reason?: string | null;
  duplicate_of_source_id?: string | null;
};

type WebsitePageItem = {
  id: string;
  url: string;
  status: string;
  depth: number;
  last_indexed_at: string | null;
  http_status: number | null;
};

const WEBSITE_PAGE_BATCH = 10;
const WEBSITE_PAGE_SEARCH_LIMIT = 500;

const OPERATOR_OPTIONS: Array<{ label: string; value: PathOperatorApi }> = [
  { label: "Starts with", value: "starts_with" },
  { label: "Ends with", value: "ends_with" },
  { label: "Contains", value: "contains" },
  { label: "Exact match", value: "exact_match" },
  { label: "Wildcard", value: "wildcard" },
];

function operatorLabel(op: PathOperatorApi): string {
  return OPERATOR_OPTIONS.find((o) => o.value === op)?.label ?? op;
}

function formatRelativeTime(iso: string | null): string {
  if (!iso) return "Not indexed yet";
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "Not indexed yet";
  const diff = Date.now() - t;
  const days = Math.floor(diff / (86400 * 1000));
  if (days >= 1) return `Last indexed ${days}d ago`;
  const hours = Math.floor(diff / (3600 * 1000));
  if (hours >= 1) return `Last indexed ${hours}h ago`;
  return "Last indexed recently";
}

function newChipId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return String(Date.now()) + Math.random().toString(16).slice(2);
}

/** Same cap as backend ``SITEMAP_MAX_DOCUMENT_FETCHES`` (for user-visible hints only). */
const SITEMAP_XML_DOC_FETCH_CAP = 500;

function urlCountLabel(n: number): string {
  return `${n} ${n === 1 ? "URL" : "URLs"}`;
}

/** Primary list summary: DB ``link_count`` stays 0 until rows exist — use job metrics during discovery. */
function websiteLinksSummary(source: WebsiteSourceListRow): string {
  const activeJob =
    source.status === "indexing" ||
    source.latest_job_status === "queued" ||
    source.latest_job_status === "running";
  const jobPhase = (source.latest_job_phase ?? "").toLowerCase();
  const m = source.job_metrics;
  if (!activeJob || jobPhase !== "crawling" || !m || typeof m !== "object") {
    return `${source.link_count} links`;
  }
  const crawlPhase = typeof m.crawl_phase === "string" ? m.crawl_phase : null;
  if (crawlPhase === "sitemap_discovery") {
    const matched = typeof m.sitemap_urls_matched === "number" ? m.sitemap_urls_matched : null;
    const docs = typeof m.sitemap_docs_fetched === "number" ? m.sitemap_docs_fetched : null;
    if (matched != null && matched > 0) {
      return `${urlCountLabel(matched)} matched (discovery)`;
    }
    if (docs != null && docs > 0) {
      return `scanning sitemap · ${docs} XML file(s) fetched`;
    }
    return "discovering URLs…";
  }
  if (crawlPhase === "seeding_urls") {
    const total = typeof m.seeding_total === "number" ? m.seeding_total : null;
    if (total != null && total > 0) return `${urlCountLabel(total)} queued for fetch`;
  }
  return `${source.link_count} links`;
}

/** Explains long-running website jobs (sitemap walk happens before DB rows exist). */
function websiteCrawlDetailLine(source: WebsiteSourceListRow): string | null {
  const activeJob =
    source.status === "indexing" ||
    source.latest_job_status === "queued" ||
    source.latest_job_status === "running";
  if (!activeJob) return null;
  if ((source.latest_job_phase ?? "").toLowerCase() !== "crawling") return null;
  const m = source.job_metrics;
  if (!m || typeof m !== "object") return null;
  const crawlPhase = typeof m.crawl_phase === "string" ? m.crawl_phase : null;
  if (crawlPhase === "sitemap_discovery") {
    const docs = typeof m.sitemap_docs_fetched === "number" ? m.sitemap_docs_fetched : null;
    const matched = typeof m.sitemap_urls_matched === "number" ? m.sitemap_urls_matched : null;
    const bits: string[] = [];
    if (docs != null) bits.push(`${docs} sitemap XML file(s) fetched`);
    if (matched != null && matched > 0) {
      bits.push("list saves to the database when this step completes — count above is live from the worker");
    }
    if (docs != null && docs >= SITEMAP_XML_DOC_FETCH_CAP) {
      bits.push(
        "per-job XML fetch budget reached — still parsing large files or draining the queue; may take several minutes",
      );
    }
    if (bits.length === 0) bits.push("Walking sitemap indexes for your site…");
    return bits.join(" · ");
  }
  if (crawlPhase === "seeding_urls") {
    const done = typeof m.seeding_done === "number" ? m.seeding_done : null;
    const total = typeof m.seeding_total === "number" ? m.seeding_total : null;
    if (done != null && total != null) return `Saving URL list · ${done}/${total}`;
    return "Saving URL list…";
  }
  if (crawlPhase === "urls_discovered") {
    return "Starting to fetch page HTML…";
  }
  if (crawlPhase === "fetching_html") {
    return null;
  }
  return null;
}

function websiteEmptyUrlsCaption(source: WebsiteSourceListRow, q: string): string {
  const sq = q.trim();
  if (sq) return "No indexed URLs match your search.";
  const activeJob =
    source.status === "indexing" ||
    source.latest_job_status === "queued" ||
    source.latest_job_status === "running";
  const jobPhase = (source.latest_job_phase ?? "").toLowerCase();
  const m = source.job_metrics;
  if (activeJob && jobPhase === "crawling" && m && typeof m === "object") {
    const cp = typeof m.crawl_phase === "string" ? m.crawl_phase : null;
    if (cp === "sitemap_discovery") {
      const matched = typeof m.sitemap_urls_matched === "number" ? m.sitemap_urls_matched : null;
      if (matched != null && matched > 0) {
        return `${urlCountLabel(matched)} already match your filters (shown in the summary row). URL rows load here after discovery finishes and HTML fetch starts.`;
      }
      return "Sitemap discovery running — URL rows appear here after matching URLs are saved.";
    }
    if (cp === "seeding_urls" || cp === "urls_discovered") {
      return "Saving the URL list — rows should appear here shortly.";
    }
  }
  return "No indexed URLs yet. Finish indexing to see links here.";
}

function duplicateSourceSummary(source: WebsiteSourceListRow): string {
  const r = source.duplicate_reason;
  if (r === "same_root_url") {
    return `No crawl ran: the same website URL and path rules are already configured on another source for this agent${
      source.duplicate_of_source_id ? ` (existing source ${source.duplicate_of_source_id.slice(0, 8)}…).` : "."
    }`;
  }
  if (r === "page_already_indexed") {
    return "No crawl ran: this exact seed URL is already stored as an indexed page under another website source for this agent.";
  }
  return "No crawl ran: skipped as a duplicate of existing website coverage for this agent.";
}

async function fetchWebsiteSources(agentId: string): Promise<WebsiteSourceListRow[]> {
  const data = await backendFetch<{ sources: WebsiteSourceListRow[] }>(
    `/api/v1/knowledge/website/sources?agent_id=${encodeURIComponent(agentId)}`
  );
  return data.sources;
}

async function fetchAllPages(sourceId: string): Promise<WebsitePageItem[]> {
  const data = await backendFetch<{
    pages: WebsitePageItem[];
    total: number;
  }>(
    `/api/v1/knowledge/website/sources/${encodeURIComponent(sourceId)}/pages?offset=0&limit=${WEBSITE_PAGE_SEARCH_LIMIT}`
  );
  return data.pages;
}

export default function KnowledgeWebsitePage() {
  const searchParams = useSearchParams();
  const highlightSourceId = searchParams.get("source")?.trim() ?? null;
  const { selectedAgentId, agentsLoading } = useDashboardAgent();
  const [sourceType, setSourceType] = useState<SourceType>("crawl");
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
  const [addLinksExpanded, setAddLinksExpanded] = useState(true);
  const [protocol, setProtocol] = useState("https://");
  const [urlInput, setUrlInput] = useState("");
  const [includeChips, setIncludeChips] = useState<PathChip[]>([]);
  const [excludeChips, setExcludeChips] = useState<PathChip[]>([]);
  const [sources, setSources] = useState<WebsiteSourceListRow[]>([]);
  const [sourcesLoading, setSourcesLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [sortKey, setSortKey] = useSortPreference("website");
  const [pageCache, setPageCache] = useState<Record<string, WebsitePageItem[]>>({});
  const [searchPagesLoading, setSearchPagesLoading] = useState(false);
  const [urlPreviewLine, setUrlPreviewLine] = useState<string | null>(null);
  const [urlPreviewWarning, setUrlPreviewWarning] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  const supportsAdvancedOptions = sourceType !== "individual";
  const submitLabel =
    sourceType === "sitemap" ? "Load sitemap" : sourceType === "individual" ? "Add link" : "Fetch links";

  const handleSourceTypeChange = (next: SourceType) => {
    setSourceType(next);
    setShowAdvancedOptions(false);
    setUrlPreviewLine(null);
    setUrlPreviewWarning(null);
  };

  async function handlePreviewFilteredUrls() {
    if (!selectedAgentId || !urlInput.trim()) {
      setError("Select an agent and enter a URL.");
      return;
    }
    setPreviewLoading(true);
    setUrlPreviewLine(null);
    setUrlPreviewWarning(null);
    setError(null);
    try {
      const data = await backendFetch<{
        discovery_mode: string;
        filtered_url_count: number;
        sample_urls: string[];
        truncated: boolean;
        message: string | null;
        discovery_warning?: string | null;
        sitemap_truncated?: boolean;
      }>("/api/v1/knowledge/website/preview-urls", {
        method: "POST",
        body: JSON.stringify({
          agent_id: selectedAgentId,
          protocol,
          url_input: urlInput.trim(),
          title: null,
          include_rules: includeChips.map((c) => ({ operator: c.operator, pattern: c.pattern })),
          exclude_rules: excludeChips.map((c) => ({ operator: c.operator, pattern: c.pattern })),
          max_sample_urls: 25,
        }),
      });
      setUrlPreviewWarning(data.discovery_warning ?? null);
      if (data.discovery_mode === "sitemap") {
        setUrlPreviewLine(
          `From sitemap: about ${data.filtered_url_count} URL(s) match your filters${data.truncated ? " (preview capped)" : ""}.`,
        );
      } else if (data.discovery_mode === "sitemap_unreachable" || data.discovery_mode === "sitemap_invalid") {
        setUrlPreviewLine(data.message ?? "Could not read sitemap XML for this URL.");
      } else {
        setUrlPreviewLine(data.message ?? "Sitemap returned no matching URLs; a crawl would use link following.");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Preview failed");
    } finally {
      setPreviewLoading(false);
    }
  }

  useEffect(() => {
    if (!selectedAgentId) return;
    let cancelled = false;
    void (async () => {
      await Promise.resolve();
      if (cancelled) return;
      setSourcesLoading(true);
      setError(null);
      try {
        const nextSources = await fetchWebsiteSources(selectedAgentId);
        if (cancelled) return;
        setSources(nextSources);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load sources");
      } finally {
        if (!cancelled) setSourcesLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedAgentId]);

  const silentRefreshSources = useCallback(async () => {
    if (!selectedAgentId) return;
    try {
      const s = await fetchWebsiteSources(selectedAgentId);
      setSources(s);
    } catch {
      /* ignore */
    }
  }, [selectedAgentId]);

  const indexingActive = useMemo(
    () =>
      sources.some(
        (s) =>
          s.status === "indexing" ||
          s.latest_job_status === "queued" ||
          s.latest_job_status === "running" ||
          (s.latest_job_phase && !["complete", "failed"].includes(s.latest_job_phase))
      ),
    [sources]
  );

  useEffect(() => {
    if (!selectedAgentId || !indexingActive) return;
    const id = window.setInterval(() => {
      void (async () => {
        try {
          await silentRefreshSources();
        } catch {
          /* ignore poll errors */
        }
      })();
    }, 3500);
    return () => window.clearInterval(id);
  }, [selectedAgentId, indexingActive, silentRefreshSources]);

  // Eagerly fetch all pages for sources when search is active, so the search can
  // also match nested URLs and auto-expand the matching parent.
  useEffect(() => {
    const q = searchQuery.trim();
    if (!q) return;
    let cancelled = false;
    void (async () => {
      setSearchPagesLoading(true);
      const missing = sources.filter((s) => !pageCache[s.id]);
      try {
        const fetched = await Promise.all(
          missing.map(async (s) => [s.id, await fetchAllPages(s.id)] as const)
        );
        if (cancelled) return;
        if (fetched.length > 0) {
          setPageCache((prev) => {
            const next = { ...prev };
            for (const [sid, pages] of fetched) next[sid] = pages;
            return next;
          });
        }
      } catch {
        /* ignore */
      } finally {
        if (!cancelled) setSearchPagesLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [searchQuery, sources, pageCache]);

  const filteredSources = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    let result = sources;
    if (q) {
      result = sources.filter((s) => {
        const matchTop =
          (s.source_url ?? "").toLowerCase().includes(q) ||
          s.title.toLowerCase().includes(q);
        if (matchTop) return true;
        const cached = pageCache[s.id];
        if (!cached) return false;
        return cached.some((p) => p.url.toLowerCase().includes(q));
      });
    }
    const cmp = makeSortComparator<WebsiteSourceListRow>(
      sortKey,
      (r) => r.status,
      (r) => r.last_indexed_at
    );
    if (cmp) result = [...result].sort(cmp);
    return result;
  }, [sources, searchQuery, sortKey, pageCache]);

  const allFilteredSelected =
    filteredSources.length > 0 && filteredSources.every((s) => selected.has(s.id));

  const toggleSelectAll = () => {
    if (allFilteredSelected) {
      setSelected((prev) => {
        const next = new Set(prev);
        for (const s of filteredSources) next.delete(s.id);
        return next;
      });
    } else {
      setSelected((prev) => {
        const next = new Set(prev);
        for (const s of filteredSources) next.add(s.id);
        return next;
      });
    }
  };

  const toggleOne = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  async function handleBulkDelete() {
    if (selected.size === 0) return;
    if (
      !window.confirm(
        `Delete ${selected.size} website source${selected.size === 1 ? "" : "s"} and all indexed pages? This cannot be undone.`
      )
    ) {
      return;
    }
    setBulkDeleting(true);
    setError(null);
    try {
      for (const id of selected) {
        try {
          await backendFetch<void>(`/api/v1/knowledge/website/sources/${encodeURIComponent(id)}`, {
            method: "DELETE",
          });
        } catch (e) {
          setError(e instanceof Error ? e.message : "Delete failed");
        }
      }
      setSelected(new Set());
      await silentRefreshSources();
    } finally {
      setBulkDeleting(false);
    }
  }

  async function handleSubmit() {
    if (!selectedAgentId || !urlInput.trim()) {
      setError("Select an agent and enter a URL.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const base = {
        agent_id: selectedAgentId,
        protocol,
        url_input: urlInput.trim(),
        title: null as string | null,
      };
      if (sourceType === "individual") {
        await backendFetch("/api/v1/knowledge/website/links", {
          method: "POST",
          body: JSON.stringify({
            ...base,
          }),
        });
      } else if (sourceType === "sitemap") {
        await backendFetch("/api/v1/knowledge/website/sitemap", {
          method: "POST",
          body: JSON.stringify({
            ...base,
            include_rules: includeChips.map((c) => ({ operator: c.operator, pattern: c.pattern })),
            exclude_rules: excludeChips.map((c) => ({ operator: c.operator, pattern: c.pattern })),
          }),
        });
      } else {
        await backendFetch("/api/v1/knowledge/website/crawl", {
          method: "POST",
          body: JSON.stringify({
            ...base,
            include_rules: includeChips.map((c) => ({ operator: c.operator, pattern: c.pattern })),
            exclude_rules: excludeChips.map((c) => ({ operator: c.operator, pattern: c.pattern })),
          }),
        });
      }
      setUrlInput("");
      setIncludeChips([]);
      setExcludeChips([]);
      setShowAdvancedOptions(false);
      setUrlPreviewLine(null);
      await silentRefreshSources();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Request failed");
    } finally {
      setSubmitting(false);
    }
  }

  const searchActive = searchQuery.trim().length > 0;
  const lowerQuery = searchQuery.trim().toLowerCase();

  return (
    <KnowledgeWorkspaceShell>
      <main className="min-w-0 flex-1 p-4 pb-32 [&_button]:cursor-pointer [&_select]:cursor-pointer md:p-8 md:pb-32">
        <KnowledgeMobileSubnav active="website" />

        <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="ds-app-page-title">Website</h1>
            <p className="ds-app-page-description ds-app-page-description--wide">
              Crawl pages or submit sitemaps so your agent stays aligned with live content.
            </p>
          </div>
        </div>

        {error ? (
          <div className="border-ds-outline text-ds-on-surface mb-4 rounded-ds-lg border border-red-200 bg-red-50 px-4 py-3 text-sm">
            {error}
          </div>
        ) : null}

        <section className="border-ds-outline mb-8 overflow-hidden rounded-ds-xl border bg-ds-surface">
          <div
            className="border-ds-outline flex cursor-pointer items-center justify-between border-b px-5 py-1.5 sm:px-6"
            role="button"
            tabIndex={0}
            aria-expanded={addLinksExpanded}
            onClick={() => setAddLinksExpanded((p) => !p)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                setAddLinksExpanded((p) => !p);
              }
            }}
          >
            <div className="flex min-w-0 flex-wrap gap-5">
              {(["crawl", "sitemap", "individual"] as const).map((key) => (
                <button
                  key={key}
                  type="button"
                  className={cn(
                    "cursor-pointer pt-1.5 pb-1 text-sm font-medium transition-colors",
                    sourceType === key
                      ? "text-ds-primary border-ds-primary border-b-2 font-semibold"
                      : "text-ds-on-surface-variant hover:text-ds-on-surface"
                  )}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSourceTypeChange(key);
                  }}
                >
                  {key === "crawl" ? "Crawl links" : key === "sitemap" ? "Sitemap" : "Individual link"}
                </button>
              ))}
            </div>
            <button
              type="button"
              className="text-ds-on-surface-variant hover:text-ds-on-surface rounded-ds-md p-1"
              onClick={(e) => {
                e.stopPropagation();
                setAddLinksExpanded((p) => !p);
              }}
              aria-expanded={addLinksExpanded}
              aria-label="Toggle add links section"
            >
              <IconChevron className={cn("size-5 transition-transform", addLinksExpanded ? "rotate-90" : "")} />
            </button>
          </div>

          {addLinksExpanded ? (
            <>

              <div className="space-y-6 p-5 sm:p-6">
                <div className="space-y-2">
                  <label className="ds-app-kicker block text-ds-on-surface-variant">URL</label>
                  <div className="border-ds-outline focus-within:border-ds-primary focus-within:ring-ds-primary/15 flex items-center overflow-hidden rounded-ds-lg border bg-white focus-within:ring-2">
                    <div className="border-ds-outline bg-ds-sidebar relative border-r">
                      <select
                        value={protocol}
                        onChange={(e) => setProtocol(e.target.value)}
                        className="text-ds-on-surface h-full min-h-[44px] cursor-pointer appearance-none rounded-ds-lg bg-transparent py-2 pr-9 pl-4 text-sm font-medium leading-none outline-none"
                      >
                        <option value="https://">https://</option>
                        <option value="http://">http://</option>
                      </select>
                      <IconChevron
                        className="text-ds-on-surface-variant pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 rotate-90"
                      />
                    </div>
                    <input
                      className="min-w-0 flex-1 px-4 py-3 text-sm outline-none"
                      placeholder="www.example.com or /sitemap.xml path"
                      value={urlInput}
                      onChange={(e) => setUrlInput(e.target.value)}
                    />
                  </div>
                  <div className="mt-2 flex items-start gap-2">
                    <IconInfo className="text-ds-on-surface-variant mt-0.5 size-4 shrink-0" />
                    <p className="text-ds-on-surface-variant text-xs leading-relaxed">
                      For Shopify, prefer your <strong className="text-ds-on-surface">sitemap.xml</strong> under Sitemap
                      to reduce duplicate pages. Include/exclude path rules apply to crawled or sitemap URLs.
                    </p>
                  </div>
                </div>

                {supportsAdvancedOptions ? (
                  <div className="pt-2">
                    <button
                      type="button"
                      className="text-ds-on-surface flex cursor-pointer items-center gap-2 text-sm font-semibold hover:text-ds-primary"
                      onClick={() => setShowAdvancedOptions((p) => !p)}
                    >
                      <IconChevron
                        className={cn("size-4 transition-transform", showAdvancedOptions ? "rotate-90" : "")}
                      />
                      Advanced options
                    </button>

                    {showAdvancedOptions ? (
                      <div className="mt-4 space-y-6">
                        <PathRuleBlock
                          label="Include only paths"
                          chips={includeChips}
                          onAdd={(op, pat) =>
                            setIncludeChips((prev) => [...prev, { id: newChipId(), operator: op, pattern: pat }])
                          }
                          onRemove={(id) => setIncludeChips((prev) => prev.filter((c) => c.id !== id))}
                        />
                        <PathRuleBlock
                          label="Exclude paths"
                          chips={excludeChips}
                          onAdd={(op, pat) =>
                            setExcludeChips((prev) => [...prev, { id: newChipId(), operator: op, pattern: pat }])
                          }
                          onRemove={(id) => setExcludeChips((prev) => prev.filter((c) => c.id !== id))}
                        />
                        <p className="text-ds-on-surface-variant text-xs leading-relaxed">
                          Rules match the URL <strong className="text-ds-on-surface">path</strong> only (e.g.{" "}
                          <code className="text-ds-on-surface bg-ds-sidebar/80 rounded px-1 py-0.5 text-[11px]">
                            /products/…
                          </code>
                          ), not the query string. For &quot;starts with&quot; / &quot;exact&quot;, include a leading{" "}
                          <code className="text-ds-on-surface bg-ds-sidebar/80 rounded px-1 py-0.5 text-[11px]">/</code>.
                        </p>
                        {(sourceType === "crawl" || sourceType === "sitemap") && (
                          <div className="border-ds-outline space-y-2 rounded-ds-lg border border-dashed p-3">
                            <button
                              type="button"
                              disabled={previewLoading || !selectedAgentId || !urlInput.trim()}
                              className="text-ds-primary hover:text-ds-secondary cursor-pointer text-sm font-semibold underline-offset-2 hover:underline disabled:cursor-not-allowed disabled:opacity-50"
                              onClick={() => void handlePreviewFilteredUrls()}
                            >
                              {previewLoading ? "Checking sitemap…" : "Estimate filtered URLs (sitemap only)"}
                            </button>
                            {urlPreviewLine ? (
                              <p className="text-ds-on-surface-variant text-xs leading-relaxed">{urlPreviewLine}</p>
                            ) : null}
                            {urlPreviewWarning ? (
                              <p className="text-amber-800 dark:text-amber-200/90 text-xs leading-relaxed">{urlPreviewWarning}</p>
                            ) : null}
                          </div>
                        )}
                      </div>
                    ) : null}
                  </div>
                ) : null}

                <div className="flex justify-end pt-4">
                  <button
                    type="button"
                    disabled={submitting || !selectedAgentId}
                    className="bg-ds-primary text-ds-on-primary hover:bg-ds-secondary cursor-pointer rounded-ds-md px-6 py-2.5 text-sm font-semibold transition-colors active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
                    onClick={() => void handleSubmit()}
                  >
                    {submitting ? "Working…" : submitLabel}
                  </button>
                </div>
              </div>
            </>
          ) : null}
        </section>

        <section className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="ds-app-section-title text-base">Link sources</h2>
            <KnowledgeSearchInput
              placeholder="Search links and sub-pages…"
              className="w-full sm:w-72"
              value={searchQuery}
              onChange={setSearchQuery}
            />
          </div>

          {searchActive && searchPagesLoading ? (
            <p className="text-ds-on-surface-variant text-xs">Searching nested pages…</p>
          ) : null}

          <div className="border-ds-outline flex flex-col gap-2 border-b pb-2 sm:flex-row sm:items-center sm:justify-between">
            <label className="text-ds-on-surface flex cursor-pointer items-center gap-3 text-sm">
              <input
                type="checkbox"
                className="border-ds-outline text-ds-primary size-4 cursor-pointer rounded"
                checked={allFilteredSelected}
                onChange={toggleSelectAll}
              />
              <span className="font-semibold">Select all</span>
            </label>
            <div className="flex items-center gap-3">
              {selected.size > 0 ? (
                <>
                  <span className="text-ds-on-surface-variant text-xs font-medium">{selected.size} selected</span>
                  <button
                    type="button"
                    onClick={() => void handleBulkDelete()}
                    disabled={bulkDeleting}
                    className="rounded-ds-md bg-rose-100 px-3 py-1 text-xs font-semibold text-rose-800 disabled:opacity-60"
                  >
                    {bulkDeleting ? "Deleting…" : "Delete"}
                  </button>
                </>
              ) : null}
              <KnowledgeSortMenu value={sortKey} onChange={setSortKey} />
            </div>
          </div>

          {!agentsLoading && !selectedAgentId ? (
            <DashboardSelectAgentEmptyState />
          ) : (
          <div className="space-y-1.5">
            {sourcesLoading ? (
              <KnowledgeWebsiteSourceListSkeleton rows={4} />
            ) : filteredSources.length === 0 ? (
              <div className="bg-ds-sidebar px-4 py-6 text-center">
                <p className="text-ds-on-surface text-sm font-medium">
                  {searchActive ? "No matching links" : "No website sources yet"}
                </p>
                <p className="text-ds-on-surface-variant mx-auto mt-1 max-w-md text-xs leading-relaxed">
                  {searchActive
                    ? "Try another search or clear filters."
                    : "Add a crawl, sitemap, or single URL above to index content for this agent."}
                </p>
              </div>
            ) : (
              filteredSources.map((row) => (
                <WebsiteSourceRow
                  key={row.id}
                  source={row}
                  onSourcesRefresh={silentRefreshSources}
                  onError={setError}
                  checked={selected.has(row.id)}
                  onToggleSelect={() => toggleOne(row.id)}
                  forceExpanded={searchActive}
                  searchQuery={lowerQuery}
                  cachedPages={pageCache[row.id]}
                  onPagesCached={(pages) =>
                    setPageCache((prev) => ({ ...prev, [row.id]: pages }))
                  }
                  highlightSourceId={highlightSourceId}
                />
              ))
            )}
          </div>
          )}
        </section>

        <DataSourcesSidebar mobile className="lg:hidden" />
      </main>

      <DataSourcesSidebar className="hidden lg:block" />
    </KnowledgeWorkspaceShell>
  );
}

function PathRuleBlock({
  label,
  chips,
  onAdd,
  onRemove,
}: {
  label: string;
  chips: PathChip[];
  onAdd: (operator: PathOperatorApi, pattern: string) => void;
  onRemove: (id: string) => void;
}) {
  const [operator, setOperator] = useState<PathOperatorApi>("starts_with");
  const [pattern, setPattern] = useState("");

  return (
    <div className="space-y-2">
      <label className="text-ds-on-surface-variant text-xs font-medium">{label}</label>
      {chips.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {chips.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => onRemove(c.id)}
              className="bg-ds-sidebar text-ds-on-surface border-ds-outline hover:border-ds-primary/40 inline-flex cursor-pointer items-center gap-1 rounded-full border px-3 py-1.5 text-xs shadow-sm transition-colors"
              title="Click to remove"
            >
              <span className="text-ds-on-surface-variant">{operatorLabel(c.operator)}:</span>
              <span className="font-semibold">{c.pattern}</span>
              <span className="text-ds-on-surface-variant ml-1">×</span>
            </button>
          ))}
        </div>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <div className="border-ds-outline focus-within:border-ds-primary focus-within:ring-ds-primary/15 relative h-[46px] min-w-[150px] overflow-hidden rounded-ds-lg border bg-white focus-within:ring-2">
          <select
            className="text-ds-on-surface h-full w-full cursor-pointer appearance-none rounded-ds-lg bg-transparent py-2 pr-9 pl-4 text-sm font-medium leading-none outline-none"
            value={operator}
            onChange={(e) => setOperator(e.target.value as PathOperatorApi)}
          >
            {OPERATOR_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <IconChevron
            className="text-ds-on-surface-variant pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 rotate-90"
          />
        </div>
        <input
          className="ds-app-field min-w-[180px] flex-1 rounded-ds-lg"
          placeholder="/blog or .pdf"
          value={pattern}
          onChange={(e) => setPattern(e.target.value)}
        />
        <button
          type="button"
          className="border-ds-outline text-ds-on-surface-variant hover:bg-ds-sidebar cursor-pointer rounded-ds-lg border bg-white px-5 py-2 text-sm font-medium transition-colors"
          onClick={() => {
            const p = pattern.trim();
            if (!p) return;
            onAdd(operator, p);
            setPattern("");
          }}
        >
          Add
        </button>
      </div>
    </div>
  );
}

function WebsiteSourceRow({
  source,
  onSourcesRefresh,
  onError,
  checked,
  onToggleSelect,
  forceExpanded,
  searchQuery,
  cachedPages,
  onPagesCached,
  highlightSourceId,
}: {
  source: WebsiteSourceListRow;
  onSourcesRefresh: () => Promise<void>;
  onError: (message: string | null) => void;
  checked: boolean;
  onToggleSelect: () => void;
  forceExpanded: boolean;
  searchQuery: string;
  cachedPages: WebsitePageItem[] | undefined;
  onPagesCached: (pages: WebsitePageItem[]) => void;
  highlightSourceId?: string | null;
}) {
  const [userExpanded, setUserExpanded] = useState(false);
  const expanded = forceExpanded || userExpanded;
  const isHighlighted = Boolean(highlightSourceId && highlightSourceId === source.id);
  const [menuOpen, setMenuOpen] = useState(false);
  const [pageItems, setPageItems] = useState<WebsitePageItem[]>([]);
  const [pageTotal, setPageTotal] = useState<number | null>(null);
  const [pagesLoading, setPagesLoading] = useState(false);
  const [pagesLoadingMore, setPagesLoadingMore] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [retraining, setRetraining] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const onPointerDown = (ev: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(ev.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [menuOpen]);

  useEffect(() => {
    if (highlightSourceId && highlightSourceId === source.id) {
      setUserExpanded(true);
    }
  }, [highlightSourceId, source.id]);

  useEffect(() => {
    if (!expanded) return;
    if (cachedPages) return;
    let cancelled = false;
    void (async () => {
      setPagesLoading(true);
      onError(null);
      try {
        const data = await backendFetch<{
          pages: WebsitePageItem[];
          total: number;
          offset: number;
          limit: number;
        }>(
          `/api/v1/knowledge/website/sources/${encodeURIComponent(source.id)}/pages?offset=0&limit=${WEBSITE_PAGE_BATCH}`
        );
        if (cancelled) return;
        setPageItems(data.pages);
        setPageTotal(data.total);
      } catch (e) {
        if (!cancelled) {
          onError(e instanceof Error ? e.message : "Failed to load URLs");
          setUserExpanded(false);
        }
      } finally {
        setPagesLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [expanded, source.id, source.link_count, source.last_indexed_at, onError, cachedPages]);

  async function loadPages(nextOffset: number, nextLimit: number, append: boolean) {
    onError(null);
    try {
      const data = await backendFetch<{
        pages: WebsitePageItem[];
        total: number;
        offset: number;
        limit: number;
      }>(
        `/api/v1/knowledge/website/sources/${encodeURIComponent(source.id)}/pages?offset=${nextOffset}&limit=${nextLimit}`
      );
      setPageItems((prev) => {
        const merged = append ? [...prev, ...data.pages] : data.pages;
        if (merged.length >= data.total) onPagesCached(merged);
        return merged;
      });
      setPageTotal(data.total);
    } catch (e) {
      onError(e instanceof Error ? e.message : "Failed to load URLs");
    }
  }

  async function loadMore() {
    if (pageTotal === null || pageItems.length >= pageTotal) return;
    setPagesLoadingMore(true);
    try {
      await loadPages(pageItems.length, WEBSITE_PAGE_BATCH, true);
    } finally {
      setPagesLoadingMore(false);
    }
  }

  async function refreshPagesAfterMutation() {
    const initialLimit = Math.max(WEBSITE_PAGE_BATCH, pageItems.length || WEBSITE_PAGE_BATCH);
    await loadPages(0, initialLimit, false);
  }

  async function handleDelete() {
    setMenuOpen(false);
    const label = source.source_url ?? source.title;
    if (
      !window.confirm(
        `Delete this website source (${label}) and all indexed pages and embeddings? This cannot be undone.`
      )
    ) {
      return;
    }
    setDeleting(true);
    onError(null);
    try {
      await backendFetch<void>(`/api/v1/knowledge/website/sources/${encodeURIComponent(source.id)}`, {
        method: "DELETE",
      });
      await onSourcesRefresh();
    } catch (e) {
      onError(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setDeleting(false);
    }
  }

  async function handleRetrain() {
    setMenuOpen(false);
    setRetraining(true);
    onError(null);
    try {
      await backendFetch<void>(`/api/v1/knowledge/website/sources/${encodeURIComponent(source.id)}/retrain`, {
        method: "POST",
      });
      await onSourcesRefresh();
      await refreshPagesAfterMutation();
    } catch (e) {
      onError(e instanceof Error ? e.message : "Failed to retrain source");
    } finally {
      setRetraining(false);
    }
  }

  const displayedPageItems = cachedPages ?? pageItems;
  const effectivePageTotal = cachedPages ? cachedPages.length : pageTotal;
  const canLoadMore = effectivePageTotal !== null && displayedPageItems.length < effectivePageTotal;

  const showIndexedRatio =
    source.job_pages_total != null &&
    source.job_pages_total > 0 &&
    !source.job_crawl_limit_exceeded &&
    (source.status === "indexing" ||
      source.latest_job_status === "queued" ||
      source.latest_job_status === "running" ||
      ((source.job_pages_processed ?? 0) < source.job_pages_total &&
        (source.latest_job_status === "succeeded" || source.status === "ready")));

  const crawlRatioVerb =
    source.latest_job_phase === "complete" && source.latest_job_status === "succeeded"
      ? "indexed"
      : "fetched";

  const jobFailed =
    source.status === "failed" ||
    source.latest_job_status === "failed" ||
    source.latest_job_phase === "failed";
  const showFailedCrawlRatio =
    jobFailed &&
    source.job_pages_total != null &&
    source.job_pages_total > 0 &&
    !source.job_crawl_limit_exceeded;

  const reindexedDuplicate = Boolean(source.reindexed_duplicate);
  const statusSummary = reindexedDuplicate
    ? "reindexed"
    : source.status === "skipped_duplicate"
      ? "not indexed (duplicate)"
      : source.latest_job_phase
        ? source.latest_job_phase
        : source.status === "indexing"
          ? "indexing"
          : source.status;

  const crawlDetailLine = websiteCrawlDetailLine(source);

  const visiblePages = useMemo(() => {
    const filtered = searchQuery
      ? displayedPageItems.filter((p) => p.url.toLowerCase().includes(searchQuery.trim().toLowerCase()))
      : displayedPageItems;
    // Match API order (`order by url asc`); avoid status-first sort so "Load more" does not reshuffle rows.
    return [...filtered].sort((a, b) => a.url.localeCompare(b.url));
  }, [displayedPageItems, searchQuery]);

  return (
    <div
      id={`knowledge-source-${source.id}`}
      className={cn(
        "border-ds-outline bg-ds-surface border-b/70 transition-colors last:border-0 hover:bg-ds-sidebar/40",
        isHighlighted && "ring-2 ring-ds-primary/40 ring-inset"
      )}
    >
      <div className="flex items-center py-3">
        <input
          type="checkbox"
          className="border-ds-outline text-ds-primary mr-3 size-3.5 shrink-0 cursor-pointer rounded"
          checked={checked}
          onChange={onToggleSelect}
          aria-label={`Select ${source.title || source.source_url || "source"}`}
        />
        <div className="flex min-w-0 flex-1 items-center gap-1.5">
          <IconLanguage className="text-ds-on-surface-variant size-4 shrink-0" />
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <p className="text-ds-on-surface truncate text-[13px] font-medium">
                {source.title || source.source_url || "Website source"}
              </p>
            </div>
            <p className="text-ds-on-surface-variant text-[11px]">
              {formatRelativeTime(source.last_indexed_at)} · {websiteLinksSummary(source)}
              {showIndexedRatio && source.job_pages_total
                ? ` · ${source.job_pages_processed ?? 0}/${source.job_pages_total} ${crawlRatioVerb}`
                : ""}
              {showFailedCrawlRatio && source.job_pages_total
                ? ` · ${source.job_pages_processed ?? 0}/${source.job_pages_total} crawled (indexing did not finish)`
                : ""}
              {statusSummary ? ` · ${statusSummary}` : ""}
            </p>
            {crawlDetailLine ? (
              <p className="text-ds-on-surface-variant mt-0.5 text-[11px] leading-snug">{crawlDetailLine}</p>
            ) : null}
            {source.status === "skipped_duplicate" ? (
              <p className="mt-0.5 text-[11px] leading-snug text-amber-900 dark:text-amber-200/95">
                {duplicateSourceSummary(source)}
              </p>
            ) : null}
            {jobFailed && source.error_message ? (
              <p className="text-rose-700 dark:text-rose-300 mt-0.5 line-clamp-2 text-[11px] leading-snug" title={source.error_message}>
                {source.error_message}
              </p>
            ) : null}
          </div>
        </div>
        {!showIndexedRatio && source.job_crawl_limit_exceeded ? (
          <div className="text-ds-on-surface-variant mr-2 hidden max-w-[min(14rem,40%)] shrink-0 flex-col items-end text-right text-xs sm:flex">
            <span className="tabular-nums">{source.job_pages_processed ?? 0} pages indexed</span>
            <span className="mt-0.5 font-medium text-rose-700 dark:text-rose-300">Size limit exceeded</span>
          </div>
        ) : null}
        <div ref={menuRef} className="text-ds-on-surface-variant relative flex shrink-0 items-center gap-2">
          <button
            type="button"
            disabled={deleting}
            className="hover:text-ds-on-surface cursor-pointer rounded-ds-md p-1 transition-colors disabled:opacity-50"
            aria-label="Source actions"
            aria-expanded={menuOpen}
            aria-haspopup="menu"
            onClick={(e) => {
              e.stopPropagation();
              setMenuOpen((v) => !v);
            }}
          >
            <IconMore className="size-4" />
          </button>
          {menuOpen ? (
            <div
              role="menu"
              className="border-ds-outline bg-ds-surface absolute top-full right-0 z-20 mt-1 min-w-[11rem] rounded-ds-md border py-1 shadow-lg"
            >
              <button
                type="button"
                role="menuitem"
                disabled={deleting || retraining}
                className="text-ds-on-surface hover:bg-ds-sidebar block w-full cursor-pointer px-3 py-2 text-left text-sm disabled:cursor-not-allowed disabled:opacity-50"
                onClick={() => void handleRetrain()}
              >
                {retraining ? "Retraining…" : "Retrain"}
              </button>
              <button
                type="button"
                role="menuitem"
                disabled={deleting || retraining}
                className="text-ds-on-surface hover:bg-ds-sidebar block w-full cursor-pointer px-3 py-2 text-left text-sm disabled:cursor-not-allowed disabled:opacity-50"
                onClick={() => void handleDelete()}
              >
                {deleting ? "Deleting…" : "Delete source"}
              </button>
            </div>
          ) : null}
          <button
            type="button"
            className="hover:text-ds-on-surface cursor-pointer rounded-ds-md p-1 transition-colors"
            aria-label={expanded ? "Hide indexed URLs" : "Show indexed URLs"}
            aria-expanded={expanded}
            onClick={() => setUserExpanded((v) => !v)}
          >
            <IconChevron
              className={cn("size-4 shrink-0 transition-transform", expanded ? "rotate-90" : "")}
            />
          </button>
        </div>
      </div>
      {expanded ? (
        <div className="bg-ds-sidebar/35 py-2 pr-3 pl-8 sm:pl-10">
          {pagesLoading && pageItems.length === 0 ? (
            <div className="text-ds-on-surface-variant space-y-2.5 py-1" aria-busy="true" aria-live="polite">
              <div className="bg-ds-on-surface-variant/12 h-2.5 w-full max-w-lg animate-pulse rounded-sm" />
              <div className="bg-ds-on-surface-variant/12 h-2.5 w-[92%] max-w-md animate-pulse rounded-sm" />
              <div className="bg-ds-on-surface-variant/12 h-2.5 w-[85%] max-w-sm animate-pulse rounded-sm" />
              <div className="bg-ds-on-surface-variant/12 h-2.5 w-[78%] max-w-xs animate-pulse rounded-sm" />
              <p className="text-ds-on-surface-variant pt-1 text-xs leading-relaxed">Loading indexed URLs…</p>
            </div>
          ) : visiblePages.length === 0 ? (
            <p className="text-ds-on-surface-variant py-1 text-sm leading-relaxed">
              {websiteEmptyUrlsCaption(source, searchQuery)}
            </p>
          ) : (
            <>
              <ul className="divide-ds-outline/30 divide-y">
                {visiblePages.map((p) => (
                  <PageRow
                    key={p.id || p.url}
                    page={p}
                    sourceId={source.id}
                    sourceLimitExceeded={Boolean(source.job_crawl_limit_exceeded)}
                    onChange={() =>
                      void (async () => {
                        await onSourcesRefresh();
                        await refreshPagesAfterMutation();
                      })()
                    }
                    onError={onError}
                  />
                ))}
              </ul>
              {!searchQuery && canLoadMore ? (
                <button
                  type="button"
                  disabled={pagesLoadingMore}
                  className="text-ds-primary hover:text-ds-secondary mt-2 cursor-pointer text-xs font-semibold disabled:opacity-50"
                  onClick={() => void loadMore()}
                >
                  {pagesLoadingMore ? "Loading…" : "Load more"}
                </button>
              ) : null}
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}

function PageRow({
  page,
  sourceId,
  sourceLimitExceeded,
  onChange,
  onError,
}: {
  page: WebsitePageItem;
  sourceId: string;
  sourceLimitExceeded: boolean;
  onChange: () => void;
  onError: (message: string | null) => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [excludeOpen, setExcludeOpen] = useState(false);
  const [editUrl, setEditUrl] = useState(page.url);
  const [busy, setBusy] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const pill =
    page.status?.toLowerCase() === "excluded" && sourceLimitExceeded
      ? { label: "Size Limit Exceeded", tone: "danger" as const }
      : page.status?.toLowerCase() === "failed"
        ? {
            label: page.http_status ? `Failed (HTTP ${page.http_status})` : "Failed (Fetch error)",
            tone: "danger" as const,
          }
        : pageStatusPill(page.status);

  useEffect(() => {
    if (!menuOpen) return;
    const onPointerDown = (ev: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(ev.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [menuOpen]);

  async function saveEdit() {
    const trimmed = editUrl.trim();
    if (!trimmed) return;
    setBusy(true);
    onError(null);
    try {
      await backendFetch<void>(
        `/api/v1/knowledge/website/sources/${encodeURIComponent(sourceId)}/pages/${encodeURIComponent(page.id)}`,
        {
          method: "PATCH",
          body: JSON.stringify({ url: trimmed }),
        }
      );
      setEditOpen(false);
      onChange();
    } catch (e) {
      onError(e instanceof Error ? e.message : "Failed to update link");
    } finally {
      setBusy(false);
    }
  }

  async function confirmExclude() {
    setBusy(true);
    onError(null);
    try {
      await backendFetch<void>(
        `/api/v1/knowledge/website/sources/${encodeURIComponent(sourceId)}/pages/${encodeURIComponent(page.id)}`,
        { method: "DELETE" }
      );
      setExcludeOpen(false);
      onChange();
    } catch (e) {
      onError(e instanceof Error ? e.message : "Failed to exclude link");
    } finally {
      setBusy(false);
    }
  }

  return (
    <li className="min-w-0 py-2 first:pt-0 last:pb-0">
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="text-ds-on-surface truncate text-xs leading-snug" title={page.url}>
              {page.url}
            </p>
            <StatusPill label={pill.label} tone={pill.tone} className="shrink-0 text-[10px]" />
          </div>
        </div>
        <div ref={menuRef} className="relative shrink-0">
          <button
            type="button"
            className="text-ds-on-surface-variant hover:text-ds-on-surface cursor-pointer rounded-ds-md p-1 transition-colors"
            aria-label="Page actions"
            aria-expanded={menuOpen}
            aria-haspopup="menu"
            onClick={() => setMenuOpen((v) => !v)}
          >
            <IconMore className="size-4" />
          </button>
          {menuOpen ? (
            <div
              role="menu"
              className="border-ds-outline bg-ds-surface absolute top-full right-0 z-20 mt-1 min-w-[10rem] rounded-ds-md border py-1 shadow-lg"
            >
              <button
                type="button"
                role="menuitem"
                className="text-ds-on-surface hover:bg-ds-sidebar block w-full cursor-pointer px-3 py-2 text-left text-sm"
                onClick={() => {
                  setEditUrl(page.url);
                  setEditOpen(true);
                  setMenuOpen(false);
                }}
              >
                Edit
              </button>
              <button
                type="button"
                role="menuitem"
                className="text-ds-on-surface hover:bg-ds-sidebar block w-full cursor-pointer px-3 py-2 text-left text-sm"
                onClick={() => {
                  setExcludeOpen(true);
                  setMenuOpen(false);
                }}
              >
                Exclude
              </button>
            </div>
          ) : null}
        </div>
      </div>

      <ConfirmDialog
        open={editOpen}
        title="Edit link"
        message="Saving will refetch and re-index this URL, replacing any existing indexed knowledge for it."
        confirmLabel={busy ? "Saving…" : "Save"}
        cancelLabel="Cancel"
        busy={busy}
        onCancel={() => {
          if (!busy) setEditOpen(false);
        }}
        onConfirm={() => void saveEdit()}
        maxWidthClassName="max-w-2xl"
      >
        <div className="space-y-1">
          <label className="text-ds-on-surface-variant text-xs font-medium">URL</label>
          <input
            className="ds-app-field rounded-ds-lg w-full"
            value={editUrl}
            onChange={(e) => setEditUrl(e.target.value)}
            placeholder="https://example.com/page"
            disabled={busy}
          />
        </div>
      </ConfirmDialog>

      <ConfirmDialog
        open={excludeOpen}
        title="Exclude link"
        message={`Remove ${page.url} from this website source? Its indexed text will be deleted.`}
        confirmLabel="Exclude"
        cancelLabel="Cancel"
        destructive
        busy={busy}
        onCancel={() => {
          if (!busy) setExcludeOpen(false);
        }}
        onConfirm={() => void confirmExclude()}
        maxWidthClassName="max-w-2xl"
      />
    </li>
  );
}
