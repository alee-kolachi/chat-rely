import type { Metadata } from "next";
import Link from "next/link";
import {
  LegalList,
  LegalPageShell,
  LegalParagraph,
  LegalSection,
} from "@/components/marketing/legal-page-shell";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "Terms governing your use of the ChatRely platform.",
};

export default function TermsPage() {
  return (
    <LegalPageShell
      title="Terms of Service"
      description="Please read these terms carefully. They govern access to and use of ChatRely."
    >
      <LegalSection title="Agreement">
        <LegalParagraph>
          These Terms of Service (&quot;Terms&quot;) are a binding agreement between you and ChatRely (&quot;ChatRely,&quot;
          &quot;we,&quot; &quot;us&quot;) regarding the ChatRely website, dashboard, APIs, embeddable widget, and related
          services (collectively, the &quot;Service&quot;). By creating an account, using the Service, or embedding the
          widget on your store, you agree to these Terms and our{" "}
          <Link href="/privacy" className="font-semibold text-ds-primary">
            Privacy Policy
          </Link>
          .
        </LegalParagraph>
        <LegalParagraph>
          If you use the Service on behalf of a company, you represent that you have authority to bind that company, and
          &quot;you&quot; refers to the company.
        </LegalParagraph>
      </LegalSection>

      <LegalSection title="Eligibility and accounts">
        <LegalList
          items={[
            "You must be at least 18 years old and able to form a binding contract.",
            "You must provide accurate registration information and keep it up to date.",
            "You are responsible for all activity under your account and for maintaining the confidentiality of credentials.",
            "Notify us immediately if you suspect unauthorized access.",
          ]}
        />
      </LegalSection>

      <LegalSection title="The Service">
        <LegalParagraph>
          ChatRely helps merchants configure AI support agents grounded in knowledge they provide and, when enabled, live
          data from connected systems such as Shopify. Features vary by plan and may change over time. We may add,
          modify, or discontinue features with reasonable notice where practical.
        </LegalParagraph>
        <LegalParagraph>
          The Service is provided on an &quot;as is&quot; and &quot;as available&quot; basis. AI-generated replies may be
          incomplete or incorrect. You are responsible for reviewing agent behavior, disclosures to your customers, and
          compliance with laws that apply to your business.
        </LegalParagraph>
      </LegalSection>

      <LegalSection title="Acceptable use">
        <LegalParagraph>You agree not to:</LegalParagraph>
        <LegalList
          items={[
            "Use the Service for unlawful, harmful, fraudulent, or deceptive purposes.",
            "Reverse engineer, scrape, or probe the Service except as permitted by law.",
            "Interfere with or disrupt the Service, other users, or underlying infrastructure.",
            "Upload malware or content that infringes intellectual property or privacy rights.",
            "Misrepresent the identity of your business or impersonate others.",
            "Circumvent usage limits, billing controls, or security measures.",
          ]}
        />
        <LegalParagraph>
          We may suspend or terminate access if we reasonably believe you have violated these Terms or pose a risk to
          the Service or other users.
        </LegalParagraph>
      </LegalSection>

      <LegalSection title="Your content and end users">
        <LegalParagraph>
          You retain ownership of content you submit (knowledge sources, prompts, branding, and conversation data from your
          visitors). You grant ChatRely a worldwide, non-exclusive license to host, process, and display that content
          solely to operate and improve the Service for you.
        </LegalParagraph>
        <LegalParagraph>
          You are solely responsible for your storefront visitors, your privacy notices, and obtaining any consents
          required for chat and AI processing. ChatRely processes visitor messages on your instructions as described in
          the Privacy Policy.
        </LegalParagraph>
      </LegalSection>

      <LegalSection title="Integrations">
        <LegalParagraph>
          Optional integrations (including Shopify) are subject to the third party&apos;s terms and API policies. You
          authorize ChatRely to access data you connect only within the scopes you approve. We are not responsible for
          third-party outages, policy changes, or data accuracy outside our control.
        </LegalParagraph>
      </LegalSection>

      <LegalSection title="Plans, billing, and taxes">
        <LegalParagraph>
          Paid plans are billed through Stripe. Fees, included conversation allowances, and feature limits are described
          on our{" "}
          <Link href="/pricing" className="font-semibold text-ds-primary">
            pricing page
          </Link>{" "}
          and in-product documentation at checkout. Subscriptions renew automatically until cancelled in the Stripe
          billing portal or as otherwise stated in the product.
        </LegalParagraph>
        <LegalParagraph>
          Except where required by law, fees are non-refundable. Plan changes may be prorated through Stripe. You are
          responsible for applicable taxes. If payment fails, we may downgrade or suspend the Service after notice.
        </LegalParagraph>
        <LegalParagraph>
          Free and trial tiers may have lower limits or branding requirements (for example &quot;Powered by ChatRely&quot;
          in the widget). Usage beyond included amounts may affect model selection or features as described in your plan.
        </LegalParagraph>
      </LegalSection>

      <LegalSection id="security" title="Security">
        <LegalParagraph>
          We implement reasonable administrative, technical, and organizational safeguards. You must protect embed keys,
          API credentials, and integration tokens. See the{" "}
          <Link href="/privacy#security" className="font-semibold text-ds-primary">
            Security section of our Privacy Policy
          </Link>{" "}
          for more detail. Report incidents to{" "}
          <a href="mailto:support@chatrely.com" className="font-semibold text-ds-primary">
            support@chatrely.com
          </a>
          .
        </LegalParagraph>
      </LegalSection>

      <LegalSection title="Intellectual property">
        <LegalParagraph>
          ChatRely and its licensors own the Service, software, branding, and documentation. These Terms do not grant you
          any rights to our trademarks except as needed to use the Service in accordance with your plan. Feedback you
          provide may be used by us without obligation.
        </LegalParagraph>
      </LegalSection>

      <LegalSection title="Disclaimer of warranties">
        <LegalParagraph>
          TO THE MAXIMUM EXTENT PERMITTED BY LAW, THE SERVICE IS PROVIDED WITHOUT WARRANTIES OF ANY KIND, WHETHER EXPRESS,
          IMPLIED, OR STATUTORY, INCLUDING IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND
          NON-INFRINGEMENT. WE DO NOT WARRANT THAT THE SERVICE WILL BE UNINTERRUPTED, ERROR-FREE, OR THAT AI OUTPUTS WILL
          BE ACCURATE OR SUITABLE FOR EVERY SITUATION.
        </LegalParagraph>
      </LegalSection>

      <LegalSection title="Limitation of liability">
        <LegalParagraph>
          TO THE MAXIMUM EXTENT PERMITTED BY LAW, CHATRELY AND ITS SUPPLIERS WILL NOT BE LIABLE FOR ANY INDIRECT,
          INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR FOR LOST PROFITS, REVENUE, DATA, OR GOODWILL,
          ARISING FROM OR RELATED TO THESE TERMS OR THE SERVICE.
        </LegalParagraph>
        <LegalParagraph>
          OUR TOTAL LIABILITY FOR ANY CLAIM ARISING OUT OF THESE TERMS OR THE SERVICE WILL NOT EXCEED THE GREATER OF (A)
          THE AMOUNTS YOU PAID TO CHATRELY FOR THE SERVICE IN THE TWELVE MONTHS BEFORE THE CLAIM OR (B) ONE HUNDRED U.S.
          DOLLARS ($100).
        </LegalParagraph>
        <LegalParagraph>
          Some jurisdictions do not allow certain limitations; in those cases, our liability is limited to the fullest
          extent permitted by law.
        </LegalParagraph>
      </LegalSection>

      <LegalSection title="Indemnification">
        <LegalParagraph>
          You will defend, indemnify, and hold harmless ChatRely from claims, damages, and expenses (including reasonable
          attorneys&apos; fees) arising from your content, your use of the Service, your violation of these Terms, or your
          violation of applicable law or third-party rights.
        </LegalParagraph>
      </LegalSection>

      <LegalSection title="Termination">
        <LegalParagraph>
          You may stop using the Service at any time. We may suspend or terminate your account for breach of these Terms,
          non-payment, or risk to the Service. Upon termination, your right to access the Service ends; provisions that
          by nature should survive (including payment obligations, disclaimers, limitations, and indemnity) will survive.
        </LegalParagraph>
      </LegalSection>

      <LegalSection title="Changes">
        <LegalParagraph>
          We may update these Terms. We will post the revised version with a new &quot;Last updated&quot; date. Material
          changes may be communicated through the Service or by email. Continued use after changes become effective
          constitutes acceptance.
        </LegalParagraph>
      </LegalSection>

      <LegalSection title="General">
        <LegalList
          items={[
            "These Terms are governed by the laws of the State of Delaware, USA, excluding conflict-of-law rules.",
            "Disputes will be resolved in the state or federal courts located in Delaware, unless applicable law requires otherwise.",
            "If any provision is unenforceable, the remainder stays in effect.",
            "You may not assign these Terms without our consent; we may assign them in connection with a merger or sale.",
            "Our failure to enforce a provision is not a waiver.",
          ]}
        />
      </LegalSection>
    </LegalPageShell>
  );
}
