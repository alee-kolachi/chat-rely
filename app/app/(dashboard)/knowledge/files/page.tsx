import { DataSourcesSidebar } from "@/components/knowledge/data-sources-sidebar";
import { KnowledgeMobileSubnav } from "@/components/knowledge/knowledge-mobile-subnav";

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
    <div className="-m-6 min-h-[calc(100vh-3.5rem)] bg-ds-surface">
      <div className="flex flex-col lg:flex-row">
        <main className="min-w-0 flex-1 p-4 pb-24 md:p-8 md:pb-8">
          <KnowledgeMobileSubnav active="files" />
          <div className="mx-auto max-w-5xl">
            <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-ds-on-surface text-2xl font-black tracking-tight">Files</h2>
                <p className="text-ds-on-surface-variant mt-1 text-sm">
                  Upload and manage documents to train your AI agent. Supports .pdf, .txt, .doc,
                  and .docx.
                </p>
              </div>
              <button className="bg-ds-primary text-ds-on-primary rounded-ds-lg flex w-fit items-center gap-2 px-5 py-2 text-sm font-semibold transition-all hover:opacity-90 active:scale-95">
                <IconUpload className="size-4.5" />
                Upload Files
              </button>
            </div>

            <div className="mb-10 cursor-pointer rounded-ds-xl border-2 border-dashed border-zinc-200 bg-white p-10 text-center transition-colors hover:border-black">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-zinc-50 transition-transform hover:scale-110">
                <IconCloudUpload className="text-ds-on-surface-variant size-5" />
              </div>
              <p className="text-sm font-semibold text-zinc-900">
                Drag and drop documents here or click to browse.
              </p>
              <p className="text-ds-on-surface-variant mt-1 text-xs">
                Max 50MB per file. High-quality extraction enabled.
              </p>
            </div>

            <div className="border-ds-outline overflow-hidden rounded-ds-xl border bg-white">
              <div className="border-ds-outline flex flex-col gap-2 border-b px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
                <h3 className="text-ds-on-surface text-sm font-bold tracking-wider uppercase">
                  File sources
                </h3>
                <div className="flex items-center gap-2">
                  <span className="text-ds-on-surface-variant text-xs">{fileRows.length} files</span>
                  <button className="rounded bg-red-100 px-3 py-1 text-xs font-bold text-red-700 transition-opacity hover:opacity-80">
                    Delete
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-zinc-50/50 text-ds-on-surface-variant text-[11px] font-bold tracking-widest uppercase">
                      <th className="w-10 px-6 py-3">
                        <input type="checkbox" defaultChecked className="h-4 w-4 rounded" />
                      </th>
                      <th className="px-4 py-3">File Name</th>
                      <th className="px-4 py-3">Characters</th>
                      <th className="px-4 py-3">Last Updated</th>
                      <th className="px-6 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {fileRows.map((row) => (
                      <tr key={row.name} className="transition-colors hover:bg-zinc-50">
                        <td className="px-6 py-4">
                          <input type="checkbox" defaultChecked className="h-4 w-4 rounded" />
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-3">
                            {row.icon === "pdf" ? (
                              <IconPdf className="text-ds-on-surface-variant size-5" />
                            ) : row.icon === "doc" ? (
                              <IconDoc className="text-ds-on-surface-variant size-5" />
                            ) : (
                              <IconTxt className="text-ds-on-surface-variant size-5" />
                            )}
                            <span className="text-sm font-medium text-black">{row.name}</span>
                          </div>
                        </td>
                        <td className="text-ds-on-surface-variant px-4 py-4 font-mono text-xs">
                          {row.characters}
                        </td>
                        <td className="text-ds-on-surface-variant px-4 py-4 text-xs">
                          {row.updatedAt}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button className="text-ds-on-surface-variant hover:text-ds-on-surface">
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
      </div>
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
