import { IconShopifyBag, IconCheck } from "./action-icons";

type ShopifyConnectionPanelProps = {
  connected: boolean;
  shopDomain?: string | null;
  scopes?: string[];
  lastSyncedAt?: string | null;
  busy?: boolean;
  shopDraft: string;
  onShopDraftChange: (value: string) => void;
  onConnect: () => void;
  onReconnect: () => void;
  onDisconnect: () => void;
};

function formatSynced(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    return d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
  } catch {
    return "—";
  }
}

export function ConnectionCard({
  connected,
  shopDomain,
  scopes = [],
  lastSyncedAt,
  busy,
  shopDraft,
  onShopDraftChange,
  onConnect,
  onReconnect,
  onDisconnect,
}: ShopifyConnectionPanelProps) {
  if (!connected) {
    return (
      <section className="border-ds-outline rounded-ds-xl flex flex-col gap-4 border bg-white p-6 shadow-sm md:flex-row md:flex-wrap md:items-end md:justify-between">
        <div className="flex items-start gap-4">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-ds-md bg-slate-100 text-slate-600">
            <IconShopifyBag className="size-6" />
          </div>
          <div className="min-w-0">
            <h2 className="text-ds-on-surface text-base font-bold">Shopify</h2>
            <p className="text-ds-on-surface-variant mt-1 text-sm leading-relaxed">
              Connect your store so actions can read products, orders, and inventory.
            </p>
          </div>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:min-w-[280px]">
          <label className="text-ds-on-surface-variant text-xs font-semibold uppercase tracking-wide">
            Store subdomain
          </label>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <input
              type="text"
              value={shopDraft}
              onChange={(e) => onShopDraftChange(e.target.value)}
              placeholder="your-store"
              className="border-ds-outline text-ds-on-surface flex-1 rounded-ds-md border bg-white px-3 py-2 text-sm shadow-sm"
              disabled={busy}
            />
            <button
              type="button"
              onClick={() => void onConnect()}
              disabled={busy || !shopDraft.trim()}
              className="bg-ds-primary text-ds-on-primary hover:bg-ds-secondary rounded-ds-md px-4 py-2 text-sm font-semibold transition-colors disabled:pointer-events-none disabled:opacity-45"
            >
              Connect Shopify
            </button>
          </div>
          <p className="text-ds-on-surface-variant text-[11px] leading-relaxed">
            Use your myshopify subdomain (for <span className="font-medium">store.myshopify.com</span>, enter{" "}
            <span className="font-medium">store</span>).
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="border-ds-outline rounded-ds-xl flex flex-col gap-5 border bg-white p-6 shadow-sm md:flex-row md:items-center md:justify-between">
      <div className="flex items-start gap-4">
        <div className="flex size-12 shrink-0 items-center justify-center rounded-ds-md bg-emerald-50 text-emerald-700">
          <IconShopifyBag className="size-6" />
        </div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-ds-on-surface text-base font-bold">Shopify</h2>
            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-bold tracking-widest text-emerald-700 uppercase">
              <IconCheck className="size-3" />
              Connected
            </span>
          </div>
          <p className="text-ds-on-surface-variant mt-1 text-sm">
            <span className="text-ds-on-surface font-medium">{shopDomain ?? "—"}</span>
            <span className="text-ds-outline mx-2">|</span>
            Last synced {formatSynced(lastSyncedAt)}
          </p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {scopes.map((scope) => (
              <span
                key={scope}
                className="border-ds-outline text-ds-on-surface-variant rounded-md border bg-white px-2 py-0.5 text-[11px] font-medium"
              >
                {scope}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <button
          type="button"
          onClick={() => void onReconnect()}
          disabled={busy}
          className="border-ds-outline text-ds-on-surface hover:bg-ds-sidebar rounded-ds-md border bg-white px-4 py-2 text-sm font-semibold transition-colors disabled:opacity-45"
        >
          Reconnect
        </button>
        <button
          type="button"
          onClick={() => void onDisconnect()}
          disabled={busy}
          className="rounded-ds-md border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-red-600 transition-colors hover:bg-red-50 disabled:opacity-45"
        >
          Disconnect
        </button>
      </div>
    </section>
  );
}
