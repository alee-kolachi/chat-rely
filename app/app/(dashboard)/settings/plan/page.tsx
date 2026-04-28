const planFeatures = [
  { name: "AI Agents", included: "1 included", usage: "1 / 1 used" },
  { name: "Monthly Credits", included: "50 included", usage: "1 / 50 used" },
  { name: "Team Members", included: "3 included", usage: "2 / 3 used" },
  { name: "Knowledge Storage", included: "400 KB included", usage: "887 KB used" },
];

const addOns = [
  { title: "Extra Credits", description: "Add +500 credits for high-volume periods.", price: "$29/mo" },
  { title: "Additional Agent Seat", description: "Run another production agent in parallel.", price: "$39/mo" },
  { title: "Priority Support", description: "Faster response times and dedicated support lane.", price: "$19/mo" },
];

export default function SettingsPlanPage() {
  return (
    <div className="-m-6 min-h-[calc(100vh-3.5rem)] bg-ds-surface p-8">
      <div className="mx-auto w-full max-w-5xl">
        <section className="border-ds-outline rounded-ds-xl border bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <h1 className="text-ds-on-surface text-3xl font-extrabold tracking-tight">Plan</h1>
              <p className="text-ds-on-surface-variant mt-2 max-w-2xl text-sm">
                Review your active plan, monitor limits, and scale capacity as your workload grows.
              </p>
            </div>
            <span className="inline-flex w-fit items-center rounded-full bg-zinc-100 px-3 py-1 text-xs font-bold uppercase">
              Growth Plan
            </span>
          </div>
        </section>

        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
          <section className="border-ds-outline rounded-ds-xl border bg-white p-6 shadow-sm lg:col-span-2">
            <h2 className="text-ds-on-surface mb-4 text-lg font-bold">Included resources</h2>
            <div className="space-y-3">
              {planFeatures.map((feature) => (
                <div
                  key={feature.name}
                  className="border-ds-outline/60 flex flex-col gap-2 rounded-ds-lg border bg-zinc-50 p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="text-sm font-semibold">{feature.name}</p>
                    <p className="text-ds-on-surface-variant text-xs">{feature.included}</p>
                  </div>
                  <p className="text-ds-on-surface text-sm font-bold">{feature.usage}</p>
                </div>
              ))}
            </div>
          </section>

          <aside className="border-ds-outline rounded-ds-xl border bg-white p-6 shadow-sm">
            <h2 className="text-ds-on-surface mb-3 text-lg font-bold">Current cycle</h2>
            <p className="text-ds-on-surface-variant text-sm">Renews on May 1, 2026</p>
            <div className="mt-5 space-y-3">
              <div className="rounded-ds-lg bg-zinc-100 p-3">
                <p className="text-ds-on-surface-variant text-xs">Base subscription</p>
                <p className="text-lg font-black">$99/mo</p>
              </div>
              <div className="rounded-ds-lg bg-zinc-100 p-3">
                <p className="text-ds-on-surface-variant text-xs">Estimated next invoice</p>
                <p className="text-lg font-black">$128.00</p>
              </div>
            </div>
            <button className="bg-ds-primary text-ds-on-primary mt-5 w-full rounded-ds-lg px-4 py-2.5 text-sm font-bold transition-opacity hover:opacity-90">
              Upgrade Plan
            </button>
          </aside>
        </div>

        <section className="border-ds-outline mt-6 rounded-ds-xl border bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-ds-on-surface text-lg font-bold">Recommended add-ons</h2>
            <button className="text-ds-on-surface-variant text-sm font-semibold hover:underline">
              Compare all plans
            </button>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {addOns.map((addon) => (
              <article key={addon.title} className="border-ds-outline rounded-ds-lg border p-4">
                <p className="text-sm font-bold">{addon.title}</p>
                <p className="text-ds-on-surface-variant mt-1 text-xs leading-relaxed">{addon.description}</p>
                <div className="mt-4 flex items-center justify-between">
                  <span className="text-sm font-black">{addon.price}</span>
                  <button className="rounded-ds-md border border-zinc-300 px-3 py-1.5 text-xs font-bold transition-colors hover:bg-zinc-100">
                    Add
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="border-ds-outline mt-6 rounded-ds-xl border bg-white p-6 shadow-sm">
          <h2 className="text-ds-on-surface text-lg font-bold">Manage subscription</h2>
          <p className="text-ds-on-surface-variant mt-2 text-sm">
            Need to reduce costs or stop service? You can downgrade at the next billing cycle or
            cancel your subscription from here.
          </p>

          <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="border-ds-outline/60 rounded-ds-lg border bg-zinc-50 p-4">
              <p className="text-ds-on-surface text-sm font-semibold">Downgrade plan</p>
              <p className="text-ds-on-surface-variant mt-1 text-xs leading-relaxed">
                Switch to a lower plan at the end of your current cycle. Existing usage remains
                active until renewal.
              </p>
              <button className="border-ds-outline hover:bg-ds-sidebar mt-4 rounded-ds-md border bg-white px-4 py-2 text-xs font-bold transition-colors">
                Downgrade Plan
              </button>
            </div>

            <div className="rounded-ds-lg border border-red-200 bg-red-50 p-4">
              <p className="text-sm font-semibold text-red-800">Cancel subscription</p>
              <p className="mt-1 text-xs leading-relaxed text-red-700">
                Your workspace will keep access until the period ends. After that, premium features
                and higher limits will be disabled.
              </p>
              <button className="mt-4 rounded-ds-md border border-red-300 bg-white px-4 py-2 text-xs font-bold text-red-700 transition-colors hover:bg-red-100">
                Cancel Subscription
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
