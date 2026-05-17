import type { Metadata } from "next";
import Link from "next/link";
import {
  LegalList,
  LegalPageShell,
  LegalParagraph,
  LegalSection,
} from "@/components/marketing/legal-page-shell";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How ChatRely collects, uses, and protects data for merchants and store visitors.",
};

export default function PrivacyPage() {
  return (
    <LegalPageShell
      title="Privacy Policy"
      description="This policy explains what we collect when you use ChatRely, how we use it, and the choices you have."
    >
      <LegalSection title="Overview">
        <LegalParagraph>
          ChatRely (&quot;ChatRely,&quot; &quot;we,&quot; &quot;us&quot;) provides software that helps merchants deploy AI
          support agents on their websites and Shopify stores. This Privacy Policy describes how we handle personal
          information when you visit our marketing site, create an account, use the dashboard or playground, embed our
          widget, or otherwise interact with the Service.
        </LegalParagraph>
        <LegalParagraph>
          If you operate a store using ChatRely, you are generally the data controller for information about your
          shoppers and visitors. We process that information on your behalf as a service provider. This policy covers
          both our relationship with account holders and how visitor data flows through the platform.
        </LegalParagraph>
      </LegalSection>

      <LegalSection title="Information we collect">
        <LegalParagraph>
          <strong className="text-ds-on-surface">Account and workspace data.</strong> When you sign up, we collect details
          such as your name, email address, authentication identifiers from our identity provider, workspace and agent
          settings, billing status, and preferences you set in the product.
        </LegalParagraph>
        <LegalParagraph>
          <strong className="text-ds-on-surface">Agent and knowledge data.</strong> You may upload or connect knowledge
          sources (files, text, website URLs, Q&amp;A pairs), configure agent behavior and appearance, and enable
          integrations such as Shopify. We store this content to operate your agents.
        </LegalParagraph>
        <LegalParagraph>
          <strong className="text-ds-on-surface">Conversation data.</strong> When end users chat with your agent in the
          widget, playground, or preview, we store messages, metadata (timestamps, channel, agent and
          conversation identifiers), tool activity, escalation signals, and related support tickets you or the agent
          create.
        </LegalParagraph>
        <LegalParagraph>
          <strong className="text-ds-on-surface">Integration data.</strong> If you connect Shopify, we receive and use
          store credentials and data returned through Shopify&apos;s APIs (for example products, orders, or customer
          records) only as needed to fulfill tool calls you enable and to display results in conversations.
        </LegalParagraph>
        <LegalParagraph>
          <strong className="text-ds-on-surface">Payment data.</strong> Paid subscriptions are processed by Stripe. We
          receive subscription identifiers, plan status, and limited billing metadata from Stripe, not full payment card
          numbers, which Stripe handles directly.
        </LegalParagraph>
        <LegalParagraph>
          <strong className="text-ds-on-surface">Technical and usage data.</strong> We collect logs and diagnostics
          (IP address, browser or device type, API requests, error reports, feature usage, and approximate performance
          metrics) to secure and improve the Service.
        </LegalParagraph>
      </LegalSection>

      <LegalSection title="How we use information">
        <LegalList
          items={[
            "Provide, maintain, and improve the Service, including AI responses, retrieval, and optional Shopify tools.",
            "Authenticate users, enforce plan limits, prevent abuse, and protect the security of accounts and embed keys.",
            "Process subscriptions, invoices, and usage-based billing through Stripe.",
            "Send service-related communications (for example account verification, security alerts, or billing notices).",
            "Analyze aggregated usage to improve accuracy, latency, and reliability.",
            "Comply with law, respond to lawful requests, and enforce our Terms of Service.",
          ]}
        />
        <LegalParagraph>
          We do not sell personal information. We do not use visitor conversation content to train general-purpose models
          for unrelated products without your direction; model providers may process prompts under their own terms as
          subprocessors (see below).
        </LegalParagraph>
      </LegalSection>

      <LegalSection title="Subprocessors">
        <LegalParagraph>
          We use trusted third parties to run ChatRely. They access personal information only to perform services on our
          behalf and under contractual obligations:
        </LegalParagraph>
        <LegalList
          items={[
            "Supabase: authentication, database hosting, and related infrastructure.",
            "Stripe: subscription billing and customer portal.",
            "OpenAI: language models and search indexing used to generate replies and index knowledge.",
            "Shopify: when you connect a store, per Shopify&apos;s API and your granted scopes.",
            "Cloud and hosting providers that store encrypted data and serve the application.",
          ]}
        />
        <LegalParagraph>
          We may add or change subprocessors as the product evolves; material changes will be reflected in this policy.
        </LegalParagraph>
      </LegalSection>

      <LegalSection title="Merchant responsibilities">
        <LegalParagraph>
          If you embed ChatRely on your storefront, you are responsible for informing your visitors, obtaining any
          required consents, and honoring data subject requests for visitor data you control. You should publish your own
          store privacy notice that describes your use of chat and AI tools, including ChatRely where appropriate.
        </LegalParagraph>
        <LegalParagraph>
          Do not submit sensitive categories of data (health, financial account numbers, government IDs, etc.) through
          chat unless you have a lawful basis and appropriate safeguards.
        </LegalParagraph>
      </LegalSection>

      <LegalSection title="Retention">
        <LegalParagraph>
          We retain account and conversation data for as long as your workspace is active or as needed to provide the
          Service, comply with legal obligations, resolve disputes, and enforce agreements. You may delete agents,
          knowledge sources, or conversations from the dashboard where those features are available. When you close an
          account, we delete or anonymize data within a reasonable period unless retention is required by law.
        </LegalParagraph>
      </LegalSection>

      <LegalSection id="security" title="Security">
        <LegalParagraph>
          We use industry-standard measures including encryption in transit, access controls, and separation between
          customer workspaces. You are responsible for safeguarding dashboard credentials, API keys, widget embed keys,
          and integration tokens. Report suspected security issues promptly to{" "}
          <a href="mailto:support@chatrely.com" className="font-semibold text-ds-primary">
            support@chatrely.com
          </a>
          .
        </LegalParagraph>
        <LegalParagraph>
          No method of transmission or storage is completely secure; we cannot guarantee absolute security.
        </LegalParagraph>
      </LegalSection>

      <LegalSection title="International transfers">
        <LegalParagraph>
          We may process and store information in the United States and other countries where we or our subprocessors
          operate. By using the Service, you acknowledge that data may be transferred to jurisdictions that may have
          different data protection laws than your own.
        </LegalParagraph>
      </LegalSection>

      <LegalSection title="Your rights and choices">
        <LegalParagraph>
          Depending on where you live, you may have rights to access, correct, delete, or export personal information, or
          to object to or restrict certain processing. Account holders can update profile details in the dashboard and
          contact us for other requests. We will verify your identity before fulfilling requests.
        </LegalParagraph>
        <LegalParagraph>
          You may opt out of non-essential marketing emails by using unsubscribe links or contacting us. Service-related
          messages may still be sent.
        </LegalParagraph>
      </LegalSection>

      <LegalSection title="Children">
        <LegalParagraph>
          ChatRely is not directed at children under 16, and we do not knowingly collect personal information from them.
          If you believe a child has provided us data, contact us and we will take appropriate steps to delete it.
        </LegalParagraph>
      </LegalSection>

      <LegalSection title="Changes">
        <LegalParagraph>
          We may update this Privacy Policy from time to time. We will post the revised version with a new &quot;Last
          updated&quot; date. Material changes may also be communicated through the product or by email where
          appropriate. Continued use after changes take effect constitutes acceptance of the updated policy.
        </LegalParagraph>
        <LegalParagraph>
          See also our{" "}
          <Link href="/terms" className="font-semibold text-ds-primary">
            Terms of Service
          </Link>
          .
        </LegalParagraph>
      </LegalSection>
    </LegalPageShell>
  );
}
