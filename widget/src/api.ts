export type WidgetConfig = {
  agent_id: string;
  name: string;
  brand_color: string | null;
  widget_position: "bottom_right" | "bottom_left";
  human_escalation_available?: boolean;
  avatar_url?: string | null;
  /** Hobby / Standard / Pro — show attachment affordance in composer (upload not wired yet). */
  attachments_ui_enabled?: boolean;
  /** Pro / Scale: omit “Powered by ChatRely”. Otherwise show only until the visitor sends their first message. */
  hide_powered_by_chatrely?: boolean;
  /** Pro / Scale: show thumbs on assistant messages. */
  message_feedback_enabled?: boolean;
};

export type NdjsonEvent =
  | { type: "start"; conversation_id: string }
  | { type: "token"; text: string }
  | {
      type: "done";
      conversation_id: string;
      response?: string;
      assistant_message_id?: string | null;
    }
  | { type: "error"; code?: string; message: string };

async function safeJson(res: Response): Promise<{ error?: { message?: string } } | null> {
  try {
    return (await res.json()) as { error?: { message?: string } };
  } catch {
    return null;
  }
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
): AsyncGenerator<NdjsonEvent> {
  const url = `${apiBase}/api/v1/public/widget/chat/stream`;
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
    const msg = err?.error?.message ?? `Chat failed (${res.status})`;
    throw new Error(msg);
  }
  const reader = res.body?.getReader();
  if (!reader) throw new Error("No response body");
  const dec = new TextDecoder();
  let buf = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    const lines = buf.split("\n");
    buf = lines.pop() ?? "";
    for (const line of lines) {
      const t = line.trim();
      if (!t) continue;
      yield JSON.parse(t) as NdjsonEvent;
    }
  }
  const tail = buf.trim();
  if (tail) yield JSON.parse(tail) as NdjsonEvent;
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
