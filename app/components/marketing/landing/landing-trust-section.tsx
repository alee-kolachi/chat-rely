import type { LucideIcon } from "lucide-react";
import { BookOpen, MessageSquare, Plug, Rocket, Ticket, Wand2 } from "lucide-react";
import { LandingReveal } from "@/components/marketing/landing/landing-reveal";
import { LandingSectionLabel } from "@/components/marketing/landing/landing-section-label";

const features: {
  title: string;
  body: string;
  icon: LucideIcon;
}[] = [
  {
    title: "Knowledge base",
    body: "Index your website, files, and Q&A snippets from one place.",
    icon: BookOpen,
  },
  {
    title: "Playground",
    body: "Test replies against live store data before shoppers see them.",
    icon: Wand2,
  },
  {
    title: "Actions",
    body: "Enable order lookup, product search, and human handoff per agent.",
    icon: Plug,
  },
  {
    title: "Conversations",
    body: "Review every thread with status, topic preview, and full history.",
    icon: MessageSquare,
  },
  {
    title: "Tickets",
    body: "Escalations land in your inbox with the transcript attached.",
    icon: Ticket,
  },
  {
    title: "Deploy",
    body: "Install on Shopify or paste one embed snippet on your storefront.",
    icon: Rocket,
  },
];

function FeatureCard({
  title,
  body,
  icon: Icon,
}: {
  title: string;
  body: string;
  icon: LucideIcon;
}) {
  return (
    <article className="flex h-full flex-col rounded-[24px] border border-white/10 bg-white/[0.03] p-6 transition-colors duration-300 hover:border-ds-primary/35 hover:bg-white/[0.05] sm:p-7">
      <div className="flex size-11 items-center justify-center rounded-xl border border-ds-primary/30 bg-ds-primary/15">
        <Icon className="size-5 text-ds-primary" strokeWidth={1.75} aria-hidden />
      </div>
      <h3 className="mkt-display mt-5 text-xl !text-white">{title}</h3>
      <p className="mkt-font mt-2 text-sm leading-relaxed text-white/65">{body}</p>
    </article>
  );
}

export function LandingTrustSection() {
  return (
    <section className="bg-black px-6 py-16 text-white sm:py-20">
      <div className="mx-auto max-w-[1100px]">
        <LandingReveal>
          <LandingSectionLabel tone="dark">Built for merchants</LandingSectionLabel>
          <h2 className="mkt-display mt-5 max-w-3xl text-4xl !text-white sm:text-5xl">
            Your dashboard, from setup to support
          </h2>
        </LandingReveal>

        <div className="mt-8 grid gap-4 sm:mt-10 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, index) => (
            <LandingReveal key={feature.title} delayMs={index * 60}>
              <FeatureCard {...feature} />
            </LandingReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
