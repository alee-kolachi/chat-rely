/**
 * When NEXT_PUBLIC_SUPABASE_URL points at localhost/127.0.0.1 (typical `supabase start`),
 * phones on the LAN must call Supabase on the PC's LAN IP — 127.0.0.1 on the phone is the phone itself.
 * Middleware and server code must use the same API URL as the browser for that request so JWT issuer
 * checks and session refresh stay consistent.
 */

import { rewriteLoopbackServiceUrlForPageHost } from "@/lib/resolve-loopback-service-url-for-lan";

function supabaseUrlEnv(): string {
  return process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
}

function envSupabaseHostname(): string | null {
  try {
    return new URL(supabaseUrlEnv()).hostname.toLowerCase();
  } catch {
    return null;
  }
}

function isLoopbackEnv(): boolean {
  const h = envSupabaseHostname();
  return h === "localhost" || h === "127.0.0.1";
}

/**
 * @param hostHeader Value of the `Host` header (e.g. `192.168.1.10:3000`) or `window.location.host`.
 */
export function resolveSupabaseUrlFromHost(hostHeader: string | null | undefined): string {
  const fallback = supabaseUrlEnv();
  if (!fallback) return "";

  if (!isLoopbackEnv()) {
    return fallback;
  }

  return rewriteLoopbackServiceUrlForPageHost(fallback, hostHeader);
}

export function resolveSupabaseUrlForBrowser(): string {
  if (typeof window === "undefined") {
    return supabaseUrlEnv();
  }
  return resolveSupabaseUrlFromHost(window.location.host);
}
