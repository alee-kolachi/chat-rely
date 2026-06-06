export type WidgetAppearanceColors = {
  header?: string;
  user_bubble?: string;
  panel_background?: string;
  assistant_bubble?: string;
  assistant_bubble_border?: string;
  composer_background?: string;
};

export type WidgetAppearanceConfig = {
  theme_mode?: WidgetThemeMode;
  font_family?: WidgetFontFamily;
  colors?: WidgetAppearanceColors;
};

export type WidgetConfig = {
  agent_id: string;
  name: string;
  brand_color: string | null;
  widget_position: "bottom_right" | "bottom_left";
  greeting_message?: string | null;
  greeting_messages?: string[] | null;
  welcome_screen_enabled?: boolean;
  welcome_screen_headline?: string | null;
  welcome_screen_description?: string | null;
  welcome_screen_button_label?: string | null;
  welcome_screen_social_links?: Array<{ label: string; url: string }> | null;
  human_escalation_available?: boolean;
  avatar_url?: string | null;
  attachments_ui_enabled?: boolean;
  hide_powered_by_chatrely?: boolean;
  message_feedback_enabled?: boolean;
  widget_appearance?: WidgetAppearanceConfig | null;
};

export type ProductCard = {
  handle: string;
  title: string;
  url: string;
  image_url?: string | null;
  price?: string | null;
};

export type ProductDetail = ProductCard & {
  image_urls: string[];
};

export type ProductActionRequest = {
  type: "details" | "similar";
  handle: string;
  title?: string | null;
};

export type ChatSseEvent =
  | { type: "status"; text: string }
  | { type: "preamble"; text: string }
  | { type: "token"; text: string }
  | { type: "products"; products: ProductCard[] }
  | { type: "product_detail"; product: ProductDetail }
  | { type: "start"; conversation_id?: string }
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

function parseProductCards(value: unknown): ProductCard[] {
  if (!Array.isArray(value)) return [];
  const cards: ProductCard[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    const handle = typeof row.handle === "string" ? row.handle.trim() : "";
    const title = typeof row.title === "string" ? row.title.trim() : "";
    const url = typeof row.url === "string" ? row.url.trim() : "";
    if (!handle || !title || !url) continue;
    cards.push({
      handle,
      title,
      url,
      image_url: typeof row.image_url === "string" ? row.image_url : null,
      price: typeof row.price === "string" ? row.price : null,
    });
  }
  return cards;
}

function parseProductDetail(value: unknown): ProductDetail | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  const handle = typeof row.handle === "string" ? row.handle.trim() : "";
  const title = typeof row.title === "string" ? row.title.trim() : "";
  const url = typeof row.url === "string" ? row.url.trim() : "";
  if (!handle || !title || !url) return null;
  const imageUrls: string[] = [];
  if (Array.isArray(row.image_urls)) {
    for (const item of row.image_urls) {
      if (typeof item === "string" && item.trim()) imageUrls.push(item.trim());
    }
  }
  return {
    handle,
    title,
    url,
    image_url: typeof row.image_url === "string" ? row.image_url : imageUrls[0] ?? null,
    price: typeof row.price === "string" ? row.price : null,
    image_urls: imageUrls,
  };
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
  if (eventName === "preamble") return { type: "preamble", text: String(data.text ?? "") };
  if (eventName === "token") return { type: "token", text: String(data.text ?? "") };
  if (eventName === "products") return { type: "products", products: parseProductCards(data.products) };
  if (eventName === "product_detail") {
    const product = parseProductDetail(data.product);
    if (!product) return null;
    return { type: "product_detail", product };
  }
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

export async function postWidgetVisitorContact(
  apiBase: string,
  agentKey: string,
  body: {
    conversation_id: string;
    visitor_id: string;
    visitor_name: string;
    visitor_email: string;
  }
): Promise<{
  handoff_message: string;
  conversation_status: string;
  contact_capture_required: boolean;
}> {
  const url = `${apiBase}/api/v1/public/widget/visitor-contact`;
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
    const msg = err?.error?.message ?? `Contact submit failed (${res.status})`;
    throw new Error(msg);
  }
  return (await res.json()) as {
    handoff_message: string;
    conversation_status: string;
    contact_capture_required: boolean;
  };
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
