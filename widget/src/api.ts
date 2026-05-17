export type WidgetConfig = {
  agent_id: string;
  name: string;
  brand_color: string | null;
  widget_position: "bottom_right" | "bottom_left";
  human_escalation_available?: boolean;
  avatar_url?: string | null;
  attachments_ui_enabled?: boolean;
  hide_powered_by_chatrely?: boolean;
  message_feedback_enabled?: boolean;
};

export type ChatSseEvent =
  | { type: "status"; text: string }
  | { type: "token"; text: string }
  | ({
      type: "done";
      conversation_id?: string;
      assistant_message_id?: string | null;
      response?: string;
    } & Record<string, unknown>)
  | { type: "error"; code?: string; message: string };

async function safeJson(res: Response): Promise<{ error?: { message?: string } } | null> {
  try {
    return (await res.json()) as { error?: { message?: string } };
  } catch {
    return null;
  }
}

function parseSseBlock(block: string): ChatSseEvent | null {
  let eventName = "message";
  let dataLine = "";
  for (const line of block.split("\n")) {
    if (line.startsWith("event:")) eventName = line.slice(6).trim();
    if (line.startsWith("data:")) dataLine += line.slice(5).trim();
  }
  if (!dataLine) return null;
  let data: Record<string, unknown>;
  try {
    data = JSON.parse(dataLine) as Record<string, unknown>;
  } catch {
    return null;
  }
  if (eventName === "status") return { type: "status", text: String(data.text ?? "") };
  if (eventName === "token") return { type: "token", text: String(data.text ?? "") };
  if (eventName === "done") return { type: "done", ...data };
  if (eventName === "error") {
    return { type: "error", message: String(data.message ?? "Chat failed") };
  }
  return null;
}

export async function fetchWidgetConfig(apiBase: string, agentKey: string): Promise<WidgetConfig> {
  const url = `${apiBase}/api/v1/public/widget/config`;
  const res = await fetch(url, {
    method: "GET",
    headers: { "X-ChatRely-Agent-Key": agentKey },
  });
  if (!res.ok) {
    const err = await safeJson(res);
    const msg = err?.error?.message ?? `Config failed (${res.status})`;
    throw new Error(msg);
  }
  return (await res.json()) as WidgetConfig;
}

export async function* streamChat(
  apiBase: string,
  agentKey: string,
  body: Record<string, unknown>
): AsyncGenerator<ChatSseEvent> {
  const url = `${apiBase}/api/chat/public/stream`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-ChatRely-Agent-Key": agentKey,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await safeJson(res);
    const payload = err as {
      error?: { message?: string; code?: string; details?: { retry_after_seconds?: number } };
    } | null;
    const msg = payload?.error?.message ?? `Chat failed (${res.status})`;
    const rateErr = new Error(msg) as Error & { status?: number; code?: string; retryAfterSeconds?: number };
    rateErr.status = res.status;
    rateErr.code = payload?.error?.code;
    const headerRetry = res.headers.get("Retry-After");
    const headerSecs = headerRetry ? Number(headerRetry) : NaN;
    const detailSecs = Number(payload?.error?.details?.retry_after_seconds);
    if (Number.isFinite(headerSecs) && headerSecs > 0) {
      rateErr.retryAfterSeconds = Math.ceil(headerSecs);
    } else if (Number.isFinite(detailSecs) && detailSecs > 0) {
      rateErr.retryAfterSeconds = Math.ceil(detailSecs);
    }
    throw rateErr;
  }
  const reader = res.body?.getReader();
  if (!reader) throw new Error("No response body");
  const dec = new TextDecoder();
  let buf = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    const parts = buf.split("\n\n");
    buf = parts.pop() ?? "";
    for (const block of parts) {
      const ev = parseSseBlock(block.trim());
      if (ev) yield ev;
    }
  }
  if (buf.trim()) {
    const ev = parseSseBlock(buf.trim());
    if (ev) yield ev;
  }
}

export async function postWidgetMessageFeedback(
  apiBase: string,
  agentKey: string,
  body:
    | { message_id: string; visitor_id: string; value: 1 | -1 }
    | { message_id: string; visitor_id: string; remove: true }
): Promise<void> {
  const url = `${apiBase}/api/v1/public/widget/message-feedback`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-ChatRely-Agent-Key": agentKey,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await safeJson(res);
    const msg = err?.error?.message ?? `Feedback failed (${res.status})`;
    throw new Error(msg);
  }
}
