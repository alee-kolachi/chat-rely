import { DataSourcesSidebar } from "@/components/knowledge/data-sources-sidebar";
import { KnowledgeMobileSubnav } from "@/components/knowledge/knowledge-mobile-subnav";
import { KnowledgeWorkspaceShell } from "@/components/knowledge/knowledge-workspace-shell";

const qaItems = [
  {
    question: "How can I track my order?",
    answer:
      "You can track your order from the tracking link sent by email or by sharing your order ID with support.",
    updatedAt: "Updated today",
  },
  {
    question: "What is your return policy?",
    answer:
      "Returns are accepted within 30 days for unused items in original packaging with proof of purchase.",
    updatedAt: "Updated 3 days ago",
  },
  {
    question: "Do you ship internationally?",
    answer: "Yes, we ship internationally. Delivery times vary by destination and customs processing.",
    updatedAt: "Updated 1 week ago",
  },
];

export default function KnowledgeQAndAPage() {
  return (
    <KnowledgeWorkspaceShell>
      <main className="min-w-0 flex-1 p-4 pb-24 md:p-8 md:pb-8">
        <KnowledgeMobileSubnav active="q-and-a" />
        <div className="mx-auto max-w-5xl">
          <div className="mb-8">
            <h1 className="ds-app-page-title">Q&A</h1>
            <p className="ds-app-page-description ds-app-page-description--wide">
              Canonical question and answer pairs for direct, high-confidence replies.
            </p>
          </div>

          <section className="border-ds-outline mb-8 rounded-ds-xl border bg-ds-surface p-6 shadow-sm">
            <h2 className="ds-app-kicker text-ds-on-surface mb-4 font-semibold">Create Q&A pair</h2>
            <div className="space-y-4">
              <div>
                <label className="ds-app-kicker mb-2 block text-ds-on-surface-variant">Question</label>
                <input
                  className="ds-app-field rounded-ds-lg"
                  placeholder="e.g. How long does delivery take?"
                />
              </div>
              <div>
                <label className="ds-app-kicker mb-2 block text-ds-on-surface-variant">Answer</label>
                <textarea
                  className="ds-app-field rounded-ds-lg"
                  placeholder="Provide a clear, concise answer…"
                />
              </div>
              <div className="flex justify-end">
                <button
                  type="button"
                  className="bg-ds-primary text-ds-on-primary hover:bg-ds-secondary rounded-ds-md px-5 py-2.5 text-sm font-semibold transition-colors active:scale-[0.98]"
                >
                  Save Q&A
                </button>
              </div>
            </div>
          </section>

          <section className="border-ds-outline overflow-hidden rounded-ds-xl border bg-ds-surface shadow-sm">
            <div className="border-ds-outline bg-ds-sidebar/90 flex items-center justify-between border-b px-5 py-4 sm:px-6">
              <h2 className="ds-app-kicker text-ds-on-surface font-semibold">Q&A library</h2>
              <span className="text-ds-on-surface-variant text-xs font-medium">{qaItems.length} items</span>
            </div>
            <div className="divide-ds-outline divide-y">
              {qaItems.map((item) => (
                <article key={item.question} className="p-5 sm:p-6">
                  <p className="text-ds-on-surface text-sm font-semibold">{item.question}</p>
                  <p className="text-ds-on-surface-variant mt-2 text-sm leading-relaxed">{item.answer}</p>
                  <div className="mt-3 flex items-center justify-between">
                    <p className="text-ds-on-surface-variant text-xs">{item.updatedAt}</p>
                    <button
                      type="button"
                      className="text-ds-primary text-xs font-semibold hover:underline"
                    >
                      Edit
                    </button>
                  </div>
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
