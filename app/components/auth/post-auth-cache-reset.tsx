"use client";

import type { AuthChangeEvent, Session, UserResponse } from "@supabase/supabase-js";
import { useEffect, useRef } from "react";

import {
  CHATRELY_LAST_AUTH_USER_ID_KEY,
  clearChatrelyClientAccountCaches,
} from "@/lib/clear-client-account-caches";
import { clearStaleBrowserAuthSession } from "@/lib/auth-stale-session";
import { createBrowserSupabaseClient } from "@/lib/supabase";

/**
 * Clears persisted agent/playground ids when the signed-in Supabase user changes
 * (e.g. after deleting an account and signing up again with the same Google email).
 */
export function PostAuthCacheReset() {
  const lastUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    const supabase = createBrowserSupabaseClient();

    const onUserId = (id: string | null) => {
      if (!id || id === lastUserIdRef.current) return;
      lastUserIdRef.current = id;
      if (typeof window === "undefined") return;
      const stored = window.sessionStorage.getItem(CHATRELY_LAST_AUTH_USER_ID_KEY);
      if (stored && stored !== id) {
        clearChatrelyClientAccountCaches();
      }
      window.sessionStorage.setItem(CHATRELY_LAST_AUTH_USER_ID_KEY, id);
    };

    void supabase.auth.getUser().then(async (res: UserResponse) => {
      if (res.error) {
        await clearStaleBrowserAuthSession(supabase, res.error);
        onUserId(null);
        return;
      }
      onUserId(res.data.user?.id ?? null);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event: AuthChangeEvent, session: Session | null) => {
      onUserId(session?.user?.id ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  return null;
}
