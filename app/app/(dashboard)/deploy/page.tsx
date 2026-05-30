import Link from "next/link";
import { DeployPageHeaderActions } from "@/components/deploy/deploy-page-header-actions";
import { DeployShopifyStatus } from "@/components/deploy/deploy-shopify-status";
import { DeployWidgetEmbedSnippet } from "@/components/deploy/deploy-widget-embed-snippet";

export default function DeployPage() {
  return (
    <div className="ds-app-shell p-6 md:p-8">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
        <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="ds-app-page-title">Deploy</h1>
            <p className="ds-app-body-muted mt-1 max-w-2xl">
              Add the chat widget to your storefront or website.
            </p>
          </div>
          <DeployPageHeaderActions />
        </header>

        <DeployShopifyStatus />

        <DeployWidgetEmbedSnippet />

        <section>
          <h2 className="ds-app-section-title mb-2">Next steps</h2>
          <p className="ds-app-body-muted leading-relaxed">
            Tune replies in the{" "}
            <Link href="/playground" className="text-ds-primary font-semibold hover:underline">
              Playground
            </Link>
            , review chats in{" "}
            <Link href="/conversations" className="text-ds-primary font-semibold hover:underline">
              Conversations
            </Link>
            , and manage tools under{" "}
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
