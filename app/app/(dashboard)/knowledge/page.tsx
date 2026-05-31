import Link from "next/link";
import { KnowledgeWorkspaceShell } from "@/components/knowledge/knowledge-workspace-shell";
import { cn } from "@/lib/utils";

const AREAS = [
  {
    href: "/knowledge/website",
    title: "Website",
    description: "Crawl pages and sitemaps so your agent can quote your live site.",
  },
  {
    href: "/knowledge/files",
    title: "Files",
    description: "Upload PDFs and documents for grounded answers.",
  },
  {
    href: "/knowledge/text-snippet",
    title: "Text snippets",
    description: "Paste short notes or policies the agent should always consider.",
  },
  {
    href: "/knowledge/q-and-a",
    title: "Q&A",
    description: "Curated question-and-answer pairs for consistent responses.",
  },
] as const;

export default function KnowledgePage() {
  return (
    <KnowledgeWorkspaceShell>
      <main className="ds-app-page-scroll min-w-0 flex-1 overflow-y-auto overscroll-y-contain">
        <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-6">
          <div>
            <h1 className="ds-app-page-title">Knowledge</h1>
            <p className="ds-app-page-description ds-app-page-description--wide">
              Documents and data sources your agent retrieves from when answering customers.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {AREAS.map((area) => (
              <Link
                key={area.href}
                href={area.href}
                className={cn(
                  "border-ds-outline bg-ds-surface hover:border-black/40 group rounded-ds-xl border p-5 shadow-sm transition-colors sm:p-6",
                  "focus-visible:ring-ds-primary/40 outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
                )}
              >
                <h2 className="text-ds-on-surface group-hover:text-ds-interactive-hover text-base font-semibold transition-colors">
                  {area.title}
                </h2>
                <p className="ds-app-body-muted mt-1">{area.description}</p>
                <span className="text-ds-primary mt-3 inline-flex items-center text-sm font-medium">
                  Open
                  <span className="ml-0.5 transition-transform group-hover:translate-x-0.5" aria-hidden>
                    →
                  </span>
                </span>
              </Link>
            ))}
          </div>
        </div>
      </main>
    </KnowledgeWorkspaceShell>
  );
}
