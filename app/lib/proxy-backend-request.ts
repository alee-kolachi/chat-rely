import { NextResponse, type NextRequest } from "next/server";
import { getInternalBackendBaseUrl } from "@/lib/internal-backend-url";

const DEFAULT_PROXY_TIMEOUT_MS = 120_000;

/**
 * Proxy an authenticated dashboard request to FastAPI (server-side).
 * Used for long-running calls where browser → backend direct fetch or Next rewrites may fail.
 */
export async function proxyBackendRequest(
  request: NextRequest,
  backendPath: string,
  options?: { timeoutMs?: number }
): Promise<NextResponse> {
  const timeoutMs = options?.timeoutMs ?? DEFAULT_PROXY_TIMEOUT_MS;
  const auth = request.headers.get("authorization");
  if (!auth?.trim()) {
    return NextResponse.json(
      { error: { code: "auth.required", message: "Sign in required." } },
      { status: 401 }
    );
  }

  const backend = getInternalBackendBaseUrl();
  const url = `${backend}${backendPath.startsWith("/") ? backendPath : `/${backendPath}`}`;

  const headers: Record<string, string> = { Authorization: auth };
  let body: string | undefined;
  if (request.method === "POST" || request.method === "PUT" || request.method === "PATCH") {
    headers["Content-Type"] = request.headers.get("content-type") || "application/json";
    body = await request.text();
  }

  try {
    const upstream = await fetch(url, {
      method: request.method,
      headers,
      body,
      cache: "no-store",
      signal: AbortSignal.timeout(timeoutMs),
    });
    const text = await upstream.text();
    const contentType = upstream.headers.get("content-type") || "application/json";
    return new NextResponse(text, { status: upstream.status, headers: { "Content-Type": contentType } });
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown";
    return NextResponse.json(
      {
        error: {
          code: "network.proxy_failed",
          message: `Could not reach the API server (${message}). Check that the backend is running and API_PROXY_TARGET matches its URL.`,
        },
      },
      { status: 502 }
    );
  }
}
