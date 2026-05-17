"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Check, ExternalLink } from "lucide-react";
import { IconShopifyBag } from "@/components/actions/action-icons";
import { useShopifyConnection } from "@/components/integrations/use-shopify-connection";
import type { MeContextPayload } from "@/components/layout/me-context-provider";
import { OnboardingFrame } from "@/components/onboarding/onboarding-frame";
import {
  OnboardingMainColumn,
  onboardingSplitBody,
  onboardingSplitCardFilled,
  onboardingSplitGrid,
  onboardingSplitLeftSection,
  onboardingSplitPreviewShell,
  onboardingSplitPreviewWrap,
  onboardingSplitRightSectionCentered,
  onboardingSplitRoot,
  OnboardingStickyFooter,
} from "@/components/onboarding/onboarding-ui";
import { BackendApiError, backendFetch } from "@/lib/backend-api";
import { useResolvedOnboardingAgentId } from "@/lib/use-resolved-onboarding-agent-id";
import { cn } from "@/lib/utils";

type RowState = "done" | "active" | "pending";

type OnboardingStatusPayload = {
  website_url: string | null;
  website_title: string | null;
};

function hostnameFromUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    return new URL(url).hostname.replace(/^www\./i, "");
  } catch {
    return null;
  }
}

function resolveSiteDisplayName(status: OnboardingStatusPayload | null): string {
  const title = status?.website_title?.trim();
  if (title) return title;
  const host = hostnameFromUrl(status?.website_url);
  if (host) return host;
  return "your website";
}

function formatSynced(iso: string | null | undefined): string {
  if (!iso) return "-";
  try {
    const d = new Date(iso);
    return d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
  } catch {
    return "-";
  }
}

function progressPercent(connected: boolean, connectBusy: boolean, hasShopDraft: boolean): number {
  if (connected) return 100;
  if (connectBusy) return 55;
  if (hasShopDraft) return 20;
  return 0;
}

export default function ConnectionOnboardingPage() {
  const searchParams = useSearchParams();
  const agentId = useResolvedOnboardingAgentId();
  const { data, loading, error, refresh } = useShopifyConnection(agentId || undefined);

  const [shopDraft, setShopDraft] = useState("");
  const [connectBusy, setConnectBusy] = useState(false);
  const [banner, setBanner] = useState<{ kind: "success" | "error"; text: string } | null>(null);
  const [siteStatus, setSiteStatus] = useState<OnboardingStatusPayload | null>(null);
  const [planSlug, setPlanSlug] = useState("free");

  const isFreePlan = planSlug === "free";
  const siteName = resolveSiteDisplayName(siteStatus);

  const agentPreviewHref = useMemo(() => {
    const path = "/onboarding/agent-preview";
    if (!agentId) return path;
    return `${path}?agentId=${encodeURIComponent(agentId)}`;
  }, [agentId]);

  const knowledgeBackHref = useMemo(() => {
    if (!agentId) return "/onboarding/knowledge-base";
    return `/onboarding/knowledge-base?agentId=${encodeURIComponent(agentId)}`;
  }, [agentId]);

  useEffect(() => {
    let cancelled = false;
    void backendFetch<MeContextPayload>("/api/v1/me/context")
      .then((ctx) => {
        if (!cancelled) setPlanSlug((ctx.plan.slug ?? "free").toLowerCase());
      })
      .catch(() => {
        if (!cancelled) setPlanSlug("free");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!agentId) return;
    let cancelled = false;
    void backendFetch<OnboardingStatusPayload>(
      `/api/v1/onboarding/status?agent_id=${encodeURIComponent(agentId)}`
    )
      .then((res) => {
        if (!cancelled) setSiteStatus(res);
      })
      .catch(() => {
        if (!cancelled) setSiteStatus(null);
      });
    return () => {
      cancelled = true;
    };
  }, [agentId]);

  useEffect(() => {
    const q = searchParams.get("shopify");
    if (q === "connected") {
      setBanner({ kind: "success", text: "Shopify is linked to your agent." });
      void refresh();
    }
    if (q === "error") {
      setBanner({ kind: "error", text: searchParams.get("message") ?? "Could not link Shopify. Try again." });
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
        e instanceof BackendApiError ? e.message : e instanceof Error ? e.message : "Could not open Shopify sign-in";
      setBanner({ kind: "error", text: msg });
      setConnectBusy(false);
    }
  }, [agentId, shopDraft]);

  const connected = Boolean(data?.connected);
  const hasScopes = Boolean(data?.scopes?.length);
  const progressPct = progressPercent(connected, connectBusy, Boolean(shopDraft.trim()));

  const syncRows: Array<{ label: string; state: RowState }> = useMemo(() => {
    if (!connected) {
      return [
        { label: "Open Shopify sign-in", state: connectBusy ? "active" : shopDraft.trim() ? "pending" : "pending" },
        { label: "Approve store access", state: "pending" },
        { label: "Finish setup", state: "pending" },
      ];
    }
    return [
      { label: "Open Shopify sign-in", state: "done" },
      { label: "Approve store access", state: hasScopes ? "done" : "active" },
      { label: "Finish setup", state: hasScopes ? "done" : "pending" },
    ];
  }, [connected, connectBusy, hasScopes, shopDraft]);

  return (
    <OnboardingFrame
      activeItem="Connection"
      completedItems={["Agent Name", "Knowledge Base"]}
      stepLabel="Step 3 of 5"
      linkAgentId={agentId}
      footer={
        <OnboardingStickyFooter
          backHref={knowledgeBackHref}
          backLabel="Back"
          primaryHref={agentPreviewHref}
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

          <div className={onboardingSplitCardFilled}>
            <div className={onboardingSplitGrid}>
              <section className={onboardingSplitLeftSection}>
                <div className="max-w-lg">
                  <p className="text-ds-on-surface-variant mb-3 text-[11px] font-semibold tracking-[0.18em] uppercase">
                    Step 3 · Optional
                  </p>
                  <h1 className="text-ds-on-surface text-2xl font-semibold tracking-tight sm:text-3xl lg:text-[2rem]">
                    Link your <span className="text-ds-primary font-bold">Shopify</span> store
                  </h1>
                  <p className="text-ds-on-surface-variant mt-2 text-sm leading-relaxed">
                    You added <span className="text-ds-on-surface font-medium">{siteName}</span>. Connect Shopify for live
                    products and orders, or skip and do this
                    later.
                  </p>

                  {banner ? (
                    <div
                      role="status"
                      className={`mt-5 flex items-start gap-3 rounded-ds-lg border px-4 py-3 text-sm shadow-sm ${
                        banner.kind === "success"
                          ? "border-ds-primary/25 bg-ds-primary/10 text-ds-on-surface"
                          : "border-rose-200 bg-rose-50 text-rose-900"
                      }`}
                    >
                      {banner.kind === "success" ? (
                        <span className="bg-ds-primary text-ds-on-primary flex size-8 shrink-0 items-center justify-center rounded-full">
                          <Check className="size-4" aria-hidden />
                        </span>
                      ) : null}
                      <p className="leading-relaxed font-medium">{banner.text}</p>
                    </div>
                  ) : null}

                  <div className="mt-8 space-y-4 sm:mt-10">
                    {!agentId ? (
                      <p className="rounded-ds-lg border border-amber-200 bg-amber-50/90 px-4 py-3 text-sm text-amber-900">
                        Finish step 1 first so we know which agent this store belongs to.
                      </p>
                    ) : null}

                    <div className="border-ds-outline rounded-ds-lg border bg-white p-4 sm:p-5">
                      <div className="mb-4 flex items-center gap-3">
                        <div className="border-ds-outline flex size-11 shrink-0 items-center justify-center rounded-xl border bg-emerald-50 text-emerald-800">
                          <IconShopifyBag className="size-6" aria-hidden />
                        </div>
                        <div className="min-w-0">
                          <p className="text-ds-on-surface text-sm font-semibold">Shopify</p>
                          <p className="text-ds-on-surface-variant text-sm">Sign in with Shopify. No password shared here.</p>
                        </div>
                      </div>

                      {connected ? (
                        <div className="space-y-3">
                          <p className="text-ds-on-surface-variant text-sm leading-relaxed">
                            <span className="text-ds-on-surface font-semibold">{data?.shop_domain}</span> is linked.
                          </p>
                          <button
                            type="button"
                            onClick={() => void startOAuth()}
                            disabled={connectBusy || !shopDraft.trim()}
                            className="border-ds-outline text-ds-on-surface hover:bg-ds-sidebar w-full min-h-11 rounded-ds-md border bg-white py-2.5 text-sm font-semibold transition-colors disabled:opacity-45"
                          >
                            Link a different store
                          </button>
                        </div>
                      ) : (
                        <>
                          <label
                            htmlFor="shop-subdomain"
                            className="text-ds-on-surface mb-1.5 block text-sm font-medium"
                          >
                            Shopify store name
                          </label>
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
                            <input
                              id="shop-subdomain"
                              type="text"
                              value={shopDraft}
                              onChange={(e) => setShopDraft(e.target.value)}
                              placeholder="your-store"
                              disabled={connectBusy || !agentId}
                              className="border-ds-outline text-ds-on-surface focus:border-ds-primary focus:ring-ds-primary/15 min-h-11 flex-1 rounded-ds-md border bg-white px-3 py-2.5 text-sm outline-none focus:ring-2 disabled:opacity-45"
                            />
                            <button
                              type="button"
                              onClick={() => void startOAuth()}
                              disabled={connectBusy || !agentId || !shopDraft.trim()}
                              className="bg-ds-primary text-ds-on-primary hover:bg-ds-primary-hover min-h-11 shrink-0 rounded-ds-md px-5 py-2.5 text-sm font-semibold transition-colors disabled:opacity-45 sm:min-w-[9.5rem]"
                            >
                              {connectBusy ? "Opening Shopify…" : "Link Shopify"}
                            </button>
                          </div>
                          <p className="text-ds-on-surface-variant mt-2 text-xs leading-relaxed">
                            For <span className="font-medium">your-store.myshopify.com</span>, type{" "}
                            <span className="font-medium">your-store</span>.
                          </p>
                        </>
                      )}

                      {!connected ? (
                        <div className="mt-4 flex justify-end">
                          <Link
                            href={agentPreviewHref}
                            className="text-ds-on-surface-variant hover:text-ds-on-surface text-sm font-semibold underline underline-offset-2"
                          >
                            Skip for now
                          </Link>
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>
              </section>

              <section className={onboardingSplitRightSectionCentered}>
                <div
                  className="pointer-events-none absolute inset-0 opacity-35"
                  style={{
                    backgroundImage:
                      "radial-gradient(color-mix(in srgb, var(--ds-on-surface-variant) 22%, transparent) 1px, transparent 1px)",
                    backgroundSize: "20px 20px",
                  }}
                  aria-hidden
                />
                <div className={onboardingSplitPreviewWrap}>
                  <div className={cn(onboardingSplitPreviewShell, "h-full min-h-0 flex-1")}>
                    <div className="border-ds-outline flex items-center justify-between border-b bg-white px-4 py-3">
                      <div className="min-w-0">
                        <h3 className="text-ds-on-surface truncate text-sm font-semibold">Shopify link</h3>
                        <p className="text-ds-secondary truncate text-[11px]">{siteName}</p>
                      </div>
                      {data?.shop_domain ? (
                        <a
                          href={`https://${data.shop_domain}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-ds-on-surface-variant hover:text-ds-primary inline-flex size-9 items-center justify-center rounded-md"
                          aria-label="Open Shopify admin"
                        >
                          <ExternalLink className="size-4" aria-hidden />
                        </a>
                      ) : null}
                    </div>

                    <div className="flex min-h-0 flex-1 flex-col gap-3 p-4">
                      {error ? (
                        <div className="rounded-ds-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-900">
                          {error}
                        </div>
                      ) : null}

                      <div className="border-ds-outline rounded-ds-lg border bg-white p-4">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-ds-on-surface text-sm font-semibold">
                            {loading ? "Checking…" : connected ? "Store linked" : "Not linked yet"}
                          </p>
                          {connected ? (
                            <span className="bg-ds-primary/15 text-ds-primary rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide">
                              Linked
                            </span>
                          ) : null}
                        </div>
                        {connected && data?.shop_domain ? (
                          <p className="text-ds-on-surface-variant mt-1 truncate text-xs">{data.shop_domain}</p>
                        ) : (
                          <p className="text-ds-on-surface-variant mt-1 text-xs leading-relaxed">
                            Link Shopify to answer with live catalog and order info.
                          </p>
                        )}
                        {connected && data?.last_synced_at ? (
                          <p className="text-ds-on-surface-variant mt-2 text-[11px]">
                            Updated {formatSynced(data.last_synced_at)}
                          </p>
                        ) : null}
                      </div>

                      <div className="border-ds-outline flex min-h-0 flex-1 flex-col rounded-ds-lg border bg-white p-4">
                        <div className="flex items-center justify-between text-xs font-semibold">
                          <span className="text-ds-on-surface">Setup progress</span>
                          <span className="text-ds-on-surface-variant">{loading ? "…" : `${progressPct}%`}</span>
                        </div>
                        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-ds-outline/70">
                          <div
                            className="bg-ds-primary h-full rounded-full transition-all duration-300"
                            style={{ width: loading ? "6%" : `${progressPct}%` }}
                          />
                        </div>
                        <ul className="mt-3 space-y-2">
                          {syncRows.map((item) => (
                            <li
                              key={item.label}
                              className={`flex items-center justify-between rounded-ds-md border px-3 py-2.5 text-xs ${
                                item.state === "done"
                                  ? "border-ds-primary/30 bg-ds-primary/12"
                                  : item.state === "active"
                                    ? "border-ds-primary bg-white ring-1 ring-ds-primary/20"
                                    : "border-dashed border-ds-outline/80 bg-ds-sidebar/40 text-ds-on-surface-variant"
                              }`}
                            >
                              <span
                                className={
                                  item.state === "done" ? "font-medium text-ds-on-surface" : "font-medium"
                                }
                              >
                                {item.label}
                              </span>
                              <span
                                className={`text-[10px] font-bold uppercase tracking-wide ${
                                  item.state === "done" ? "text-ds-primary" : "text-ds-on-surface-variant"
                                }`}
                              >
                                {item.state === "done"
                                  ? "Done"
                                  : item.state === "active"
                                    ? "Now"
                                    : "Waiting"}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="border-ds-outline rounded-ds-md border bg-white p-3">
                        <p className="text-ds-on-surface text-xs font-semibold">What you get</p>
                        <p className="text-ds-on-surface-variant mt-1 text-xs leading-relaxed">
                          {isFreePlan ? (
                            <>
                              <span className="text-ds-on-surface font-medium">Free plan:</span> you can link Shopify
                              here. Live product and order answers in chat need{" "}
                              <span className="text-ds-on-surface font-medium">Hobby</span> or higher.
                            </>
                          ) : connected && hasScopes ? (
                            "Your agent can read products, orders, and policies when shoppers ask. Read-only, no charges."
                          ) : (
                            "After you approve access, your agent can use live store data when shoppers ask questions."
                          )}
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
