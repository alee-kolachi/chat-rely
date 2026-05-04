import Link from "next/link";

const planFeatures = [
  { name: "AI agents", included: "1 included", usage: "1 / 1 used" },
  { name: "Monthly credits", included: "50 included", usage: "1 / 50 used" },
  { name: "Team members", included: "3 included", usage: "2 / 3 used" },
  { name: "Knowledge storage", included: "400 KB included", usage: "887 KB used" },
];

const addOns = [
  { title: "Extra credits", description: "Add +500 credits for high-volume periods.", price: "$29/mo" },
  { title: "Additional agent seat", description: "Run another production agent in parallel.", price: "$39/mo" },
  { title: "Priority support", description: "Faster response times and a dedicated support lane.", price: "$19/mo" },
];

export default function AccountPlanPage() {
  return (
    <div className="ds-app-shell p-6 md:p-8">
      <div className="mx-auto w-full max-w-5xl">
        <section className="border-ds-outline rounded-ds-xl border bg-ds-surface p-6 shadow-sm md:p-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <h1 className="ds-app-page-title">Plan</h1>
              <p className="ds-app-page-description ds-app-page-description--wide mt-2">
                Active subscription, limits, and ways to scale as your workload grows.
              </p>
            </div>
            <span className="ds-app-kicker border-ds-primary/35 text-ds-primary inline-flex w-fit items-center rounded-full border bg-white px-3 py-1.5 font-semibold shadow-sm">
              Growth plan
            </span>
          </div>
        </section>

        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
          <section className="border-ds-outline rounded-ds-xl border bg-ds-surface p-6 shadow-sm lg:col-span-2">
            <h2 className="ds-app-section-title mb-4">Included resources</h2>
            <div className="space-y-3">
              {planFeatures.map((feature) => (
                <div
                  key={feature.name}
                  className="border-ds-outline flex flex-col gap-2 rounded-ds-lg border bg-ds-sidebar/50 p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="text-ds-on-surface text-sm font-semibold">{feature.name}</p>
                    <p className="text-ds-on-surface-variant text-xs">{feature.included}</p>
                  </div>
                  <p className="text-ds-on-surface text-sm font-semibold tabular-nums">{feature.usage}</p>
                </div>
              ))}
            </div>
          </section>

          <aside className="border-ds-outline rounded-ds-xl border bg-ds-surface p-6 shadow-sm">
            <h2 className="ds-app-section-title mb-3 text-base">Current cycle</h2>
            <p className="text-ds-on-surface-variant text-sm">Renews on May 1, 2026</p>
            <div className="mt-5 space-y-3">
              <div className="rounded-ds-lg bg-ds-sidebar/80 p-3 ring-1 ring-ds-outline/60">
                <p className="text-ds-on-surface-variant text-xs font-medium">Base subscription</p>
                <p className="ds-app-metric-value mt-1 text-xl">$99/mo</p>
              </div>
              <div className="rounded-ds-lg bg-ds-sidebar/80 p-3 ring-1 ring-ds-outline/60">
                <p className="text-ds-on-surface-variant text-xs font-medium">Estimated next invoice</p>
                <p className="ds-app-metric-value mt-1 text-xl">$128.00</p>
              </div>
            </div>
            <button
              type="button"
              className="bg-ds-primary text-ds-on-primary hover:bg-ds-secondary mt-5 w-full rounded-ds-lg px-4 py-2.5 text-sm font-semibold transition-colors"
            >
              Upgrade plan
            </button>
          </aside>
        </div>

        <section className="border-ds-outline mt-6 rounded-ds-xl border bg-ds-surface p-6 shadow-sm">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="ds-app-section-title text-base">Recommended add-ons</h2>
            <Link
              href="/pricing"
              className="text-ds-primary text-sm font-semibold hover:underline"
            >
              Compare all plans
            </Link>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {addOns.map((addon) => (
              <article key={addon.title} className="border-ds-outline rounded-ds-lg border bg-white p-4 shadow-sm">
                <p className="text-ds-on-surface text-sm font-semibold">{addon.title}</p>
                <p className="text-ds-on-surface-variant mt-1 text-xs leading-relaxed">{addon.description}</p>
                <div className="mt-4 flex items-center justify-between gap-2">
                  <span className="text-ds-on-surface text-sm font-semibold tabular-nums">{addon.price}</span>
                  <button
                    type="button"
                    className="border-ds-outline text-ds-on-surface hover:bg-ds-sidebar rounded-ds-md border bg-white px-3 py-1.5 text-xs font-semibold transition-colors"
                  >
                    Add
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="border-ds-outline mt-6 rounded-ds-xl border bg-ds-surface p-6 shadow-sm">
          <h2 className="ds-app-section-title text-base">Manage subscription</h2>
          <p className="text-ds-on-surface-variant mt-2 max-w-2xl text-sm leading-relaxed">
            Downgrade at the next billing cycle or cancel. Premium features follow your plan until the period ends.
          </p>

          <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="border-ds-outline rounded-ds-lg border bg-ds-sidebar/50 p-4">
              <p className="text-ds-on-surface text-sm font-semibold">Downgrade plan</p>
              <p className="text-ds-on-surface-variant mt-1 text-xs leading-relaxed">
                Move to a lower tier at renewal. Usage stays active until then.
              </p>
              <button
                type="button"
                className="border-ds-outline text-ds-on-surface hover:bg-ds-sidebar mt-4 rounded-ds-md border bg-white px-4 py-2 text-xs font-semibold transition-colors"
              >
                Downgrade plan
              </button>
            </div>

            <div className="rounded-ds-lg border border-rose-200 bg-rose-50/90 p-4">
              <p className="text-sm font-semibold text-rose-900">Cancel subscription</p>
              <p className="mt-1 text-xs leading-relaxed text-rose-800/90">
                Access continues through the end of the billing period; then limits revert to the free tier.
              </p>
              <button
                type="button"
                className="mt-4 rounded-ds-md border border-rose-300 bg-white px-4 py-2 text-xs font-semibold text-rose-800 transition-colors hover:bg-rose-100"
              >
                Cancel subscription
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
