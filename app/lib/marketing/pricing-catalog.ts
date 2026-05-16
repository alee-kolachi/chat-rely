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

/** Short bullets for onboarding plan cards. Home teaser uses the feature row list. */
export const PRICING_TEASER_BULLETS: Record<PricingTierSlug, readonly string[]> = {
  free: ["1 agent · starter models", "Website & doc knowledge", "30 conversations / mo · no card"],
  hobby: ["Shopify + AI actions", "Advanced models", "200 conversations / mo"],
  standard: ["2 agents · automations & analytics", "Source suggestions", "1,000 conversations / mo"],
  pro: ["5 agents · white-label touches", "Visitor thumbs & feedback insights", "5,000 conversations / mo"],
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
        label: "Agents",
        cells: {
          free: { kind: "text", value: "1" },
          hobby: { kind: "text", value: "1" },
          standard: { kind: "text", value: "2" },
          pro: { kind: "text", value: "5" },
        },
      },
      {
        label: "Conversations / month",
        cells: {
          free: { kind: "text", value: "30 · $0.000" },
          hobby: { kind: "text", value: "200 · $0.145" },
          standard: { kind: "text", value: "1,000 · $0.099" },
          pro: { kind: "text", value: "5,000 · $0.080" },
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
  "Conversations / month":
    "Monthly conversation cap. The dollar figure is an estimate to compare plans—you pay the subscription, not per chat.",
  "AI actions per agent": "Automations (e.g. Shopify actions) each agent can have enabled at the same time.",
  "Training content size": "Total size of files and pages used to train agents on this plan.",
  "Attachments (roadmap)":
    "Still rolling out. Hobby: text-based PDFs. Standard & Pro: PDF plus common image types.",
  "Auto retrain agents": "Automatically refresh the agent when your knowledge sources change.",
  "Sources suggestions":
    "After chats close, Standard and Pro can suggest weak topics on the dashboard so you can add knowledge.",
  "Basic analytics": "Core conversation and performance metrics.",
  "Advanced analytics": "Deeper metrics (intents, sentiment, quality). Standard and Pro; Hobby keeps core KPIs.",
  "Visitor thumbs & feedback summaries (widget)":
    "Visitors can rate replies in the widget; Pro summarizes thumbs and themes on the dashboard.",
  "Shopify": "Connect Shopify for product- and order-aware replies.",
  "Limited models (GPT-5.4 Mini, GPT-4o Mini)": "Starter OpenAI models (e.g. GPT-4o Mini, GPT-5.4 Mini).",
  "Advanced OpenAI models": "Full OpenAI lineup (GPT-5 family, GPT-4o, o-series, and more).",
  "Advanced Google models": "Gemini 2.5+ and 3.x Flash / Pro models.",
  "Remove Powered by ChatRely":
    "Pro hides “Powered by ChatRely” in the widget. Other plans may show it until the visitor sends a message.",
};

export type LandingTierFeatureRow = {
  /** Stable id for React keys */
  key: string;
  displayLabel: string;
  value: string;
  tooltip?: string;
  /** Shown in muted type beside `value` (e.g. cost estimate next to conversation count). */
  mutedSuffix?: string;
  /** Full-width summary line (e.g. “Everything in Free plan”). */
  rowKind?: "inherit";
};

/** Landing home teaser cards: info icons only on a few high-signal rows. */
export const LANDING_TEASER_TOOLTIP_KEYS = new Set<string>([
  "usage:Conversations / month",
  "usage:AI actions per agent",
  "usage:Training content size",
  "usage:Attachments (roadmap)",
]);

const _PREVIOUS_TIER: Record<PricingTierSlug, PricingTierSlug | null> = {
  free: null,
  hobby: "free",
  standard: "hobby",
  pro: "standard",
};

const _TIER_SHORT_NAME: Record<PricingTierSlug, string> = {
  free: "Free",
  hobby: "Hobby",
  standard: "Standard",
  pro: "Pro",
};

function _compactLabel(sourceLabel: string): string {
  return LANDING_COMPACT_LABELS[sourceLabel] ?? sourceLabel;
}

function _excludedTeaserValue(v: string): boolean {
  return v === "\u2014" || v === "Soon";
}

type _TeaserMatrixRow = {
  key: string;
  matrixLabel: string;
  cells: Record<PricingTierSlug, DetailCell>;
};

function _iterTeaserMatrixRows(): _TeaserMatrixRow[] {
  const rows: _TeaserMatrixRow[] = [];
  for (const section of PRICING_DETAIL_SECTIONS) {
    if (section.title === "Usage") {
      for (const row of section.rows) {
        if (row.label === "Conversations / month") continue;
        rows.push({ key: `usage:${row.label}`, matrixLabel: row.label, cells: row.cells });
      }
      continue;
    }
    if (section.title === "Channels") {
      const shopify = section.rows.find((r) => r.label === "Shopify");
      if (shopify) {
        rows.push({ key: "Channels:Shopify", matrixLabel: "Shopify", cells: shopify.cells });
      }
      continue;
    }
    for (const row of section.rows) {
      rows.push({ key: `${section.title}:${row.label}`, matrixLabel: row.label, cells: row.cells });
    }
  }
  return rows;
}

function _insertConversationsAfterAgentOrInherit(
  base: LandingTierFeatureRow[],
  conv: LandingTierFeatureRow,
): LandingTierFeatureRow[] {
  const agentIdx = base.findIndex((r) => r.key === "usage:Agents");
  if (agentIdx !== -1) {
    return [...base.slice(0, agentIdx + 1), conv, ...base.slice(agentIdx + 1)];
  }
  const inheritIdx = base.findIndex((r) => r.rowKind === "inherit");
  if (inheritIdx !== -1) {
    return [...base.slice(0, inheritIdx + 1), conv, ...base.slice(inheritIdx + 1)];
  }
  return [conv, ...base];
}

/**
 * Compact capability rows for the marketing home teaser: omits unavailable (“—”) and roadmap rows,
 * stacks paid tiers on “Everything in … plan”, shows only upgrades vs the previous tier, and places
 * conversations (with cost estimate) after the Agents row when present.
 */
export function buildLandingTierFeatureRows(slug: PricingTierSlug): LandingTierFeatureRow[] {
  const card = PRICING_TIER_CARDS.find((c) => c.slug === slug);
  if (!card) return [];

  const prev = _PREVIOUS_TIER[slug];
  const matrixRows = _iterTeaserMatrixRows();

  const body: LandingTierFeatureRow[] = [];

  if (prev) {
    body.push({
      key: "_inherit",
      rowKind: "inherit",
      displayLabel: `Everything in ${_TIER_SHORT_NAME[prev]} plan`,
      value: "",
    });
  }

  for (const ref of matrixRows) {
    const v = detailCellToShortDisplay(ref.cells[slug]);
    if (_excludedTeaserValue(v)) continue;

    if (prev) {
      const pv = detailCellToShortDisplay(ref.cells[prev]);
      if (!_excludedTeaserValue(pv) && pv === v) continue;
    }

    const tip = LANDING_ROW_TOOLTIPS[ref.matrixLabel];
    const tooltip = tip && LANDING_TEASER_TOOLTIP_KEYS.has(ref.key) ? tip : undefined;

    body.push({
      key: ref.key,
      displayLabel: _compactLabel(ref.matrixLabel),
      value: v,
      tooltip,
    });
  }

  const convRow: LandingTierFeatureRow = {
    key: "usage:Conversations / month",
    displayLabel: _compactLabel("Conversations / month"),
    value: card.includedConversations.toLocaleString(),
    mutedSuffix: card.displayCostPerConversation,
    tooltip:
      LANDING_TEASER_TOOLTIP_KEYS.has("usage:Conversations / month") && LANDING_ROW_TOOLTIPS["Conversations / month"]
        ? LANDING_ROW_TOOLTIPS["Conversations / month"]
        : undefined,
  };

  return _insertConversationsAfterAgentOrInherit(body, convRow);
}
