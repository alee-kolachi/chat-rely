import type { Metadata } from "next";
import Link from "next/link";
import {
  LEGAL_SUPPORT_EMAIL,
  LegalList,
  LegalPageShell,
  LegalParagraph,
  LegalSection,
} from "@/components/marketing/legal-page-shell";

export const metadata: Metadata = {
  title: "Contact",
  description: "Get in touch with ChatRely for product questions, billing, security, and partnerships.",
};

export default function ContactPage() {
  return (
    <LegalPageShell
      title="Contact ChatRely"
      description="We read every message. Reach out for product help, billing, security, or partnerships."
      showLastUpdated={false}
    >
      <LegalSection title="Email">
        <LegalParagraph>
          The fastest way to reach us is{" "}
          <a href={`mailto:${LEGAL_SUPPORT_EMAIL}`} className="font-semibold text-ds-primary">
            {LEGAL_SUPPORT_EMAIL}
          </a>
          . Include your store URL if you already use ChatRely so we can look up your account.
        </LegalParagraph>
      </LegalSection>

      <LegalSection title="What we can help with">
        <LegalList
          items={[
            "Product questions, onboarding, and how to set up your agent.",
            "Billing, plans, and usage on your account.",
            "Security, privacy, and data handling requests.",
            "Partnerships and press inquiries.",
          ]}
        />
      </LegalSection>

      <LegalSection title="Response time">
        <LegalParagraph>
          We aim to reply within one business day. Urgent billing or outage issues get priority.
        </LegalParagraph>
      </LegalSection>

      <LegalSection title="Already a customer?">
        <LegalParagraph>
          Log in to review conversations, update knowledge, or change agent settings in your{" "}
          <Link href="/login" className="font-semibold text-ds-primary">
            dashboard
          </Link>
          . Many setup questions are faster there than over email.
        </LegalParagraph>
        <LegalParagraph>
          New to ChatRely?{" "}
          <Link href="/signup" className="font-semibold text-ds-primary">
            Start free
          </Link>{" "}
          or see{" "}
          <Link href="/pricing" className="font-semibold text-ds-primary">
            pricing
          </Link>
          .
        </LegalParagraph>
      </LegalSection>
    </LegalPageShell>
  );
}
