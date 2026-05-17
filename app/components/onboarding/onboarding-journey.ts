/**
 * Onboarding journey map — single source for step order, routes, and UX goals.
 * Sidebar shows 5 primary steps; pricing sits after appearance & tone.
 */
export const onboardingSteps = [
  {
    id: "agent-name",
    menuLabel: "Agent Name" as const,
    route: "/onboarding",
    stepLabel: "Step 1 of 5",
    goal: "Establish agent identity and primary site context.",
  },
  {
    id: "knowledge-base",
    menuLabel: "Knowledge Base" as const,
    route: "/onboarding/knowledge-base",
    stepLabel: "Step 2 of 5",
    goal: "Connect knowledge sources (site, files, sheets).",
  },
  {
    id: "connection",
    menuLabel: "Connection" as const,
    route: "/onboarding/connection",
    stepLabel: "Step 3 of 5",
    goal: "Link Shopify or other integrations for live data.",
  },
  {
    id: "agent-preview",
    menuLabel: "Agent Preview" as const,
    route: "/onboarding/agent-preview",
    stepLabel: "Step 4 of 5",
    goal: "Validate answers against connected data before launch.",
  },
  {
    id: "appearance-tone",
    menuLabel: "Appearance & Tone" as const,
    route: "/onboarding/appearance-tone",
    stepLabel: "Step 5 of 5",
    goal: "Configure model, tone, and brand color.",
  },
] as const;

/** After appearance & tone — plan selection before install. */
export const pricingRoute = "/onboarding/pricing";
