import { redirect } from "next/navigation";
import { Suspense, type ReactNode } from "react";
import { fetchOnboardingGateServer } from "@/lib/server-bootstrap-me";
import { getValidatedServerAuth } from "@/lib/supabase-server";

/**
 * Pages under onboarding use `useSearchParams` (via hooks like `useResolvedOnboardingAgentId`).
 * Next.js requires an ancestor Suspense boundary for static generation / CSR bailout.
 */
export default async function OnboardingLayout({ children }: { children: ReactNode }) {
  const auth = await getValidatedServerAuth();
  if (auth) {
    const gate = await fetchOnboardingGateServer(auth.session.access_token);
    if (gate.is_admin) {
      redirect("/admin");
    }
  }

  return <Suspense fallback={null}>{children}</Suspense>;
}
