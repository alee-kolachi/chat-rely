"use client";

import Link from "next/link";
import { useDashboardAgent } from "@/components/layout/dashboard-agent-context";
import { useShopifyConnection } from "@/components/integrations/use-shopify-connection";

export function DeployPageHeaderActions() {
  const { selectedAgentId } = useDashboardAgent();
  const { data, loading } = useShopifyConnection(selectedAgentId || undefined);
  const connected = Boolean(data?.connected);
  const shopifyHref =
    connected && data?.shop_domain ? `https://${data.shop_domain}` : "https://www.shopify.com";

  return (
    <div className="flex flex-wrap items-center gap-2">
      <a
        href={shopifyHref}
        target="_blank"
        rel="noreferrer"
        className="border-ds-outline text-ds-on-surface hover:bg-ds-sidebar inline-flex rounded-ds-md border bg-white px-4 py-2.5 text-sm font-semibold shadow-sm transition-colors"
      >
        Open Shopify
      </a>
      {!loading && !connected ? (
        <Link
          href="/actions#shopify-integration"
          className="bg-ds-primary text-ds-on-primary hover:bg-ds-primary-hover inline-flex cursor-pointer rounded-ds-md px-4 py-2.5 text-sm font-semibold transition-colors"
        >
          Connect store
        </Link>
      ) : null}
    </div>
  );
}
