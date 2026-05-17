const CAPABILITIES = [
  {
    title: "Live Shopify context",
    description: "Products, orders, inventory, and policies from your connected store, not a stale upload.",
  },
  {
    title: "Grounded knowledge",
    description: "Train on your site, files, snippets, and Q&A. Answers cite what you indexed.",
  },
  {
    title: "Essential AI, always on",
    description: "Fast replies on every plan. Standard and Pro add smart resolution for harder questions.",
  },
  {
    title: "Human handoff",
    description: "Escalate with full thread context and tickets your team can pick up in the dashboard.",
  },
] as const;

export function LandingStatsSection() {
  return (
    <section className="border-y border-zinc-200 bg-[#f8f9fa] px-6 py-16 sm:py-20">
      <div className="mx-auto max-w-[1200px]">
        <p className="mb-8 text-center text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
          Built for Shopify support teams
        </p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {CAPABILITIES.map((item) => (
            <article
              key={item.title}
              className="rounded-2xl border border-zinc-200 bg-white p-6 text-left shadow-sm"
            >
              <h3 className="text-base font-semibold text-ds-on-surface">{item.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ds-on-surface-variant">{item.description}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
