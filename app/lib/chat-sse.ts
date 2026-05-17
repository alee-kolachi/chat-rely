import { BackendApiError, getAccessToken, getBackendBaseUrl, parseRetryAfterSeconds } from "@/lib/backend-api";

/** SSE events from `POST /api/chat/stream`. */
export type ChatSseEvent =
  | { type: "status"; text: string }
  | { type: "token"; text: string }
  | ({
      type: "done";
      conversation_id?: string;
      assistant_message_id?: string | null;
      response?: string;
      model?: string;
      fallback_used?: boolean;
      retrieval_count?: number;
      tools_invoked?: string[];
    } & Record<string, unknown>)
  | { type: "error"; code?: string; message: string; details?: unknown };

function parseSseBlock(block: string): ChatSseEvent | null {
  let eventName = "message";
  const dataLines: string[] = [];
  for (const line of block.split("\n")) {
    if (line.startsWith("event:")) eventName = line.slice(6).trim();
    if (line.startsWith("data:")) dataLines.push(line.slice(5).trimStart());
  }
  const dataLine = dataLines.join("\n");
  if (!dataLine) return null;
  let data: Record<string, unknown>;
  try {
    data = JSON.parse(dataLine) as Record<string, unknown>;
  } catch {
    return null;
  }
  if (eventName === "status") {
    return { type: "status", text: String(data.text ?? "") };
  }
  if (eventName === "token") {
    return { type: "token", text: String(data.text ?? "") };
  }
  if (eventName === "done") {
    return { type: "done", ...data };
  }
  if (eventName === "error") {
    return {
      type: "error",
      code: typeof data.code === "string" ? data.code : undefined,
      message: String(data.message ?? "Chat failed"),
      details: data.details,
    };
  }
  return null;
}

export type ChatSseRequestInit = RequestInit & {
  /** Override auth (widget uses agent key header). */
  headers?: HeadersInit;
};

/**
 * POST + SSE stream parser for `/api/chat/stream` or `/api/chat/public/stream`.
 */
export async function* chatSseStream(
  path: string,
  init: ChatSseRequestInit = {}
): AsyncGenerator<ChatSseEvent> {
  const token = await getAccessToken();
  const base = getBackendBaseUrl();
  const url = `${base}${path.startsWith("/") ? path : `/${path}`}`;

  const response = await fetch(url, {
    ...init,
    signal: init.signal,
    headers: {
      ...(init.body != null && !(init.body instanceof FormData)
        ? { "Content-Type": "application/json" }
        : {}),
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
    const details = asRecord?.error?.details;
    throw new BackendApiError(
      asRecord?.error?.message ?? `Backend request failed (${response.status})`,
      response.status,
      asRecord?.error?.code,
      details,
      parseRetryAfterSeconds(response, details)
    );
  }

  const reader = response.body?.getReader();
  if (!reader) throw new BackendApiError("No response body", 0, "stream.no_body");

  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      if (init.signal?.aborted) break;
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const parts = buffer.split("\n\n");
      buffer = parts.pop() ?? "";
      for (const block of parts) {
        const ev = parseSseBlock(block.trim());
        if (ev) yield ev;
      }
    }
    buffer += decoder.decode();
    if (buffer.trim()) {
      const ev = parseSseBlock(buffer.trim());
      if (ev) yield ev;
    }
  } finally {
    reader.releaseLock();
  }
}
