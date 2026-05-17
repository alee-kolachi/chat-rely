"use client";

const AGENT_ID_KEY = "chatrely.onboarding.agentId";
const AGENT_NAME_KEY = "chatrely.onboarding.agentName";

export function saveOnboardingAgentId(agentId: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem(AGENT_ID_KEY, agentId);
}

export function getOnboardingAgentId() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(AGENT_ID_KEY);
}

export function saveOnboardingAgentName(name: string) {
  if (typeof window === "undefined") return;
  const trimmed = name.trim();
  if (!trimmed) return;
  localStorage.setItem(AGENT_NAME_KEY, trimmed);
}

export function getOnboardingAgentName() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(AGENT_NAME_KEY);
}

/** Append `agentId` when resuming onboarding so back links and sidebar stay in sync. */
export function onboardingHref(route: string, agentId: string | null | undefined): string {
  if (!agentId) return route;
  const sep = route.includes("?") ? "&" : "?";
  return `${route}${sep}agentId=${encodeURIComponent(agentId)}`;
}
