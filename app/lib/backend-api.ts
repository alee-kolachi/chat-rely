"use client";

import { createBrowserSupabaseClient } from "@/lib/supabase";
import { rewriteLoopbackServiceUrlForPageHost } from "@/lib/resolve-loopback-service-url-for-lan";

const DEFAULT_BACKEND_BASE_URL = "http://127.0.0.1:8000";

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

async function getAccessToken() {
  try {
    const supabase = createBrowserSupabaseClient();
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();
    if (error) return null;
    return session?.access_token ?? null;
  } catch {
    return null;
  }
}

export async function backendFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
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

