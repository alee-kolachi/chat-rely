import { ActionCard } from "@/components/actions/action-card";
import { ConnectionCard } from "@/components/actions/connection-card";
import { shopifyActions } from "@/components/actions/shopify-actions-data";
import { cn } from "@/lib/utils";

const FILTER_CHIPS = ["All", "Enabled", "Disabled", "Coming soon"] as const;

export default function ActionsPage() {
  const totalCount = shopifyActions.length;

  return (
    <div className="ds-app-shell p-6 md:p-8">
      <div className="mx-auto w-full max-w-6xl">
        <header className="mb-8 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="ds-app-page-title">Actions</h1>
            <p className="ds-app-page-description ds-app-page-description--wide">
              Tools your agent can invoke for customers. Enable an action to allow it during conversations.
            </p>
          </div>
          <button
            type="button"
            className="border-ds-outline text-ds-on-surface hover:bg-ds-sidebar self-start rounded-ds-md border bg-white px-4 py-2.5 text-sm font-semibold shadow-sm transition-colors md:self-auto"
          >
            Manage connection
          </button>
        </header>

        <ConnectionCard
          storeDomain="my-store.myshopify.com"
          lastSynced="2 minutes ago"
          scopes={["read_products", "read_orders", "read_customers", "read_returns"]}
        />

        <div className="mt-10 mb-5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-baseline gap-3">
            <h2 className="ds-app-section-title text-base md:text-lg">Shopify actions</h2>
            <span className="text-ds-on-surface-variant text-xs font-medium">{totalCount} available</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {FILTER_CHIPS.map((chip, idx) => (
              <button
                key={chip}
                type="button"
                className={cn(
                  "rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
                  idx === 0
                    ? "border-ds-primary/45 text-ds-primary bg-white shadow-sm"
                    : "text-ds-on-surface-variant hover:text-ds-on-surface border-transparent hover:bg-ds-outline/35"
                )}
              >
                {chip}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {shopifyActions.map((action) => (
            <ActionCard key={action.id} action={action} />
          ))}
        </div>

        <p className="ds-app-kicker mt-12 pb-8 text-center">More integrations coming soon</p>
      </div>
    </div>
  );
}
