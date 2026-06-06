import type { Metadata } from "next";
import Link from "next/link";
import {
  CompanyList,
  CompanyPageShell,
  CompanyParagraph,
  CompanySection,
  LEGAL_SUPPORT_EMAIL,
} from "@/components/marketing/company-page-shell";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How ChatRely collects, uses, and protects data for merchants and store visitors.",
};

export default function PrivacyPage() {
  return (
    <CompanyPageShell
      title="Privacy Policy"
      description="This policy explains what we collect when you use ChatRely, how we use it, and the choices you have."
      showLastUpdated
    >
      <CompanySection title="Overview">
        <CompanyParagraph>
          ChatRely (&quot;ChatRely,&quot; &quot;we,&quot; &quot;us&quot;) provides software that helps merchants
          deploy AI support agents on their websites and Shopify stores. This Privacy Policy describes how we handle
          personal information when you visit our marketing site, create an account, use the dashboard or playground,
          embed our widget, or otherwise interact with the Service.
        </CompanyParagraph>
        <CompanyParagraph>
          If you operate a store using ChatRely, you are generally the data controller for information about your
          shoppers and visitors. We process that information on your behalf as a service provider. This policy covers
          both our relationship with account holders and how visitor data flows through the platform.
        </CompanyParagraph>
      </CompanySection>

      <CompanySection title="Information we collect">
        <CompanyParagraph>
          <strong className="text-ds-on-surface">Account and workspace data.</strong> When you sign up, we collect
          details such as your name, email address, authentication identifiers from Supabase Auth (including Google
          sign-in when you choose it), workspace and agent settings, billing status, timezone, notification
          preferences, and other settings you configure in the product.
        </CompanyParagraph>
        <CompanyParagraph>
          <strong className="text-ds-on-surface">Agent and knowledge data.</strong> You may upload or connect knowledge
          sources (files such as PDF or DOCX, text snippets, website URLs, and Q&amp;A pairs), configure agent behavior
          and appearance, and enable integrations such as Shopify. We store this content to operate your agents and
          generate search embeddings for retrieval.
        </CompanyParagraph>
        <CompanyParagraph>
          <strong className="text-ds-on-surface">Conversation data.</strong> When end users chat with your agent in the
          widget, playground, or preview, we store messages, metadata (timestamps, channel, agent and conversation
          identifiers, browser locale when available), tool activity, escalation signals, and related support tickets
          you or the agent create. If a visitor provides contact details during escalation, we store the name and email
          they submit. On Pro plans, optional visitor thumbs feedback on assistant messages may also be stored.
        </CompanyParagraph>
        <CompanyParagraph>
          <strong className="text-ds-on-surface">Widget and visitor identifiers.</strong> The embeddable widget stores a
          visitor identifier and recent conversation state in the visitor&apos;s browser local storage so chats can
          resume on the same device. The widget does not set first-party cookies. When a chat request is sent, the widget
          may include the visitor identifier, conversation identifier, and browser locale.
        </CompanyParagraph>
        <CompanyParagraph>
          <strong className="text-ds-on-surface">Integration data.</strong> If you connect Shopify on a paid plan that
          includes Shopify actions, we store your shop domain, encrypted access tokens, granted OAuth scopes, and data
          returned through Shopify&apos;s APIs (for example products, inventory, orders, fulfillments, and customer
          records) only as needed to fulfill the tool calls you enable.
        </CompanyParagraph>
        <CompanyParagraph>
          <strong className="text-ds-on-surface">Payment data.</strong> Paid subscriptions are processed by Stripe. We
          receive subscription identifiers, plan status, and limited billing metadata from Stripe, not full payment card
          numbers, which Stripe handles directly.
        </CompanyParagraph>
        <CompanyParagraph>
          <strong className="text-ds-on-surface">Technical and usage data.</strong> We collect logs and diagnostics
          (such as IP address for rate limiting and security, browser or device type, API requests, error reports,
          feature usage, token counts, and approximate performance metrics) to secure and improve the Service. IP
          addresses are used for abuse prevention and may appear in server logs; we do not maintain a separate
          persistent visitor profile keyed only by IP address.
        </CompanyParagraph>
      </CompanySection>

      <CompanySection title="How we use information">
        <CompanyList
          items={[
            "Provide, maintain, and improve the Service, including AI replies, knowledge retrieval, and optional Shopify tools.",
            "Authenticate users, enforce plan limits, prevent abuse, and protect the security of accounts and embed keys.",
            "Process subscriptions and usage-based plan enforcement through Stripe.",
            "Send service-related communications (for example account verification, security alerts, or billing notices).",
            "Analyze aggregated usage to improve accuracy, latency, and reliability.",
            "Comply with law, respond to lawful requests, and enforce our Terms of Service.",
          ]}
        />
        <CompanyParagraph>
          We do not sell personal information. We do not use merchant or visitor conversation content to train
          general-purpose models for unrelated products. OpenAI processes prompts and embeddings on our behalf under
          its own terms as a subprocessor (see below).
        </CompanyParagraph>
      </CompanySection>

      <CompanySection title="Subprocessors">
        <CompanyParagraph>
          We use trusted third parties to run ChatRely. They access personal information only to perform services on
          our behalf and under contractual obligations:
        </CompanyParagraph>
        <CompanyList
          items={[
            "Supabase: authentication, PostgreSQL database hosting, and related infrastructure.",
            "Stripe: subscription billing and the customer billing portal.",
            "OpenAI: language models for chat replies and embedding models for knowledge search.",
            "Shopify: when you connect a store, per Shopify's API and the scopes you grant.",
            "Vercel: hosting for our marketing site and dashboard frontend.",
            "Google: optional Google sign-in for accounts; the widget may load Google Fonts or favicon assets when configured.",
            "Mailjet: optional transactional email delivery for escalations and notifications when enabled.",
            "Application hosting providers that run our API and background workers.",
          ]}
        />
        <CompanyParagraph>
          We may add or change subprocessors as the product evolves; material changes will be reflected in this policy.
        </CompanyParagraph>
      </CompanySection>

      <CompanySection title="Marketing site">
        <CompanyParagraph>
          Our marketing pages do not load third-party analytics or advertising trackers by default. We may embed the
          ChatRely widget on our own site for product support; when enabled, visitor chat data is handled the same way
          as for merchant embeds described above.
        </CompanyParagraph>
      </CompanySection>

      <CompanySection title="Merchant responsibilities">
        <CompanyParagraph>
          If you embed ChatRely on your storefront, you are responsible for informing your visitors, obtaining any
          required consents, and honoring data subject requests for visitor data you control. You should publish your
          own store privacy notice that describes your use of chat and AI tools, including ChatRely where appropriate.
        </CompanyParagraph>
        <CompanyParagraph>
          Do not submit sensitive categories of data (health, financial account numbers, government IDs, etc.) through
          chat unless you have a lawful basis and appropriate safeguards.
        </CompanyParagraph>
      </CompanySection>

      <CompanySection title="Retention and deletion">
        <CompanyParagraph>
          We retain account and conversation data for as long as your workspace is active or as needed to provide the
          Service, comply with legal obligations, resolve disputes, and enforce agreements. You can delete knowledge
          sources, disconnect Shopify, and update or close conversations from the dashboard where those features are
          available. Permanent deletion of an entire workspace or account is handled manually on request to avoid
          accidental data loss; contact{" "}
          <a href={`mailto:${LEGAL_SUPPORT_EMAIL}`} className="font-semibold text-ds-primary">
            {LEGAL_SUPPORT_EMAIL}
          </a>
          .
        </CompanyParagraph>
        <CompanyParagraph>
          Idle widget conversations may be closed automatically after a period of inactivity based on your agent
          settings.
        </CompanyParagraph>
      </CompanySection>

      <CompanySection id="security" title="Security">
        <CompanyParagraph>
          We use industry-standard measures including encryption in transit, access controls, and separation between
          customer workspaces. Shopify access tokens and similar secrets are stored encrypted. You are responsible for
          safeguarding dashboard credentials, API keys, widget embed keys, and integration tokens. Report suspected
          security issues promptly to{" "}
          <a href={`mailto:${LEGAL_SUPPORT_EMAIL}`} className="font-semibold text-ds-primary">
            {LEGAL_SUPPORT_EMAIL}
          </a>
          .
        </CompanyParagraph>
        <CompanyParagraph>
          No method of transmission or storage is completely secure; we cannot guarantee absolute security.
        </CompanyParagraph>
      </CompanySection>

      <CompanySection title="International transfers">
        <CompanyParagraph>
          We may process and store information in the United States and other countries where we or our subprocessors
          operate. By using the Service, you acknowledge that data may be transferred to jurisdictions that may have
          different data protection laws than your own.
        </CompanyParagraph>
      </CompanySection>

      <CompanySection title="Your rights and choices">
        <CompanyParagraph>
          Depending on where you live, you may have rights to access, correct, delete, or export personal information, or
          to object to or restrict certain processing. Account holders can update profile details in the dashboard and
          contact us for other requests. We will verify your identity before fulfilling requests.
        </CompanyParagraph>
        <CompanyParagraph>
          You may opt out of non-essential marketing emails by using unsubscribe links or contacting us. Service-related
          messages may still be sent.
        </CompanyParagraph>
      </CompanySection>

      <CompanySection title="Children">
        <CompanyParagraph>
          ChatRely is not directed at children under 16, and we do not knowingly collect personal information from them.
          If you believe a child has provided us data, contact us and we will take appropriate steps to delete it.
        </CompanyParagraph>
      </CompanySection>

      <CompanySection title="Changes">
        <CompanyParagraph>
          We may update this Privacy Policy from time to time. We will post the revised version with a new &quot;Last
          updated&quot; date. Material changes may also be communicated through the product or by email where
          appropriate. Continued use after changes take effect constitutes acceptance of the updated policy.
        </CompanyParagraph>
        <CompanyParagraph>
          See also our{" "}
          <Link href="/terms" className="font-semibold text-ds-primary">
            Terms of Service
          </Link>
          .
        </CompanyParagraph>
      </CompanySection>
    </CompanyPageShell>
  );
}
