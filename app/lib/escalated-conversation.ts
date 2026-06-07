export const ESCALATED_CONVERSATION_STATUS = "escalated";

export type EscalationHandoffContext = {
  sellerLive?: boolean;
  estimatedMinutes?: number | null;
  channelHint?: "live" | "email" | null;
};

/** Shown briefly after a teammate has replied; hidden once the visitor sends a message. */
export const OPERATOR_ENGAGED_CHAT_BANNER = "Team replied. Continue below.";

/** Widget / playground banner after human handoff (not the old generic line). */
export function buildEscalatedChatBanner(ctx?: EscalationHandoffContext | null): string {
  if (ctx?.sellerLive) {
    const n = Math.max(1, Math.round(ctx.estimatedMinutes ?? 15));
    return (
      `Our team is on it. Someone should reply within about ${n} minutes. ` +
      "You can add more details here while you wait."
    );
  }
  if (ctx?.channelHint === "email") {
    return (
      "We're not available for live chat right now. Our team will reach out by email. " +
      "Start a new chat if you need the AI again."
    );
  }
  return (
    "We're not available for live chat right now. Our team will reach out as soon as they're back. " +
    "Start a new chat if you need the AI again."
  );
}

/** @deprecated Use buildEscalatedChatBanner() with handoff context when available. */
export const ESCALATED_CHAT_BANNER = buildEscalatedChatBanner({ channelHint: "email" });

export function isEscalatedConversationStatus(status: string | null | undefined): boolean {
  return (status ?? "").trim().toLowerCase() === ESCALATED_CONVERSATION_STATUS;
}

export function isAiChatDisabledStatus(status: string | null | undefined): boolean {
  return isEscalatedConversationStatus(status);
}

export function readConversationStatus(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

export function readEscalationHandoffFromSse(
  payload: Record<string, unknown>
): EscalationHandoffContext | null {
  const escalation = payload.escalation;
  if (!escalation || typeof escalation !== "object" || Array.isArray(escalation)) return null;
  const row = escalation as Record<string, unknown>;
  return {
    sellerLive: row.seller_live === true,
    estimatedMinutes:
      typeof row.estimated_minutes === "number" ? row.estimated_minutes : null,
    channelHint:
      row.channel_hint === "live" || row.channel_hint === "email"
        ? row.channel_hint
        : null,
  };
}

export function readEscalationHandoffFromApiFields(data: {
  seller_live?: boolean;
  estimated_minutes?: number | null;
  channel_hint?: string | null;
}): EscalationHandoffContext {
  return {
    sellerLive: data.seller_live === true,
    estimatedMinutes:
      typeof data.estimated_minutes === "number" ? data.estimated_minutes : null,
    channelHint:
      data.channel_hint === "live" || data.channel_hint === "email"
        ? data.channel_hint
        : null,
  };
}

export function readEscalationHandoffFromMetadata(
  metadata: Record<string, unknown> | null | undefined
): EscalationHandoffContext | null {
  const raw = metadata?.escalation_handoff;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const row = raw as Record<string, unknown>;
  return {
    sellerLive: row.seller_live === true,
    estimatedMinutes:
      typeof row.estimated_minutes === "number" ? row.estimated_minutes : null,
    channelHint:
      row.channel_hint === "live" || row.channel_hint === "email"
        ? row.channel_hint
        : null,
  };
}
