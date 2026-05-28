import { redirect } from "next/navigation";
import { resolvePostAuthDestination } from "@/lib/post-auth-destination";
import { postBootstrapMeServer } from "@/lib/server-bootstrap-me";
import { getValidatedServerAuth } from "@/lib/supabase-server";

function safeNextPath(raw: string | undefined): string {
  if (raw && raw.startsWith("/") && !raw.startsWith("//")) return raw;
  return "/dashboard";
}

/** Redirect signed-in users away from login/signup (preserves `next` when provided). */
export async function redirectAuthenticatedUser(nextPath?: string): Promise<void> {
  const auth = await getValidatedServerAuth();
  if (!auth) return;

  const destination = resolvePostAuthDestination(
    safeNextPath(nextPath),
    (await postBootstrapMeServer(auth.session.access_token)).onboarding_completed
  );
  redirect(destination);
}
