import type { Metadata } from "next";
import Link from "next/link";
import {
  COMPANY_CONTACT_EMAIL,
  CompanyHighlight,
  CompanyList,
  CompanyPageShell,
  CompanyParagraph,
  CompanySection,
  CompanyValues,
} from "@/components/marketing/company-page-shell";

export const metadata: Metadata = {
  title: "About Us",
  description: "What ChatRely is building and who we serve.",
};

export default function AboutPage() {
  return (
    <CompanyPageShell
      title="About ChatRely"
      description="Fast, accurate AI support for Shopify merchants, grounded in your store and policies."
      activeHref="/about"
    >
      <CompanySection title="Our mission">
        <CompanyHighlight>Shopping support should feel instant and trustworthy.</CompanyHighlight>
        <CompanyParagraph>
          Merchants shouldn&apos;t choose between speed and accuracy, and shoppers shouldn&apos;t get copy-pasted
          answers that ignore what&apos;s actually in stock or what your return policy says today.
        </CompanyParagraph>
        <CompanyParagraph>
          ChatRely exists to give every Shopify store a support agent that answers from live store data, indexed
          knowledge, and the conversation thread, then hands off to a human when needed.
        </CompanyParagraph>
      </CompanySection>

      <CompanySection title="What we build">
        <CompanyList
          items={[
            "An embeddable chat widget for your storefront.",
            "A merchant dashboard to train knowledge, tune tone and behavior, review conversations, and manage escalations.",
            "Optional Shopify integrations for products, orders, and enabled actions.",
            "Conversation-based plans from free trial to Pro, with smart resolution for hard questions.",
          ]}
        />
        <CompanyParagraph>
          Under the hood we use modern language models, retrieval over your knowledge base, and streaming so replies
          start quickly. We prioritize short, direct answers and clear escalation instead of long, generic essays.
        </CompanyParagraph>
      </CompanySection>

      <CompanySection title="How we work">
        <CompanyValues
          items={[
            {
              title: "Accuracy first",
              body: "The agent uses tools and knowledge, and says when it does not know.",
            },
            {
              title: "Speed second",
              body: "Quick replies and only the tool calls that are needed.",
            },
            {
              title: "Brevity always",
              body: "A few sentences or tight bullets, not walls of text.",
            },
          ]}
        />
        <CompanyParagraph>
          We ship iteratively with merchants who run real support volume. Your feedback shapes the roadmap:
          integrations, analytics, and workflow tools that fit how support teams actually work.
        </CompanyParagraph>
      </CompanySection>

      <CompanySection title="Who we serve">
        <CompanyParagraph>
          ChatRely is built for Shopify merchants and small support teams who want automation without losing control.
          Whether you&apos;re launching your first agent or scaling to thousands of conversations a month, the product
          grows with your plan.
        </CompanyParagraph>
      </CompanySection>

      <CompanySection title="Get in touch">
        <CompanyParagraph>
          Questions about the product, partnerships, or security? Email{" "}
          <a href={`mailto:${COMPANY_CONTACT_EMAIL}`} className="font-semibold text-ds-primary">
            {COMPANY_CONTACT_EMAIL}
          </a>
          .
        </CompanyParagraph>
        <CompanyParagraph>
          Ready to try it?{" "}
          <Link href="/signup" className="font-semibold text-ds-primary">
            Start free
          </Link>{" "}
          or explore{" "}
          <Link href="/pricing" className="font-semibold text-ds-primary">
            pricing
          </Link>
          .
        </CompanyParagraph>
      </CompanySection>
    </CompanyPageShell>
  );
}
