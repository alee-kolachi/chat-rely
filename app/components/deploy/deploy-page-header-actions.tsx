"use client";

import Link from "next/link";
import { useDashboardAgent } from "@/components/layout/dashboard-agent-context";
import { useShopifyConnection } from "@/components/integrations/use-shopify-connection";
import { appButtonClassName } from "@/lib/button-styles";

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
        className={appButtonClassName()}
      >
        Open Shopify
      </a>
      {!loading && !connected ? (
        <Link
          href="/actions#shopify-integration"
          className={appButtonClassName()}
        >
          Connect store
        </Link>
      ) : null}
    </div>
  );
}
