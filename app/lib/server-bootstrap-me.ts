import "server-only";

import { getInternalBackendBaseUrl } from "@/lib/internal-backend-url";

export type BootstrapMePayload = {
  onboarding_completed: boolean;
};

export type OnboardingGatePayload = {
  onboarding_completed: boolean;
  is_admin: boolean;
};

const DEFAULT_ONBOARDING_GATE: OnboardingGatePayload = {
  onboarding_completed: true,
  is_admin: false,
};

/**
 * Ensures profile + default subscription (same as dashboard bootstrap) and returns onboarding gate.
 * On transport failure, fail open so login is not blocked when the API is unreachable.
 */
/** Lightweight gate used for post-sign-in routing and onboarding bypass checks. */
export async function fetchOnboardingGateServer(accessToken: string): Promise<OnboardingGatePayload> {
  const base = getInternalBackendBaseUrl();
  try {
    const res = await fetch(`${base}/api/v1/me/onboarding-gate`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    });
    if (!res.ok) {
      return DEFAULT_ONBOARDING_GATE;
    }
    const data = (await res.json()) as Partial<OnboardingGatePayload>;
    return {
      onboarding_completed: Boolean(data.onboarding_completed),
      is_admin: Boolean(data.is_admin),
    };
  } catch {
    return DEFAULT_ONBOARDING_GATE;
  }
}

export async function postBootstrapMeServer(accessToken: string): Promise<BootstrapMePayload> {
  const base = getInternalBackendBaseUrl();
  try {
    const res = await fetch(`${base}/api/v1/bootstrap/me`, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    });
    if (!res.ok) {
      return { onboarding_completed: true };
    }
    const data = (await res.json()) as { onboarding_completed?: boolean };
    return { onboarding_completed: Boolean(data.onboarding_completed) };
  } catch {
    return { onboarding_completed: true };
  }
}
