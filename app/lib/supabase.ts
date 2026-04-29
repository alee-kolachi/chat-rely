import { createBrowserClient } from "@supabase/ssr";
import { resolveSupabaseUrlForBrowser } from "@/lib/resolve-supabase-url";

export function createBrowserSupabaseClient() {
  const supabaseUrl = resolveSupabaseUrlForBrowser();
  const supabaseKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Missing Supabase browser env vars. Set NEXT_PUBLIC_SUPABASE_URL and a public key.");
  }

  return createBrowserClient(supabaseUrl, supabaseKey, {
    // URL can differ by host (localhost vs LAN IP); avoid reusing a client built for another origin.
    isSingleton: false,
  });
}
