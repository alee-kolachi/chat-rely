import type { Metadata } from "next";
import Link from "next/link";
import {
  COMPANY_CONTACT_EMAIL,
  CompanyList,
  CompanyPageShell,
  CompanyParagraph,
  CompanySection,
} from "@/components/marketing/company-page-shell";

export const metadata: Metadata = {
  title: "Contact",
  description: "Get in touch with ChatRely for product questions, billing, security, and partnerships.",
};

export default function ContactPage() {
  return (
    <CompanyPageShell
      title="Contact ChatRely"
      description="We read every message. Reach out for product help, billing, security, or partnerships."
      activeHref="/contact"
    >
      <CompanySection title="Email">
        <CompanyParagraph>
          The fastest way to reach us is{" "}
          <a href={`mailto:${COMPANY_CONTACT_EMAIL}`} className="font-semibold text-ds-primary">
            {COMPANY_CONTACT_EMAIL}
          </a>
          . Include your store URL if you already use ChatRely so we can look up your account.
        </CompanyParagraph>
      </CompanySection>

      <CompanySection title="What we can help with">
        <CompanyList
          items={[
            "Product questions, onboarding, and how to set up your agent.",
            "Billing, plans, and usage on your account.",
            "Security, privacy, and data handling requests.",
            "Partnerships and press inquiries.",
          ]}
        />
      </CompanySection>

      <CompanySection title="Response time">
        <CompanyParagraph>
          We aim to reply within one business day. Urgent billing or outage issues get priority.
        </CompanyParagraph>
      </CompanySection>

      <CompanySection title="Already a customer?">
        <CompanyParagraph>
          Log in to review conversations, update knowledge, or change agent settings in your{" "}
          <Link href="/login" className="font-semibold text-ds-primary">
            dashboard
          </Link>
          . Many setup questions are faster there than over email.
        </CompanyParagraph>
        <CompanyParagraph>
          New to ChatRely?{" "}
          <Link href="/signup" className="font-semibold text-ds-primary">
            Start free
          </Link>{" "}
          or see{" "}
          <Link href="/pricing" className="font-semibold text-ds-primary">
            pricing
          </Link>
          .
        </CompanyParagraph>
      </CompanySection>
    </CompanyPageShell>
  );
}
