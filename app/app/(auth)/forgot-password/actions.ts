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
    if (process.env.NODE_ENV === "development") {
      console.error("[auth] resetPasswordForEmail failed", {
        message: error.message,
        code: error.code,
        status: error.status,
        redirectTo,
      });
    }

    if (error.code === "over_email_send_rate_limit") {
      return {
        error:
          "Too many reset emails were sent recently. Wait a few minutes and try again, or raise the email rate limit in Supabase Authentication → Rate Limits.",
      };
    }

    if (error.message === "Error sending recovery email") {
      return {
        error:
          "Supabase could not send the reset email. Check Authentication → Logs in your Supabase project for the SMTP error. For Namecheap Private Email, try port 587 instead of 465.",
      };
    }

    return { error: error.message };
  }

  return { success: true };
}
