import type { Metadata } from "next";
import Link from "next/link";
import {
  LegalList,
  LegalPageShell,
  LegalParagraph,
  LegalSection,
} from "@/components/marketing/legal-page-shell";

export const metadata: Metadata = {
  title: "About Us",
  description: "What ChatRely is building and who we serve.",
};

export default function AboutPage() {
  return (
    <LegalPageShell
      title="About ChatRely"
      description="Fast, accurate AI support for Shopify merchants, grounded in your store and policies."
    >
      <LegalSection title="Our mission">
        <LegalParagraph>
          Shopping support should feel instant and trustworthy. Merchants shouldn&apos;t choose between speed and
          accuracy, and shoppers shouldn&apos;t get copy-pasted answers that ignore what&apos;s actually in stock or
          what your return policy says today.
        </LegalParagraph>
        <LegalParagraph>
          ChatRely exists to give every Shopify store a support agent that answers from live store data, indexed
          knowledge, and the conversation thread, then hands off to a human when needed.
        </LegalParagraph>
      </LegalSection>

      <LegalSection title="What we build">
        <LegalList
          items={[
            "An embeddable chat widget for your storefront.",
            "A merchant dashboard to train knowledge, tune tone and behavior, review conversations, and manage escalations.",
            "Optional Shopify integrations for products, orders, and enabled actions.",
            "Conversation-based plans from free trial to Pro, with smart resolution for hard questions.",
          ]}
        />
        <LegalParagraph>
          Under the hood we use modern language models, retrieval over your knowledge base, and streaming so replies
          start quickly. We prioritize short, direct answers and clear escalation instead of long, generic essays.
        </LegalParagraph>
      </LegalSection>

      <LegalSection title="How we work">
        <LegalList
          items={[
            "Accuracy first: the agent uses tools and knowledge, and says when it does not know.",
            "Speed second: quick replies and only the tool calls that are needed.",
            "Brevity always: a few sentences or tight bullets, not walls of text.",
          ]}
        />
        <LegalParagraph>
          We ship iteratively with merchants who run real support volume. Your feedback shapes the roadmap: integrations,
          analytics, and workflow tools that fit how support teams actually work.
        </LegalParagraph>
      </LegalSection>

      <LegalSection title="Who we serve">
        <LegalParagraph>
          ChatRely is built for Shopify merchants and small support teams who want automation without losing control.
          Whether you&apos;re launching your first agent or scaling to thousands of conversations a month, the product
          grows with your plan.
        </LegalParagraph>
      </LegalSection>

      <LegalSection title="Get in touch">
        <LegalParagraph>
          Questions about the product, partnerships, or security? Email{" "}
          <a href="mailto:support@chatrely.com" className="font-semibold text-ds-primary">
            support@chatrely.com
          </a>
          .
        </LegalParagraph>
        <LegalParagraph>
          Ready to try it?{" "}
          <Link href="/signup" className="font-semibold text-ds-primary">
            Start free
          </Link>{" "}
          or explore{" "}
          <Link href="/pricing" className="font-semibold text-ds-primary">
            pricing
          </Link>
          .
        </LegalParagraph>
        <LegalParagraph>
          Legal:{" "}
          <Link href="/privacy" className="font-semibold text-ds-primary">
            Privacy Policy
          </Link>{" "}
          ·{" "}
          <Link href="/terms" className="font-semibold text-ds-primary">
            Terms of Service
          </Link>
        </LegalParagraph>
      </LegalSection>
    </LegalPageShell>
  );
}
