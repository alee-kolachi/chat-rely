"use client";

import { DemoInstallCta } from "@/components/demo/demo-install-cta";
import { DemoStoreLogo } from "@/components/demo/demo-store-logo";
import { PoweredByChatRely } from "@/components/branding/powered-by-chatrely";
import type { DemoStoreMeta } from "@/lib/demo-store-meta";
import { DEMO_ACCENT_HEX } from "@/lib/demo-constants";
import { cn } from "@/lib/utils";

const VALUE_BULLETS = [
  "Grounded answers from your real catalog",
  "Handles products, shipping, and returns",
  "24/7, instant replies",
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
  const accent = store.brandColorHex?.trim() || DEMO_ACCENT_HEX;
  const trustLine = `Trained on ${store.displayName}'s catalog · ${store.productCount} products indexed`;

  return (
    <section
      className={cn("flex min-h-full flex-1 flex-col lg:min-h-screen", className)}
      style={{
        backgroundColor: `color-mix(in srgb, ${accent} 7%, #fafafa)`,
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
              brandColorHex={accent}
              size="pitch"
            />
          </div>

          <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-neutral-500">
            {store.displayName}
          </p>
          <h1 className="text-2xl font-semibold tracking-tight text-neutral-900 sm:text-[1.75rem] sm:leading-tight">
            Your store&apos;s support agent, already trained on everything you sell.
          </h1>

          <p className="mt-4 text-sm text-neutral-600">{trustLine}</p>

          <ul className="mt-6 space-y-2.5">
            {VALUE_BULLETS.map((bullet) => (
              <li key={bullet} className="flex gap-2.5 text-sm leading-snug text-neutral-700">
                <span
                  className="mt-1.5 size-1.5 shrink-0 rounded-full"
                  style={{ backgroundColor: accent }}
                  aria-hidden
                />
                {bullet}
              </li>
            ))}
          </ul>

          <div className="mt-8">
            <DemoInstallCta
              storeName={store.displayName}
              href={store.installUrl}
              accentColor={accent}
              variant="primary"
            />
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
