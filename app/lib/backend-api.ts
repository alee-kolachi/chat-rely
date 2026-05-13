"use client";

import { createBrowserSupabaseClient } from "@/lib/supabase";
import { rewriteLoopbackServiceUrlForPageHost } from "@/lib/resolve-loopback-service-url-for-lan";

const DEFAULT_BACKEND_BASE_URL = "http://127.0.0.1:8000";
let cachedAccessToken: string | null = null;
let tokenCacheInitialized = false;
let tokenCacheInitPromise: Promise<void> | null = null;

export class BackendApiError extends Error {
  status: number;
  code?: string;
  details?: unknown;

  constructor(message: string, status: number, code?: string, details?: unknown) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

/**
 * Base URL for `/api/v1/...` calls.
 *
 * - If `NEXT_PUBLIC_BACKEND_URL` is set: call that host directly (production / custom API).
 * - If unset in the **browser**: use same-origin `""` so Next `rewrites` proxy to FastAPI — avoids CORS
 *   when the dashboard is opened from LAN IPs or non-localhost dev hosts.
 * - On the **server** (SSR): proxy rewrites do not apply; call the internal API URL instead.
 */
export function getBackendBaseUrl(): string {
  const explicit = (process.env.NEXT_PUBLIC_BACKEND_URL ?? "").trim();

  if (typeof window === "undefined") {
    if (explicit) return explicit.replace(/\/$/, "");
    const internal =
      (process.env.API_PROXY_TARGET || process.env.BACKEND_INTERNAL_URL || DEFAULT_BACKEND_BASE_URL).trim();
    return internal.replace(/\/$/, "");
  }

  if (explicit) {
    return rewriteLoopbackServiceUrlForPageHost(explicit, window.location.host).replace(/\/$/, "");
  }

  return "";
}

async function initTokenCache(): Promise<void> {
  if (typeof window === "undefined" || tokenCacheInitialized) {
    return;
  }
  if (tokenCacheInitPromise) {
    await tokenCacheInitPromise;
    return;
  }
  tokenCacheInitPromise = (async () => {
    try {
      const supabase = createBrowserSupabaseClient();
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();
      cachedAccessToken = error ? null : session?.access_token ?? null;
      supabase.auth.onAuthStateChange((_event, nextSession) => {
        cachedAccessToken = nextSession?.access_token ?? null;
      });
    } catch {
      cachedAccessToken = null;
    } finally {
      tokenCacheInitialized = true;
    }
  })();
  await tokenCacheInitPromise;
}

export async function getAccessToken() {
  if (typeof window === "undefined") {
    return null;
  }
  await initTokenCache();
  return cachedAccessToken;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export type BackendFetchOptions = RequestInit & {
  /**
   * Extra attempts after transient browser `fetch` failures ("Failed to fetch").
   * Only applied for GET and HEAD to avoid duplicate side effects on POST/PUT/PATCH/DELETE.
   */
  networkRetries?: number;
};

export async function backendFetch<T>(path: string, init: BackendFetchOptions = {}): Promise<T> {
  const { networkRetries = 0, ...requestInit } = init;
  const method = (requestInit.method ?? "GET").toUpperCase();
  const allowNetworkRetry = method === "GET" || method === "HEAD";
  const maxAttempts = allowNetworkRetry ? 1 + Math.max(0, networkRetries) : 1;

  const token = await getAccessToken();
  const isFormDataBody = typeof FormData !== "undefined" && requestInit.body instanceof FormData;
  const base = getBackendBaseUrl();
  const url = `${base}${path.startsWith("/") ? path : `/${path}`}`;

  const hint =
    base === ""
      ? " Could not reach the API via this app (check that the FastAPI server is running and API_PROXY_TARGET in next.config matches its URL)."
      : " Check NEXT_PUBLIC_BACKEND_URL, CORS on the API, and that the backend is running.";

  let response: Response | undefined;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      response = await fetch(url, {
        ...requestInit,
        headers: {
          ...(isFormDataBody ? {} : { "Content-Type": "application/json" }),
          ...(requestInit.headers ?? {}),
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        cache: "no-store",
      });
      break;
    } catch (err) {
      const isAbort =
        (typeof DOMException !== "undefined" && err instanceof DOMException && err.name === "AbortError") ||
        (err instanceof Error && err.name === "AbortError");
      if (isAbort) {
        throw new BackendApiError(
          `Network request failed (${err instanceof Error ? err.message : "unknown"}).${hint}`,
          0,
          "network.fetch_failed"
        );
      }
      if (attempt < maxAttempts - 1 && allowNetworkRetry) {
        await sleep(180 * 2 ** attempt);
        continue;
      }
      throw new BackendApiError(
        `Network request failed (${err instanceof Error ? err.message : "unknown"}).${hint}`,
        0,
        "network.fetch_failed"
      );
    }
  }

  if (!response) {
    throw new BackendApiError(`Network request failed (no response).${hint}`, 0, "network.fetch_failed");
  }

  if (!response.ok) {
    let payload: unknown = null;
    try {
      payload = await response.json();
    } catch {
      payload = null;
    }

    const asRecord = payload as { error?: { code?: string; message?: string; details?: unknown } } | null;
    throw new BackendApiError(
      asRecord?.error?.message ?? `Backend request failed (${response.status})`,
      response.status,
      asRecord?.error?.code,
      asRecord?.error?.details
    );
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

/** NDJSON events from `POST /api/v1/runtime/chat/stream`. */
export type RuntimeChatNdjsonEvent =
  | { type: "start"; conversation_id: string }
  | { type: "token"; text: string }
  | ({
      type: "done";
      conversation_id: string;
      response: string;
      assistant_message_id?: string | null;
      fallback_used: boolean;
      retrieval_count: number;
      tools_invoked?: string[];
    } & Record<string, unknown>)
  | { type: "error"; code?: string; message: string; details?: unknown };

/**
 * Reads newline-delimited JSON from a streaming POST (same auth as `backendFetch`).
 */
export async function* backendNdjsonStream(
  path: string,
  init: RequestInit = {}
): AsyncGenerator<RuntimeChatNdjsonEvent> {
  const token = await getAccessToken();
  const isFormDataBody = typeof FormData !== "undefined" && init.body instanceof FormData;
  const base = getBackendBaseUrl();
  const url = `${base}${path.startsWith("/") ? path : `/${path}`}`;

  let response: Response;
  try {
    response = await fetch(url, {
      ...init,
      headers: {
        ...(isFormDataBody ? {} : { "Content-Type": "application/json" }),
        ...(init.headers ?? {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      cache: "no-store",
    });
  } catch (err) {
    const hint =
      base === ""
        ? " Could not reach the API via this app (check that the FastAPI server is running and API_PROXY_TARGET in next.config matches its URL)."
        : " Check NEXT_PUBLIC_BACKEND_URL, CORS on the API, and that the backend is running.";
    throw new BackendApiError(
      `Network request failed (${err instanceof Error ? err.message : "unknown"}).${hint}`,
      0,
      "network.fetch_failed"
    );
  }

  if (!response.ok) {
    let payload: unknown = null;
    try {
      payload = await response.json();
    } catch {
      payload = null;
    }
    const asRecord = payload as { error?: { code?: string; message?: string; details?: unknown } } | null;
    throw new BackendApiError(
      asRecord?.error?.message ?? `Backend request failed (${response.status})`,
      response.status,
      asRecord?.error?.code,
      asRecord?.error?.details
    );
  }

  const body = response.body;
  if (!body) {
    throw new BackendApiError("Empty response body", response.status, "stream.empty_body");
  }

  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (value) {
        buffer += decoder.decode(value, { stream: true });
      }
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        yield JSON.parse(trimmed) as RuntimeChatNdjsonEvent;
      }
      if (done) break;
    }
    const tail = buffer.trim();
    if (tail) {
      yield JSON.parse(tail) as RuntimeChatNdjsonEvent;
    }
  } finally {
    reader.releaseLock();
  }
}

/**
 * Reads Server-Sent Events (`data: {...}\\n\\n`) with Bearer auth (same as `backendFetch`).
 * Runs until the stream closes or `signal` aborts.
 */
export async function consumeBackendSseJson<T>(
  path: string,
  onData: (payload: T) => void,
  options?: { signal?: AbortSignal },
): Promise<void> {
  const token = await getAccessToken();
  const base = getBackendBaseUrl();
  const url = `${base}${path.startsWith("/") ? path : `/${path}`}`;
  let response: Response;
  try {
    response = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "text/event-stream",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      cache: "no-store",
      signal: options?.signal,
    });
  } catch (err) {
    const hint =
      base === ""
        ? " Could not reach the API via this app (check that the FastAPI server is running and API_PROXY_TARGET in next.config matches its URL)."
        : " Check NEXT_PUBLIC_BACKEND_URL, CORS on the API, and that the backend is running.";
    throw new BackendApiError(
      `Network request failed (${err instanceof Error ? err.message : "unknown"}).${hint}`,
      0,
      "network.fetch_failed",
    );
  }

  if (!response.ok) {
    let payload: unknown = null;
    try {
      payload = await response.json();
    } catch {
      payload = null;
    }
    const asRecord = payload as { error?: { code?: string; message?: string; details?: unknown } } | null;
    throw new BackendApiError(
      asRecord?.error?.message ?? `Backend request failed (${response.status})`,
      response.status,
      asRecord?.error?.code,
      asRecord?.error?.details,
    );
  }

  const body = response.body;
  if (!body) {
    throw new BackendApiError("Empty SSE body", response.status, "stream.empty_body");
  }

  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (value) {
        buf += decoder.decode(value, { stream: true });
      }
      let sep = buf.indexOf("\n\n");
      while (sep !== -1) {
        const block = buf.slice(0, sep).trim();
        buf = buf.slice(sep + 2);
        sep = buf.indexOf("\n\n");
        if (block.startsWith("data: ")) {
          try {
            onData(JSON.parse(block.slice(6)) as T);
          } catch {
            /* ignore malformed chunk */
          }
        }
      }
      if (done) break;
    }
  } finally {
    reader.releaseLock();
  }
}

