import Link from "next/link";
import { DeployShopifyStatus } from "@/components/deploy/deploy-shopify-status";
import { cn } from "@/lib/utils";

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
    <div className="ds-app-shell p-6 md:p-8">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="ds-app-page-title">Deploy</h1>
            <p className="ds-app-page-description ds-app-page-description--wide">
              Connect Shopify and configure the chat widget for your store.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <a
              href="https://www.shopify.com"
              target="_blank"
              rel="noreferrer"
              className="border-ds-outline text-ds-on-surface hover:bg-ds-sidebar inline-flex rounded-ds-md border bg-white px-4 py-2.5 text-sm font-semibold shadow-sm transition-colors"
            >
              Open Shopify
            </a>
            <Link
              href="/actions#shopify-integration"
              className="bg-ds-primary text-ds-on-primary hover:bg-ds-secondary inline-flex cursor-pointer rounded-ds-md px-4 py-2.5 text-sm font-semibold transition-colors"
            >
              Connect store
            </Link>
          </div>
        </header>

        <DeployShopifyStatus />

        <section className="grid grid-cols-1 gap-6 xl:grid-cols-[1.2fr_1fr]">
          <article className="border-ds-outline rounded-ds-xl border bg-ds-surface p-6 shadow-sm">
            <h2 className="ds-app-section-title mb-4">Recommended setup</h2>
            <div className="space-y-3">
              {setupSteps.map((step, index) => (
                <div key={step.title} className="border-ds-outline rounded-ds-lg border bg-ds-sidebar/60 p-4">
                  <p className="text-ds-on-surface text-sm font-semibold">
                    Step {index + 1}: {step.title}
                  </p>
                  <p className="text-ds-on-surface-variant mt-1 text-sm leading-relaxed">{step.detail}</p>
                </div>
              ))}
            </div>
          </article>

          <article className="border-ds-outline rounded-ds-xl border bg-ds-surface p-6 shadow-sm">
            <h2 className="ds-app-section-title mb-4">Connection method</h2>
            <div className="space-y-3 text-sm">
              <div className="border-ds-outline rounded-ds-md border bg-ds-sidebar/60 p-3">
                <p className="text-ds-on-surface font-semibold">Via ChatRely (recommended)</p>
                <p className="text-ds-on-surface-variant mt-1 leading-relaxed">
                  Full feature access and add-ons. Best for production and growth.
                </p>
              </div>
              <div className="border-ds-outline rounded-ds-md border bg-ds-sidebar/60 p-3">
                <p className="text-ds-on-surface font-semibold">Via Shopify Marketplace</p>
                <p className="text-ds-on-surface-variant mt-1 leading-relaxed">
                  Billing via Shopify with a more constrained feature set.
                </p>
              </div>
            </div>
          </article>
        </section>

        <section className="grid grid-cols-1 gap-6 xl:grid-cols-[1.3fr_1fr]">
          <article className="border-ds-outline rounded-ds-xl border bg-ds-surface p-6 shadow-sm">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
              <h2 className="ds-app-section-title">Theme & widget</h2>
              <span className="ds-app-kicker rounded-ds-md bg-emerald-100 px-2 py-1 font-semibold text-emerald-800">
                Ready
              </span>
            </div>

            <div className="space-y-4">
              <div>
                <label className="ds-app-kicker mb-2 block text-ds-on-surface-variant">Selected theme</label>
                <select className="ds-app-field rounded-ds-md">
                  <option>Published Theme</option>
                  <option>Holiday Campaign Theme</option>
                </select>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="ds-app-kicker mb-2 block text-ds-on-surface-variant">Launcher position</label>
                  <select className="ds-app-field rounded-ds-md">
                    <option>Bottom Right</option>
                    <option>Bottom Left</option>
                  </select>
                </div>
                <div>
                  <label className="ds-app-kicker mb-2 block text-ds-on-surface-variant">Chat widget</label>
                  <select className="ds-app-field rounded-ds-md">
                    <option>Enabled</option>
                    <option>Disabled</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="ds-app-kicker mb-2 block text-ds-on-surface-variant">Welcome message</label>
                <textarea
                  className="ds-app-field min-h-24 rounded-ds-md"
                  defaultValue="Hi there! Need help finding a product or tracking your order?"
                />
              </div>
            </div>
          </article>

          <article className="border-ds-outline rounded-ds-xl border bg-ds-surface p-6 shadow-sm">
            <h2 className="ds-app-section-title mb-5">Actions readiness</h2>
            <div className="space-y-3">
              <ChecklistItem text="Product Search configured" checked />
              <ChecklistItem text="Order Lookup configured" checked />
              <ChecklistItem text="Customer auth prompts reviewed" checked={false} />
              <ChecklistItem text="Escalate to Human fallback enabled" checked />
            </div>
            <div className="mt-5">
              <Link
                href="/actions#shopify-integration"
                className="border-ds-outline text-ds-on-surface hover:bg-ds-sidebar inline-flex w-full cursor-pointer justify-center rounded-ds-md border bg-white px-3 py-2.5 text-center text-sm font-semibold transition-colors"
              >
                Open Actions & integrations
              </Link>
            </div>
          </article>
        </section>

        <section className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_360px]">
          <article className="border-ds-outline rounded-ds-xl border bg-ds-surface p-6 shadow-sm">
            <h2 className="ds-app-section-title mb-5">Integration activity</h2>
            <div className="space-y-3">
              {integrationEvents.map((event) => (
                <div
                  key={event.title}
                  className="border-ds-outline flex items-start justify-between gap-4 rounded-ds-lg border bg-ds-sidebar/50 px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="text-ds-on-surface text-sm font-semibold">{event.title}</p>
                    <p className="text-ds-on-surface-variant mt-0.5 text-xs">{event.detail}</p>
                  </div>
                  <span className="text-ds-on-surface-variant shrink-0 text-xs">{event.time}</span>
                </div>
              ))}
            </div>
          </article>

          <aside className="border-ds-outline h-fit rounded-ds-xl border bg-ds-surface p-6 shadow-sm">
            <h2 className="ds-app-section-title mb-4">MVP checklist</h2>
            <ul className="space-y-2">
              <ChecklistItem text="Shopify store connected" checked />
              <ChecklistItem text="Widget enabled in Deploy" checked />
              <ChecklistItem text="Theme selected in Shopify editor" checked />
              <ChecklistItem text="Core Shopify actions configured" checked={false} />
            </ul>
            <button
              type="button"
              className="bg-ds-primary text-ds-on-primary hover:bg-ds-secondary mt-5 w-full rounded-ds-md px-4 py-2.5 text-sm font-semibold transition-colors"
            >
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
    <li className="border-ds-outline flex items-center gap-3 rounded-ds-md border bg-white px-3 py-2 shadow-sm">
      <span
        className={cn(
          "flex size-5 shrink-0 items-center justify-center rounded-full text-xs font-bold",
          checked ? "bg-emerald-600 text-white" : "bg-ds-outline text-ds-on-surface-variant"
        )}
      >
        {checked ? "✓" : "!"}
      </span>
      <span className="text-ds-on-surface text-sm">{text}</span>
    </li>
  );
}
