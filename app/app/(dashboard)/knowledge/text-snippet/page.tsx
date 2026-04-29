import { DataSourcesSidebar } from "@/components/knowledge/data-sources-sidebar";
import { KnowledgeMobileSubnav } from "@/components/knowledge/knowledge-mobile-subnav";
import { KnowledgeWorkspaceShell } from "@/components/knowledge/knowledge-workspace-shell";

const snippets = [
  {
    title: "Refund Policy",
    text: "Refund requests are accepted within 30 days with original receipt and order ID.",
    updatedAt: "Updated 2 days ago",
  },
  {
    title: "Shipping SLA",
    text: "Orders ship within 24-48 hours. International shipping may take 5-10 business days.",
    updatedAt: "Updated 5 days ago",
  },
  {
    title: "Store Hours",
    text: "Support is available Monday to Friday, 9:00 AM to 6:00 PM PKT.",
    updatedAt: "Updated 1 week ago",
  },
];

export default function KnowledgeTextSnippetPage() {
  return (
    <KnowledgeWorkspaceShell>
      <main className="min-w-0 flex-1 p-4 pb-24 md:p-8 md:pb-8">
        <KnowledgeMobileSubnav active="text-snippet" />
        <div className="mx-auto max-w-5xl">
          <div className="mb-8">
            <h1 className="ds-app-page-title">Text snippets</h1>
            <p className="ds-app-page-description ds-app-page-description--wide">
              Short knowledge excerpts to improve retrieval for repeated support answers.
            </p>
          </div>

          <section className="border-ds-outline mb-8 rounded-ds-xl border bg-ds-surface p-6 shadow-sm">
            <h2 className="ds-app-kicker text-ds-on-surface mb-4 font-semibold">Create snippet</h2>
            <div className="space-y-4">
              <div>
                <label className="ds-app-kicker mb-2 block text-ds-on-surface-variant">Title</label>
                <input className="ds-app-field rounded-ds-lg" placeholder="e.g. Return policy summary" />
              </div>
              <div>
                <label className="ds-app-kicker mb-2 block text-ds-on-surface-variant">Snippet text</label>
                <textarea className="ds-app-field rounded-ds-lg" placeholder="Write the text you want your AI to use…" />
              </div>
              <div className="flex justify-end">
                <button
                  type="button"
                  className="bg-ds-primary text-ds-on-primary hover:bg-ds-secondary rounded-ds-md px-5 py-2.5 text-sm font-semibold transition-colors active:scale-[0.98]"
                >
                  Save snippet
                </button>
              </div>
            </div>
          </section>

          <section className="border-ds-outline overflow-hidden rounded-ds-xl border bg-ds-surface shadow-sm">
            <div className="border-ds-outline bg-ds-sidebar/90 flex items-center justify-between border-b px-5 py-4 sm:px-6">
              <h2 className="ds-app-kicker text-ds-on-surface font-semibold">Snippet library</h2>
              <span className="text-ds-on-surface-variant text-xs font-medium">{snippets.length} snippets</span>
            </div>
            <div className="divide-ds-outline divide-y">
              {snippets.map((snippet) => (
                <article key={snippet.title} className="p-5 sm:p-6">
                  <div className="mb-2 flex items-start justify-between gap-4">
                    <h3 className="text-ds-on-surface text-sm font-semibold">{snippet.title}</h3>
                    <button type="button" className="text-ds-primary shrink-0 text-xs font-semibold hover:underline">
                      Edit
                    </button>
                  </div>
                  <p className="text-ds-on-surface-variant text-sm leading-relaxed">{snippet.text}</p>
                  <p className="text-ds-on-surface-variant mt-3 text-xs">{snippet.updatedAt}</p>
                </article>
              ))}
            </div>
          </section>
        </div>

        <DataSourcesSidebar mobile className="lg:hidden" />
      </main>

      <DataSourcesSidebar className="hidden lg:block" />
    </KnowledgeWorkspaceShell>
  );
}
