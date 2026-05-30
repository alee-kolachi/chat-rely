import { InfoHint } from "@/components/ui/info-hint";
import { appButtonClassName } from "@/lib/button-styles";
import { SHOPIFY_ADMIN_STOREFRONT_HINT } from "@/lib/shopify-connection-copy";
import { cn } from "@/lib/utils";
import { IconShopifyBag, IconCheck } from "./action-icons";

type ShopifyConnectionPanelProps = {
  connected: boolean;
  shopDomain?: string | null;
  scopes?: string[];
  lastSyncedAt?: string | null;
  busy?: boolean;
  /** When false, Connect / input are disabled (e.g. no agent selected). */
  connectEnabled?: boolean;
  /** Parent section provides the Shopify heading; card shows connection UI only. */
  embedded?: boolean;
  shopDraft: string;
  onShopDraftChange: (value: string) => void;
  onConnect: () => void;
  onReconnect: () => void;
  onDisconnect: () => void;
};

function formatSynced(iso: string | null | undefined): string {
  if (!iso) return "-";
  try {
    const d = new Date(iso);
    return d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
  } catch {
    return "-";
  }
}

export function ConnectionCard({
  connected,
  shopDomain,
  lastSyncedAt,
  busy,
  connectEnabled = true,
  embedded = false,
  shopDraft,
  onShopDraftChange,
  onConnect,
  onReconnect,
  onDisconnect,
}: ShopifyConnectionPanelProps) {
  if (!connected) {
    return (
      <section
        className={cn(
          "flex flex-col gap-3",
          !embedded && "border-ds-outline rounded-ds-lg border bg-ds-sidebar/30 p-5 md:flex-row md:flex-wrap md:items-end md:justify-between"
        )}
      >
        {!embedded ? (
          <div className="flex items-start gap-4">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-ds-md bg-slate-100 text-slate-600">
              <IconShopifyBag className="size-6" />
            </div>
            <div className="min-w-0">
              <h2 className="ds-app-section-title inline-flex items-center">
                Shopify
                <InfoHint text={SHOPIFY_ADMIN_STOREFRONT_HINT} labelFor="Shopify connection" />
              </h2>
              <p className="ds-app-body-muted mt-1">
                Connect your store so the agent can read products, orders, and inventory.
              </p>
            </div>
          </div>
        ) : null}
        {embedded ? (
          <p className="text-ds-on-surface-variant text-sm">
            Shopify links are per agent. Connect this agent&apos;s store to turn on tools here.
          </p>
        ) : null}
        <div className={cn("flex w-full flex-col gap-2 sm:flex-row sm:items-center", !embedded && "sm:min-w-[320px] sm:flex-1")}>
          <input
            type="text"
            value={shopDraft}
            onChange={(e) => onShopDraftChange(e.target.value)}
            placeholder="your-store.myshopify.com"
            aria-label="Store URL"
            className="border-ds-outline text-ds-on-surface ds-app-field min-w-0 flex-1 rounded-ds-md border bg-white px-3 py-2 text-sm"
            disabled={busy || !connectEnabled}
          />
          <button
            type="button"
            onClick={() => void onConnect()}
            disabled={busy || !connectEnabled || !shopDraft.trim()}
            className={appButtonClassName("default", { className: "shrink-0" })}
          >
            Connect
          </button>
        </div>
      </section>
    );
  }

  return (
    <section
      className={cn(
        "flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between",
        !embedded && "border-ds-outline rounded-ds-lg border bg-ds-sidebar/30 p-5"
      )}
    >
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          {!embedded ? <h2 className="ds-app-section-title">Shopify</h2> : null}
          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">
            <IconCheck className="size-3" />
            Connected
          </span>
        </div>
        <p className="ds-app-body-muted mt-1 text-sm">
          <span className="text-ds-on-surface font-medium">{shopDomain ?? "-"}</span>
          <span className="text-ds-outline mx-2">·</span>
          Last synced {formatSynced(lastSyncedAt)}
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <button
          type="button"
          onClick={() => void onReconnect()}
          disabled={busy}
          className={appButtonClassName("default", { size: "sm" })}
        >
          Reconnect
        </button>
        <button
          type="button"
          onClick={() => void onDisconnect()}
          disabled={busy}
          className="rounded-ds-md border border-red-200 bg-white px-3 py-1.5 text-sm font-semibold text-red-600 transition-colors hover:bg-red-50 disabled:opacity-45"
        >
          Disconnect
        </button>
      </div>
    </section>
  );
}
