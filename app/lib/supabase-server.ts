import { createServerClient } from "@supabase/ssr";
import { cookies, headers } from "next/headers";
import {
  CHATRELY_AUTH_SHORT_LIVED_COOKIE,
  CHATRELY_REMEMBER_ME_MAX_AGE_SEC,
  CHATRELY_SHORT_SESSION_MAX_AGE_SEC,
} from "@/lib/auth-session-preference";
import { resolveSupabaseUrlFromHost } from "@/lib/resolve-supabase-url";

export type CreateServerSupabaseOptions = {
  /**
   * During email/password login only: whether the user checked "Remember me".
   * When false, session cookies are capped to a shorter lifetime for this response.
   */
  loginRememberMe?: boolean;
};

function shouldUseShortLivedSession(
  loginRememberMe: boolean | undefined,
  shortLivedCookie: boolean,
): boolean {
  if (loginRememberMe === false) {
    return true;
  }
  if (loginRememberMe === true) {
    return false;
  }
  return shortLivedCookie;
}

export async function createServerSupabaseClient(options?: CreateServerSupabaseOptions) {
  const headerList = await headers();
  const supabaseUrl = resolveSupabaseUrlFromHost(headerList.get("host"));
  const supabaseKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Missing Supabase server env vars. Set NEXT_PUBLIC_SUPABASE_URL and a public key.");
  }

  const cookieStore = await cookies();
  const shortLivedFromCookie = cookieStore.get(CHATRELY_AUTH_SHORT_LIVED_COOKIE)?.value === "1";
  const shortLived = shouldUseShortLivedSession(options?.loginRememberMe, shortLivedFromCookie);

  return createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            const maxAge = options.maxAge;
            if (!value) {
              cookieStore.set(name, value, options);
              return;
            }
            if (typeof maxAge !== "number" || maxAge <= 0) {
              cookieStore.set(name, value, options);
              return;
            }
            let capped = maxAge;
            if (shortLived && maxAge > CHATRELY_SHORT_SESSION_MAX_AGE_SEC) {
              capped = CHATRELY_SHORT_SESSION_MAX_AGE_SEC;
            } else if (!shortLived && maxAge > CHATRELY_REMEMBER_ME_MAX_AGE_SEC) {
              capped = CHATRELY_REMEMBER_ME_MAX_AGE_SEC;
            }
            const nextOptions =
              capped === maxAge ? options : { ...options, maxAge: capped };
            cookieStore.set(name, value, nextOptions);
          });
        } catch {
          /* ignore in Server Components */
        }
      },
    },
  });
}
