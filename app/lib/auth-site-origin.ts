import { headers } from "next/headers";

/**
 * Absolute site origin for Supabase email links (reset password, etc.).
 * Prefer NEXT_PUBLIC_SITE_URL in production so redirects match your canonical host.
 */
export async function getSiteOrigin(): Promise<string> {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, "");
  if (configured) {
    return configured;
  }

  const headerList = await headers();
  const host = headerList.get("x-forwarded-host") ?? headerList.get("host");
  const proto = headerList.get("x-forwarded-proto") ?? "http";
  if (!host) {
    throw new Error(
      "Cannot resolve site URL for auth redirects. Set NEXT_PUBLIC_SITE_URL in .env.",
    );
  }
  return `${proto}://${host}`;
}
