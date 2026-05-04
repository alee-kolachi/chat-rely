import Link from "next/link";
import { PageHeader } from "@/components/dashboard/page-header";
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
      <main className="min-w-0 flex-1 p-6 md:p-8">
        <PageHeader
          title="Knowledge"
          description="Documents and data sources your agent retrieves from when answering customers."
          descriptionWide
        />

        <div className="grid gap-3 sm:grid-cols-2 sm:gap-4">
          {AREAS.map((area) => (
            <Link
              key={area.href}
              href={area.href}
              className={cn(
                "border-ds-outline bg-ds-surface hover:border-ds-primary/40 group rounded-xl border p-4 shadow-sm transition-colors",
                "focus-visible:ring-ds-primary/40 outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
              )}
            >
              <h2 className="text-ds-on-surface group-hover:text-ds-primary text-base font-semibold transition-colors">
                {area.title}
              </h2>
              <p className="text-ds-on-surface-variant mt-1 text-sm leading-relaxed">{area.description}</p>
              <span className="text-ds-primary mt-3 inline-flex items-center text-sm font-medium">
                Open
                <span className="ml-0.5 transition-transform group-hover:translate-x-0.5" aria-hidden>
                  →
                </span>
              </span>
            </Link>
          ))}
        </div>
      </main>
    </KnowledgeWorkspaceShell>
  );
}
