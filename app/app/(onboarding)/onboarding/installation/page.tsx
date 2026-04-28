"use client";

import Link from "next/link";
import { useState } from "react";
import { OnboardingFrame } from "@/components/onboarding/onboarding-frame";
import {
  OnboardingMainColumn,
  OnboardingPageHeader,
  OnboardingSectionCard,
  OnboardingStickyFooter,
  onboardingType,
} from "@/components/onboarding/onboarding-ui";

type InstallTab = "custom" | "shopify";

const codeSnippet = `<!-- ChatRely widget -->
<script>
  window.chatRelyConfig = {
    appId: "your-app-id",
    theme: "light",
    region: "us-east-1"
  };
</script>
<script src="https://cdn.chatrely.example/widget.js" async></script>
<!-- end -->`;

export default function InstallationOnboardingPage() {
  const [tab, setTab] = useState<InstallTab>("custom");

  return (
    <OnboardingFrame
      activeItem="Installation"
      completedItems={["Agent Name", "Knowledge Base", "Connection", "Appearance & Tone", "Agent Preview"]}
      stepLabel="Step 6 of 6"
    >
      <OnboardingMainColumn className="max-w-5xl">
        <OnboardingPageHeader
          kicker="Step 6 · Ship"
          title="Install the chat widget"
          subtitle="Choose where you’re adding ChatRely. Copy the snippet once and paste it into your layout."
        />

        <div className="mb-6 flex gap-1 border-b border-ds-outline">
          <button
            type="button"
            onClick={() => setTab("custom")}
            className={`border-b-2 px-4 py-3 text-sm font-semibold transition-colors ${
              tab === "custom"
                ? "border-ds-primary text-ds-on-surface"
                : "border-transparent text-ds-on-surface-variant hover:text-ds-on-surface"
            }`}
          >
            Install
          </button>
          <button
            type="button"
            onClick={() => setTab("shopify")}
            className={`border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
              tab === "shopify"
                ? "border-ds-primary text-ds-on-surface"
                : "border-transparent text-ds-on-surface-variant hover:text-ds-on-surface"
            }`}
          >
            Shopify theme
          </button>
        </div>

        <div className="grid gap-8 lg:grid-cols-12">
          <div className="space-y-6 lg:col-span-7">
            <OnboardingSectionCard>
              <h2 className="text-ds-on-surface mb-4 text-base font-semibold">Instructions</h2>
              {tab === "custom" ? (
                <ol className="space-y-4">
                  {[
                    ["Copy the snippet", "Use the block below— it includes your workspace id placeholder."],
                    ["Paste before </body>", "In your main layout or CMS “custom code” footer injection."],
                    ["Publish and verify", "Hard refresh or use a private window to avoid cached HTML."],
                  ].map(([title, desc], i) => (
                    <li key={title} className="flex gap-3">
                      <span className="bg-ds-primary text-ds-on-primary flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-bold">
                        {i + 1}
                      </span>
                      <div>
                        <p className="text-sm font-semibold text-ds-on-surface">{title}</p>
                        <p className={onboardingType.hint}>{desc}</p>
                      </div>
                    </li>
                  ))}
                </ol>
              ) : (
                <ol className="space-y-4">
                  {[
                    ["Open Shopify Admin", "Sign in to the store you connected earlier."],
                    ["Online Store → Themes", "Use your live theme."],
                    ["Edit code → theme.liquid", "Open the layout file for the storefront."],
                    ["Paste before </body>", "Save. Preview the storefront in a new tab."],
                  ].map(([title, desc], i) => (
                    <li key={title} className="flex gap-3">
                      <span className="bg-ds-primary text-ds-on-primary flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-bold">
                        {i + 1}
                      </span>
                      <div>
                        <p className="text-sm font-semibold text-ds-on-surface">{title}</p>
                        <p className={onboardingType.hint}>{desc}</p>
                      </div>
                    </li>
                  ))}
                </ol>
              )}
              {tab === "shopify" ? (
                <button
                  type="button"
                  className="bg-ds-primary text-ds-on-primary hover:bg-zinc-800 mt-6 rounded-ds-md px-4 py-2.5 text-sm font-semibold transition-colors"
                >
                  Open theme editor (Shopify)
                </button>
              ) : null}
            </OnboardingSectionCard>

            <OnboardingSectionCard className="overflow-hidden p-0" padding="p-0">
              <div className="border-ds-outline flex items-center justify-between border-b bg-ds-sidebar/80 px-4 py-3">
                <span className="text-ds-on-surface-variant font-mono text-xs">widget-snippet.html</span>
                <button
                  type="button"
                  className="text-ds-primary hover:bg-ds-tertiary/10 rounded-ds-md px-3 py-1.5 text-xs font-semibold transition-colors"
                >
                  Copy snippet
                </button>
              </div>
              <pre className="max-h-64 overflow-auto bg-ds-sidebar p-4 text-xs leading-relaxed text-ds-on-surface md:p-5">
                <code>{codeSnippet}</code>
              </pre>
            </OnboardingSectionCard>
          </div>

          <aside className="lg:col-span-5">
            <div className="border-ds-outline lg:sticky lg:top-20 space-y-4 rounded-ds-lg border bg-ds-surface p-4 shadow-sm">
              <div className="border-ds-outline overflow-hidden rounded-ds-md border bg-white">
                <div className="bg-ds-primary flex items-center justify-between px-4 py-3">
                  <div>
                    <p className="text-sm font-semibold text-ds-on-primary">Preview</p>
                    <p className="text-ds-on-primary/75 text-[10px]">Launcher + first message</p>
                  </div>
                </div>
                <div className="relative flex h-56 items-end justify-end bg-ds-sidebar p-4">
                  <div className="border-ds-outline absolute inset-3 rounded-ds-sm border bg-white/90" aria-hidden />
                  <div className="relative z-10 flex flex-col items-end gap-2">
                    <div className="border-ds-outline max-w-[200px] rounded-ds-lg border bg-white px-3 py-2 text-xs shadow-sm">
                      Hi! Need help with an order?
                    </div>
                    <div className="bg-ds-tertiary flex size-11 items-center justify-center rounded-full text-ds-on-primary shadow-md">
                      💬
                    </div>
                  </div>
                </div>
              </div>
              <div className="border-ds-outline rounded-ds-md border border-amber-200/80 bg-amber-50/90 p-3">
                <p className="text-xs font-semibold text-amber-950">Testing tip</p>
                <p className="text-ds-on-surface mt-1 text-[11px] leading-relaxed">
                  Use an incognito window so you see the same experience as a new visitor.
                </p>
              </div>
            </div>
          </aside>
        </div>
      </OnboardingMainColumn>

      <OnboardingStickyFooter
        backHref="/onboarding/pricing"
        backLabel="Back"
        primaryHref="/onboarding/complete"
        primaryLabel="Finish setup"
      />
    </OnboardingFrame>
  );
}
