import { DataSourcesSidebar } from "@/components/knowledge/data-sources-sidebar";
import { KnowledgeMobileSubnav } from "@/components/knowledge/knowledge-mobile-subnav";

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
    <div className="-m-6 min-h-[calc(100vh-3.5rem)] bg-ds-surface">
      <div className="flex flex-col lg:flex-row">
        <main className="min-w-0 flex-1 p-4 pb-24 md:p-8 md:pb-8">
          <KnowledgeMobileSubnav active="text-snippet" />
          <div className="mx-auto max-w-5xl">
            <div className="mb-8">
              <h2 className="text-ds-on-surface text-2xl font-black tracking-tight">Text Snippets</h2>
              <p className="text-ds-on-surface-variant mt-1 text-sm">
                Add short pieces of knowledge to improve retrieval for repeated support answers.
              </p>
            </div>

            <section className="border-ds-outline mb-8 rounded-ds-xl border bg-white p-6">
              <h3 className="text-ds-on-surface mb-4 text-sm font-bold tracking-wide uppercase">
                Create snippet
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="text-ds-on-surface-variant mb-2 block text-xs font-medium uppercase">
                    Title
                  </label>
                  <input
                    className="border-ds-outline w-full rounded-ds-lg border px-4 py-2.5 text-sm outline-none focus:border-black"
                    placeholder="e.g. Return policy summary"
                  />
                </div>
                <div>
                  <label className="text-ds-on-surface-variant mb-2 block text-xs font-medium uppercase">
                    Snippet text
                  </label>
                  <textarea
                    className="border-ds-outline min-h-32 w-full rounded-ds-lg border px-4 py-3 text-sm outline-none focus:border-black"
                    placeholder="Write the text you want your AI to use..."
                  />
                </div>
                <div className="flex justify-end">
                  <button className="bg-ds-primary text-ds-on-primary rounded-ds-lg px-5 py-2 text-sm font-semibold transition-opacity hover:opacity-90">
                    Save Snippet
                  </button>
                </div>
              </div>
            </section>

            <section className="border-ds-outline overflow-hidden rounded-ds-xl border bg-white">
              <div className="border-ds-outline flex items-center justify-between border-b px-6 py-4">
                <h3 className="text-ds-on-surface text-sm font-bold tracking-wide uppercase">
                  Snippet library
                </h3>
                <span className="text-ds-on-surface-variant text-xs">{snippets.length} snippets</span>
              </div>
              <div className="divide-y divide-zinc-100">
                {snippets.map((snippet) => (
                  <article key={snippet.title} className="p-6">
                    <div className="mb-2 flex items-start justify-between gap-4">
                      <h4 className="text-ds-on-surface text-sm font-semibold">{snippet.title}</h4>
                      <button className="text-ds-on-surface-variant hover:text-ds-on-surface text-xs font-medium">
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
      </div>
    </div>
  );
}
