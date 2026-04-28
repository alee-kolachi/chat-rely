import { DataSourcesSidebar } from "@/components/knowledge/data-sources-sidebar";
import { KnowledgeMobileSubnav } from "@/components/knowledge/knowledge-mobile-subnav";

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
    answer:
      "Yes, we ship internationally. Delivery times vary by destination and customs processing.",
    updatedAt: "Updated 1 week ago",
  },
];

export default function KnowledgeQAndAPage() {
  return (
    <div className="-m-6 min-h-[calc(100vh-3.5rem)] bg-ds-surface">
      <div className="flex flex-col lg:flex-row">
        <main className="min-w-0 flex-1 p-4 pb-24 md:p-8 md:pb-8">
          <KnowledgeMobileSubnav active="q-and-a" />
          <div className="mx-auto max-w-5xl">
            <div className="mb-8">
              <h2 className="text-ds-on-surface text-2xl font-black tracking-tight">Q&A</h2>
              <p className="text-ds-on-surface-variant mt-1 text-sm">
                Add canonical question and answer pairs for direct, high-confidence replies.
              </p>
            </div>

            <section className="border-ds-outline mb-8 rounded-ds-xl border bg-white p-6">
              <h3 className="text-ds-on-surface mb-4 text-sm font-bold tracking-wide uppercase">
                Create Q&A pair
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="text-ds-on-surface-variant mb-2 block text-xs font-medium uppercase">
                    Question
                  </label>
                  <input
                    className="border-ds-outline w-full rounded-ds-lg border px-4 py-2.5 text-sm outline-none focus:border-black"
                    placeholder="e.g. How long does delivery take?"
                  />
                </div>
                <div>
                  <label className="text-ds-on-surface-variant mb-2 block text-xs font-medium uppercase">
                    Answer
                  </label>
                  <textarea
                    className="border-ds-outline min-h-32 w-full rounded-ds-lg border px-4 py-3 text-sm outline-none focus:border-black"
                    placeholder="Provide a clear, concise answer..."
                  />
                </div>
                <div className="flex justify-end">
                  <button className="bg-ds-primary text-ds-on-primary rounded-ds-lg px-5 py-2 text-sm font-semibold transition-opacity hover:opacity-90">
                    Save Q&A
                  </button>
                </div>
              </div>
            </section>

            <section className="border-ds-outline overflow-hidden rounded-ds-xl border bg-white">
              <div className="border-ds-outline flex items-center justify-between border-b px-6 py-4">
                <h3 className="text-ds-on-surface text-sm font-bold tracking-wide uppercase">
                  Q&A library
                </h3>
                <span className="text-ds-on-surface-variant text-xs">{qaItems.length} items</span>
              </div>
              <div className="divide-y divide-zinc-100">
                {qaItems.map((item) => (
                  <article key={item.question} className="p-6">
                    <p className="text-ds-on-surface mb-2 text-sm font-semibold">{item.question}</p>
                    <p className="text-ds-on-surface-variant text-sm leading-relaxed">{item.answer}</p>
                    <div className="mt-3 flex items-center justify-between">
                      <p className="text-ds-on-surface-variant text-xs">{item.updatedAt}</p>
                      <button className="text-ds-on-surface-variant hover:text-ds-on-surface text-xs font-medium">
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
      </div>
    </div>
  );
}
