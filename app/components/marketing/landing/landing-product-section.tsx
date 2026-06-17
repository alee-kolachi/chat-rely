import type { LucideIcon } from "lucide-react";
import { BookOpen, LayoutGrid, MessagesSquare, RefreshCw } from "lucide-react";
import { LandingReveal } from "@/components/marketing/landing/landing-reveal";
import { LandingSectionLabel } from "@/components/marketing/landing/landing-section-label";
import { cn } from "@/lib/utils";

type PanelTheme = "gray" | "purple";

const panels: {
  theme: PanelTheme;
  label: string;
  title: string;
  body: string;
  icon: LucideIcon;
}[] = [
  {
    theme: "gray",
    label: "Flat pricing",
    title: "No message credits. No mid-month shutdown.",
    body: "Generic bots meter every message and cut you off at the cap. ChatRely caps conversations, not replies, so your widget stays live when traffic spikes.",
    icon: MessagesSquare,
  },
  {
    theme: "purple",
    label: "Live data",
    title: "Live Shopify data, not a stale upload.",
    body: "Orders, stock, and catalog are fetched the moment a shopper asks. Most bots only know the docs you uploaded last month.",
    icon: RefreshCw,
  },
  {
    theme: "purple",
    label: "Grounded answers",
    title: "Grounded in your store, honest when unsure.",
    body: "Answers come from your content and live Shopify tools, and the agent says so when it isn't certain instead of guessing.",
    icon: BookOpen,
  },
  {
    theme: "gray",
    label: "Storefront sales",
    title: "Product cards in chat, not a FAQ wall.",
    body: "Catalog search returns cards with image, price, and live stock, so shoppers buy inside the conversation.",
    icon: LayoutGrid,
  },
];

function PanelIcon({ icon: Icon }: { icon: LucideIcon }) {
  return (
    <div
      className="flex size-20 shrink-0 items-center justify-center self-center rounded-2xl border border-ds-primary/20 bg-ds-primary/10 sm:size-24 lg:self-start"
      aria-hidden
    >
      <Icon className="size-9 text-ds-primary sm:size-10" strokeWidth={1.5} />
    </div>
  );
}

function SwitchPanel({
  theme,
  label,
  title,
  body,
  icon,
}: {
  theme: PanelTheme;
  label: string;
  title: string;
  body: string;
  icon: LucideIcon;
}) {
  const isPurple = theme === "purple";

  return (
    <article
      className={cn(
        "flex h-full flex-col items-center gap-6 px-6 py-9 sm:px-8 sm:py-10 lg:flex-row lg:items-start lg:justify-between lg:gap-8 lg:px-10 lg:py-11",
        isPurple ? "bg-[#faf7ff]" : "bg-[#fafafa]",
      )}
    >
      <div className="w-full max-w-md flex-1 text-center lg:text-left">
        <p className="mkt-font text-[11px] font-semibold uppercase tracking-[0.14em] text-ds-primary">{label}</p>
        <h3 className="mkt-display mt-3 text-[1.625rem] leading-snug text-ds-on-surface sm:text-[1.75rem]">{title}</h3>
        <p className="mkt-font mt-3 text-sm leading-relaxed text-ds-on-surface-variant sm:text-[0.9375rem]">{body}</p>
      </div>

      <PanelIcon icon={icon} />
    </article>
  );
}

export function LandingProductSection() {
  return (
    <section id="product" className="bg-ds-surface">
      <div className="mx-auto max-w-[1100px] px-6 pb-8 pt-14 sm:pb-10 sm:pt-16">
        <LandingReveal>
          <LandingSectionLabel tone="light">Problems we solve</LandingSectionLabel>
          <h2 className="mkt-display mt-5 max-w-2xl text-3xl sm:text-4xl">
            What breaks on generic support bots
          </h2>
        </LandingReveal>
      </div>

      <div className="grid grid-cols-1 gap-px bg-ds-outline lg:grid-cols-2 lg:auto-rows-fr">
        {panels.map((panel, index) => (
          <LandingReveal key={panel.title} className="h-full" delayMs={index * 60}>
            <SwitchPanel {...panel} />
          </LandingReveal>
        ))}
      </div>
    </section>
  );
}
