import { LandingReveal } from "@/components/marketing/landing/landing-reveal";
import { LandingSectionLabel } from "@/components/marketing/landing/landing-section-label";
import { cn } from "@/lib/utils";

const steps = [
  {
    title: "Connect your store",
    body: "Link Shopify in one click. Products, policies, and inventory sync automatically.",
  },
  {
    title: "Set your rules",
    body: "Choose what your agent handles and what it escalates. Five minutes to set up.",
  },
  {
    title: "Go live",
    body: "Embed one line of code or install via Shopify. Your agent goes live immediately.",
  },
] as const;

function StepNode({ number, compact = false }: { number: number; compact?: boolean }) {
  const sizeClass = compact ? "size-16" : "size-20 sm:size-[5.5rem]";
  const textClass = compact ? "text-xl" : "text-2xl sm:text-[1.75rem]";

  return (
    <div className={cn("relative z-10 flex shrink-0 items-center justify-center rounded-full", sizeClass)}>
      <div
        className={cn(
          "absolute inset-0 scale-100 rounded-full bg-ds-primary/15 blur-md transition-all duration-300 ease-out motion-reduce:transition-none group-hover/step:scale-[1.35] group-hover/step:bg-ds-primary/35",
          sizeClass,
        )}
        aria-hidden
      />
      <div
        className={cn(
          "relative flex items-center justify-center rounded-full border-2 border-ds-primary bg-[#12001f] shadow-[0_0_0_4px_rgba(138,5,255,0.12)] transition-all duration-300 ease-out motion-reduce:transition-none motion-reduce:group-hover/step:scale-100 group-hover/step:scale-105 group-hover/step:border-white/50 group-hover/step:shadow-[0_0_0_8px_rgba(138,5,255,0.28),0_0_32px_rgba(138,5,255,0.35)]",
          sizeClass,
        )}
      >
        <span className={cn("font-semibold tabular-nums text-white", textClass)}>{number}</span>
      </div>
    </div>
  );
}

function StepCopy({
  step,
  number,
  align = "center",
}: {
  step: (typeof steps)[number];
  number: number;
  align?: "center" | "left";
}) {
  return (
    <div className={align === "center" ? "text-center" : "text-left"}>
      <p className="mkt-font text-[11px] font-semibold uppercase tracking-[0.16em] text-ds-primary transition-colors duration-300 group-hover/step:text-white/90">
        Step {number}
      </p>
      <h3 className="mkt-display mt-3 text-xl !text-white transition-colors duration-300 group-hover/step:!text-white sm:text-2xl">
        {step.title}
      </h3>
      <p className="mkt-font mt-3 text-sm leading-relaxed text-white/60 transition-colors duration-300 group-hover/step:text-white/75 sm:text-[0.9375rem]">
        {step.body}
      </p>
    </div>
  );
}

function StepCard({
  step,
  number,
  align = "center",
  className,
}: {
  step: (typeof steps)[number];
  number: number;
  align?: "center" | "left";
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-sm transition-all duration-300 ease-out motion-reduce:transition-none motion-reduce:group-hover/step:translate-y-0 group-hover/step:-translate-y-1.5 group-hover/step:border-ds-primary/40 group-hover/step:bg-white/[0.06] group-hover/step:shadow-[0_20px_48px_rgba(138,5,255,0.2)]",
        className,
      )}
    >
      <StepCopy step={step} number={number} align={align} />
    </div>
  );
}

export function LandingHowItWorks() {
  return (
    <section className="relative overflow-hidden bg-[#070707] px-6 py-16 sm:py-24">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-10%,rgba(138,5,255,0.18),transparent)]"
        aria-hidden
      />

      <div className="relative mx-auto max-w-[1100px]">
        <LandingReveal>
          <LandingSectionLabel tone="dark">How it works</LandingSectionLabel>
        </LandingReveal>

        {/* Desktop */}
        <ol className="relative mt-16 hidden md:grid md:grid-cols-3 md:gap-6 lg:gap-10">
          <div
            className="pointer-events-none absolute top-10 right-[calc(16.67%+2.75rem)] left-[calc(16.67%+2.75rem)] h-0.5 bg-gradient-to-r from-ds-primary/30 via-ds-primary to-ds-primary/30 sm:top-11"
            aria-hidden
          />

          {steps.map((step, index) => (
            <li key={step.title} className="group/step flex flex-col items-center">
              <div className="flex w-full max-w-[300px] cursor-default flex-col items-center">
                <StepNode number={index + 1} />
                <StepCard step={step} number={index + 1} className="mt-8 w-full px-5 py-6" />
              </div>
            </li>
          ))}
        </ol>

        {/* Mobile */}
        <ol className="mt-12 space-y-0 md:hidden">
          {steps.map((step, index) => (
            <li key={step.title} className="group/step relative flex gap-5 pb-10 last:pb-0">
              <div className="flex flex-col items-center">
                <StepNode number={index + 1} compact />
                {index < steps.length - 1 ? (
                  <div
                    className="my-3 w-px flex-1 min-h-16 bg-gradient-to-b from-ds-primary/70 to-ds-primary/20 transition-opacity duration-300 group-hover/step:from-ds-primary group-hover/step:to-ds-primary/50"
                    aria-hidden
                  />
                ) : null}
              </div>
              <StepCard step={step} number={index + 1} align="left" className="flex-1 px-5 py-5 pt-3" />
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
