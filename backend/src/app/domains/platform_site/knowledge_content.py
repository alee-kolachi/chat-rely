"""Curated Q&A and snippets for the ChatRely marketing-site agent.

Keep pricing facts aligned with ``app/lib/marketing/pricing-catalog.ts``.
"""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class PlatformQAPair:
    question: str
    answer: str


@dataclass(frozen=True)
class PlatformSnippet:
    title: str
    body: str


PLATFORM_SITE_SYSTEM_PROMPT = (
    "You are ChatRely's website assistant for merchants evaluating or using the product. "
    "Answer only from retrieved knowledge and this conversation. "
    "Do not invent pricing, plan limits, features, or policies. "
    "Scope: what ChatRely is, plans and pricing, signup, onboarding, the dashboard, "
    "widget embed, Shopify integration, and high-level security and privacy. "
    "Out of scope: other customers' data, legal advice, and any merchant's store-specific orders or catalog. "
    "When helpful, point visitors to /signup, /pricing, or support@chatrely.com. "
    "Be brief, direct, and accurate."
)

PLATFORM_SITE_QA: tuple[PlatformQAPair, ...] = (
    PlatformQAPair(
        question="What is ChatRely?",
        answer=(
            "ChatRely is an AI support assistant for Shopify merchants. You add knowledge about your store, "
            "optionally connect Shopify for live product and order data, test in the playground, and embed a "
            "chat widget on your storefront. Sign up at /signup to get started."
        ),
    ),
    PlatformQAPair(
        question="Who is ChatRely for?",
        answer=(
            "E-commerce brands on Shopify that want fast, accurate customer support without hiring a large team. "
            "It works for solo stores and growing teams that need policies, product questions, and order lookups in chat."
        ),
    ),
    PlatformQAPair(
        question="Do I need Shopify to use ChatRely?",
        answer=(
            "No. You can use knowledge-base content and the embeddable widget without Shopify. "
            "Connecting Shopify unlocks live catalog, inventory, and order tools for richer answers."
        ),
    ),
    PlatformQAPair(
        question="How do I embed the chat widget on my site?",
        answer=(
            "In the dashboard, open Deploy and copy the embed snippet. It loads widget.js with "
            "data-chatrely-agent-key (your public embed key) and data-chatrely-api-base (your public API URL). "
            "Paste the script before </body> on your storefront or theme."
        ),
    ),
    PlatformQAPair(
        question="How do I get started?",
        answer=(
            "1) Sign up at /signup. 2) Complete onboarding (agent name, optional website knowledge). "
            "3) Add knowledge (website, files, snippets, or Q&A). 4) Test in Playground. "
            "5) Copy the embed snippet from Deploy and add it to your store."
        ),
    ),
    PlatformQAPair(
        question="How much does the Standard plan cost?",
        answer=(
            "Standard is $99/month and includes 1,000 conversations per month, 2 agents, 5 AI actions per agent, "
            "40 MB training content, premium AI conversations, and analytics. "
            "See /pricing for the full comparison."
        ),
    ),
    PlatformQAPair(
        question="What is the difference between essential AI and premium AI?",
        answer=(
            "Free uses essential AI only. Paid plans use premium AI until your monthly conversation cap. "
            "After the cap, chat stays on with unlimited essential AI. Replies may be slower and less accurate. "
            "Busy periods may add a short delay; visitors are never shown an offline error."
        ),
    ),
    PlatformQAPair(
        question="Where is my data stored and who processes it?",
        answer=(
            "ChatRely hosts application data on our infrastructure and uses providers such as OpenAI for "
            "language models and embeddings. See /privacy for collection, use, subprocessors, and retention details."
        ),
    ),
    PlatformQAPair(
        question="Can you access my Shopify orders or account?",
        answer=(
            "This assistant only answers questions about the ChatRely product. It cannot access your store, "
            "dashboard account, or orders. Sign in to the dashboard or email support@chatrely.com for account help."
        ),
    ),
)

PLATFORM_SITE_SNIPPETS: tuple[PlatformSnippet, ...] = (
    PlatformSnippet(
        title="ChatRely pricing matrix",
        body="""ChatRely plan pricing (USD/month, marketing catalog):

Free — $0/mo — 30 essential AI conversations — 1 agent — 0 AI actions — 500 KB training — no Shopify
Hobby — $29/mo — 250 premium AI conversations — 1 agent — 1 AI action — 5 MB training — Shopify + premium AI
Standard — $99/mo — 1,000 premium AI conversations — 2 agents — 5 AI actions — 40 MB training — premium AI + analytics
Pro — $399/mo — 5,000 premium AI conversations — 5 agents — 6 AI actions — 100 MB training — visitor feedback, remove Powered by ChatRely branding

Overage display (marketing): Free $0.000, Hobby $0.145, Standard $0.099, Pro $0.080 per conversation beyond included.
After the premium cap, unlimited essential AI continues; replies may slow during heavy use.

Full matrix: /pricing""",
    ),
    PlatformSnippet(
        title="ChatRely feature glossary",
        body="""Essential AI: Faster, lighter AI tier. Free uses essential AI only. Paid plans switch here after the premium conversation cap.

Premium AI: Higher-quality AI on paid plans until the monthly premium conversation cap.

AI actions: Shopify-connected automations (product search, order lookup, etc.) capped per plan per agent.

Knowledge sources: Website crawl, file upload, text snippets, and Q&A pairs; indexed for retrieval at chat time.

Playground: Dashboard chat to test the agent before embedding the widget.

Widget: Embeddable script (widget.js) with a public agent key; streams replies via the public chat API.

Human escalation: Visitors can request a person; creates a ticket for the merchant team when enabled.""",
    ),
    PlatformSnippet(
        title="ChatRely setup checklist",
        body="""Merchant setup checklist:
1. Create account at /signup and name your agent.
2. Optional: add website knowledge during onboarding or in Knowledge → Website.
3. Add policies and FAQs via files, snippets, or Q&A.
4. Optional: connect Shopify in Actions for live store tools.
5. Tune appearance and tone under Agent settings.
6. Test in Playground.
7. Deploy: copy embed snippet to your theme (Deploy page).
8. Monitor conversations and analytics in the dashboard.""",
    ),
    PlatformSnippet(
        title="ChatRely support boundaries",
        body="""This website assistant explains ChatRely only. It cannot log into your dashboard, change billing, or read your Shopify data.

For account, billing, or bug reports: support@chatrely.com
For product signup: /signup
For plan details: /pricing""",
    ),
)
