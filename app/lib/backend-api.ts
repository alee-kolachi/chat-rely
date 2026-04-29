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

export function getBackendBaseUrl() {
  const fromEnv = process.env.NEXT_PUBLIC_BACKEND_URL ?? DEFAULT_BACKEND_BASE_URL;
  if (typeof window === "undefined") {
    return fromEnv;
  }
  return rewriteLoopbackServiceUrlForPageHost(fromEnv, window.location.host);
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
  const response = await fetch(`${getBackendBaseUrl()}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    cache: "no-store",
  });

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

