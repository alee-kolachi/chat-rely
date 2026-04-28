/**
 * Onboarding journey map — single source for step order, routes, and UX goals.
 * Sidebar shows 6 primary steps; intermediate routes (training, pricing) sit between steps.
 */
export const onboardingSteps = [
  {
    id: "agent-name",
    menuLabel: "Agent Name" as const,
    route: "/onboarding",
    stepLabel: "Step 1 of 6",
    goal: "Establish agent identity and primary site context.",
  },
  {
    id: "knowledge-base",
    menuLabel: "Knowledge Base" as const,
    route: "/onboarding/knowledge-base",
    stepLabel: "Step 2 of 6",
    goal: "Connect knowledge sources (site, files, sheets).",
  },
  {
    id: "connection",
    menuLabel: "Connection" as const,
    route: "/onboarding/connection",
    stepLabel: "Step 3 of 6",
    goal: "Link Shopify or other integrations for live data.",
  },
  {
    id: "appearance-tone",
    menuLabel: "Appearance & Tone" as const,
    route: "/onboarding/appearance-tone",
    stepLabel: "Step 4 of 6",
    goal: "Configure model, tone, brand color, and widget placement.",
  },
  {
    id: "agent-preview",
    menuLabel: "Agent Preview" as const,
    route: "/onboarding/agent-preview",
    stepLabel: "Step 5 of 6",
    goal: "Validate answers against connected data before launch.",
  },
  {
    id: "installation",
    menuLabel: "Installation" as const,
    route: "/onboarding/installation",
    stepLabel: "Step 6 of 6",
    goal: "Install snippet and finish setup.",
  },
] as const;

/** Optional entry — framing before step 1 (not a sidebar step). */
export const welcomeRoute = "/onboarding/welcome";

/** Between step 2 and 3 — async indexing; user can continue without blocking. */
export const trainingRoute = "/onboarding/knowledge-base/training";

/** After preview — plan selection before install. */
export const pricingRoute = "/onboarding/pricing";

/** Post-install success checkpoint (optional screen). */
export const completeRoute = "/onboarding/complete";
