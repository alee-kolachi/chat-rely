/**
 * After sign-in, send first-time users through onboarding before the dashboard.
 * Preserves deep links that already target `/onboarding/...`.
 */
export function resolvePostAuthDestination(nextPath: string, onboardingCompleted: boolean): string {
  const safe = nextPath.startsWith("/") && !nextPath.startsWith("//") ? nextPath : "/dashboard";
  if (onboardingCompleted) {
    return safe;
  }
  if (safe.startsWith("/onboarding")) {
    return safe;
  }
  return "/onboarding/welcome";
}
