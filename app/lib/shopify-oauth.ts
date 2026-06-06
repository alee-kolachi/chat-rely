import { backendFetch } from "@/lib/backend-api";

/** Strip `.myshopify.com` for the OAuth `shop` query param. */
export function shopifyShopSubdomain(shopDomain: string | null | undefined): string {
  return (shopDomain ?? "").replace(/\.myshopify\.com$/i, "").trim();
}

/** Redirect the browser to Shopify OAuth (same flow as Actions → Connect / Reconnect). */
export async function startShopifyOAuth({
  agentId,
  shop,
  returnTo,
}: {
  agentId: string;
  shop: string;
  returnTo: string;
}): Promise<void> {
  const trimmed = shop.trim();
  if (!trimmed) {
    throw new Error("Enter your store name (the part before .myshopify.com).");
  }
  const res = await backendFetch<{ authorization_url: string }>(
    `/api/v1/integrations/shopify/oauth/start?agent_id=${encodeURIComponent(agentId)}&shop=${encodeURIComponent(
      trimmed
    )}&return_to=${encodeURIComponent(returnTo)}`
  );
  window.location.href = res.authorization_url;
}
