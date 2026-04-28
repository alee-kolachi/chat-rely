const setupSteps = [
  {
    title: "Enable chat widget in Deploy",
    detail: "Turn on Chat Widget first, then open the Shopify card and click Setup.",
  },
  {
    title: "Connect your store",
    detail: "Enter your myshopify subdomain (for mystore.myshopify.com, use mystore) and authorize.",
  },
  {
    title: "Manage integration",
    detail: "After authorization, choose theme and configure widget display settings in Shopify theme editor.",
  },
];

const integrationEvents = [
  { title: "Shopify app connected", detail: "Store mystore.myshopify.com linked", time: "Today, 11:24 AM" },
  { title: "Theme selected", detail: "Published theme synced for widget display", time: "Today, 11:31 AM" },
  { title: "Actions panel opened", detail: "Shopify actions ready to configure", time: "Today, 11:36 AM" },
];

export default function DeployPage() {
  return (
    <div className="-m-6 min-h-[calc(100vh-3.5rem)] bg-ds-surface p-8">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-ds-on-surface text-3xl font-black tracking-tight">Deploy</h1>
            <p className="text-ds-on-surface-variant mt-1 text-sm">
              Connect Shopify and configure the chat widget experience for your store.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button className="border-ds-outline bg-white hover:bg-ds-sidebar rounded-ds-md border px-4 py-2 text-sm font-semibold transition-colors">
              Open Shopify
            </button>
            <button className="bg-ds-primary text-ds-on-primary rounded-ds-md px-4 py-2 text-sm font-semibold transition-opacity hover:opacity-90">
              Connect store
            </button>
          </div>
        </header>

        <section className="border-ds-outline rounded-ds-xl border bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-ds-on-surface text-base font-bold">Shopify Integration</p>
              <p className="text-ds-on-surface-variant mt-1 text-sm">
                Store: <span className="text-ds-on-surface font-medium">mystore.myshopify.com</span>
              </p>
            </div>
            <span className="rounded bg-emerald-100 px-2 py-1 text-[10px] font-bold text-emerald-700 uppercase">
              Connected
            </span>
          </div>
          <div className="mt-4 rounded-ds-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
            No manual embed code needed. The widget is automatically added once the Chatbase Shopify
            app is installed and authorized.
          </div>
        </section>

        <section className="grid grid-cols-1 gap-6 xl:grid-cols-[1.2fr_1fr]">
          <article className="border-ds-outline rounded-ds-xl border bg-white p-6 shadow-sm">
            <h2 className="text-ds-on-surface mb-4 text-lg font-bold">Recommended Setup Flow</h2>
            <div className="space-y-3">
              {setupSteps.map((step, index) => (
                <div key={step.title} className="border-ds-outline rounded-ds-lg border bg-zinc-50 p-4">
                  <p className="text-ds-on-surface text-sm font-semibold">
                    Step {index + 1}: {step.title}
                  </p>
                  <p className="text-ds-on-surface-variant mt-1 text-sm">{step.detail}</p>
                </div>
              ))}
            </div>
          </article>

          <article className="border-ds-outline rounded-ds-xl border bg-white p-6 shadow-sm">
            <h2 className="text-ds-on-surface mb-4 text-lg font-bold">Connection Method</h2>
            <div className="space-y-3 text-sm">
              <div className="border-ds-outline rounded-ds-md border bg-zinc-50 p-3">
                <p className="text-ds-on-surface font-semibold">Via Chatbase (Recommended)</p>
                <p className="text-ds-on-surface-variant mt-1">
                  Full feature access and add-ons. Best option for MVP + future expansion.
                </p>
              </div>
              <div className="border-ds-outline rounded-ds-md border bg-zinc-50 p-3">
                <p className="text-ds-on-surface font-semibold">Via Shopify Marketplace</p>
                <p className="text-ds-on-surface-variant mt-1">
                  Billing via Shopify, but limited add-ons and single agent constraint.
                </p>
              </div>
            </div>
          </article>
        </section>

        <section className="grid grid-cols-1 gap-6 xl:grid-cols-[1.3fr_1fr]">
          <article className="border-ds-outline rounded-ds-xl border bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-ds-on-surface text-lg font-bold">Theme & Widget Settings</h2>
              <span className="rounded bg-emerald-100 px-2 py-1 text-[10px] font-bold text-emerald-700 uppercase">
                Ready
              </span>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-ds-on-surface-variant mb-1.5 block text-xs font-bold tracking-wide uppercase">
                  Selected theme
                </label>
                <select className="border-ds-outline bg-white text-ds-on-surface w-full rounded-ds-md border px-3 py-2 text-sm outline-none">
                  <option>Published Theme</option>
                  <option>Holiday Campaign Theme</option>
                </select>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="text-ds-on-surface-variant mb-1.5 block text-xs font-bold tracking-wide uppercase">
                    Launcher position
                  </label>
                  <select className="border-ds-outline bg-white text-ds-on-surface w-full rounded-ds-md border px-3 py-2 text-sm outline-none">
                    <option>Bottom Right</option>
                    <option>Bottom Left</option>
                  </select>
                </div>
                <div>
                  <label className="text-ds-on-surface-variant mb-1.5 block text-xs font-bold tracking-wide uppercase">
                    Chat widget
                  </label>
                  <select className="border-ds-outline bg-white text-ds-on-surface w-full rounded-ds-md border px-3 py-2 text-sm outline-none">
                    <option>Enabled</option>
                    <option>Disabled</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-ds-on-surface-variant mb-1.5 block text-xs font-bold tracking-wide uppercase">
                  Welcome message
                </label>
                <textarea
                  className="border-ds-outline bg-white text-ds-on-surface min-h-24 w-full rounded-ds-md border p-3 text-sm outline-none"
                  defaultValue="Hi there! Need help finding a product or tracking your order?"
                />
              </div>
            </div>
          </article>

          <article className="border-ds-outline rounded-ds-xl border bg-white p-6 shadow-sm">
            <h2 className="text-ds-on-surface mb-5 text-lg font-bold">Actions Readiness</h2>
            <div className="space-y-3">
              <ChecklistItem text="Product Search configured" checked />
              <ChecklistItem text="Order Lookup configured" checked />
              <ChecklistItem text="Customer auth prompts reviewed" checked={false} />
              <ChecklistItem text="Escalate to Human fallback enabled" checked />
            </div>
            <div className="mt-5 grid grid-cols-1 gap-2">
              <button className="border-ds-outline hover:bg-ds-sidebar rounded-ds-md border bg-white px-3 py-2 text-sm font-semibold transition-colors">
                Open Actions setup
              </button>
            </div>
          </article>
        </section>

        <section className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_360px]">
          <article className="border-ds-outline rounded-ds-xl border bg-white p-6 shadow-sm">
            <h2 className="text-ds-on-surface mb-5 text-lg font-bold">Integration Activity</h2>
            <div className="space-y-3">
              {integrationEvents.map((event) => (
                <div
                  key={event.title}
                  className="border-ds-outline/70 rounded-ds-lg flex items-start justify-between gap-4 border bg-zinc-50 px-4 py-3"
                >
                  <div>
                    <p className="text-ds-on-surface text-sm font-semibold">{event.title}</p>
                    <p className="text-ds-on-surface-variant mt-0.5 text-xs">{event.detail}</p>
                  </div>
                  <span className="text-ds-on-surface-variant shrink-0 text-xs">{event.time}</span>
                </div>
              ))}
            </div>
          </article>

          <aside className="border-ds-outline rounded-ds-xl h-fit border bg-white p-6 shadow-sm">
            <h2 className="text-ds-on-surface mb-4 text-lg font-bold">MVP Checklist</h2>
            <ul className="space-y-2">
              <ChecklistItem text="Shopify store connected via Chatbase" checked />
              <ChecklistItem text="Widget enabled in Deploy page" checked />
              <ChecklistItem text="Theme selected in Shopify editor" checked />
              <ChecklistItem text="Core Shopify actions configured" checked={false} />
            </ul>
            <button className="mt-5 w-full rounded-ds-md bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90">
              Continue to actions
            </button>
          </aside>
        </section>
      </div>
    </div>
  );
}

function ChecklistItem({ text, checked }: { text: string; checked: boolean }) {
  return (
    <li className="border-ds-outline rounded-ds-md flex items-center gap-3 border px-3 py-2">
      <span
        className={`flex h-5 w-5 items-center justify-center rounded-full text-xs font-bold ${
          checked ? "bg-emerald-600 text-white" : "bg-zinc-200 text-zinc-700"
        }`}
      >
        {checked ? "✓" : "!"}
      </span>
      <span className="text-ds-on-surface text-sm">{text}</span>
    </li>
  );
}
