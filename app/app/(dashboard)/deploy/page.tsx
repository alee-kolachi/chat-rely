import Link from "next/link";
import { DeployWidgetEmbedSnippet } from "@/components/deploy/deploy-widget-embed-snippet";

export default function DeployPage() {
  return (
    <div className="ds-app-shell">
      <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-6">
        <header>
          <h1 className="ds-app-page-title">Deploy</h1>
          <p className="ds-app-page-description ds-app-page-description--wide">
            Add the chat widget to your storefront or website.
          </p>
        </header>

        <section className="border-ds-outline bg-ds-surface rounded-ds-xl border p-4 shadow-sm sm:p-6">
          <DeployWidgetEmbedSnippet />
        </section>

        <section className="border-ds-outline bg-ds-surface rounded-ds-xl border p-4 shadow-sm sm:p-6">
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
