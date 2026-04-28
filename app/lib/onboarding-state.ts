"use client";

const AGENT_ID_KEY = "chatrely.onboarding.agentId";

export function saveOnboardingAgentId(agentId: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem(AGENT_ID_KEY, agentId);
}

export function getOnboardingAgentId() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(AGENT_ID_KEY);
}

