/** Map dashboard route slugs (product-search) ↔ API action_key (shopify.product_search). */

export const SHOPIFY_ACTION_SLUG_TO_KEY: Record<string, string> = {
  "product-search": "shopify.product_search",
  "order-lookup": "shopify.order_lookup",
  "inventory-check": "shopify.inventory_check",
  "refund-status": "shopify.refund_status",
  "cart-recovery": "shopify.cart_recovery",
  "customer-profile": "shopify.customer_context",
};

export function shopifyActionSlugToKey(slug: string): string {
  return SHOPIFY_ACTION_SLUG_TO_KEY[slug] ?? slug;
}

export function shopifyActionKeyToSlug(key: string): string | undefined {
  const hit = Object.entries(SHOPIFY_ACTION_SLUG_TO_KEY).find(([, k]) => k === key);
  return hit?.[0];
}
