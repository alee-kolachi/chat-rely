import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "ChatRely privacy policy",
};

export default function PrivacyPage() {
  return (
    <main className="bg-ds-sidebar text-ds-on-surface flex-1 px-6 py-12 sm:py-16">
      <article className="prose prose-zinc mx-auto max-w-3xl">
        <h1 className="text-3xl font-bold tracking-tight">Privacy Policy</h1>
        <p className="text-ds-on-surface-variant mt-2 text-sm">Last updated: May 7, 2026</p>
        <p className="mt-6 leading-relaxed">
          ChatRely processes data you provide and data generated when visitors use your agents (messages, metadata,
          integrations). Authentication is handled by Supabase; payments by Stripe. We use subprocessors to operate the
          Service and do not sell personal data.
        </p>
        <h2 className="mt-10 text-xl font-semibold">Data we collect</h2>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-ds-on-surface-variant">
          <li>Account profile (name, email, preferences)</li>
          <li>Agent configuration, knowledge sources, and conversation transcripts</li>
          <li>Billing-related identifiers as required by Stripe</li>
        </ul>
        <h2 className="mt-10 text-xl font-semibold">Contact</h2>
        <p className="mt-3 leading-relaxed text-ds-on-surface-variant">
          Questions:{" "}
          <a href="mailto:support@chatrely.com" className="text-ds-primary font-semibold">
            support@chatrely.com
          </a>
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
