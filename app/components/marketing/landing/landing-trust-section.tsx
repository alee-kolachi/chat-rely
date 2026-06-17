import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  BookOpen,
  MessageSquare,
  Palette,
  Plug,
  Smile,
  ThumbsUp,
  Ticket,
  Wand2,
} from "lucide-react";
import { LandingReveal } from "@/components/marketing/landing/landing-reveal";
import { LandingSectionLabel } from "@/components/marketing/landing/landing-section-label";

const features: {
  title: string;
  body: string;
  icon: LucideIcon;
}[] = [
  {
    title: "Knowledge base",
    body: "Index your site, files, and Q&A so answers stay grounded in your content.",
    icon: BookOpen,
  },
  {
    title: "Playground",
    body: "Test replies against live store data before shoppers see them.",
    icon: Wand2,
  },
  {
    title: "Actions",
    body: "Toggle order lookup, product search, and handoff per agent.",
    icon: Plug,
  },
  {
    title: "Conversations",
    body: "Review every thread with status, topic, and full history.",
    icon: MessageSquare,
  },
  {
    title: "Tickets",
    body: "Escalations arrive in your inbox with the transcript attached.",
    icon: Ticket,
  },
  {
    title: "Widget appearance",
    body: "Match colors, fonts, and welcome copy to your storefront.",
    icon: Palette,
  },
  {
    title: "Visitor feedback",
    body: "Shoppers rate replies in the widget; summaries roll up on Pro.",
    icon: ThumbsUp,
  },
  {
    title: "Analytics",
    body: "Track volume, resolution rate, and top shopper topics.",
    icon: BarChart3,
  },
  {
    title: "Customer sentiment",
    body: "See positive, neutral, and negative trends on Standard and Pro.",
    icon: Smile,
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
    <article className="group h-full rounded-2xl border border-white/[0.08] bg-white/[0.03] p-6 transition-all duration-300 hover:border-ds-primary/35 hover:bg-white/[0.05] hover:shadow-[0_16px_40px_rgba(138,5,255,0.12)] sm:p-7">
      <div className="flex items-start gap-4">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-ds-primary/25 bg-ds-primary/10 transition-colors duration-300 group-hover:border-ds-primary/40 group-hover:bg-ds-primary/15">
          <Icon className="size-[18px] text-ds-primary" strokeWidth={1.75} aria-hidden />
        </div>
        <div className="min-w-0">
          <h3 className="mkt-display text-base leading-snug !text-white">{title}</h3>
          <p className="mkt-font mt-2.5 text-sm leading-[1.6] text-white/60">{body}</p>
        </div>
      </div>
    </article>
  );
}

export function LandingTrustSection() {
  return (
    <section className="bg-black px-6 py-16 text-white sm:py-20">
      <div className="mx-auto max-w-[1100px]">
        <LandingReveal>
          <LandingSectionLabel tone="dark">Merchant dashboard</LandingSectionLabel>
          <h2 className="mkt-display mt-5 max-w-3xl text-4xl !text-white sm:text-5xl">
            Set up, run, and improve store support, all in one place
          </h2>
          <p className="mkt-font mt-4 max-w-2xl text-base leading-relaxed text-white/65">
            Launch your agent, brand the widget, review every chat, and track analytics, sentiment, and feedback from
            one workspace.
          </p>
        </LandingReveal>

        <div className="mt-8 grid gap-4 sm:mt-10 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3 lg:gap-5">
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
