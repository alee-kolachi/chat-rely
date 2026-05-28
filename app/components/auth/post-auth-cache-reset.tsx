"use client";

import { useEffect, useRef } from "react";

import { clearChatrelyClientAccountCaches } from "@/lib/clear-client-account-caches";
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
      clearChatrelyClientAccountCaches();
    };

    void supabase.auth.getUser().then(({ data }) => {
      onUserId(data.user?.id ?? null);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      onUserId(session?.user?.id ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  return null;
}
