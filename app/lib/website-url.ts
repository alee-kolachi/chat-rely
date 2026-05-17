export type WebsiteScheme = "https://" | "http://";

export function stripUrlScheme(input: string): string {
  let t = input.trim();
  const lower = t.toLowerCase();
  if (lower.startsWith("https://")) return t.slice(8);
  if (lower.startsWith("http://")) return t.slice(7);
  return t;
}

export function validateWebsiteHostInput(hostPart: string): string | null {
  const host = stripUrlScheme(hostPart).split("/")[0]?.trim() ?? "";
  if (!host) return "Enter your website address.";
  if (host.includes(" ")) return "Remove spaces from the website address.";
  return null;
}

export function buildWebsiteUrl(
  scheme: WebsiteScheme,
  hostPart: string
): { ok: true; website_url: string; title: string; hostname: string } | { ok: false; error: string } {
  const validationError = validateWebsiteHostInput(hostPart);
  if (validationError) return { ok: false, error: validationError };

  const pathSuffix = stripUrlScheme(hostPart).includes("/")
    ? `/${stripUrlScheme(hostPart).split("/").slice(1).join("/")}`.replace(/\/+/g, "/")
    : "";
  const hostOnly = stripUrlScheme(hostPart).split("/")[0] ?? "";

  try {
    const website_url = new URL(`${scheme}${hostOnly}${pathSuffix}`).toString().replace(/\/$/, "") || `${scheme}${hostOnly}`;
    const parsed = new URL(website_url);
    const hostname = parsed.hostname;
    if (!hostname) return { ok: false, error: "Enter a valid website address like example.com." };
    if (hostname !== "localhost" && !hostname.includes(".")) {
      return { ok: false, error: "Enter a full domain like example.com." };
    }
    const title = hostname.slice(0, 255);
    return { ok: true, website_url, title, hostname };
  } catch {
    return { ok: false, error: "Enter a valid website address like example.com." };
  }
}

export function displayPathFromUrl(url: string): string {
  try {
    const path = new URL(url).pathname;
    return path || "/";
  } catch {
    return url;
  }
}

export function faviconServiceUrl(siteUrl: string | null | undefined): string {
  if (!siteUrl) return "";
  try {
    const host = new URL(siteUrl).hostname;
    return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(host)}&sz=128`;
  } catch {
    return "";
  }
}

export function hostnameAccentColor(hostname: string): string {
  let hash = 0;
  for (let i = 0; i < hostname.length; i += 1) {
    hash = (hash * 31 + hostname.charCodeAt(i)) | 0;
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue} 42% 93%)`;
}
