export const ESCALATED_CONVERSATION_STATUS = "escalated";

export const ESCALATED_CHAT_BANNER =
  "This chat was escalated to human support. Start a new chat to talk to the AI again.";

export function isEscalatedConversationStatus(status: string | null | undefined): boolean {
  return (status ?? "").trim().toLowerCase() === ESCALATED_CONVERSATION_STATUS;
}

export function isAiChatDisabledStatus(status: string | null | undefined): boolean {
  return isEscalatedConversationStatus(status);
}

export function readConversationStatus(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}
