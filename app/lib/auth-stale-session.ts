import type { SupabaseClient } from "@supabase/supabase-js";

import { CHATRELY_AUTH_SHORT_LIVED_COOKIE } from "@/lib/auth-session-preference";

/** Supabase returns this when cookies still hold a refresh token the auth server no longer knows. */
export function isStaleRefreshTokenAuthError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;

  const message =
    "message" in error && typeof error.message === "string" ? error.message : "";
  if (
    message.includes("Refresh Token Not Found") ||
    message.includes("Invalid Refresh Token")
  ) {
    return true;
  }

  const code = "code" in error && typeof error.code === "string" ? error.code : "";
  return code === "refresh_token_not_found";
}

function clearChatrelyAuthPreferenceCookie(): void {
  if (typeof document === "undefined") return;
  document.cookie = `${CHATRELY_AUTH_SHORT_LIVED_COOKIE}=; Path=/; Max-Age=0`;
}

/** Drop invalid browser auth cookies so Supabase stops retrying refresh on every page load. */
export async function clearStaleBrowserAuthSession(
  supabase: SupabaseClient,
  error?: unknown,
): Promise<void> {
  if (error !== undefined && !isStaleRefreshTokenAuthError(error)) return;

  try {
    await supabase.auth.signOut({ scope: "local" });
  } catch {
    /* ignore */
  }
  clearChatrelyAuthPreferenceCookie();
}
