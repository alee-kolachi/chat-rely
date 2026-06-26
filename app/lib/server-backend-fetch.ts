import "server-only";

import { cache } from "react";
import { getInternalBackendBaseUrl } from "@/lib/internal-backend-url";
import type { DemoPublicConfigResponse } from "@/lib/demo-store-meta";

export class ServerBackendApiError extends Error {
  status: number;
  code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

type ServerBackendFetchOptions = RequestInit & {
  /** Next.js fetch revalidation in seconds (GET only). */
  revalidate?: number;
};

export async function serverBackendFetch<T>(
  path: string,
  init: ServerBackendFetchOptions = {},
): Promise<T> {
  const { revalidate, ...requestInit } = init;
  const base = getInternalBackendBaseUrl();
  const url = `${base}${path.startsWith("/") ? path : `/${path}`}`;
  const method = (requestInit.method ?? "GET").toUpperCase();

  const response = await fetch(url, {
    ...requestInit,
    headers: {
      "Content-Type": "application/json",
      ...(requestInit.headers ?? {}),
    },
    ...(method === "GET" && revalidate != null
      ? { next: { revalidate } }
      : { cache: "no-store" }),
  });

  if (!response.ok) {
    let payload: unknown = null;
    try {
      payload = await response.json();
    } catch {
      payload = null;
    }
    const asRecord = payload as { error?: { code?: string; message?: string } } | null;
    throw new ServerBackendApiError(
      asRecord?.error?.message ?? `Backend request failed (${response.status})`,
      response.status,
      asRecord?.error?.code,
    );
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

/** Cached demo config fetch shared by page render and metadata. */
export const fetchDemoPublicConfig = cache(async (slug: string): Promise<DemoPublicConfigResponse> => {
  return serverBackendFetch<DemoPublicConfigResponse>(
    `/api/v1/demo/${encodeURIComponent(slug)}`,
    { revalidate: 60 },
  );
});
