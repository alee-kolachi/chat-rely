"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
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
import { cn } from "@/lib/utils";

type InstallTab = "custom" | "shopify";

const codeSnippet = `<!-- ChatRely widget -->
<script
  async
  src="https://YOUR-HOST/widget.js"
  data-chatrely-agent-key="YOUR_AGENT_PUBLIC_KEY"
  data-chatrely-api-base="https://YOUR-PUBLIC-API"
></script>
<!-- Public key: Dashboard → Deploy (Website embed), or GET /api/v1/agents -->`;

export default function InstallationOnboardingPage() {
  const agentId = useResolvedOnboardingAgentId();
  const [tab, setTab] = useState<InstallTab>("custom");

  const pricingBackHref = useMemo(() => {
    const path = "/onboarding/pricing";
    if (!agentId) return path;
    return `${path}?agentId=${encodeURIComponent(agentId)}`;
  }, [agentId]);

  const playgroundHref = useMemo(() => {
    if (!agentId) return "/playground";
    return `/playground?agentId=${encodeURIComponent(agentId)}`;
  }, [agentId]);

  return (
    <OnboardingFrame
      activeItem="Installation"
      completedItems={["Agent Name", "Knowledge Base", "Connection", "Appearance & Tone", "Agent Preview"]}
      stepLabel="Step 6 of 6"
      linkAgentId={agentId}
      footer={
        <OnboardingStickyFooter
          backHref={pricingBackHref}
          backLabel="Back"
          primaryHref={playgroundHref}
          primaryLabel="Finish"
        />
      }
    >
      <OnboardingMainColumn className={cn(onboardingSplitRoot, "px-4 md:px-6")}>
        <div className={cn(onboardingSplitBody, "py-3 md:py-4")}>
          <div
            className="pointer-events-none absolute inset-0 -z-10 rounded-[36px] opacity-80"
            style={{
              background:
                "radial-gradient(circle at 16% 22%, rgba(251,191,36,0.14), transparent 36%), radial-gradient(circle at 84% 70%, rgba(59,130,246,0.1), transparent 40%), linear-gradient(180deg, rgba(255,251,235,0.95), rgba(241,245,249,0.78))",
            }}
            aria-hidden
          />

          <div
            className={cn(
              onboardingSplitCard,
              "max-w-6xl border-ds-outline/45 ring-1 ring-zinc-900/[0.06] max-lg:flex-none"
            )}
          >
            <div className={cn(onboardingSplitGrid, "max-lg:overflow-visible lg:items-stretch lg:overflow-hidden")}>
              <section className="flex flex-col overflow-visible p-4 max-lg:min-h-min max-lg:border-b max-lg:border-ds-outline/25 sm:p-5 lg:h-full lg:min-h-0 lg:flex-1 lg:overflow-y-auto lg:border-r lg:border-ds-outline/25 lg:border-b-0 lg:p-6">
                <div className="min-w-0">
                  <p className="text-ds-on-surface-variant mb-1.5 text-[10px] font-semibold tracking-[0.18em] uppercase">
                    Step 6
                  </p>
                  <h1 className="text-ds-on-surface text-xl font-semibold tracking-tight sm:text-2xl">
                    Install the <span className="text-ds-primary font-bold">chat widget</span>
                  </h1>
                  <p className="text-ds-on-surface-variant mt-1 text-xs leading-snug sm:text-sm">
                    Choose where you’re adding ChatRely.
                  </p>

                  <div className="mt-4 flex gap-1 rounded-full border border-ds-outline/35 bg-ds-sidebar/90 p-1 shadow-inner">
                    <button
                      type="button"
                      onClick={() => setTab("custom")}
                      className={`touch-manipulation min-h-11 min-w-0 flex-1 rounded-full px-3 py-2.5 text-sm font-medium transition-colors [-webkit-tap-highlight-color:transparent] ${
                        tab === "custom"
                          ? "bg-ds-primary text-ds-on-primary shadow-sm"
                          : "text-ds-on-surface-variant hover:bg-white/50 hover:text-ds-on-surface"
                      }`}
                    >
                      Install
                    </button>
                    <button
                      type="button"
                      onClick={() => setTab("shopify")}
                      className={`touch-manipulation min-h-11 min-w-0 flex-1 rounded-full px-3 py-2.5 text-sm font-medium transition-colors [-webkit-tap-highlight-color:transparent] ${
                        tab === "shopify"
                          ? "bg-ds-primary text-ds-on-primary shadow-sm"
                          : "text-ds-on-surface-variant hover:bg-white/50 hover:text-ds-on-surface"
                      }`}
                    >
                      Shopify theme
                    </button>
                  </div>

                  <div className="mt-4 flex flex-col gap-4 max-lg:min-h-min max-lg:flex-none lg:min-h-0 lg:flex-1">
                    <div className="shrink-0 rounded-ds-xl border border-ds-outline/35 bg-ds-sidebar/40 p-3 sm:p-4">
                      <h2 className="text-ds-on-surface mb-2 text-xs font-semibold sm:text-sm">Instructions</h2>
                      <div className="flex min-h-0 flex-col sm:min-h-[17.5rem] md:min-h-[18.5rem]">
                        <div className="min-h-0 flex-1">
                          {tab === "custom" ? (
                            <ol className="space-y-2.5 sm:space-y-3">
                              {[
                                ["Copy the snippet", "Use the block below— it includes your workspace id placeholder."],
                                ["Paste before </body>", "In your main layout or CMS “custom code” footer injection."],
                                ["Publish and verify", "Hard refresh or use a private window to avoid cached HTML."],
                              ].map(([title, desc], i) => (
                                <li key={title} className="flex gap-2.5">
                                  <span className="bg-ds-primary text-ds-on-primary flex size-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold sm:size-7 sm:text-xs">
                                    {i + 1}
                                  </span>
                                  <div>
                                    <p className="text-xs font-semibold text-ds-on-surface sm:text-sm">{title}</p>
                                    <p className="text-ds-on-surface-variant mt-0.5 text-[11px] leading-snug sm:text-xs">
                                      {desc}
                                    </p>
                                  </div>
                                </li>
                              ))}
                            </ol>
                          ) : (
                            <ol className="space-y-2.5 sm:space-y-3">
                              {[
                                ["Open Shopify Admin", "Sign in to the store you connected earlier."],
                                ["Online Store → Themes", "Use your live theme."],
                                ["Edit code → theme.liquid", "Open the layout file for the storefront."],
                                ["Paste before </body>", "Save. Preview the storefront in a new tab."],
                              ].map(([title, desc], i) => (
                                <li key={title} className="flex gap-2.5">
                                  <span className="bg-ds-primary text-ds-on-primary flex size-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold sm:size-7 sm:text-xs">
                                    {i + 1}
                                  </span>
                                  <div>
                                    <p className="text-xs font-semibold text-ds-on-surface sm:text-sm">{title}</p>
                                    <p className="text-ds-on-surface-variant mt-0.5 text-[11px] leading-snug sm:text-xs">
                                      {desc}
                                    </p>
                                  </div>
                                </li>
                              ))}
                            </ol>
                          )}
                        </div>
                        <div className="mt-3 flex shrink-0 items-center sm:mt-4">
                          {tab === "shopify" ? (
                            <button
                              type="button"
                              className="bg-ds-primary text-ds-on-primary hover:bg-ds-primary-hover touch-manipulation min-h-11 rounded-ds-md px-3 py-2 text-xs font-semibold transition-colors sm:min-h-0 sm:px-4 sm:py-2.5 sm:text-sm [-webkit-tap-highlight-color:transparent]"
                            >
                              Open theme editor (Shopify)
                            </button>
                          ) : (
                            <button
                              type="button"
                              className="invisible pointer-events-none rounded-ds-md px-3 py-2 text-xs font-semibold sm:px-4 sm:py-2.5 sm:text-sm"
                              tabIndex={-1}
                              aria-hidden
                            >
                              Open theme editor (Shopify)
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-ds-xl border border-ds-outline/35 bg-ds-sidebar/30">
                      <div className="flex shrink-0 items-center justify-between border-b border-ds-outline/25 bg-ds-sidebar/50 px-3 py-2 sm:px-4">
                        <span className="text-ds-on-surface-variant font-mono text-[10px] sm:text-xs">widget-snippet.html</span>
                        <button
                          type="button"
                          className="text-ds-primary hover:bg-white/60 touch-manipulation min-h-9 min-w-9 rounded-ds-md px-2 py-1 text-[10px] font-semibold sm:min-h-0 sm:min-w-0 sm:px-3 sm:py-1.5 sm:text-xs [-webkit-tap-highlight-color:transparent]"
                        >
                          Copy snippet
                        </button>
                      </div>
                      <pre className="min-h-0 flex-1 overflow-auto rounded-b-ds-xl bg-ds-sidebar/50 p-3 text-[10px] leading-relaxed text-ds-on-surface sm:p-4 sm:text-xs">
                        <code>{codeSnippet}</code>
                      </pre>
                    </div>

                    <p className="text-ds-on-surface-variant shrink-0 text-[11px] leading-snug sm:text-xs">
                      Need a different surface?{" "}
                      <Link href="/actions#shopify-integration" className="text-ds-primary font-semibold underline underline-offset-2">
                        Settings
                      </Link>{" "}
                      lists every install path.
                    </p>
                  </div>
                </div>
              </section>

              <section className="bg-ds-sidebar/80 relative flex flex-col overflow-visible p-4 max-lg:min-h-min sm:p-5 lg:h-full lg:min-h-0 lg:flex-1 lg:overflow-hidden lg:p-6">
                <div
                  className="pointer-events-none absolute inset-0 opacity-30"
                  style={{
                    backgroundImage:
                      "radial-gradient(color-mix(in srgb, var(--ds-on-surface-variant) 22%, transparent) 1px, transparent 1px)",
                    backgroundSize: "20px 20px",
                  }}
                  aria-hidden
                />
                <div className="relative flex w-full min-h-[14rem] flex-col max-lg:flex-none sm:min-h-[16rem] lg:h-full lg:min-h-0 lg:flex-1">
                  <div className="flex w-full flex-col overflow-hidden rounded-2xl border border-ds-outline/40 bg-ds-surface/90 shadow-xl ring-1 ring-zinc-900/[0.05] max-lg:min-h-[12rem] lg:h-full lg:min-h-0 lg:flex-1">
                    <div className="flex shrink-0 items-center justify-between border-b border-ds-outline/25 bg-ds-sidebar px-3 py-2.5 sm:px-4">
                      <div className="min-w-0">
                        <h3 className="text-ds-on-surface truncate text-xs font-semibold sm:text-sm">On-site preview</h3>
                        <p className="text-ds-secondary text-[10px] sm:text-[11px]">Launcher + first message</p>
                      </div>
                      <span className="text-ds-on-surface-variant/60 shrink-0 text-sm" aria-hidden>
                        ⋮
                      </span>
                    </div>

                    <div className="flex min-h-0 flex-1 flex-col gap-3 p-3 sm:gap-4 sm:p-4">
                      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-ds-lg border border-ds-outline/35 bg-white shadow-sm">
                        <div className="bg-ds-primary flex shrink-0 items-center justify-between border-b border-black/10 px-3 py-2 sm:px-4">
                          <div>
                            <p className="text-[11px] font-semibold text-ds-on-primary sm:text-xs">Widget</p>
                            <p className="text-ds-on-primary/75 text-[9px] sm:text-[10px]">Placeholder layout</p>
                          </div>
                        </div>
                        <div className="relative flex min-h-[10rem] flex-1 items-end justify-end bg-ds-sidebar/60 p-3 sm:min-h-[12rem] sm:p-4 lg:min-h-[14rem]">
                          <div className="absolute inset-2 rounded-ds-md border border-ds-outline/25 bg-white/90 shadow-inner sm:inset-3" aria-hidden />
                          <div className="relative z-10 flex flex-col items-end gap-1.5 sm:gap-2">
                            <div className="max-w-[180px] rounded-2xl rounded-tr-sm border border-ds-outline/20 bg-white px-2.5 py-1.5 text-[10px] shadow-md sm:max-w-[200px] sm:px-3 sm:py-2 sm:text-xs">
                              Hi! Need help with an order?
                            </div>
                            <div className="bg-ds-tertiary flex size-9 items-center justify-center rounded-full text-sm text-ds-on-primary shadow-md sm:size-10 sm:text-base">
                              💬
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="shrink-0 rounded-ds-lg border border-amber-200/60 bg-amber-50/95 px-3 py-2 sm:py-2.5">
                        <p className="text-[10px] font-semibold text-amber-950 sm:text-xs">Testing tip</p>
                        <p className="text-ds-on-surface mt-0.5 text-[10px] leading-snug sm:text-[11px]">
                          Use an incognito window so you see the same experience as a new visitor.
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
