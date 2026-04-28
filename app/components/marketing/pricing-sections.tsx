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

export function PricingCards() {
  return (
    <div className="grid grid-cols-1 gap-4 md:gap-6 md:grid-cols-2 lg:grid-cols-4">
      {pricingPlans.map((plan) => (
        <article
          key={plan.name}
          className={`flex flex-col rounded-xl border p-5 sm:p-6 lg:p-8 ${
            plan.highlighted
              ? "relative z-10 border-ds-primary bg-ds-primary text-ds-on-primary shadow-xl sm:scale-[1.02] sm:shadow-2xl"
              : "border-ds-outline bg-white"
          }`}
        >
          {plan.highlighted ? (
            <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-ds-tertiary px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white">
              Popular
            </span>
          ) : null}
          <div className="mb-5 sm:mb-6">
            <h3 className="text-lg font-bold">{plan.name}</h3>
            <p className={`mt-2 text-sm ${plan.highlighted ? "text-white/75" : "text-ds-on-surface-variant"}`}>
              {plan.description}
            </p>
            <div className="mt-4 flex items-baseline">
              <span className="text-3xl font-black sm:text-4xl">{plan.price}</span>
              {plan.period ? (
                <span className={`ml-1 ${plan.highlighted ? "text-white/70" : "text-ds-on-surface-variant"}`}>
                  {plan.period}
                </span>
              ) : null}
            </div>
          </div>
          <div className="mb-6 flex grow flex-col gap-2.5 sm:gap-3">
            {plan.features.map((feature) => (
              <p
                key={feature.label}
                className={`flex items-center gap-2 text-sm ${
                  feature.included ? "" : plan.highlighted ? "text-white/70" : "text-ds-on-surface-variant"
                }`}
              >
                <span className="text-xs">{feature.included ? "✓" : "✕"}</span>
                {feature.label}
              </p>
            ))}
          </div>
          <Link
            href={plan.name === "Pro" ? "/login" : "/signup"}
            className={`mx-auto w-full max-w-[17rem] rounded-lg py-3 text-center text-sm font-semibold transition ${
              plan.highlighted
                ? "bg-white text-ds-primary hover:bg-ds-tertiary hover:text-white"
                : "border-2 border-ds-primary text-ds-primary hover:bg-ds-primary hover:text-ds-on-primary"
            }`}
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
