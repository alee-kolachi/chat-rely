/**
 * Origin of the dashboard the user is viewing (for Stripe return URLs).
 */
export function getAppSiteOrigin(): string {
  if (typeof window !== "undefined") {
    return window.location.origin;
  }
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, "");
  return configured || "http://localhost:3000";
}
