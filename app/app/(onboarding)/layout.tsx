import { Suspense, type ReactNode } from "react";

/**
 * Pages under onboarding use `useSearchParams` (via hooks like `useResolvedOnboardingAgentId`).
 * Next.js requires an ancestor Suspense boundary for static generation / CSR bailout.
 */
export default function OnboardingLayout({
  children,
}: {
  children: ReactNode;
}) {
  return <Suspense fallback={null}>{children}</Suspense>;
}
