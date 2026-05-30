"use client";

import Link from "next/link";
import { useDashboardAgent } from "@/components/layout/dashboard-agent-context";
import { useShopifyConnection } from "@/components/integrations/use-shopify-connection";

export function DeployShopifyStatus() {
  const { selectedAgentId } = useDashboardAgent();
  const { data, loading } = useShopifyConnection(selectedAgentId || undefined);
  const connected = Boolean(data?.connected);
  const shop = data?.shop_domain;

  return (
    <section className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="ds-app-section-title">Shopify store</p>
          <p className="ds-app-body-muted mt-1">
            {loading ? "…" : connected && shop ? shop : "Not connected"}
          </p>
        </div>
        <span
          className={`rounded-ds-md px-2 py-1 text-xs font-semibold ${
            connected ? "bg-emerald-100 text-emerald-800" : "bg-ds-sidebar text-ds-on-surface-variant"
          }`}
        >
          {loading ? "…" : connected ? "Connected" : "Not connected"}
        </span>
      </div>
      {!connected ? (
        <p className="ds-app-body-muted text-sm">
          This agent has no Shopify store linked. Connect in{" "}
          <Link href="/actions#shopify-integration" className="text-ds-primary font-semibold hover:underline">
            Actions &amp; integrations
          </Link>
          .
        </p>
      ) : (
        <p className="ds-app-body-muted text-sm">
          Storefront password and Shopify admin access are separate. Catalog tools keep working if the shop is
          password-protected.
        </p>
      )}
    </section>
  );
}
