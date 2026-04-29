/**
 * When a service URL points at localhost/127.0.0.1 but the app is opened from a LAN host
 * (e.g. phone at http://192.168.1.10:3000), rewrite the hostname to the page host so the
 * device reaches the dev PC. Same idea as NEXT_PUBLIC_SUPABASE_URL on LAN.
 */

function isLanHostname(hostname: string): boolean {
  if (/^192\.168\.\d{1,3}\.\d{1,3}$/.test(hostname)) return true;
  if (/^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(hostname)) return true;
  if (/^172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}$/.test(hostname)) return true;
  return false;
}

function isLoopbackHostname(hostname: string): boolean {
  const h = hostname.toLowerCase();
  return h === "localhost" || h === "127.0.0.1";
}

function pageHostnameFromHeader(hostHeader: string | null | undefined): string {
  return hostHeader?.split(":")[0]?.trim().toLowerCase() ?? "";
}

/**
 * If `serviceBaseUrl` targets loopback and the page was loaded from a private LAN host,
 * return the same URL with that hostname (port and protocol preserved). Otherwise return
 * `serviceBaseUrl` unchanged.
 */
export function rewriteLoopbackServiceUrlForPageHost(
  serviceBaseUrl: string,
  pageHostHeader: string | null | undefined
): string {
  if (!serviceBaseUrl) return serviceBaseUrl;
  let url: URL;
  try {
    url = new URL(serviceBaseUrl);
  } catch {
    return serviceBaseUrl;
  }

  if (!isLoopbackHostname(url.hostname)) {
    return serviceBaseUrl;
  }

  const pageHost = pageHostnameFromHeader(pageHostHeader);
  if (!pageHost || isLoopbackHostname(pageHost)) {
    return serviceBaseUrl;
  }
  if (!isLanHostname(pageHost)) {
    return serviceBaseUrl;
  }

  url.hostname = pageHost;
  return url.origin;
}
