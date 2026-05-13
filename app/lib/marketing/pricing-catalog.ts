/**
 * Static marketing pricing catalog (no API round-trip).
 * Keep in sync with `public.plans` / Stripe after tier changes.
 */

export const PRICING_TIER_SLUGS = ["free", "hobby", "standard", "pro"] as const;
export type PricingTierSlug = (typeof PRICING_TIER_SLUGS)[number];

export type DetailCell =
  | { kind: "tick" }
  | { kind: "dash" }
  | { kind: "comingSoon" }
  | { kind: "text"; value: string };

export type PricingTierCard = {
  slug: PricingTierSlug;
  name: string;
  monthlyPriceCents: number;
  includedConversations: number;
  /** Shown on card and in detail sheet (marketing accuracy). */
  displayCostPerConversation: string;
  tagline: string;
};

export const PRICING_TIER_CARDS: PricingTierCard[] = [
  {
    slug: "free",
    name: "Free",
    monthlyPriceCents: 0,
    includedConversations: 30,
    displayCostPerConversation: "$0.000",
    tagline: "Explore ChatRely on a small monthly conversation allowance.",
  },
  {
    slug: "hobby",
    name: "Hobby",
    monthlyPriceCents: 2900,
    includedConversations: 200,
    displayCostPerConversation: "$0.145",
    tagline: "For solo operators getting real customer volume.",
  },
  {
    slug: "standard",
    name: "Standard",
    monthlyPriceCents: 9900,
    includedConversations: 1000,
    displayCostPerConversation: "$0.099",
    tagline: "Growing teams that need automation and richer analytics.",
  },
  {
    slug: "pro",
    name: "Pro",
    monthlyPriceCents: 39900,
    includedConversations: 5000,
    displayCostPerConversation: "$0.080",
    tagline: "Higher limits, visitor feedback, source suggestions, and white-label touches.",
  },
];

/** Short bullets for home / onboarding only. Full breakdown is on `/pricing`. */
export const PRICING_TEASER_BULLETS: Record<PricingTierSlug, readonly string[]> = {
  free: ["30 conversations / month", "1 agent · starter models", "No card required"],
  hobby: ["200 conversations / month", "Shopify + AI actions", "Advanced models"],
  standard: ["1,000 conversations / month", "2 agents · automations", "Popular for teams"],
  pro: ["5,000 conversations / month", "5 agents", "Visitor thumbs & feedback insights"],
};

export type PricingDetailSection = {
  title: string;
  rows: { label: string; cells: Record<PricingTierSlug, DetailCell> }[];
};

export const PRICING_DETAIL_SECTIONS: PricingDetailSection[] = [
  {
    title: "Usage",
    rows: [
      {
        label: "Conversations / month",
        cells: {
          free: { kind: "text", value: "30" },
          hobby: { kind: "text", value: "200" },
          standard: { kind: "text", value: "1,000" },
          pro: { kind: "text", value: "5,000" },
        },
      },
      {
        label: "Cost per conversation (estimate)",
        cells: {
          free: { kind: "text", value: "$0.000" },
          hobby: { kind: "text", value: "$0.145" },
          standard: { kind: "text", value: "$0.099" },
          pro: { kind: "text", value: "$0.080" },
        },
      },
      {
        label: "Agents",
        cells: {
          free: { kind: "text", value: "1" },
          hobby: { kind: "text", value: "1" },
          standard: { kind: "text", value: "2" },
          pro: { kind: "text", value: "5" },
        },
      },
      {
        label: "AI actions per agent",
        cells: {
          free: { kind: "text", value: "0" },
          hobby: { kind: "text", value: "3" },
          standard: { kind: "text", value: "5" },
          pro: { kind: "text", value: "8" },
        },
      },
      {
        label: "Training content size",
        cells: {
          free: { kind: "text", value: "500 KB" },
          hobby: { kind: "text", value: "15 MB" },
          standard: { kind: "text", value: "40 MB" },
          pro: { kind: "text", value: "100 MB" },
        },
      },
      {
        label: "Attachments (roadmap)",
        cells: {
          free: { kind: "dash" },
          hobby: {
            kind: "text",
            value: "PDF with readable text only",
          },
          standard: {
            kind: "text",
            value: "PDF, PNG, JPG, JPEG",
          },
          pro: {
            kind: "text",
            value: "PDF, PNG, JPG, JPEG",
          },
        },
      },
      {
        label: "Auto retrain agents",
        cells: {
          free: { kind: "dash" },
          hobby: { kind: "dash" },
          standard: { kind: "tick" },
          pro: { kind: "tick" },
        },
      },
      {
        label: "Sources suggestions",
        cells: {
          free: { kind: "dash" },
          hobby: { kind: "dash" },
          standard: { kind: "tick" },
          pro: { kind: "tick" },
        },
      },
      {
        label: "Tickets as a source",
        cells: {
          free: { kind: "comingSoon" },
          hobby: { kind: "comingSoon" },
          standard: { kind: "comingSoon" },
          pro: { kind: "comingSoon" },
        },
      },
    ],
  },
  {
    title: "Analytics",
    rows: [
      {
        label: "Basic analytics",
        cells: {
          free: { kind: "dash" },
          hobby: { kind: "tick" },
          standard: { kind: "tick" },
          pro: { kind: "tick" },
        },
      },
      {
        label: "Advanced analytics",
        cells: {
          free: { kind: "dash" },
          hobby: { kind: "dash" },
          standard: { kind: "tick" },
          pro: { kind: "tick" },
        },
      },
      {
        label: "Visitor thumbs & feedback summaries (widget)",
        cells: {
          free: { kind: "dash" },
          hobby: { kind: "dash" },
          standard: { kind: "dash" },
          pro: { kind: "tick" },
        },
      },
    ],
  },
  {
    title: "Channels",
    rows: [
      {
        label: "Shopify",
        cells: {
          free: { kind: "dash" },
          hobby: { kind: "tick" },
          standard: { kind: "tick" },
          pro: { kind: "tick" },
        },
      },
      {
        label: "WhatsApp",
        cells: {
          free: { kind: "comingSoon" },
          hobby: { kind: "comingSoon" },
          standard: { kind: "comingSoon" },
          pro: { kind: "comingSoon" },
        },
      },
      {
        label: "Messenger",
        cells: {
          free: { kind: "comingSoon" },
          hobby: { kind: "comingSoon" },
          standard: { kind: "comingSoon" },
          pro: { kind: "comingSoon" },
        },
      },
      {
        label: "Instagram",
        cells: {
          free: { kind: "comingSoon" },
          hobby: { kind: "comingSoon" },
          standard: { kind: "comingSoon" },
          pro: { kind: "comingSoon" },
        },
      },
    ],
  },
  {
    title: "Models",
    rows: [
      {
        label: "Limited models (GPT-5.4 Mini, GPT-4o Mini)",
        cells: {
          free: { kind: "tick" },
          hobby: { kind: "tick" },
          standard: { kind: "tick" },
          pro: { kind: "tick" },
        },
      },
      {
        label: "Advanced OpenAI models",
        cells: {
          free: { kind: "dash" },
          hobby: { kind: "tick" },
          standard: { kind: "tick" },
          pro: { kind: "tick" },
        },
      },
      {
        label: "Advanced Google models",
        cells: {
          free: { kind: "dash" },
          hobby: { kind: "tick" },
          standard: { kind: "tick" },
          pro: { kind: "tick" },
        },
      },
    ],
  },
  {
    title: "Brand",
    rows: [
      {
        label: "Remove Powered by ChatRely",
        cells: {
          free: { kind: "dash" },
          hobby: { kind: "dash" },
          standard: { kind: "dash" },
          pro: { kind: "tick" },
        },
      },
    ],
  },
];

/** Multi-line footnotes for model groups (shown under the detail table). */
export const PRICING_MODEL_FOOTNOTES: { title: string; lines: string[] }[] = [
  {
    title: "Limited models",
    lines: ["GPT-5.4 Mini", "GPT-4o Mini"],
  },
  {
    title: "Advanced OpenAI models",
    lines: [
      "GPT-5",
      "GPT-5.1",
      "GPT-5.2",
      "GPT-5.4",
      "GPT-5.5",
      "GPT-5.4 Mini",
      "GPT-5.4 Nano",
      "GPT-5 Mini",
      "GPT-5 Nano",
      "GPT-OSS-120B",
      "GPT-OSS-20B",
      "GPT-4o",
      "GPT-4o Mini",
      "o4 Mini",
    ],
  },
  {
    title: "Advanced Google models",
    lines: [
      "Gemini 2.5 Flash",
      "Gemini 2.5 Pro",
      "Gemini 3 Flash",
      "Gemini 3.1 Flash Lite",
      "Gemini 3.1 Pro",
    ],
  },
];

export function detailCellToShortDisplay(cell: DetailCell): string {
  switch (cell.kind) {
    case "tick":
      return "\u2713";
    case "dash":
      return "\u2014";
    case "comingSoon":
      return "Soon";
    case "text":
      return cell.value;
    default:
      return "";
  }
}

function _footnoteBlock(title: string): string {
  const block = PRICING_MODEL_FOOTNOTES.find((b) => b.title === title);
  if (!block) return "";
  return `${block.title}:\n${block.lines.join("\n")}`;
}

/** Shorter row labels on the home landing teaser cards. */
export const LANDING_COMPACT_LABELS: Record<string, string> = {
  "Limited models (GPT-5.4 Mini, GPT-4o Mini)": "Limited models",
  "Advanced OpenAI models": "Advanced models (OpenAI)",
  "Advanced Google models": "Advanced models (Google)",
  "Attachments (roadmap)": "Attachments",
  "Remove Powered by ChatRely": "Remove branding",
};

/** Hover tooltips only where the row benefits from extra context (paired with the info icon). */
export const LANDING_ROW_TOOLTIPS: Record<string, string> = {
  "Agents": "How many separate AI agents you can run on this plan.",
  "Cost per conversation (estimate)":
    "Estimate for comparison. You pay the monthly subscription only—we do not charge per extra conversation today.",
  "AI actions per agent": "Automations / integrations each agent can enable at once.",
  "Training content size": "Total size of sources used to train the agent for this tier.",
  "Attachments (roadmap)":
    "Not enforced in the product yet. Free: none. Hobby: PDF with readable text only. Standard & Pro: PDF, PNG, JPG, JPEG.",
  "Auto retrain agents": "Automatically refresh the agent when your knowledge sources change.",
  "Sources suggestions":
    "After closures, we surface topics where grounded answers were weak—Standard & Pro on the dashboard. Add pages, snippets, or Q&A in Knowledge.",
  "Tickets as a source": "Use support tickets as training context. Coming soon on all tiers.",
  "Basic analytics": "Core conversation and performance metrics.",
  "Advanced analytics":
    "Intents, geography, sentiment, and quality metrics. Included on Standard and Pro (Hobby has core KPIs and trends only).",
  "Shopify": "Connect a Shopify store for product and order-aware replies.",
  "Limited models (GPT-5.4 Mini, GPT-4o Mini)": _footnoteBlock("Limited models"),
  "Advanced OpenAI models": _footnoteBlock("Advanced OpenAI models"),
  "Advanced Google models": _footnoteBlock("Advanced Google models"),
  "Remove Powered by ChatRely":
    "Pro (and legacy Scale) omit “Powered by ChatRely” in the storefront widget. Other plans show it only until the visitor sends their first message.",
};

export type LandingTierFeatureRow = {
  /** Stable id for React keys */
  key: string;
  displayLabel: string;
  value: string;
  tooltip?: string;
};

function _compactLabel(sourceLabel: string): string {
  return LANDING_COMPACT_LABELS[sourceLabel] ?? sourceLabel;
}

/**
 * Rows shown inside each tier card on the home landing (and onboarding): full coverage, compact text,
 * optional tooltips for dense rows.
 */
export function buildLandingTierFeatureRows(slug: PricingTierSlug): LandingTierFeatureRow[] {
  const card = PRICING_TIER_CARDS.find((c) => c.slug === slug);
  if (!card) return [];

  const rows: LandingTierFeatureRow[] = [
    {
      key: "conversations",
      displayLabel: "Conversations / mo",
      value: card.includedConversations.toLocaleString(),
      tooltip: LANDING_ROW_TOOLTIPS["Conversations / month"],
    },
    {
      key: "cost_conv",
      displayLabel: "Cost / conv (est.)",
      value: card.displayCostPerConversation,
      tooltip: LANDING_ROW_TOOLTIPS["Cost per conversation (estimate)"],
    },
  ];

  for (const section of PRICING_DETAIL_SECTIONS) {
    if (section.title === "Usage") {
      for (const row of section.rows) {
        if (row.label === "Conversations / month" || row.label === "Cost per conversation (estimate)") {
          continue;
        }
        rows.push({
          key: `usage:${row.label}`,
          displayLabel: _compactLabel(row.label),
          value: detailCellToShortDisplay(row.cells[slug]),
          tooltip: LANDING_ROW_TOOLTIPS[row.label],
        });
      }
      continue;
    }

    if (section.title === "Channels") {
      const shopify = section.rows.find((r) => r.label === "Shopify");
      if (shopify && slug !== "free") {
        rows.push({
          key: "channel:shopify",
          displayLabel: "Shopify",
          value: detailCellToShortDisplay(shopify.cells[slug]),
          tooltip: LANDING_ROW_TOOLTIPS["Shopify"],
        });
      }
      rows.push({
        key: "channel:more",
        displayLabel: "WhatsApp · Messenger · Instagram",
        value: "Soon",
        tooltip: "Additional messaging channels on our roadmap; coming soon on all plans.",
      });
      continue;
    }

    for (const row of section.rows) {
      rows.push({
        key: `${section.title}:${row.label}`,
        displayLabel: _compactLabel(row.label),
        value: detailCellToShortDisplay(row.cells[slug]),
        tooltip: LANDING_ROW_TOOLTIPS[row.label],
      });
    }
  }

  return rows;
}
