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
    tagline: "Start free, always on",
  },
  {
    slug: "hobby",
    name: "Hobby",
    monthlyPriceCents: 2900,
    includedConversations: 250,
    displayCostPerConversation: "$0.145",
    tagline: "Solo stores, real volume",
  },
  {
    slug: "standard",
    name: "Standard",
    monthlyPriceCents: 9900,
    includedConversations: 1000,
    displayCostPerConversation: "$0.099",
    tagline: "Automation and analytics",
  },
  {
    slug: "pro",
    name: "Pro",
    monthlyPriceCents: 39900,
    includedConversations: 5000,
    displayCostPerConversation: "$0.080",
    tagline: "Scale and white-label",
  },
];

/** Feature bullets on the marketing pricing page cards (Hunter-style layout). */
export const PRICING_CARD_BULLETS: Record<PricingTierSlug, readonly string[]> = {
  free: [
    "1 agent",
    "30 conversations per month",
    "Essential AI",
    "Website knowledge",
    "Shopify connect",
    "500 KB training content",
    "Always on",
  ],
  hobby: [
    "Everything in Free",
    "250 conversations per month",
    "3 AI actions per agent",
    "Basic analytics",
    "15 MB training content",
    "Always on",
  ],
  standard: [
    "Everything in Hobby",
    "2 agents",
    "1,000 conversations per month",
    "Smart resolution",
    "5 AI actions per agent",
    "Advanced analytics",
    "Sources suggestions",
    "40 MB training content",
    "Always on",
  ],
  pro: [
    "Everything in Standard",
    "5 agents",
    "5,000 conversations per month",
    "Visitor feedback summaries",
    "8 AI actions per agent",
    "Remove Powered by ChatRely",
    "100 MB training content",
    "Always on",
  ],
};

/** Short bullets for onboarding plan cards. Home teaser uses the feature row list. */
export const PRICING_TEASER_BULLETS: Record<PricingTierSlug, readonly string[]> = {
  free: ["1 agent · essential AI", "Website knowledge · Shopify connect", "30 conversations / mo · always on"],
  hobby: ["Shopify + AI actions", "Essential AI", "250 conversations / mo · always on"],
  standard: ["Smart resolution for complex issues", "2 agents · analytics", "1,000 conversations / mo"],
  pro: ["Smart resolution · visitor feedback", "5 agents · white-label", "5,000 conversations / mo"],
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
          hobby: { kind: "text", value: "250 · $0.145" },
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
        label: "Attachments",
        cells: {
          free: { kind: "dash" },
          hobby: { kind: "comingSoon" },
          standard: { kind: "comingSoon" },
          pro: { kind: "comingSoon" },
        },
      },
      {
        label: "Auto retrain agents",
        cells: {
          free: { kind: "dash" },
          hobby: { kind: "dash" },
          standard: { kind: "comingSoon" },
          pro: { kind: "comingSoon" },
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
          free: { kind: "tick" },
          hobby: { kind: "tick" },
          standard: { kind: "tick" },
          pro: { kind: "tick" },
        },
      },
    ],
  },
  {
    title: "AI",
    rows: [
      {
        label: "Essential AI (always on)",
        cells: {
          free: { kind: "tick" },
          hobby: { kind: "tick" },
          standard: { kind: "tick" },
          pro: { kind: "tick" },
        },
      },
      {
        label: "Smart resolution for complex issues",
        cells: {
          free: { kind: "dash" },
          hobby: { kind: "dash" },
          standard: { kind: "tick" },
          pro: { kind: "tick" },
        },
      },
      {
        label: "Priority smart resolution (shared capacity)",
        cells: {
          free: { kind: "dash" },
          hobby: { kind: "dash" },
          standard: { kind: "dash" },
          pro: { kind: "comingSoon" },
        },
      },
      {
        label: "Always on (may slow when busy)",
        cells: {
          free: { kind: "tick" },
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

/** Footnotes for the AI section (optional detail under the matrix). */
export const PRICING_AI_FOOTNOTES: { title: string; lines: string[] }[] = [
  {
    title: "How AI works on every plan",
    lines: [
      "Essential AI handles most chats and is included in your monthly conversations.",
      "Standard and Pro use smart resolution on harder questions within a shared monthly allowance.",
      "Pro priority resolution is rolling out next. Until then, Pro uses the same smart resolution with a higher allowance.",
      "Chat stays on when you are busy. Heavy periods may reply a bit slower.",
    ],
  },
];

export function detailCellToShortDisplay(cell: DetailCell): string {
  switch (cell.kind) {
    case "tick":
      return "\u2713";
    case "dash":
      return "-";
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
  "Essential AI (always on)": "Essential AI",
  "Smart resolution for complex issues": "Smart resolution",
  "Priority smart resolution (shared capacity)": "Priority resolution",
  "Always on (may slow when busy)": "Always on",
  Attachments: "Attachments",
  "Auto retrain agents": "Auto retrain",
  "Remove Powered by ChatRely": "Remove branding",
};

/** Hover tooltips only where the row benefits from extra context (paired with the info icon). */
export const LANDING_ROW_TOOLTIPS: Record<string, string> = {
  "Conversations / month":
    "Monthly cap. The dollar figure helps compare plans. You pay the subscription, not per chat.",
  "AI actions per agent": "Shopify automations each agent can run at once.",
  "Training content size": "Total size of files and pages used to train agents.",
  Attachments: "Visitors send files in the widget. Rolling out soon on paid plans.",
  "Auto retrain agents": "Refresh agents when knowledge changes. Coming soon on Standard and Pro.",
  "Sources suggestions": "After chats close, Standard and Pro suggest topics to add in Knowledge.",
  "Advanced analytics": "Deeper metrics on Standard and Pro. Hobby keeps core KPIs.",
  "Visitor thumbs & feedback summaries (widget)":
    "Visitors rate replies in the widget. Pro summarizes themes on the dashboard.",
  "Essential AI (always on)": "Default AI on every plan. Fast and included in your conversations.",
  "Smart resolution for complex issues":
    "Harder questions use deeper reasoning on Standard and Pro (shared monthly capacity).",
  "Priority smart resolution (shared capacity)":
    "Larger pool on Pro, rolling out next. Smart resolution is on Standard and Pro today.",
  "Always on (may slow when busy)": "Chat stays on. Busy periods may reply a bit slower.",
  "Remove Powered by ChatRely":
    "Pro hides “Powered by ChatRely” in the widget until the visitor sends a message on other plans.",
  Shopify:
    "Free links your store (OAuth). Hobby and above add live product and order tools in chat via AI actions.",
};

/** Pricing rows that show an info hint (skip self-explanatory labels like Agents). */
export const PRICING_ROW_TOOLTIP_LABELS = new Set<string>([
  "Shopify",
  "Conversations / month",
  "AI actions per agent",
  "Training content size",
  "Attachments",
  "Auto retrain agents",
  "Sources suggestions",
  "Advanced analytics",
  "Visitor thumbs & feedback summaries (widget)",
  "Essential AI (always on)",
  "Smart resolution for complex issues",
  "Priority smart resolution (shared capacity)",
  "Always on (may slow when busy)",
  "Remove Powered by ChatRely",
]);

export function pricingRowTooltip(label: string): string | undefined {
  if (!PRICING_ROW_TOOLTIP_LABELS.has(label)) return undefined;
  return LANDING_ROW_TOOLTIPS[label];
}

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
  "Channels:Shopify",
  "usage:Conversations / month",
  "usage:AI actions per agent",
  "usage:Training content size",
  "usage:Attachments",
  "usage:Auto retrain agents",
  "AI:Priority smart resolution (shared capacity)",
]);

/** Show “Soon” on landing plan cards for these rows (still hidden in the full matrix when dash). */
export const LANDING_TEASER_SOON_KEYS = new Set<string>([
  "usage:Attachments",
  "usage:Auto retrain agents",
  "AI:Priority smart resolution (shared capacity)",
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

function _excludedTeaserValue(v: string, rowKey?: string): boolean {
  if (v === "Soon" && rowKey && LANDING_TEASER_SOON_KEYS.has(rowKey)) return false;
  return v === "-" || v === "Soon";
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
    if (_excludedTeaserValue(v, ref.key)) continue;

    if (prev) {
      const pv = detailCellToShortDisplay(ref.cells[prev]);
      if (!_excludedTeaserValue(pv, ref.key) && pv === v) continue;
    }

    const tip = pricingRowTooltip(ref.matrixLabel);
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
      LANDING_TEASER_TOOLTIP_KEYS.has("usage:Conversations / month")
        ? pricingRowTooltip("Conversations / month")
        : undefined,
  };

  return _insertConversationsAfterAgentOrInherit(body, convRow);
}
