import Link from "next/link";

type Plan = {
  name: string;
  price: string;
  period?: string;
  description: string;
  features: Array<{ label: string; included: boolean }>;
  cta: string;
  highlighted?: boolean;
};

export const pricingPlans: Plan[] = [
  {
    name: "Free",
    price: "$0",
    description: "Basic features, limited access.",
    features: [
      { label: "100 message credits", included: true },
      { label: "1 member", included: true },
      { label: "AI Actions excluded", included: false },
    ],
    cta: "Get Started",
  },
  {
    name: "Hobby",
    price: "$40",
    period: "/mo",
    description: "For personal projects and small trials.",
    features: [
      { label: "500 message credits", included: true },
      { label: "2 members", included: true },
      { label: "Basic AI actions", included: true },
    ],
    cta: "Choose Hobby",
  },
  {
    name: "Standard",
    price: "$150",
    period: "/mo",
    description: "Designed for growing teams.",
    features: [
      { label: "4,000 message credits", included: true },
      { label: "8 AI actions", included: true },
      { label: "3 members", included: true },
      { label: "Priority support", included: true },
    ],
    cta: "Start 14-day Trial",
    highlighted: true,
  },
  {
    name: "Pro",
    price: "$500",
    period: "/mo",
    description: "Scale without limitations.",
    features: [
      { label: "15,000 message credits", included: true },
      { label: "12 AI actions", included: true },
      { label: "5 members", included: true },
    ],
    cta: "Contact Sales",
  },
];

export const comparisonRows = [
  ["Message Credits", "100", "500", "4,000", "15,000"],
  ["Monthly AI Actions", "-", "2", "8", "12"],
  ["Team Members", "1", "2", "3", "5"],
  ["Response Speed", "Standard", "Standard", "Priority", "Fastest"],
  ["Custom Branding", "-", "-", "Yes", "Yes"],
] as const;

export function PricingCards({ variant = "default" }: { variant?: "default" | "onboarding" }) {
  const isOnboarding = variant === "onboarding";

  return (
    <div
      className={
        isOnboarding
          ? "mx-auto grid w-full max-w-6xl grid-cols-1 items-stretch gap-x-5 gap-y-8 px-0.5 sm:grid-cols-2 sm:gap-x-5 sm:gap-y-10 sm:px-1 lg:grid-cols-4 lg:gap-x-6 lg:gap-y-6 lg:px-1"
          : "grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6 lg:grid-cols-4"
      }
    >
      {pricingPlans.map((plan) => (
        <article
          key={plan.name}
          className={
            isOnboarding
              ? `flex min-h-0 flex-col rounded-2xl p-5 sm:p-6 lg:h-full lg:min-h-[17rem] ${
                  plan.highlighted
                    ? "relative isolate z-0 bg-ds-primary text-ds-on-primary shadow-[0_12px_40px_rgba(99,102,241,0.28)] ring-2 ring-ds-primary/60"
                    : "relative z-0 border border-ds-outline/45 bg-white text-ds-on-surface shadow-[0_6px_28px_rgba(15,23,42,0.06)] ring-1 ring-zinc-900/[0.05]"
                }`
              : `flex flex-col rounded-xl border p-5 sm:p-6 lg:p-8 ${
                  plan.highlighted
                    ? "relative z-10 border-ds-primary bg-ds-primary text-ds-on-primary shadow-xl sm:scale-[1.02] sm:shadow-2xl"
                    : "border-ds-outline bg-white"
                }`
          }
        >
          {plan.highlighted ? (
            <span
              className={`absolute -top-3 left-1/2 -translate-x-1/2 rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider ${
                isOnboarding ? "bg-ds-tertiary text-white shadow-md" : "bg-ds-tertiary text-white"
              }`}
            >
              Popular
            </span>
          ) : null}
          <div className={isOnboarding ? "mb-5 shrink-0" : "mb-5 sm:mb-6"}>
            <h3
              className={
                isOnboarding
                  ? `text-lg font-semibold tracking-tight sm:text-xl ${plan.highlighted ? "text-ds-on-primary" : "text-ds-on-surface"}`
                  : "text-lg font-bold"
              }
            >
              {plan.name}
            </h3>
            <p
              className={`${isOnboarding ? "mt-2 text-sm leading-relaxed" : "mt-2 text-sm"} ${
                plan.highlighted ? "text-white/85" : "text-ds-on-surface-variant"
              }`}
            >
              {plan.description}
            </p>
            <div className={`flex items-baseline ${isOnboarding ? "mt-5 gap-1" : "mt-4"}`}>
              <span
                className={
                  isOnboarding
                    ? `font-bold tabular-nums tracking-tight ${plan.highlighted ? "text-4xl text-ds-on-primary sm:text-[2.5rem]" : "text-3xl text-ds-on-surface sm:text-4xl"}`
                    : "text-3xl font-black sm:text-4xl"
                }
              >
                {plan.price}
              </span>
              {plan.period ? (
                <span
                  className={`ml-1 font-medium ${isOnboarding ? "text-[15px]" : "text-base"} ${plan.highlighted ? "text-white/80" : "text-ds-on-surface-variant"}`}
                >
                  {plan.period}
                </span>
              ) : null}
            </div>
          </div>
          <div
            className={
              isOnboarding
                ? "mb-5 flex flex-col gap-2.5"
                : "mb-8 flex min-h-0 flex-1 flex-col gap-2.5 sm:gap-3"
            }
          >
            {plan.features.map((feature) => (
              <p
                key={feature.label}
                className={`flex items-start gap-2.5 text-sm leading-snug ${
                  feature.included ? "" : plan.highlighted ? "text-white/75" : "text-ds-on-surface-variant"
                } ${isOnboarding && feature.included && !plan.highlighted ? "text-ds-on-surface" : ""}`}
              >
                <span
                  className={`mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
                    plan.highlighted
                      ? feature.included
                        ? "bg-white/20 text-ds-on-primary"
                        : "bg-white/10 text-white/60"
                      : feature.included
                        ? "bg-emerald-500/12 text-emerald-700"
                        : "bg-ds-sidebar text-ds-on-surface-variant"
                  }`}
                >
                  {feature.included ? "✓" : "✕"}
                </span>
                {feature.label}
              </p>
            ))}
          </div>
          <Link
            href={plan.name === "Pro" ? "/login" : "/signup"}
            className={
              isOnboarding
                ? `mx-auto mt-auto w-full max-w-none shrink-0 rounded-ds-md py-3 text-center text-sm font-semibold transition ${
                    plan.highlighted
                      ? "bg-white text-ds-primary shadow-md hover:bg-ds-tertiary hover:text-white hover:shadow-lg"
                      : "border-2 border-ds-primary bg-transparent text-ds-primary hover:bg-ds-primary hover:text-ds-on-primary"
                  }`
                : `mx-auto w-full max-w-[17rem] rounded-lg py-3 text-center text-sm font-semibold transition ${
                    plan.highlighted
                      ? "bg-white text-ds-primary hover:bg-ds-tertiary hover:text-white"
                      : "border-2 border-ds-primary text-ds-primary hover:bg-ds-primary hover:text-ds-on-primary"
                  }`
            }
          >
            {plan.cta}
          </Link>
        </article>
      ))}
    </div>
  );
}

export function PricingComparison() {
  return (
    <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
      <table className="w-full border-collapse text-left">
        <thead>
          <tr className="bg-ds-sidebar">
            <th className="p-5 text-xs font-bold uppercase tracking-widest">Feature comparison</th>
            <th className="p-5 text-sm font-semibold">Free</th>
            <th className="p-5 text-sm font-semibold">Hobby</th>
            <th className="p-5 text-sm font-semibold">Standard</th>
            <th className="p-5 text-sm font-semibold">Pro</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100">
          {comparisonRows.map((row) => (
            <tr key={row[0]}>
              <td className="p-5 text-sm font-medium">{row[0]}</td>
              <td className="p-5 text-sm">{row[1]}</td>
              <td className="p-5 text-sm">{row[2]}</td>
              <td className="p-5 text-sm font-semibold">{row[3]}</td>
              <td className="p-5 text-sm">{row[4]}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
