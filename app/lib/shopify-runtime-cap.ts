/** Mirrors backend `SHOPIFY_ACTIONS` order in catalog_definitions.py for runtime capping. */
export const SHOPIFY_RUNTIME_PRIORITY_ORDER = [
  "shopify.product_search",
  "shopify.order_lookup",
  "shopify.inventory_check",
  "shopify.customer_context",
  "shopify.refund_status",
  "shopify.cart_recovery",
] as const;

function shopifyRuntimePriority(actionKey: string): number {
  const idx = SHOPIFY_RUNTIME_PRIORITY_ORDER.indexOf(
    actionKey as (typeof SHOPIFY_RUNTIME_PRIORITY_ORDER)[number]
  );
  return idx >= 0 ? idx : SHOPIFY_RUNTIME_PRIORITY_ORDER.length;
}

/** Apply plan cap, keeping highest-priority Shopify tools (matches backend runtime). */
export function partitionShopifyActionsForRuntime(
  enabledKeys: string[],
  maxN: number
): { activeKeys: Set<string>; inactiveKeys: Set<string> } {
  if (maxN <= 0) {
    return { activeKeys: new Set(), inactiveKeys: new Set(enabledKeys) };
  }
  const ordered = [...enabledKeys].sort((a, b) => {
    const pa = shopifyRuntimePriority(a);
    const pb = shopifyRuntimePriority(b);
    if (pa !== pb) return pa - pb;
    return a.localeCompare(b);
  });
  return {
    activeKeys: new Set(ordered.slice(0, maxN)),
    inactiveKeys: new Set(ordered.slice(maxN)),
  };
}
