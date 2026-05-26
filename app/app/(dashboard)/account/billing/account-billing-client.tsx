"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import { useMeContext } from "@/components/layout/me-context-provider";
import { getAppSiteOrigin } from "@/lib/app-site-origin";
import { BackendApiError, backendFetch } from "@/lib/backend-api";

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, { dateStyle: "medium" });
  } catch {
    return iso;
  }
}

export function AccountBillingClient() {
  const searchParams = useSearchParams();
  const { data: ctx, loading, error, refresh } = useMeContext();
  const [portalError, setPortalError] = useState<string | null>(null);
  const [portalBusy, setPortalBusy] = useState(false);
  const [syncBanner, setSyncBanner] = useState<string | null>(null);
  const didStartPortalSyncRef = useRef(false);

  const subscriptionSummary = useMemo(() => {
    if (!ctx) return null;
    return {
      planName: ctx.plan.name,
      planSlug: ctx.plan.slug,
      status: ctx.subscription.status,
      periodEnd: ctx.subscription.current_period_end,
      cancelAtPeriodEnd: ctx.subscription.cancel_at_period_end,
      hasStripeSub: Boolean(ctx.subscription.provider_subscription_id?.trim()),
    };
  }, [ctx]);

  useEffect(() => {
    if (searchParams.get("portal") !== "return") return;
    if (loading || !ctx) return;
    if (didStartPortalSyncRef.current) return;
    didStartPortalSyncRef.current = true;

    void (async () => {
      setSyncBanner("Syncing your subscription from Stripe…");
      try {
        await backendFetch("/api/v1/billing/sync", { method: "POST" });
        await refresh();
        setSyncBanner("Subscription status updated.");
      } catch (e) {
        const msg =
          e instanceof BackendApiError
            ? e.message
            : e instanceof Error
              ? e.message
              : "Could not sync subscription";
        setPortalError(msg);
        setSyncBanner(null);
      }
    })();
  }, [searchParams, loading, ctx, refresh]);

  async function openStripePortal() {
    setPortalBusy(true);
    setPortalError(null);
    try {
      const res = await backendFetch<{ url: string }>("/api/v1/billing/portal", {
        method: "POST",
        body: JSON.stringify({ return_context: "billing", return_origin: getAppSiteOrigin() }),
      });
      window.location.href = res.url;
    } catch (e) {
      const msg =
        e instanceof BackendApiError
          ? e.message
          : e instanceof Error
            ? e.message
            : "Could not open billing portal";
      setPortalError(msg);
      setPortalBusy(false);
    }
  }

  return (
    <div className="ds-app-shell p-6 md:p-8">
      <div className="mx-auto w-full max-w-3xl space-y-8">
        <section>
          <h1 className="ds-app-page-title">Billing</h1>
          <p className="text-ds-on-surface-variant ds-app-page-description ds-app-page-description--wide mt-2">
            Manage payment methods, invoices, and subscription details through Stripe&apos;s secure portal.
          </p>
        </section>

        {loading ? (
          <p className="text-ds-on-surface-variant text-sm">Loading billing…</p>
        ) : error ? (
          <p className="text-sm text-rose-600">{error}</p>
        ) : (
          <>
            {syncBanner ? (
              <div className="rounded-ds-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
                {syncBanner}
              </div>
            ) : null}
            {subscriptionSummary ? (
              <section className="border-ds-outline rounded-ds-xl border bg-ds-surface p-6 shadow-sm">
                <h2 className="ds-app-section-title">Current subscription</h2>
                <dl className="mt-4 space-y-2 text-sm">
                  <div className="flex justify-between gap-4">
                    <dt className="text-ds-on-surface-variant">Plan</dt>
                    <dd className="text-ds-on-surface font-semibold">{subscriptionSummary.planName}</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-ds-on-surface-variant">Status</dt>
                    <dd className="text-ds-on-surface capitalize">{subscriptionSummary.status.replace(/_/g, " ")}</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-ds-on-surface-variant">Current period ends</dt>
                    <dd className="text-ds-on-surface">{formatDate(subscriptionSummary.periodEnd)}</dd>
                  </div>
                  {subscriptionSummary.cancelAtPeriodEnd ? (
                    <p className="text-amber-800 bg-amber-50 border-ds-outline rounded-ds-md border px-3 py-2 text-xs">
                      Cancellation scheduled at the end of this period.
                    </p>
                  ) : null}
                </dl>
              </section>
            ) : null}

            <section className="border-ds-outline rounded-ds-xl border bg-ds-surface p-6 shadow-sm">
              <h2 className="ds-app-section-title">Stripe billing portal</h2>
              <p className="text-ds-on-surface-variant mt-2 text-sm leading-relaxed">
                View invoices, update payment methods, and manage subscription cancellation in Stripe&apos;s customer
                portal. If you haven&apos;t subscribed yet, the portal may only show limited billing options until you
                upgrade from{" "}
                <Link href="/account/plan" className="text-ds-primary font-semibold hover:underline">
                  Plan
                </Link>
                .
              </p>
              {portalError ? <p className="mt-4 text-sm text-rose-600">{portalError}</p> : null}
              <div className="mt-6 flex flex-wrap gap-3">
                <button
                  type="button"
                  disabled={portalBusy}
                  onClick={() => void openStripePortal()}
                  className="bg-ds-primary text-ds-on-primary hover:bg-ds-primary-hover rounded-ds-lg px-6 py-2.5 text-sm font-semibold shadow-sm transition-colors disabled:opacity-50"
                >
                  {portalBusy ? "Opening…" : "Manage billing in Stripe"}
                </button>
                <button
                  type="button"
                  onClick={() => void refresh()}
                  className="border-ds-outline text-ds-on-surface hover:bg-ds-sidebar rounded-ds-lg border bg-white px-4 py-2.5 text-sm font-semibold transition-colors"
                >
                  Refresh status
                </button>
              </div>
            </section>

            <p className="ds-app-body-muted">
              Need to change your plan? Go to{" "}
              <Link href="/account/plan" className="text-ds-primary font-semibold hover:underline">
                Plan &amp; usage
              </Link>
              .
            </p>
          </>
        )}
      </div>
    </div>
  );
}
