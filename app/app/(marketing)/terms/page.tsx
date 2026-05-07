import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "ChatRely terms of service",
};

export default function TermsPage() {
  return (
    <main className="bg-ds-sidebar text-ds-on-surface flex-1 px-6 py-12 sm:py-16">
      <article className="prose prose-zinc mx-auto max-w-3xl">
        <h1 className="text-3xl font-bold tracking-tight">Terms of Service</h1>
        <p className="text-ds-on-surface-variant mt-2 text-sm">Last updated: May 7, 2026</p>
        <p className="mt-6 leading-relaxed">
          By using ChatRely (&quot;Service&quot;), you agree to these terms. The Service is provided &quot;as is&quot; for building and
          operating AI support agents. You are responsible for your content, your end users, and compliance with
          applicable laws. We may change or discontinue features with reasonable notice where practical.
        </p>
        <h2 className="mt-10 text-xl font-semibold" id="security">
          Security
        </h2>
        <p className="mt-3 leading-relaxed text-ds-on-surface-variant">
          We use industry-standard practices for authentication and encryption in transit. You should protect API keys,
          widget embed keys, and integration credentials. Report suspected incidents to{" "}
          <a href="mailto:support@chatrely.com" className="text-ds-primary font-semibold">
            support@chatrely.com
          </a>
          .
        </p>
        <h2 className="mt-10 text-xl font-semibold">Billing</h2>
        <p className="mt-3 leading-relaxed text-ds-on-surface-variant">
          Paid plans are billed via Stripe. Fees are described at checkout and on your Plan page. Taxes may apply.
          Overage and usage rules follow your selected plan and in-product documentation.
        </p>
        <p className="mt-10">
          <Link href="/" className="text-ds-primary font-semibold">
            ← Back to home
          </Link>
        </p>
      </article>
    </main>
  );
}
