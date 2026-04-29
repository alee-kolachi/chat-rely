import type { ReactNode } from "react";
import { DataSourcesSidebar } from "@/components/knowledge/data-sources-sidebar";
import { KnowledgeMobileSubnav } from "@/components/knowledge/knowledge-mobile-subnav";
import { KnowledgeWorkspaceShell } from "@/components/knowledge/knowledge-workspace-shell";
import { cn } from "@/lib/utils";

const sourceRows = [
  {
    url: "https://breakout.com.pk",
    status: "Last crawled 2 days ago",
    links: "Links: 2068",
  },
];

export default function KnowledgeWebsitePage() {
  return (
    <KnowledgeWorkspaceShell>
      <main className="min-w-0 flex-1 p-4 pb-24 md:p-8 md:pb-8">
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
            className="border-ds-outline text-ds-on-surface hover:bg-ds-sidebar flex w-fit items-center gap-2 rounded-ds-md border bg-white px-4 py-2 text-sm font-medium shadow-sm transition-colors"
          >
            <IconInfo className="text-ds-primary size-4 shrink-0" aria-hidden />
            Learn more
          </button>
        </div>

        <section className="border-ds-outline mb-10 overflow-hidden rounded-ds-xl border bg-ds-surface shadow-sm">
          <div className="border-ds-outline bg-ds-sidebar/90 flex items-center justify-between border-b p-5 sm:p-6">
            <h2 className="ds-app-section-title text-base">Add links</h2>
            <IconChevron className="text-ds-on-surface-variant size-5 rotate-90 shrink-0" aria-hidden />
          </div>

          <div className="border-ds-outline overflow-x-auto px-5 sm:px-6">
            <div className="flex min-w-max gap-6">
              <button
                type="button"
                className="text-ds-primary border-ds-primary border-b-2 py-4 text-sm font-semibold"
              >
                Crawl links
              </button>
              <button
                type="button"
                className="text-ds-on-surface-variant hover:text-ds-on-surface py-4 text-sm font-medium transition-colors"
              >
                Sitemap
              </button>
              <button
                type="button"
                className="text-ds-on-surface-variant hover:text-ds-on-surface py-4 text-sm font-medium transition-colors"
              >
                Individual link
              </button>
            </div>
          </div>

          <div className="space-y-6 p-5 sm:p-6">
            <div className="space-y-2">
              <label className="ds-app-kicker block text-ds-on-surface-variant">URL</label>
              <div className="border-ds-outline focus-within:border-ds-primary focus-within:ring-ds-primary/15 flex items-center overflow-hidden rounded-ds-lg border bg-white focus-within:ring-2">
                <div className="border-ds-outline bg-ds-sidebar flex items-center gap-1 border-r px-4 py-3">
                  <span className="text-ds-on-surface text-sm font-medium">https://</span>
                  <IconChevron className="text-ds-on-surface-variant size-4 rotate-90" aria-hidden />
                </div>
                <input className="min-w-0 flex-1 px-4 py-3 text-sm outline-none" placeholder="www.example.com" />
              </div>
              <div className="mt-2 flex items-start gap-2">
                <IconInfo className="text-ds-on-surface-variant mt-0.5 size-4 shrink-0" aria-hidden />
                <p className="text-ds-on-surface-variant text-xs leading-relaxed">
                  Links found during crawling or sitemap retrieval may be updated when new links appear or some links
                  become invalid.
                </p>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="button"
                className="text-ds-on-surface flex items-center gap-2 text-sm font-semibold hover:text-ds-primary"
              >
                <IconChevron className="size-4 rotate-90" aria-hidden />
                Advanced options
              </button>

              <div className="mt-4 space-y-6">
                <PathRuleRow label="Include only paths" />
                <PathRuleRow label="Exclude paths" />

                <label className="text-ds-on-surface flex cursor-pointer items-center gap-2 text-sm">
                  <input type="checkbox" className="border-ds-outline text-ds-primary size-4 rounded" />
                  <span>Slow scraping</span>
                  <IconInfo className="text-ds-on-surface-variant size-4" aria-hidden />
                </label>
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <button
                type="button"
                className="bg-ds-primary text-ds-on-primary hover:bg-ds-secondary rounded-ds-md px-6 py-2.5 text-sm font-semibold transition-colors active:scale-[0.98]"
              >
                Fetch links
              </button>
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="ds-app-section-title text-base">Link sources</h2>
            <SearchInput placeholder="Search…" className="w-full sm:w-64" />
          </div>

          <div className="border-ds-outline flex flex-col gap-2 border-b pb-2 sm:flex-row sm:items-center sm:justify-between">
            <label className="text-ds-on-surface flex cursor-pointer items-center gap-3 text-sm">
              <input type="checkbox" className="border-ds-outline text-ds-primary size-4 rounded" />
              <span className="font-semibold">Select all</span>
            </label>
            <button type="button" className="text-ds-on-surface-variant flex items-center gap-1 text-sm">
              <span>Sort by:</span>
              <span className="text-ds-on-surface font-semibold">Default</span>
              <IconChevron className="size-4 rotate-90" aria-hidden />
            </button>
          </div>

          {sourceRows.map((row) => (
            <div key={row.url} className="border-ds-outline flex items-center border-b py-4 last:border-0">
              <input type="checkbox" className="border-ds-outline text-ds-primary mr-4 size-4 rounded" />
              <div className="flex min-w-0 flex-1 items-center gap-2">
                <IconLanguage className="text-ds-on-surface-variant size-5 shrink-0" aria-hidden />
                <div className="min-w-0">
                  <p className="text-ds-on-surface truncate text-sm font-semibold">{row.url}</p>
                  <p className="text-ds-on-surface-variant text-xs">
                    {row.status} · {row.links}
                  </p>
                </div>
              </div>
              <div className="text-ds-on-surface-variant flex shrink-0 items-center gap-2">
                <button type="button" className="hover:text-ds-on-surface rounded-ds-md p-1 transition-colors" aria-label="More">
                  <IconMore className="size-5" />
                </button>
                <button type="button" className="hover:text-ds-on-surface rounded-ds-md p-1 transition-colors" aria-label="Expand">
                  <IconChevron className="size-5 rotate-90" />
                </button>
              </div>
            </div>
          ))}
        </section>

        <DataSourcesSidebar mobile className="lg:hidden" />
      </main>

      <DataSourcesSidebar className="hidden lg:block" />
    </KnowledgeWorkspaceShell>
  );
}

function PathRuleRow({ label }: { label: string }) {
  return (
    <div className="space-y-2">
      <label className="text-ds-on-surface-variant text-xs font-medium">{label}</label>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="border-ds-outline flex min-w-[120px] items-center gap-1 rounded-ds-lg border bg-white px-3 py-2 text-sm shadow-sm"
        >
          <span>Starts with</span>
          <IconChevron className="text-ds-on-surface-variant ml-auto size-4 rotate-90" aria-hidden />
        </button>
        <input className="ds-app-field min-w-[180px] flex-1 rounded-ds-lg" placeholder="/blog" />
        <button
          type="button"
          className="border-ds-outline text-ds-on-surface-variant hover:bg-ds-sidebar rounded-ds-lg border bg-white px-5 py-2 text-sm font-medium transition-colors"
        >
          Add
        </button>
      </div>
    </div>
  );
}

function SearchInput({ placeholder, className }: { placeholder: string; className?: string }) {
  return (
    <div className={cn("relative", className)}>
      <IconSearch className="text-ds-on-surface-variant pointer-events-none absolute top-1/2 left-3 size-4.5 -translate-y-1/2" aria-hidden />
      <input className="ds-app-field rounded-ds-lg py-2 pr-4 pl-10" placeholder={placeholder} />
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
