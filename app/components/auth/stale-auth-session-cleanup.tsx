"use client";

import { useEffect } from "react";

import { clearStaleBrowserAuthSession } from "@/lib/auth-stale-session";
import { createBrowserSupabaseClient } from "@/lib/supabase";

/**
 * Clears Supabase cookies when the browser holds a refresh token the auth server no longer
 * recognizes (common after project switches, account deletion, or long-idle sessions).
 */
export function StaleAuthSessionCleanup() {
  useEffect(() => {
    const supabase = createBrowserSupabaseClient();

    void (async () => {
      const { error } = await supabase.auth.getSession();
      if (error) {
        await clearStaleBrowserAuthSession(supabase, error);
      }
    })();
  }, []);

  return null;
}
