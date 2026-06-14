import type { MeContextPayload } from "@/components/layout/me-context-provider";

const TIER_ORDER = ["free", "hobby", "standard", "pro", "scale"] as const;

export type PlanEntitlementRow = {
  label: string;
  value: string;
  included: boolean;
  upgradeNote?: string;
  /** Minimum paid tier for upsell badge (Pro shows crown). */
  minimumTier?: "hobby" | "standard" | "pro";
};

export type PlanEntitlementSection = {
  title: string;
  rows: PlanEntitlementRow[];
};

function tierIndex(slug: string): number {
  const i = TIER_ORDER.indexOf(slug as (typeof TIER_ORDER)[number]);
  return i >= 0 ? i : 0;
}

export function planTierAtLeast(
  planSlug: string | null | undefined,
  minimum: (typeof TIER_ORDER)[number]
): boolean {
  const slug = (planSlug ?? "").trim().toLowerCase() || "free";
  return tierIndex(slug) >= tierIndex(minimum);
}

function tierAtLeast(slug: string, minimum: (typeof TIER_ORDER)[number]): boolean {
  return planTierAtLeast(slug, minimum);
}

function tierLabel(minimum: (typeof TIER_ORDER)[number]): string {
  const name = minimum.charAt(0).toUpperCase() + minimum.slice(1);
  return minimum === "free" ? name : `${name} and up`;
}

export function formatStorageBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb < 10 ? kb.toFixed(1) : Math.round(kb)} KB`;
  const mb = kb / 1024;
  if (mb < 1024) return `${mb < 10 ? mb.toFixed(1) : Math.round(mb)} MB`;
  const gb = mb / 1024;
  return `${gb < 10 ? gb.toFixed(1) : Math.round(gb)} GB`;
}

function featureBool(features: Record<string, unknown>, key: string): boolean {
  const v = features[key];
  return v === true || v === "true";
}

function featureInt(features: Record<string, unknown>, key: string): number {
  const v = features[key];
  if (typeof v === "number" && Number.isFinite(v)) return Math.max(0, Math.trunc(v));
  return 0;
}

function resolveStorageBytes(plan: MeContextPayload["plan"]): { storage: number; crawl: number } {
  const fromLimits = plan.limits;
  if (fromLimits && fromLimits.max_total_knowledge_bytes > 0) {
    return {
      storage: fromLimits.max_total_knowledge_bytes,
      crawl: fromLimits.max_website_crawl_bytes || fromLimits.max_total_knowledge_bytes,
    };
  }
  const features = plan.features ?? {};
  const caps: number[] = [];
  const totalMb = features.max_total_knowledge_mb;
  if (typeof totalMb === "number" && totalMb > 0) caps.push(totalMb * 1024 * 1024);
  const kb = features.max_knowledge_storage_kb;
  if (typeof kb === "number" && kb > 0) caps.push(kb * 1024);
  const fileMb = features.max_file_storage_mb;
  if (typeof fileMb === "number" && fileMb > 0) caps.push(fileMb * 1024 * 1024);
  const storage = caps.length > 0 ? Math.min(...caps) : 0;
  const crawlKb = features.max_website_crawl_kb;
  const crawlRaw = typeof crawlKb === "number" && crawlKb > 0 ? crawlKb * 1024 : storage;
  const crawl = storage > 0 ? Math.min(crawlRaw, storage) : crawlRaw;
  return { storage, crawl };
}

export function buildPlanEntitlementSections(
  plan: MeContextPayload["plan"],
  usageSnapshot: MeContextPayload["usage_snapshot"]
): PlanEntitlementSection[] {
  const slug = (plan.slug || "free").toLowerCase();
  const features = plan.features ?? {};
  const { storage: storageBytes, crawl: crawlBytes } = resolveStorageBytes(plan);
  const maxActions =
    plan.limits?.max_enabled_actions_per_agent ?? featureInt(features, "max_enabled_actions_per_agent");
  const knowledgeRows: PlanEntitlementRow[] = [
    {
      label: "Training content",
      value: storageBytes > 0 ? formatStorageBytes(storageBytes) : "-",
      included: storageBytes > 0,
    },
  ];
  if (crawlBytes > 0 && crawlBytes !== storageBytes) {
    knowledgeRows.push({
      label: "Website crawl budget",
      value: formatStorageBytes(crawlBytes),
      included: true,
    });
  }

  const automationRows: PlanEntitlementRow[] = [
    {
      label: "AI actions per agent",
      value: maxActions > 0 ? String(maxActions) : "Not included",
      included: maxActions > 0,
      upgradeNote: maxActions > 0 ? undefined : tierLabel("hobby"),
      minimumTier: "hobby",
    },
    {
      label: "Human handoff",
      value: !featureBool(features, "human_escalation_enabled")
        ? "Not included"
        : "Escalate to your team",
      included: featureBool(features, "human_escalation_enabled"),
      upgradeNote: !featureBool(features, "human_escalation_enabled") ? tierLabel("hobby") : undefined,
      minimumTier: !featureBool(features, "human_escalation_enabled") ? "hobby" : undefined,
    },
    {
      label: "Shopify integration",
      value: !featureBool(features, "shopify_enabled")
        ? "Not included"
        : "Connect + live actions",
      included: featureBool(features, "shopify_enabled"),
      upgradeNote: !featureBool(features, "shopify_enabled") ? tierLabel("hobby") : undefined,
      minimumTier: !featureBool(features, "shopify_enabled") ? "hobby" : undefined,
    },
    {
      label: "Auto-retrain agents",
      value: tierAtLeast(slug, "standard") ? "Coming soon" : "Not included",
      included: false,
      upgradeNote: tierAtLeast(slug, "standard") ? undefined : tierLabel("standard"),
      minimumTier: "standard",
    },
    {
      label: "Visitor attachments (widget)",
      value: tierAtLeast(slug, "hobby") ? "Coming soon" : "Not included",
      included: false,
      upgradeNote: tierAtLeast(slug, "hobby") ? undefined : tierLabel("hobby"),
      minimumTier: "hobby",
    },
    {
      label: "Source suggestions",
      value: tierAtLeast(slug, "standard") ? "Included" : "Not included",
      included: tierAtLeast(slug, "standard"),
      upgradeNote: tierAtLeast(slug, "standard") ? undefined : tierLabel("standard"),
      minimumTier: "standard",
    },
  ];

  const analyticsTier = !slug || slug === "free" ? "none" : slug === "hobby" ? "basic" : tierAtLeast(slug, "standard") ? "full" : "none";
  const insightsRows: PlanEntitlementRow[] = [
    {
      label: "Basic analytics",
      value: analyticsTier === "none" ? "Not included" : analyticsTier === "basic" ? "Included" : "Included",
      included: analyticsTier !== "none",
      upgradeNote: analyticsTier === "none" ? tierLabel("hobby") : undefined,
      minimumTier: analyticsTier === "none" ? "hobby" : undefined,
    },
    {
      label: "Advanced analytics",
      value: analyticsTier === "full" ? "Included" : "Not included",
      included: analyticsTier === "full",
      upgradeNote: analyticsTier === "full" ? undefined : tierLabel("standard"),
      minimumTier: analyticsTier === "full" ? undefined : "standard",
    },
    {
      label: "Visitor feedback (widget)",
      value: tierAtLeast(slug, "pro") ? "Included" : "Not included",
      included: tierAtLeast(slug, "pro"),
      upgradeNote: tierAtLeast(slug, "pro") ? undefined : tierLabel("pro"),
      minimumTier: "pro",
    },
  ];

  const includedConversations =
    usageSnapshot?.included_conversations ?? plan.included_conversations ?? 0;
  const usedConversations = usageSnapshot?.conversations_used ?? 0;

  const intelligenceRows: PlanEntitlementRow[] = [
    {
      label: "Premium models",
      value:
        slug === "free"
          ? "Not on Free"
          : usedConversations < includedConversations
            ? "Within allowance"
            : "Allowance used",
      included: slug !== "free",
      upgradeNote: slug === "free" ? tierLabel("hobby") : undefined,
      minimumTier: slug === "free" ? "hobby" : undefined,
    },
    {
      label: "Normal models",
      value: slug === "free" ? "Always" : "After allowance",
      included: true,
    },
    {
      label: "Chat stays on",
      value: "Included",
      included: true,
    },
  ];

  const brandRows: PlanEntitlementRow[] = [
    {
      label: "Widget styling (fonts, colors)",
      value: tierAtLeast(slug, "pro") ? "Included" : "Not included",
      included: tierAtLeast(slug, "pro"),
      upgradeNote: tierAtLeast(slug, "pro") ? undefined : tierLabel("pro"),
      minimumTier: "pro",
    },
    {
      label: "Remove “Powered by ChatRely”",
      value: tierAtLeast(slug, "pro") ? "Included" : "Not included",
      included: tierAtLeast(slug, "pro"),
      upgradeNote: tierAtLeast(slug, "pro") ? undefined : tierLabel("pro"),
      minimumTier: "pro",
    },
  ];

  return [
    { title: "Knowledge", rows: knowledgeRows },
    { title: "Store & automation", rows: automationRows },
    { title: "Insights", rows: insightsRows },
    { title: "Models", rows: intelligenceRows },
    { title: "Brand", rows: brandRows },
  ].filter((section) => section.rows.length > 0);
}
