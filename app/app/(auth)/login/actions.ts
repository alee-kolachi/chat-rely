"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  CHATRELY_AUTH_SHORT_LIVED_COOKIE,
  CHATRELY_REMEMBER_ME_MAX_AGE_SEC,
} from "@/lib/auth-session-preference";
import { postBootstrapMeServer, fetchOnboardingGateServer } from "@/lib/server-bootstrap-me";
import { resolvePostAuthDestination } from "@/lib/post-auth-destination";
import { createServerSupabaseClient, getValidatedServerAuth } from "@/lib/supabase-server";

export type LoginFormState = { error?: string } | undefined;

export async function loginWithEmailPassword(
  _prevState: LoginFormState,
  formData: FormData
): Promise<LoginFormState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const rawNext = String(formData.get("next") ?? "");
  const remember = formData.get("remember") === "on";

  if (!email || !password) {
    return { error: "Enter your email and password." };
  }

  const supabase = await createServerSupabaseClient({ loginRememberMe: remember });
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: error.message };
  }

  const auth = await getValidatedServerAuth({ loginRememberMe: remember });
  if (!auth) {
    return {
      error: "Login succeeded but the session could not be saved. Check Supabase URL and keys.",
    };
  }
  const { session } = auth;

  const cookieStore = await cookies();
  if (remember) {
    cookieStore.delete(CHATRELY_AUTH_SHORT_LIVED_COOKIE);
  } else {
    cookieStore.set(CHATRELY_AUTH_SHORT_LIVED_COOKIE, "1", {
      path: "/",
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: CHATRELY_REMEMBER_ME_MAX_AGE_SEC,
    });
  }

  const nextDefault = rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/dashboard";
  await postBootstrapMeServer(session.access_token);
  const gate = await fetchOnboardingGateServer(session.access_token);
  const destination = resolvePostAuthDestination(nextDefault, gate);

  redirect(destination);
}
