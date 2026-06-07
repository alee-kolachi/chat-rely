import Link from "next/link";
import { LandingReveal } from "@/components/marketing/landing/landing-reveal";
import { LandingSectionLabel } from "@/components/marketing/landing/landing-section-label";
import { StoryPostCover, type StoryPostCoverVariant } from "@/components/marketing/landing/story/scenes";

const posts = [
  {
    title: "Connect Shopify in one sitting",
    category: "Product",
    date: "Apr 14, 2026",
    cover: "shopify",
  },
  {
    title: "How to test your agent before launch",
    category: "Guide",
    date: "May 12, 2026",
    cover: "playground",
  },
  {
    title: "When premium AI helps most",
    category: "Product",
    date: "Feb 23, 2026",
    cover: "resolution",
  },
  {
    title: "Knowledge sources that reduce escalations",
    category: "Guide",
    date: "Feb 17, 2026",
    cover: "knowledge",
  },
] as const satisfies ReadonlyArray<{ title: string; category: string; date: string; cover: StoryPostCoverVariant }>;

export function LandingInsightsSection() {
  const [featured, ...rest] = posts;

  return (
    <section className="bg-ds-surface px-6 py-20 sm:py-24">
      <div className="mx-auto max-w-[1100px]">
        <LandingReveal>
          <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
            <div>
              <LandingSectionLabel tone="light">Guides</LandingSectionLabel>
              <h2 className="mkt-display mt-6 text-4xl sm:text-5xl">Latest from ChatRely</h2>
            </div>
            <Link href="/about" className="mkt-pill mkt-pill-outline shrink-0">
              View all posts
            </Link>
          </div>
        </LandingReveal>

        <div className="mt-12 grid gap-6 lg:grid-cols-2">
          <LandingReveal delayMs={80}>
            <article className="overflow-hidden rounded-[28px] border border-ds-outline bg-white">
              <div className="aspect-[16/10] w-full bg-[#f5e6a3]/50 p-6 sm:p-8">
                <StoryPostCover variant={featured.cover} className="h-full w-full" />
              </div>
              <div className="p-8">
                <p className="mkt-font text-xs font-medium uppercase tracking-[0.12em] text-ds-primary">Featured</p>
                <h3 className="mkt-display mt-3 text-2xl">{featured.title}</h3>
                <p className="mkt-body mt-3">
                  {featured.category} · {featured.date}
                </p>
              </div>
            </article>
          </LandingReveal>

          <div className="grid gap-4">
            {rest.map((post, index) => (
              <LandingReveal key={post.title} delayMs={120 + index * 60}>
                <article className="grid gap-4 rounded-[24px] border border-ds-outline bg-white p-5 sm:grid-cols-[140px_1fr]">
                  <div className="aspect-[4/3] w-full overflow-hidden rounded-xl bg-[#f5e6a3]/40 p-3 sm:aspect-auto sm:min-h-[100px]">
                    <StoryPostCover variant={post.cover} className="h-full w-full" />
                  </div>
                  <div>
                    <h3 className="mkt-display text-lg">{post.title}</h3>
                    <p className="mkt-body mt-2">
                      {post.category} · {post.date}
                    </p>
                  </div>
                </article>
              </LandingReveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
