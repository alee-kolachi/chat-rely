export type PostAuthGate = {
  onboarding_completed: boolean;
  is_admin: boolean;
};

/**
 * After sign-in, send first-time users through onboarding before the dashboard.
 * Admin allowlist emails skip onboarding and go straight to `/admin`.
 */
export function resolvePostAuthDestination(
  nextPath: string,
  { onboarding_completed: onboardingCompleted, is_admin: isAdmin }: PostAuthGate
): string {
  const safe = nextPath.startsWith("/") && !nextPath.startsWith("//") ? nextPath : "/dashboard";
  if (onboardingCompleted) {
    return safe;
  }
  if (isAdmin) {
    return safe.startsWith("/admin") ? safe : "/admin";
  }
  if (safe.startsWith("/onboarding")) {
    return safe;
  }
  return "/onboarding";
}
