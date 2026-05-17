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
    <section className="border-ds-outline rounded-ds-xl border bg-ds-surface p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="ds-app-section-title">Shopify integration</p>
          <p className="text-ds-on-surface-variant mt-1 text-sm">
            Store:{" "}
            <span className="text-ds-on-surface font-semibold">
              {loading ? "…" : connected && shop ? shop : "Not connected"}
            </span>
          </p>
        </div>
        <span
          className={`ds-app-kicker rounded-ds-md px-2 py-1 font-semibold ${
            connected ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-700"
          }`}
        >
          {loading ? "…" : connected ? "Connected" : "Disconnected"}
        </span>
      </div>
      <div
        className={`mt-4 rounded-ds-md border p-3 text-sm leading-relaxed ${
          connected ? "border-emerald-200 bg-emerald-50/90 text-emerald-950" : "border-ds-outline bg-ds-sidebar/40 text-ds-on-surface"
        }`}
      >
        {connected ? (
          <>
            OAuth is linked for this agent. Configure AI actions under{" "}
            <Link href="/actions#shopify-integration" className="text-ds-primary font-semibold underline-offset-2 hover:underline">
              Actions & integrations
            </Link>
            .
          </>
        ) : (
          <>
            Connect your Shopify store from{" "}
            <Link href="/actions#shopify-integration" className="text-ds-primary font-semibold underline-offset-2 hover:underline">
              Actions & integrations
            </Link>{" "}
            to enable catalog and order tools.
          </>
        )}
      </div>
    </section>
  );
}
