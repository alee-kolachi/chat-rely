"use server";

import { createServerSupabaseClient } from "@/lib/supabase-server";
import { getSiteOrigin } from "@/lib/auth-site-origin";

export type ForgotPasswordFormState = { error?: string; success?: boolean } | undefined;

export async function requestPasswordReset(
  _prevState: ForgotPasswordFormState,
  formData: FormData
): Promise<ForgotPasswordFormState> {
  const email = String(formData.get("email") ?? "").trim();
  if (!email) {
    return { error: "Enter your email address." };
  }

  let origin: string;
  try {
    origin = await getSiteOrigin();
  } catch (e) {
    return {
      error: e instanceof Error ? e.message : "Site URL is not configured for password reset.",
    };
  }

  const supabase = await createServerSupabaseClient();
  const nextPath = "/update-password";
  const redirectTo = `${origin}/auth/callback?next=${encodeURIComponent(nextPath)}`;

  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });

  if (error) {
    return { error: error.message };
  }

  return { success: true };
}
