"use client";

import type { AuthChangeEvent, Session } from "@supabase/supabase-js";
import { useEffect, useState } from "react";

import { clearStaleBrowserAuthSession } from "@/lib/auth-stale-session";
import { createBrowserSupabaseClient } from "@/lib/supabase";

/**
 * Resolves whether the browser has a Supabase session (for marketing CTAs).
 * `ready` becomes true after the first `getSession` completes.
 */
export function useSessionPresent(): { ready: boolean; hasSession: boolean } {
  const [ready, setReady] = useState(false);
  const [hasSession, setHasSession] = useState(false);

  useEffect(() => {
    const supabase = createBrowserSupabaseClient();
    let cancelled = false;

    const refresh = async () => {
      const { data, error } = await supabase.auth.getSession();
      if (cancelled) return;
      if (error) {
        await clearStaleBrowserAuthSession(supabase, error);
        setHasSession(false);
        setReady(true);
        return;
      }
      setHasSession(!!data.session);
      setReady(true);
    };

    void refresh();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event: AuthChangeEvent, session: Session | null) => {
      if (cancelled) return;
      setHasSession(!!session);
      setReady(true);
    });

    const onPageShow = (event: PageTransitionEvent) => {
      if (event.persisted) void refresh();
    };

    const onVisibility = () => {
      if (document.visibilityState === "visible") void refresh();
    };

    window.addEventListener("pageshow", onPageShow);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelled = true;
      subscription.unsubscribe();
      window.removeEventListener("pageshow", onPageShow);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return { ready, hasSession };
}
