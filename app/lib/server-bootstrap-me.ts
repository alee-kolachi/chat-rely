import "server-only";

import { getInternalBackendBaseUrl } from "@/lib/internal-backend-url";

export type BootstrapMePayload = {
  onboarding_completed: boolean;
};

/**
 * Ensures profile + default subscription (same as dashboard bootstrap) and returns onboarding gate.
 * On transport failure, fail open so login is not blocked when the API is unreachable.
 */
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
