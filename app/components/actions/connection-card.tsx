import { IconShopifyBag, IconCheck } from "./action-icons";

type ConnectionCardProps = {
  storeDomain: string;
  lastSynced: string;
  scopes: string[];
};

export function ConnectionCard({ storeDomain, lastSynced, scopes }: ConnectionCardProps) {
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
            <span className="text-ds-on-surface font-medium">{storeDomain}</span>
            <span className="mx-2 text-zinc-300">|</span>
            Last synced {lastSynced}
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
          className="border-ds-outline text-ds-on-surface hover:bg-ds-sidebar rounded-ds-md border bg-white px-4 py-2 text-sm font-semibold transition-colors"
        >
          Reconnect
        </button>
        <button
          type="button"
          className="rounded-ds-md border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-red-600 transition-colors hover:bg-red-50"
        >
          Disconnect
        </button>
      </div>
    </section>
  );
}
