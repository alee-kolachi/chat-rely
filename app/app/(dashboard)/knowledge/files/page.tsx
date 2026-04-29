import { DataSourcesSidebar } from "@/components/knowledge/data-sources-sidebar";
import { KnowledgeMobileSubnav } from "@/components/knowledge/knowledge-mobile-subnav";
import { KnowledgeWorkspaceShell } from "@/components/knowledge/knowledge-workspace-shell";

const fileRows = [
  {
    icon: "pdf",
    name: "product_roadmap_2024.pdf",
    characters: "42,850",
    updatedAt: "Oct 24, 2023 · 14:20",
  },
  {
    icon: "doc",
    name: "customer_support_faqs.docx",
    characters: "128,402",
    updatedAt: "Oct 22, 2023 · 09:15",
  },
  {
    icon: "txt",
    name: "technical_specs_v2.txt",
    characters: "8,922",
    updatedAt: "Oct 21, 2023 · 18:45",
  },
  {
    icon: "pdf",
    name: "brand_guidelines.pdf",
    characters: "54,300",
    updatedAt: "Oct 19, 2023 · 11:30",
  },
];

export default function KnowledgeFilesPage() {
  return (
    <KnowledgeWorkspaceShell>
      <main className="min-w-0 flex-1 p-4 pb-24 md:p-8 md:pb-8">
        <KnowledgeMobileSubnav active="files" />
        <div className="mx-auto max-w-5xl">
          <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="ds-app-page-title">Files</h1>
              <p className="ds-app-page-description ds-app-page-description--wide">
                Upload documents to train your agent. Supports .pdf, .txt, .doc, and .docx.
              </p>
            </div>
            <button
              type="button"
              className="bg-ds-primary text-ds-on-primary hover:bg-ds-secondary flex w-fit items-center gap-2 rounded-ds-md px-5 py-2.5 text-sm font-semibold shadow-sm transition-colors active:scale-[0.98]"
            >
              <IconUpload className="size-4.5 shrink-0" aria-hidden />
              Upload files
            </button>
          </div>

          <div className="border-ds-outline mb-10 cursor-pointer rounded-ds-xl border-2 border-dashed bg-ds-surface/80 p-10 text-center shadow-sm transition-colors hover:border-ds-primary/50 hover:bg-white">
            <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-ds-sidebar ring-1 ring-ds-outline transition-transform hover:scale-105">
              <IconCloudUpload className="text-ds-primary size-5" aria-hidden />
            </div>
            <p className="text-ds-on-surface text-sm font-semibold">Drag and drop documents here or click to browse.</p>
            <p className="text-ds-on-surface-variant mt-1 text-xs leading-relaxed">Max 50MB per file. High-quality extraction enabled.</p>
          </div>

          <div className="border-ds-outline overflow-hidden rounded-ds-xl border bg-ds-surface shadow-sm">
            <div className="border-ds-outline bg-ds-sidebar/90 flex flex-col gap-2 border-b px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
              <h2 className="ds-app-kicker text-ds-on-surface font-semibold">File sources</h2>
              <div className="flex items-center gap-2">
                <span className="text-ds-on-surface-variant text-xs font-medium">{fileRows.length} files</span>
                <button
                  type="button"
                  className="rounded-ds-md bg-rose-100 px-3 py-1 text-xs font-semibold text-rose-800 transition-opacity hover:opacity-80"
                >
                  Delete
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="ds-app-kicker bg-ds-sidebar/80 text-ds-on-surface-variant">
                    <th className="w-10 px-5 py-3 sm:px-6">
                      <input type="checkbox" defaultChecked className="border-ds-outline size-4 rounded" aria-label="Select all" />
                    </th>
                    <th className="px-4 py-3 font-semibold">File name</th>
                    <th className="px-4 py-3 font-semibold">Characters</th>
                    <th className="px-4 py-3 font-semibold">Last updated</th>
                    <th className="px-5 py-3 text-right font-semibold sm:px-6">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-ds-outline divide-y">
                  {fileRows.map((row) => (
                    <tr key={row.name} className="transition-colors hover:bg-ds-sidebar/50">
                      <td className="px-5 py-4 sm:px-6">
                        <input type="checkbox" defaultChecked className="border-ds-outline size-4 rounded" aria-label={`Select ${row.name}`} />
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          {row.icon === "pdf" ? (
                            <IconPdf className="text-ds-on-surface-variant size-5 shrink-0" aria-hidden />
                          ) : row.icon === "doc" ? (
                            <IconDoc className="text-ds-on-surface-variant size-5 shrink-0" aria-hidden />
                          ) : (
                            <IconTxt className="text-ds-on-surface-variant size-5 shrink-0" aria-hidden />
                          )}
                          <span className="text-ds-on-surface text-sm font-medium">{row.name}</span>
                        </div>
                      </td>
                      <td className="text-ds-on-surface-variant px-4 py-4 font-mono text-xs">{row.characters}</td>
                      <td className="text-ds-on-surface-variant px-4 py-4 text-xs">{row.updatedAt}</td>
                      <td className="px-5 py-4 text-right sm:px-6">
                        <button type="button" className="text-ds-on-surface-variant hover:text-ds-on-surface rounded-ds-md p-1" aria-label="More">
                          <IconMore className="size-5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <DataSourcesSidebar mobile className="lg:hidden" />
      </main>

      <DataSourcesSidebar className="hidden lg:block" />
    </KnowledgeWorkspaceShell>
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

function IconUpload({ className }: { className?: string }) {
  return (
    <IconBase className={className}>
      <path d="M12 16V4" />
      <path d="m7 9 5-5 5 5" />
      <path d="M4 20h16" />
    </IconBase>
  );
}

function IconCloudUpload({ className }: { className?: string }) {
  return (
    <IconBase className={className}>
      <path d="M7 18a4 4 0 1 1 .6-7.95A5 5 0 0 1 17 11h1a3 3 0 0 1 0 6H7Z" />
      <path d="M12 14V9" />
      <path d="m10 11 2-2 2 2" />
    </IconBase>
  );
}

function IconPdf({ className }: { className?: string }) {
  return (
    <IconBase className={className}>
      <path d="M6 3h8l4 4v14H6z" />
      <path d="M14 3v4h4" />
      <path d="M9 17h6" />
    </IconBase>
  );
}

function IconDoc({ className }: { className?: string }) {
  return (
    <IconBase className={className}>
      <path d="M6 3h8l4 4v14H6z" />
      <path d="M14 3v4h4" />
      <path d="M9 11h6M9 14h6M9 17h4" />
    </IconBase>
  );
}

function IconTxt({ className }: { className?: string }) {
  return (
    <IconBase className={className}>
      <path d="M6 3h8l4 4v14H6z" />
      <path d="M14 3v4h4" />
      <path d="M9 12h2M13 12h2M10 16h4" />
    </IconBase>
  );
}

function IconMore({ className }: { className?: string }) {
  return (
    <IconBase className={className} fill="currentColor" strokeWidth="0">
      <circle cx="12" cy="5" r="1.7" />
      <circle cx="12" cy="12" r="1.7" />
      <circle cx="12" cy="19" r="1.7" />
    </IconBase>
  );
}
