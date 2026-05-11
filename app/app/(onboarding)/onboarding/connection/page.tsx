"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { IconShopifyBag } from "@/components/actions/action-icons";
import { useShopifyConnection } from "@/components/integrations/use-shopify-connection";
import { OnboardingFrame } from "@/components/onboarding/onboarding-frame";
import {
  OnboardingMainColumn,
  onboardingSplitBody,
  onboardingSplitCard,
  onboardingSplitGrid,
  onboardingSplitRoot,
  OnboardingStickyFooter,
} from "@/components/onboarding/onboarding-ui";
import { BackendApiError, backendFetch } from "@/lib/backend-api";
import { useResolvedOnboardingAgentId } from "@/lib/use-resolved-onboarding-agent-id";

function formatDisplayShopName(shopDomain: string | null | undefined): string {
  if (!shopDomain) return "Your store";
  const sub = shopDomain.replace(/\.myshopify\.com$/i, "").trim();
  if (!sub) return shopDomain;
  return sub
    .split(/[-_]/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

function formatSynced(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    return d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
  } catch {
    return "—";
  }
}

type RowState = "done" | "active" | "pending";

export default function ConnectionOnboardingPage() {
  const searchParams = useSearchParams();
  const agentId = useResolvedOnboardingAgentId();
  const { data, loading, error, refresh } = useShopifyConnection(agentId || undefined);

  const [shopDraft, setShopDraft] = useState("");
  const [connectBusy, setConnectBusy] = useState(false);
  const [banner, setBanner] = useState<string | null>(null);

  const appearanceHref = useMemo(() => {
    const path = "/onboarding/appearance-tone";
    if (!agentId) return path;
    return `${path}?agentId=${encodeURIComponent(agentId)}`;
  }, [agentId]);

  useEffect(() => {
    const q = searchParams.get("shopify");
    if (q === "connected") {
      setBanner("Shopify connected successfully.");
      void refresh();
    }
    if (q === "error") {
      setBanner(searchParams.get("message") ?? "Authorization failed.");
    }
  }, [searchParams, refresh]);

  useEffect(() => {
    if (data?.connected && data.shop_domain) {
      const sub = data.shop_domain.replace(/\.myshopify\.com$/i, "");
      setShopDraft((prev) => (prev.trim() ? prev : sub));
    }
  }, [data?.connected, data?.shop_domain]);

  const startOAuth = useCallback(async () => {
    if (!agentId || !shopDraft.trim()) return;
    setConnectBusy(true);
    setBanner(null);
    const returnTo = `/onboarding/connection?agentId=${encodeURIComponent(agentId)}`;
    try {
      const res = await backendFetch<{ authorization_url: string }>(
        `/api/v1/integrations/shopify/oauth/start?agent_id=${encodeURIComponent(agentId)}&shop=${encodeURIComponent(
          shopDraft.trim()
        )}&return_to=${encodeURIComponent(returnTo)}`
      );
      window.location.href = res.authorization_url;
    } catch (e) {
      const msg =
        e instanceof BackendApiError ? e.message : e instanceof Error ? e.message : "Could not start OAuth";
      setBanner(msg);
      setConnectBusy(false);
    }
  }, [agentId, shopDraft]);

  const connected = Boolean(data?.connected);
  const progressPct = connected ? 100 : 0;
  const shopLabel = formatDisplayShopName(data?.shop_domain);
  const domainLine = data?.shop_domain ?? "—";

  const syncRows: Array<{ label: string; state: RowState }> = useMemo(() => {
    if (!connected) {
      return [
        { label: "Secure OAuth link", state: "pending" },
        { label: "Catalog & policy API access", state: "pending" },
        { label: "Ready for conversations", state: "pending" },
      ];
    }
    return [
      { label: "Secure OAuth link", state: "done" },
      { label: "Scopes granted", state: "done" },
      { label: "Ready for conversations", state: "done" },
    ];
  }, [connected]);

  const statusBadge = loading ? (
    <span className="text-ds-on-surface-variant border-ds-outline rounded-full border bg-white px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide">
      …
    </span>
  ) : connected ? (
    <span className="border-emerald-200 bg-emerald-50 text-emerald-800 rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide">
      Linked
    </span>
  ) : (
    <span className="text-ds-on-surface-variant border-ds-outline rounded-full border border-dashed bg-ds-sidebar/50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide">
      Not linked
    </span>
  );

  const panelSubtitle = loading ? "Loading status…" : connected ? "Live connection" : "Not connected yet";

  return (
    <OnboardingFrame
      activeItem="Connection"
      completedItems={["Agent Name", "Knowledge Base"]}
      stepLabel="Step 3 of 6"
      linkAgentId={agentId}
      footer={
        <OnboardingStickyFooter
          backHref={
            agentId
              ? `/onboarding/knowledge-base/training?agentId=${encodeURIComponent(agentId)}`
              : "/onboarding/knowledge-base/training"
          }
          backLabel="Back"
          primaryHref={appearanceHref}
          primaryLabel="Continue"
        />
      }
    >
      <OnboardingMainColumn className={onboardingSplitRoot}>
        <div className={onboardingSplitBody}>
          <div
            className="pointer-events-none absolute inset-0 -z-10 rounded-[36px] opacity-80"
            style={{
              background:
                "radial-gradient(circle at 12% 22%, rgba(16,185,129,0.14), transparent 38%), radial-gradient(circle at 88% 72%, rgba(99,102,241,0.12), transparent 42%), linear-gradient(180deg, rgba(240,253,250,0.95), rgba(245,243,255,0.72))",
            }}
            aria-hidden
          />

          <div className={onboardingSplitCard}>
            <div className={onboardingSplitGrid}>
              <section className="flex flex-col justify-center p-6 sm:p-8 max-lg:min-h-min lg:min-h-0 lg:h-full lg:p-10">
                <div>
                  <p className="text-ds-on-surface-variant mb-3 text-[11px] font-semibold tracking-[0.18em] uppercase">
                    Step 3
                  </p>
                  <h1 className="text-ds-on-surface text-2xl font-semibold tracking-tight sm:text-3xl lg:text-[2rem]">
                    Connect your <span className="text-ds-primary font-bold">commerce store</span> for live data
                  </h1>
                  <p className="text-ds-on-surface-variant mt-2 text-sm leading-relaxed">
                    OAuth keeps access scoped and revocable. We use your granted Admin API scopes so the agent can read
                    products, orders, and policies—without sharing passwords.
                  </p>

                  {banner ? (
                    <div className="border-ds-outline mt-5 rounded-ds-lg border bg-white px-3 py-2.5 text-sm text-slate-800 shadow-sm">
                      {banner}
                    </div>
                  ) : null}

                  <div className="mt-8 space-y-5 sm:mt-10">
                    {!agentId ? (
                      <p className="text-amber-900 border-amber-200 rounded-ds-lg border bg-amber-50/90 px-4 py-3 text-sm leading-relaxed">
                        Finish step 1 first so we know which agent this store belongs to, or open this page from your
                        onboarding flow with <span className="font-mono text-xs">?agentId=…</span> in the URL.
                      </p>
                    ) : null}

                    <div className="border-ds-outline rounded-ds-lg border bg-white p-4 sm:p-5">
                      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                        <div className="flex min-w-0 flex-1 items-center gap-3">
                          <div className="border-ds-outline flex size-11 shrink-0 items-center justify-center rounded-xl border bg-emerald-50 text-emerald-800">
                            <IconShopifyBag className="size-6" aria-hidden />
                          </div>
                          <div className="min-w-0">
                            <p className="text-ds-on-surface text-sm font-semibold">Shopify</p>
                            <p className="text-ds-on-surface-variant text-xs">Recommended for product catalogs</p>
                          </div>
                        </div>
                        {!connected ? (
                          <Link
                            href={appearanceHref}
                            className="text-ds-on-surface-variant hover:text-ds-on-surface touch-manipulation min-h-11 shrink-0 rounded-ds-md px-2 text-[11px] font-semibold tracking-wide uppercase transition-colors [-webkit-tap-highlight-color:transparent]"
                          >
                            Connect later
                          </Link>
                        ) : null}
                      </div>

                      {connected ? (
                        <div className="space-y-3">
                          <p className="text-ds-on-surface-variant text-sm">
                            <span className="text-ds-on-surface font-semibold">{data?.shop_domain ?? "—"}</span> is
                            linked. You can tune tone and preview next, or disconnect from Actions later.
                          </p>
                          <button
                            type="button"
                            onClick={() => void startOAuth()}
                            disabled={connectBusy || !shopDraft.trim()}
                            className="border-ds-outline text-ds-on-surface hover:bg-ds-sidebar w-full touch-manipulation min-h-12 rounded-ds-md border bg-white py-3 text-sm font-semibold transition-colors disabled:pointer-events-none disabled:opacity-45 [-webkit-tap-highlight-color:transparent]"
                          >
                            Reconnect store
                          </button>
                        </div>
                      ) : (
                        <>
                          <label className="text-ds-on-surface-variant mb-1.5 block text-[11px] font-semibold uppercase tracking-wide">
                            Store subdomain
                          </label>
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
                            <input
                              type="text"
                              value={shopDraft}
                              onChange={(e) => setShopDraft(e.target.value)}
                              placeholder="your-store"
                              disabled={connectBusy || !agentId}
                              className="border-ds-outline text-ds-on-surface focus:border-ds-primary focus:ring-ds-primary/15 min-h-12 flex-1 rounded-ds-md border bg-white px-3 py-2.5 text-sm shadow-sm outline-none focus:ring-2 disabled:opacity-45"
                            />
                            <button
                              type="button"
                              onClick={() => void startOAuth()}
                              disabled={connectBusy || !agentId || !shopDraft.trim()}
                              className="bg-ds-primary text-ds-on-primary hover:bg-ds-primary-hover touch-manipulation min-h-12 shrink-0 rounded-ds-md px-5 py-3 text-sm font-semibold transition-colors disabled:pointer-events-none disabled:opacity-45 [-webkit-tap-highlight-color:transparent] sm:min-w-[10rem]"
                            >
                              {connectBusy ? "Redirecting…" : "Connect Shopify"}
                            </button>
                          </div>
                          <p className="text-ds-on-surface-variant mt-2 text-[11px] leading-relaxed">
                            For <span className="font-medium">store.myshopify.com</span>, enter{" "}
                            <span className="font-medium">store</span>.
                          </p>
                        </>
                      )}

                      <p className="text-ds-on-surface-variant mt-4 text-center text-[11px] font-medium uppercase tracking-wider">
                        Secure OAuth · no password sharing
                      </p>
                    </div>

                    <p className="text-ds-on-surface-variant text-sm leading-relaxed">
                      Other channels (email, helpdesk) can be linked later from Settings.
                    </p>
                  </div>
                </div>
              </section>

              <section className="bg-ds-sidebar border-ds-outline relative flex flex-col items-center justify-center border-t p-6 sm:p-8 max-lg:min-h-min lg:min-h-0 lg:h-full lg:border-t-0 lg:border-l lg:p-10">
                <div
                  className="pointer-events-none absolute inset-0 opacity-35"
                  style={{
                    backgroundImage:
                      "radial-gradient(color-mix(in srgb, var(--ds-on-surface-variant) 22%, transparent) 1px, transparent 1px)",
                    backgroundSize: "20px 20px",
                  }}
                  aria-hidden
                />
                <div className="relative mx-auto w-full max-w-[400px]">
                  <div className="border-ds-outline flex min-h-[18rem] w-full flex-col overflow-hidden rounded-2xl border bg-ds-surface shadow-xl sm:min-h-[24rem] lg:min-h-[520px]">
                    <div className="border-ds-outline flex items-center justify-between border-b bg-white px-4 py-3">
                      <div className="min-w-0">
                        <h3 className="text-ds-on-surface truncate text-sm font-semibold">Store connection</h3>
                        <p className="text-ds-secondary text-[11px]">{panelSubtitle}</p>
                      </div>
                      <span className="text-ds-on-surface-variant shrink-0 text-sm" aria-hidden>
                        ⋮
                      </span>
                    </div>

                    <div className="flex min-h-0 flex-1 flex-col gap-4 p-4">
                      {error ? (
                        <div className="border-ds-outline rounded-ds-lg border border-rose-200 bg-rose-50/80 p-4 text-sm text-rose-900">
                          {error}
                        </div>
                      ) : null}

                      <div className="border-ds-outline rounded-ds-lg border bg-white p-4">
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-ds-on-surface truncate text-sm font-semibold">{shopLabel}</p>
                            <p className="text-ds-on-surface-variant truncate text-xs">{domainLine}</p>
                          </div>
                          {statusBadge}
                        </div>
                        <p className="text-ds-on-surface-variant mt-3 text-xs leading-relaxed">
                          {connected
                            ? "Products, orders, and policy pages can be read on demand when shoppers ask."
                            : "Connect OAuth to link your Shopify Admin access for this agent."}
                        </p>
                        {connected ? (
                          <p className="text-ds-on-surface-variant mt-2 text-[11px]">
                            Last updated {formatSynced(data?.last_synced_at)}
                          </p>
                        ) : null}
                      </div>

                      <div className="border-ds-outline flex min-h-0 flex-1 flex-col overflow-hidden rounded-ds-lg border bg-white p-3 sm:p-4">
                        <p className="text-ds-on-surface text-xs font-semibold">Setup progress</p>
                        <p className="text-ds-on-surface-variant mt-1 text-[11px] leading-relaxed">
                          {connected
                            ? "Connection is complete. You can keep configuring your agent while shoppers chat."
                            : "Complete OAuth to unlock catalog and order-aware answers for this agent."}
                        </p>
                        <div className="mt-3 flex items-center justify-between text-[10px] font-semibold uppercase tracking-wide text-ds-on-surface">
                          <span>Progress</span>
                          <span>{loading ? "…" : `${progressPct}%`}</span>
                        </div>
                        <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-ds-outline/80">
                          <div
                            className="bg-ds-primary h-full rounded-full transition-all"
                            style={{ width: loading ? "8%" : `${progressPct}%` }}
                          />
                        </div>
                        <ul className="mt-3 space-y-1.5">
                          {syncRows.map((item) => (
                            <li
                              key={item.label}
                              className={`flex items-center justify-between rounded-ds-md border px-2.5 py-2 text-[11px] ${
                                item.state === "active"
                                  ? "border-ds-primary bg-white ring-1 ring-ds-primary/15"
                                  : item.state === "pending"
                                    ? "border-dashed border-ds-outline bg-ds-sidebar/60 text-ds-on-surface-variant"
                                    : "border-ds-outline bg-white"
                              }`}
                            >
                              <span className="font-medium text-ds-on-surface">{item.label}</span>
                              <span className="text-[9px] font-semibold uppercase tracking-wide text-ds-on-surface-variant">
                                {item.state === "done"
                                  ? "Done"
                                  : item.state === "active"
                                    ? "In progress"
                                    : "Pending"}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="border-ds-outline rounded-ds-md border bg-white p-3">
                        <p className="text-ds-on-surface text-xs font-semibold">Scope</p>
                        <p className="text-ds-on-surface-variant mt-1 text-[11px] leading-relaxed">
                          {data?.scopes?.length
                            ? `Granted: ${data.scopes.slice(0, 6).join(", ")}${data.scopes.length > 6 ? "…" : ""}`
                            : connected
                              ? "Scopes are stored on the server for this connection."
                              : "Read products, orders, inventory, and storefront policies. No payment capture by default."}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            </div>
          </div>
        </div>
      </OnboardingMainColumn>
    </OnboardingFrame>
  );
}
