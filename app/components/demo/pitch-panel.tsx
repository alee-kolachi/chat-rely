"use client";

import { DemoSignupCta } from "@/components/demo/demo-signup-cta";
import { DemoStoreLogo } from "@/components/demo/demo-store-logo";
import { PoweredByChatRely } from "@/components/branding/powered-by-chatrely";
import type { DemoStoreMeta } from "@/lib/demo-store-meta";
import { DEMO_CHAT_PRIMARY, DEMO_PITCH_PANEL_BG } from "@/lib/demo-constants";
import { cn } from "@/lib/utils";

const VALUE_BULLETS = [
  "ChatRely is an AI chat widget you install on your store",
  "It answers from your live catalog, policies, and orders",
  "Shoppers get product, shipping, and return help instantly",
  "Customize widget colors, fonts, and welcome screen to match your brand",
  "Hand off to your team when shoppers need a person",
  "Playground, analytics, and shopper feedback help you refine answers over time",
  "Give shoppers a better experience with fast, helpful answers on your site",
] as const;

export function PitchPanel({
  store,
  previewMode = false,
  className,
}: {
  store: DemoStoreMeta;
  previewMode?: boolean;
  className?: string;
}) {
  const trustLine = `Trained on ${store.displayName}'s catalog · ${store.productCount} products indexed`;

  return (
    <section
      className={cn("flex min-h-full flex-1 flex-col lg:min-h-screen", className)}
      style={{
        backgroundColor: DEMO_PITCH_PANEL_BG,
      }}
    >
      <div className="flex flex-1 flex-col justify-center px-6 py-8 sm:px-10 sm:py-10 lg:px-12">
        <div className="mx-auto w-full max-w-lg">
          {previewMode ? (
            <p className="mb-5 inline-flex rounded-full border border-neutral-200 bg-white/80 px-3 py-1 text-[11px] text-neutral-500">
              Design preview · chat disabled
            </p>
          ) : null}

          <div className="mb-6">
            <DemoStoreLogo
              displayName={store.displayName}
              logoUrl={store.logoUrl}
              brandColorHex={DEMO_CHAT_PRIMARY}
              size="pitch"
            />
          </div>

          <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-neutral-500">
            {store.displayName}
          </p>
          <h1 className="text-2xl font-semibold tracking-tight text-neutral-900 sm:text-[1.75rem] sm:leading-tight">
            Try ChatRely with a live demo of your store: AI support trained on what you sell.
          </h1>

          <p className="mt-4 text-sm text-neutral-600">{trustLine}</p>

          <ul className="mt-6 space-y-2.5">
            {VALUE_BULLETS.map((bullet) => (
              <li key={bullet} className="flex gap-2.5 text-sm leading-snug text-neutral-700">
                <span
                  className="mt-1.5 size-1.5 shrink-0 rounded-full"
                  style={{ backgroundColor: DEMO_CHAT_PRIMARY }}
                  aria-hidden
                />
                {bullet}
              </li>
            ))}
          </ul>

          <div className="mt-8">
            <DemoSignupCta accentColor={DEMO_CHAT_PRIMARY} variant="primary" />
          </div>

          <div className="mt-6">
            <PoweredByChatRely compact className="justify-start" />
          </div>
        </div>
      </div>

      <p className="px-6 pb-8 text-[12px] leading-relaxed text-neutral-500 sm:px-10 lg:px-12">
        {store.limitationLine}
      </p>
    </section>
  );
}
