import Link from "next/link";
import { DeployShopifyStatus } from "@/components/deploy/deploy-shopify-status";
import { DeployWidgetEmbedSnippet } from "@/components/deploy/deploy-widget-embed-snippet";

export default function DeployPage() {
  return (
    <div className="ds-app-shell p-6 md:p-8">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="ds-app-page-title">Deploy</h1>
            <p className="text-ds-on-surface-variant ds-app-page-description ds-app-page-description--wide">
              Connect Shopify and embed the chat widget on your storefront or any website.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <a
              href="https://www.shopify.com"
              target="_blank"
              rel="noreferrer"
              className="border-ds-outline text-ds-on-surface hover:bg-ds-sidebar inline-flex rounded-ds-md border bg-white px-4 py-2.5 text-sm font-semibold shadow-sm transition-colors"
            >
              Open Shopify
            </a>
            <Link
              href="/actions#shopify-integration"
              className="bg-ds-primary text-ds-on-primary hover:bg-ds-secondary inline-flex cursor-pointer rounded-ds-md px-4 py-2.5 text-sm font-semibold transition-colors"
            >
              Connect store
            </Link>
          </div>
        </header>

        <DeployShopifyStatus />

        <section className="border-ds-outline rounded-ds-xl border bg-ds-surface p-6 shadow-sm">
          <h2 className="ds-app-section-title mb-3">Recommended setup</h2>
          <ol className="text-ds-on-surface-variant list-decimal space-y-2 pl-5 text-sm leading-relaxed">
            <li>
              Under{" "}
              <Link href="/actions#shopify-integration" className="text-ds-primary font-semibold hover:underline">
                Actions &amp; integrations
              </Link>
              , connect your Shopify store with OAuth.
            </li>
            <li>Enable the Shopify actions you want (product search, order lookup, etc.).</li>
            <li>
              Copy the website embed snippet below and paste it into your theme&apos;s{" "}
              <code className="text-ds-on-surface bg-ds-sidebar rounded px-1 py-0.5 text-xs">theme.liquid</code> before{" "}
              <code className="text-ds-on-surface bg-ds-sidebar rounded px-1 py-0.5 text-xs">&lt;/body&gt;</code>
              , or on any site that can load external scripts.
            </li>
            <li>
              Ensure <code className="text-ds-on-surface bg-ds-sidebar rounded px-1 py-0.5 text-xs">data-chatrely-api-base</code>{" "}
              points at your public API origin (same value you use for the Next app&apos;s{" "}
              <code className="text-ds-on-surface bg-ds-sidebar rounded px-1 py-0.5 text-xs">NEXT_PUBLIC_BACKEND_URL</code>
              ).
            </li>
          </ol>
        </section>

        <DeployWidgetEmbedSnippet />

        <section className="border-ds-outline rounded-ds-xl border bg-ds-surface p-6 shadow-sm">
          <h2 className="ds-app-section-title mb-2">Next steps</h2>
          <p className="text-ds-on-surface-variant text-sm leading-relaxed">
            Tune prompts and actions in the{" "}
            <Link href="/playground" className="text-ds-primary font-semibold hover:underline">
              Playground
            </Link>
            , monitor chats in{" "}
            <Link href="/conversations" className="text-ds-primary font-semibold hover:underline">
              Conversations
            </Link>
            , and manage human handoff under{" "}
            <Link href="/actions" className="text-ds-primary font-semibold hover:underline">
              Actions &amp; integrations
            </Link>
            .
          </p>
        </section>
      </div>
    </div>
  );
}
