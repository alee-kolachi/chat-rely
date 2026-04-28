import { ActionCard } from "@/components/actions/action-card";
import { ConnectionCard } from "@/components/actions/connection-card";
import { shopifyActions } from "@/components/actions/shopify-actions-data";

const FILTER_CHIPS = ["All", "Enabled", "Disabled", "Coming soon"] as const;

export default function ActionsPage() {
  const totalCount = shopifyActions.length;

  return (
    <div className="-m-6 min-h-[calc(100vh-3.5rem)] bg-ds-surface p-8">
      <div className="mx-auto w-full max-w-6xl">
        <header className="mb-8 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-ds-primary text-3xl font-extrabold tracking-tight">Actions</h1>
            <p className="text-ds-on-surface-variant mt-2 max-w-2xl text-sm">
              Tools your agent can invoke on behalf of customers. Enable an action to let the
              agent call it during conversations.
            </p>
          </div>
          <button
            type="button"
            className="border-ds-outline text-ds-on-surface hover:bg-ds-sidebar self-start rounded-ds-md border bg-white px-4 py-2 text-sm font-semibold transition-colors md:self-auto"
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
            <h2 className="text-ds-on-surface text-lg font-bold">Shopify actions</h2>
            <span className="text-ds-on-surface-variant text-xs font-medium">
              {totalCount} available
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {FILTER_CHIPS.map((chip, idx) => (
              <button
                key={chip}
                type="button"
                className={
                  idx === 0
                    ? "rounded-full border border-zinc-300 bg-white px-3 py-1 text-xs font-semibold text-ds-on-surface shadow-sm"
                    : "text-ds-on-surface-variant hover:text-ds-on-surface rounded-full border border-transparent px-3 py-1 text-xs font-medium transition-colors hover:bg-ds-outline/35"
                }
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

        <p className="text-ds-on-surface-variant mt-12 pb-12 text-center text-[10px] tracking-widest uppercase">
          More integrations coming soon
        </p>
      </div>
    </div>
  );
}
