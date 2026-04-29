"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useResolvedOnboardingAgentId } from "@/lib/use-resolved-onboarding-agent-id";
import { OnboardingFrame } from "@/components/onboarding/onboarding-frame";
import {
  OnboardingMainColumn,
  onboardingSplitBody,
  onboardingSplitCard,
  onboardingSplitGrid,
  onboardingSplitRoot,
  OnboardingStickyFooter,
} from "@/components/onboarding/onboarding-ui";

const syncItems = [
  { label: "Products", state: "done" as const },
  { label: "Variants", state: "done" as const },
  { label: "Pricing models", state: "active" as const },
  { label: "Store policies", state: "pending" as const },
];

export default function ConnectionOnboardingPage() {
  const agentId = useResolvedOnboardingAgentId();
  const appearanceHref = useMemo(() => {
    const path = "/onboarding/appearance-tone";
    if (!agentId) return path;
    return `${path}?agentId=${encodeURIComponent(agentId)}`;
  }, [agentId]);

  return (
    <OnboardingFrame
      activeItem="Connection"
      completedItems={["Agent Name", "Knowledge Base"]}
      stepLabel="Step 3 of 6"
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
                    OAuth keeps access scoped and revocable. We sync catalog and policies so your agent answers with what
                    is in stock today—not a stale snapshot.
                  </p>

                  <div className="mt-8 space-y-5 sm:mt-10">
                    <div className="border-ds-outline rounded-ds-lg border bg-white p-4 sm:p-5">
                      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                        <div className="flex min-w-0 flex-1 items-center gap-3">
                          <div className="border-ds-outline bg-ds-sidebar flex size-11 shrink-0 items-center justify-center rounded-xl border text-lg font-bold text-ds-on-surface">
                            S
                          </div>
                          <div className="min-w-0">
                            <p className="text-ds-on-surface text-sm font-semibold">Shopify</p>
                            <p className="text-ds-on-surface-variant text-xs">Recommended for product catalogs</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          className="text-ds-on-surface-variant hover:text-ds-on-surface touch-manipulation min-h-11 shrink-0 rounded-ds-md px-2 text-[11px] font-semibold tracking-wide uppercase transition-colors [-webkit-tap-highlight-color:transparent]"
                        >
                          Connect later
                        </button>
                      </div>
                      <button
                        type="button"
                        className="bg-ds-primary text-ds-on-primary hover:bg-ds-secondary touch-manipulation min-h-12 w-full rounded-ds-md py-3 text-sm font-semibold transition-colors [-webkit-tap-highlight-color:transparent]"
                      >
                        Connect Shopify
                      </button>
                      <p className="text-ds-on-surface-variant mt-3 text-center text-[11px] font-medium uppercase tracking-wider">
                        Secure OAuth · no password sharing
                      </p>
                    </div>

                    <p className="text-ds-on-surface-variant text-sm leading-relaxed">
                      Other channels (email, helpdesk) can be linked later from{" "}
                      <Link href="/settings" className="text-ds-primary font-semibold underline underline-offset-2">
                        Settings
                      </Link>
                      .
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
                        <p className="text-ds-secondary text-[11px]">Preview · not live yet</p>
                      </div>
                      <span className="text-ds-on-surface-variant shrink-0 text-sm" aria-hidden>
                        ⋮
                      </span>
                    </div>

                    <div className="flex min-h-0 flex-1 flex-col gap-4 p-4">
                      <div className="border-ds-outline rounded-ds-lg border bg-white p-4">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="text-ds-on-surface text-sm font-semibold">Luma Outfitters</p>
                            <p className="text-ds-on-surface-variant text-xs">my-store.myshopify.com</p>
                          </div>
                          <span className="bg-emerald-50 text-emerald-800 border-emerald-200 rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide">
                            Linked
                          </span>
                        </div>
                        <p className="text-ds-on-surface-variant mt-3 text-xs leading-relaxed">
                          Product titles, variants, and policy pages stay in sync while ChatRely answers shoppers.
                        </p>
                      </div>

                      <div className="border-ds-outline flex min-h-0 flex-1 flex-col overflow-hidden rounded-ds-lg border bg-white p-3 sm:p-4">
                        <p className="text-ds-on-surface text-xs font-semibold">Synchronization</p>
                        <p className="text-ds-on-surface-variant mt-1 text-[11px] leading-relaxed">
                          Initial sync may take a few minutes. You can keep configuring your agent.
                        </p>
                        <div className="mt-3 flex items-center justify-between text-[10px] font-semibold uppercase tracking-wide text-ds-on-surface">
                          <span>Progress</span>
                          <span>55%</span>
                        </div>
                        <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-ds-outline/80">
                          <div className="bg-ds-primary h-full w-[55%] rounded-full transition-all" />
                        </div>
                        <ul className="mt-3 space-y-1.5">
                          {syncItems.map((item) => (
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
                          Read products, variants, and storefront policies. No payment or customer PII by default.
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
