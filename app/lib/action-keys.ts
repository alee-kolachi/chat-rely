import { SHOPIFY_ACTION_SLUG_TO_KEY, shopifyActionKeyToSlug } from "@/lib/shopify-action-keys";

/** Non-Shopify dashboard slugs ↔ API action_key */
const EXTRA_SLUG_TO_KEY: Record<string, string> = {
  "human-escalate": "human.escalate",
  "email-bridge": "email.bridge",
  "zendesk-tickets": "zendesk.tickets",
  "calendly-booking": "calendly.booking",
};

export function actionSlugToKey(slug: string): string {
  return SHOPIFY_ACTION_SLUG_TO_KEY[slug] ?? EXTRA_SLUG_TO_KEY[slug] ?? slug;
}

export function actionKeyToSlug(actionKey: string): string {
  const shopify = shopifyActionKeyToSlug(actionKey);
  if (shopify) return shopify;
  const hit = Object.entries(EXTRA_SLUG_TO_KEY).find(([, k]) => k === actionKey);
  return hit?.[0] ?? actionKey.replace(/\./g, "-");
}
