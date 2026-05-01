import { createBrowserClient } from "@supabase/ssr";
import { resolveSupabaseUrlForBrowser } from "@/lib/resolve-supabase-url";

type SupabaseBrowserClient = ReturnType<typeof createBrowserClient>;

declare global {
  // Reuse browser client across renders/navigation to avoid duplicate GoTrue instances.
  // eslint-disable-next-line no-var
  var __supportAgentSupabaseBrowserClient: SupabaseBrowserClient | undefined;
}

export function createBrowserSupabaseClient() {
  const supabaseUrl = resolveSupabaseUrlForBrowser();
  const supabaseKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Missing Supabase browser env vars. Set NEXT_PUBLIC_SUPABASE_URL and a public key.");
  }

  const globalClient = globalThis.__supportAgentSupabaseBrowserClient;
  if (globalClient) return globalClient;

  const client = createBrowserClient(supabaseUrl, supabaseKey);
  globalThis.__supportAgentSupabaseBrowserClient = client;
  return client;
}
