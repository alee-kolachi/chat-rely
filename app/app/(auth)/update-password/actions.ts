"use server";

import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase-server";

export type UpdatePasswordFormState = { error?: string } | undefined;

export async function updatePasswordWithSession(
  _prevState: UpdatePasswordFormState,
  formData: FormData
): Promise<UpdatePasswordFormState> {
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  if (!password || !confirm) {
    return { error: "Enter and confirm your new password." };
  }
  if (password !== confirm) {
    return { error: "Passwords do not match." };
  }
  if (password.length < 8) {
    return { error: "Use at least 8 characters." };
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    return { error: error.message };
  }

  redirect("/dashboard");
}
