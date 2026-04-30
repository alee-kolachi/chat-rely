"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { DataSourcesSidebar, type KnowledgeWebsiteUsage } from "@/components/knowledge/data-sources-sidebar";
import { KnowledgeMobileSubnav } from "@/components/knowledge/knowledge-mobile-subnav";
import { KnowledgeWorkspaceShell } from "@/components/knowledge/knowledge-workspace-shell";
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
  latest_job_status: string | null;
  latest_job_phase: string | null;
  job_pages_total?: number | null;
  job_pages_processed?: number | null;
  job_progress_pct?: number | null;
  job_crawl_limit_exceeded?: boolean;
};

type WebsitePageItem = {
  url: string;
  status: string;
  depth: number;
  last_indexed_at: string | null;
  http_status: number | null;
};

const WEBSITE_PAGE_BATCH = 10;

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

async function fetchWebsiteSources(agentId: string): Promise<WebsiteSourceListRow[]> {
  const data = await backendFetch<{ sources: WebsiteSourceListRow[] }>(
    `/api/v1/knowledge/website/sources?agent_id=${encodeURIComponent(agentId)}`
  );
  return data.sources;
}

async function fetchWebsiteUsage(agentId: string): Promise<KnowledgeWebsiteUsage> {
  return backendFetch<KnowledgeWebsiteUsage>(
    `/api/v1/knowledge/website/usage?agent_id=${encodeURIComponent(agentId)}`
  );
}

export default function KnowledgeWebsitePage() {
  const { selectedAgentId } = useDashboardAgent();
  const [sourceType, setSourceType] = useState<SourceType>("crawl");
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
  const [addLinksExpanded, setAddLinksExpanded] = useState(true);
  const [protocol, setProtocol] = useState("https://");
  const [urlInput, setUrlInput] = useState("");
  const [includeChips, setIncludeChips] = useState<PathChip[]>([]);
  const [excludeChips, setExcludeChips] = useState<PathChip[]>([]);
  const [sources, setSources] = useState<WebsiteSourceListRow[]>([]);
  const [sourcesLoading, setSourcesLoading] = useState(false);
  const [usage, setUsage] = useState<KnowledgeWebsiteUsage | null>(null);
  const [usageLoading, setUsageLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const supportsAdvancedOptions = sourceType !== "individual";
  const submitLabel =
    sourceType === "sitemap" ? "Load sitemap" : sourceType === "individual" ? "Add link" : "Fetch links";

  const handleSourceTypeChange = (next: SourceType) => {
    setSourceType(next);
    setShowAdvancedOptions(false);
  };

  useEffect(() => {
    if (!selectedAgentId) return;
    let cancelled = false;
    void (async () => {
      await Promise.resolve();
      if (cancelled) return;
      setSourcesLoading(true);
      setUsageLoading(true);
      setError(null);
      try {
        const [nextSources, nextUsage] = await Promise.all([
          fetchWebsiteSources(selectedAgentId),
          fetchWebsiteUsage(selectedAgentId),
        ]);
        if (cancelled) return;
        setSources(nextSources);
        setUsage(nextUsage);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load sources");
      } finally {
        if (!cancelled) {
          setSourcesLoading(false);
          setUsageLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedAgentId]);

  const silentRefreshSources = useCallback(async () => {
    if (!selectedAgentId) return;
    try {
      const [s, u] = await Promise.all([fetchWebsiteSources(selectedAgentId), fetchWebsiteUsage(selectedAgentId)]);
      setSources(s);
      setUsage(u);
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

  const filteredSources = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return sources;
    return sources.filter((s) => (s.source_url ?? "").toLowerCase().includes(q) || s.title.toLowerCase().includes(q));
  }, [sources, searchQuery]);

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
      await silentRefreshSources();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Request failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <KnowledgeWorkspaceShell>
      <main className="min-w-0 flex-1 p-4 pb-24 [&_button]:cursor-pointer [&_select]:cursor-pointer md:p-8 md:pb-8">
        <KnowledgeMobileSubnav active="website" />

        <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="ds-app-page-title">Website</h1>
            <p className="ds-app-page-description ds-app-page-description--wide">
              Crawl pages or submit sitemaps so your agent stays aligned with live content.
            </p>
          </div>
          <button
            type="button"
            className="border-ds-outline text-ds-on-surface hover:bg-ds-sidebar flex w-fit cursor-pointer items-center gap-2 rounded-ds-md border bg-white px-4 py-2 text-sm font-medium shadow-sm transition-colors"
          >
            <IconInfo className="text-ds-primary size-4 shrink-0" aria-hidden />
            Learn more
          </button>
        </div>

        {error ? (
          <div className="border-ds-outline text-ds-on-surface mb-4 rounded-ds-lg border border-red-200 bg-red-50 px-4 py-3 text-sm">
            {error}
          </div>
        ) : null}

        <section className="border-ds-outline mb-10 overflow-hidden rounded-ds-xl border bg-ds-surface shadow-sm">
          <button
            type="button"
            className="border-ds-outline bg-ds-sidebar/90 hover:bg-ds-sidebar flex w-full cursor-pointer items-center justify-between border-b px-5 py-4 text-left transition-colors sm:px-6 sm:py-5"
            onClick={() => setAddLinksExpanded((p) => !p)}
          >
            <h2 className="ds-app-section-title text-base">Add links</h2>
            <IconChevron
              className={cn(
                "text-ds-on-surface-variant size-5 shrink-0 transition-transform",
                addLinksExpanded ? "rotate-90" : ""
              )}
              aria-hidden
            />
          </button>

          {addLinksExpanded ? (
            <>
              <div className="border-ds-outline overflow-x-auto px-5 sm:px-6">
                <div className="flex min-w-max gap-6">
                  {(["crawl", "sitemap", "individual"] as const).map((key) => (
                    <button
                      key={key}
                      type="button"
                      className={cn(
                        "cursor-pointer py-4 text-sm font-medium transition-colors",
                        sourceType === key
                          ? "text-ds-primary border-ds-primary border-b-2 font-semibold"
                          : "text-ds-on-surface-variant hover:text-ds-on-surface"
                      )}
                      onClick={() => handleSourceTypeChange(key)}
                    >
                      {key === "crawl" ? "Crawl links" : key === "sitemap" ? "Sitemap" : "Individual link"}
                    </button>
                  ))}
                </div>
              </div>

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
                        aria-hidden
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
                    <IconInfo className="text-ds-on-surface-variant mt-0.5 size-4 shrink-0" aria-hidden />
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
                        aria-hidden
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
            <SearchInput
              placeholder="Search…"
              className="w-full sm:w-64"
              value={searchQuery}
              onChange={(v) => setSearchQuery(v)}
            />
          </div>

          <div className="border-ds-outline flex flex-col gap-2 border-b pb-2 sm:flex-row sm:items-center sm:justify-between">
            <label className="text-ds-on-surface flex cursor-pointer items-center gap-3 text-sm">
              <input type="checkbox" className="border-ds-outline text-ds-primary size-4 cursor-pointer rounded" />
              <span className="font-semibold">Select all</span>
            </label>
            <button type="button" className="text-ds-on-surface-variant flex cursor-pointer items-center gap-1 text-sm">
              <span>Sort by:</span>
              <span className="text-ds-on-surface font-semibold">Default</span>
              <IconChevron className="size-4 rotate-90" aria-hidden />
            </button>
          </div>

          {sourcesLoading ? (
            <p className="text-ds-on-surface-variant text-sm">Loading sources…</p>
          ) : filteredSources.length === 0 ? (
            <p className="text-ds-on-surface-variant text-sm">No website sources yet. Add one above.</p>
          ) : (
            filteredSources.map((row) => (
              <WebsiteSourceRow key={row.id} source={row} onSourcesRefresh={silentRefreshSources} onError={setError} />
            ))
          )}
        </section>

        <DataSourcesSidebar mobile className="lg:hidden" agentId={selectedAgentId} usage={usage} usageLoading={usageLoading} />
      </main>

      <DataSourcesSidebar className="hidden lg:block" agentId={selectedAgentId} usage={usage} usageLoading={usageLoading} />
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
            aria-hidden
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

function SearchInput({
  placeholder,
  className,
  value,
  onChange,
}: {
  placeholder: string;
  className?: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className={cn("relative", className)}>
      <IconSearch
        className="text-ds-on-surface-variant pointer-events-none absolute top-1/2 left-3.5 size-4.5 -translate-y-1/2"
        aria-hidden
      />
      <input
        className="ds-app-field rounded-ds-lg py-2 pr-4"
        style={{ paddingLeft: "2.9rem" }}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

function WebsiteSourceRow({
  source,
  onSourcesRefresh,
  onError,
}: {
  source: WebsiteSourceListRow;
  onSourcesRefresh: () => Promise<void>;
  onError: (message: string | null) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [pageItems, setPageItems] = useState<WebsitePageItem[]>([]);
  const [pageTotal, setPageTotal] = useState<number | null>(null);
  const [pagesLoading, setPagesLoading] = useState(false);
  const [pagesLoadingMore, setPagesLoadingMore] = useState(false);
  const [deleting, setDeleting] = useState(false);
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
    if (!expanded) return;
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
          setExpanded(false);
        }
      } finally {
        setPagesLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [expanded, source.id, source.link_count, source.last_indexed_at, onError]);

  async function loadMore() {
    if (pageTotal === null || pageItems.length >= pageTotal) return;
    setPagesLoadingMore(true);
    onError(null);
    try {
      const offset = pageItems.length;
      const data = await backendFetch<{
        pages: WebsitePageItem[];
        total: number;
        offset: number;
        limit: number;
      }>(
        `/api/v1/knowledge/website/sources/${encodeURIComponent(source.id)}/pages?offset=${offset}&limit=${WEBSITE_PAGE_BATCH}`
      );
      setPageItems((prev) => [...prev, ...data.pages]);
      setPageTotal(data.total);
    } catch (e) {
      onError(e instanceof Error ? e.message : "Failed to load more URLs");
    } finally {
      setPagesLoadingMore(false);
    }
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

  const canLoadMore = pageTotal !== null && pageItems.length < pageTotal;

  const showIndexedRatio =
    source.job_pages_total != null &&
    source.job_pages_total > 0 &&
    (source.status === "indexing" ||
      source.latest_job_status === "queued" ||
      source.latest_job_status === "running" ||
      ((source.job_pages_processed ?? 0) < source.job_pages_total &&
        (source.latest_job_status === "succeeded" || source.status === "ready")));

  return (
    <div className="border-ds-outline border-b last:border-0">
      <div className="flex items-center py-4">
        <input type="checkbox" className="border-ds-outline text-ds-primary mr-4 size-4 shrink-0 cursor-pointer rounded" />
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <IconLanguage className="text-ds-on-surface-variant size-5 shrink-0" aria-hidden />
          <div className="min-w-0">
            <p className="text-ds-on-surface truncate text-sm font-semibold">{source.source_url ?? source.title}</p>
            <p className="text-ds-on-surface-variant text-xs">
              {formatRelativeTime(source.last_indexed_at)} · Pages: {source.link_count}
              {source.latest_job_phase ? ` · ${source.latest_job_phase}` : ""}
              {source.status === "indexing" ? " · Indexing…" : ""}
            </p>
          </div>
        </div>
        {showIndexedRatio ? (
          <div className="text-ds-on-surface-variant mr-2 hidden max-w-[min(14rem,40%)] shrink-0 flex-col items-end text-right text-xs sm:flex">
            <span className="tabular-nums">
              {source.job_pages_processed ?? 0}/{source.job_pages_total} indexed
            </span>
            {source.job_crawl_limit_exceeded ? (
              <span className="text-amber-800 mt-0.5 font-medium dark:text-amber-200">Limit exceeded</span>
            ) : null}
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
            <IconMore className="size-5" />
          </button>
          {menuOpen ? (
            <div
              role="menu"
              className="border-ds-outline bg-ds-surface absolute top-full right-0 z-20 mt-1 min-w-[11rem] rounded-ds-md border py-1 shadow-lg"
            >
              <button
                type="button"
                role="menuitem"
                disabled={deleting}
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
            onClick={() => setExpanded((v) => !v)}
          >
            <IconChevron
              className={cn("size-5 shrink-0 transition-transform", expanded ? "rotate-90" : "")}
              aria-hidden
            />
          </button>
        </div>
      </div>
      {expanded ? (
        <div className="bg-ds-sidebar py-2.5 pr-3 pl-10 sm:pl-14">
          {pagesLoading ? (
            <div className="text-ds-on-surface-variant space-y-2.5 py-1" aria-busy="true" aria-live="polite">
              <div className="bg-ds-on-surface-variant/12 h-2.5 w-full max-w-lg animate-pulse rounded-sm" />
              <div className="bg-ds-on-surface-variant/12 h-2.5 w-[92%] max-w-md animate-pulse rounded-sm" />
              <div className="bg-ds-on-surface-variant/12 h-2.5 w-[85%] max-w-sm animate-pulse rounded-sm" />
              <div className="bg-ds-on-surface-variant/12 h-2.5 w-[78%] max-w-xs animate-pulse rounded-sm" />
              <p className="text-ds-on-surface-variant pt-1 text-xs leading-relaxed">Loading indexed URLs…</p>
            </div>
          ) : pageTotal === 0 ? (
            <p className="text-ds-on-surface-variant py-1 text-sm leading-relaxed">
              No indexed URLs yet. Finish indexing to see links here.
            </p>
          ) : (
            <>
              <ul className="divide-ds-outline/40 max-h-72 divide-y overflow-y-auto">
                {pageItems.map((p) => (
                  <li key={p.url} className="min-w-0 py-2.5 first:pt-0 last:pb-0">
                    <p className="text-ds-on-surface truncate text-sm leading-snug" title={p.url}>
                      {p.url}
                    </p>
                    <p className="text-ds-on-surface-variant mt-0.5 text-xs leading-relaxed">
                      {p.status}
                      {p.http_status != null ? ` · HTTP ${p.http_status}` : ""} · depth {p.depth}
                    </p>
                  </li>
                ))}
              </ul>
              {canLoadMore ? (
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

function IconBase({
  className,
  children,
  fill = "none",
  strokeWidth = "1.8",
}: {
  className?: string;
  children: ReactNode;
  fill?: string;
  strokeWidth?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill={fill}
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      {children}
    </svg>
  );
}

function IconChevron({ className }: { className?: string }) {
  return (
    <IconBase className={className}>
      <path d="m9 18 6-6-6-6" />
    </IconBase>
  );
}

function IconInfo({ className }: { className?: string }) {
  return (
    <IconBase className={className}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 10v6M12 7.5h.01" />
    </IconBase>
  );
}

function IconSearch({ className }: { className?: string }) {
  return (
    <IconBase className={className}>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </IconBase>
  );
}

function IconLanguage({ className }: { className?: string }) {
  return (
    <IconBase className={className}>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18" />
    </IconBase>
  );
}

function IconMore({ className }: { className?: string }) {
  return (
    <IconBase className={className} fill="currentColor" strokeWidth="0">
      <circle cx="5" cy="12" r="1.7" />
      <circle cx="12" cy="12" r="1.7" />
      <circle cx="19" cy="12" r="1.7" />
    </IconBase>
  );
}
