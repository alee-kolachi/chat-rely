import { DataSourcesSidebar } from "@/components/knowledge/data-sources-sidebar";
import { KnowledgeMobileSubnav } from "@/components/knowledge/knowledge-mobile-subnav";

const sourceRows = [
  {
    url: "https://breakout.com.pk",
    status: "Last crawled 2 days ago",
    links: "Links: 2068",
  },
];

export default function KnowledgeWebsitePage() {
  return (
    <div className="-m-6 min-h-[calc(100vh-3.5rem)] bg-ds-surface">
      <div className="flex flex-col lg:flex-row">
        <main className="min-w-0 flex-1 px-4 py-6 pb-24 md:px-8 md:py-10 md:pb-10">
          <KnowledgeMobileSubnav active="website" />
          <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="text-ds-on-surface mb-1 text-2xl font-bold">Website</h1>
              <p className="text-ds-on-surface-variant text-sm">
                Crawl web pages or submit sitemaps to update your AI with the latest content.
              </p>
            </div>
            <button className="border-ds-outline text-ds-on-surface hover:bg-ds-sidebar flex w-fit items-center gap-2 rounded-ds-md border px-4 py-2 text-sm font-medium transition-colors">
              <IconInfo className="size-4" />
              Learn more
            </button>
          </div>

          <section className="border-ds-outline mb-10 overflow-hidden rounded-ds-xl border bg-white shadow-sm">
            <div className="border-ds-outline flex items-center justify-between border-b p-6">
              <h2 className="text-ds-on-surface text-[15px] font-bold">Add links</h2>
              <IconChevron className="text-ds-on-surface-variant size-5 rotate-90" />
            </div>

            <div className="border-ds-outline overflow-x-auto px-6">
              <div className="flex min-w-max gap-6">
                <button className="border-ds-primary py-4 text-sm font-bold text-black border-b-2">
                  Crawl links
                </button>
                <button className="text-ds-on-surface-variant hover:text-ds-on-surface py-4 text-sm font-medium transition-colors">
                  Sitemap
                </button>
                <button className="text-ds-on-surface-variant hover:text-ds-on-surface py-4 text-sm font-medium transition-colors">
                  Individual link
                </button>
              </div>
            </div>

            <div className="space-y-6 p-6">
              <div className="space-y-2">
                <label className="text-ds-on-surface-variant text-xs font-medium tracking-wider uppercase">
                  URL
                </label>
                <div className="border-ds-outline focus-within:border-ds-primary flex items-center overflow-hidden rounded-ds-lg border">
                  <div className="border-ds-outline bg-ds-sidebar flex items-center gap-1 border-r px-4 py-3">
                    <span className="text-sm font-medium">https://</span>
                    <IconChevron className="text-ds-on-surface-variant size-4 rotate-90" />
                  </div>
                  <input
                    className="flex-1 px-4 py-3 text-sm outline-none"
                    placeholder="www.example.com"
                  />
                </div>
                <div className="mt-2 flex items-start gap-2">
                  <IconInfo className="text-ds-on-surface-variant mt-0.5 size-4" />
                  <p className="text-ds-on-surface-variant text-xs">
                    Links found during crawling or sitemap retrieval may be updated if new links
                    are discovered or some links are invalid.
                  </p>
                </div>
              </div>

              <div className="pt-2">
                <button className="mb-4 flex items-center gap-2 text-sm font-bold">
                  <IconChevron className="size-4 rotate-90" />
                  Advanced options
                </button>

                <div className="space-y-6">
                  <PathRuleRow label="Include only paths" />
                  <PathRuleRow label="Exclude paths" />

                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" className="border-ds-outline h-4 w-4 rounded" />
                    <span>Slow scraping</span>
                    <IconInfo className="text-ds-on-surface-variant size-4" />
                  </label>
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <button className="rounded-ds-lg bg-zinc-500 px-6 py-2.5 text-sm font-bold text-white transition-colors hover:bg-zinc-600">
                  Fetch links
                </button>
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-ds-on-surface text-base font-bold">Link sources</h2>
              <SearchInput placeholder="Search..." className="w-full sm:w-64" />
            </div>

            <div className="border-ds-outline flex flex-col gap-2 border-b pb-2 sm:flex-row sm:items-center sm:justify-between">
              <label className="flex items-center gap-3">
                <input type="checkbox" className="border-ds-outline h-4 w-4 rounded" />
                <span className="text-sm font-bold">Select all</span>
              </label>
              <button className="text-ds-on-surface-variant flex items-center gap-1 text-sm">
                <span>Sort by:</span>
                <span className="text-ds-on-surface font-bold">Default</span>
                <IconChevron className="size-4 rotate-90" />
              </button>
            </div>

            {sourceRows.map((row) => (
              <div
                key={row.url}
                className="border-ds-outline flex items-center border-b py-4"
              >
                <input type="checkbox" className="border-ds-outline mr-4 h-4 w-4 rounded" />
                <div className="flex flex-1 items-center gap-2">
                  <IconLanguage className="text-ds-on-surface-variant size-5" />
                  <div>
                    <p className="text-ds-on-surface text-sm font-bold">{row.url}</p>
                    <p className="text-ds-on-surface-variant text-xs">
                      {row.status} • {row.links}
                    </p>
                  </div>
                </div>
                <div className="text-ds-on-surface-variant flex items-center gap-4">
                  <button className="hover:text-ds-on-surface p-1 transition-colors">
                    <IconMore className="size-5" />
                  </button>
                  <button className="hover:text-ds-on-surface p-1 transition-colors">
                    <IconChevron className="size-5 rotate-90" />
                  </button>
                </div>
              </div>
            ))}
          </section>

          <DataSourcesSidebar mobile className="lg:hidden" />
        </main>

        <DataSourcesSidebar className="hidden lg:block" />
      </div>
    </div>
  );
}

function PathRuleRow({ label }: { label: string }) {
  return (
    <div className="space-y-2">
      <label className="text-ds-on-surface-variant text-xs font-medium">{label}</label>
      <div className="flex flex-wrap gap-2">
        <button className="border-ds-outline flex min-w-[120px] items-center gap-1 rounded-ds-lg border bg-white px-3 py-2">
          <span className="text-sm">Starts with</span>
          <IconChevron className="text-ds-on-surface-variant ml-auto size-4 rotate-90" />
        </button>
        <input
          className="border-ds-outline min-w-[180px] flex-1 rounded-ds-lg border px-4 py-2 text-sm"
          placeholder="/blog"
        />
        <button className="border-ds-outline text-ds-on-surface-variant hover:bg-ds-sidebar rounded-ds-lg border px-5 py-2 text-sm font-medium transition-colors">
          Add
        </button>
      </div>
    </div>
  );
}

function SearchInput({ placeholder, className }: { placeholder: string; className?: string }) {
  return (
    <div className={`relative ${className ?? ""}`}>
      <IconSearch className="text-ds-on-surface-variant absolute top-1/2 left-3 size-4.5 -translate-y-1/2" />
      <input
        className="border-ds-outline bg-white w-full rounded-ds-lg border py-2 pr-4 pl-10 text-sm outline-none focus:border-black"
        placeholder={placeholder}
      />
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
  children: React.ReactNode;
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

