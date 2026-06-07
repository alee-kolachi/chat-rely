import { isRenderableTranscriptMessage, type TranscriptMessageLike } from "@/lib/conversation-transcript";

export type ConversationMessageRow = TranscriptMessageLike & {
  id: string;
  created_at: string;
};

export function isPendingConversationMessage(id: string): boolean {
  return id.startsWith("pending-");
}

/** Keep optimistic operator replies until the server transcript catches up. */
export function shouldApplyServerConversationMessages(
  local: ConversationMessageRow[],
  server: ConversationMessageRow[]
): boolean {
  const localCommitted = local.filter((m) => !isPendingConversationMessage(m.id));
  if (server.length > localCommitted.length) return true;
  const serverLast = server[server.length - 1];
  const localLast = localCommitted[localCommitted.length - 1];
  if (serverLast && localLast && serverLast.id !== localLast.id) return true;
  return server.length >= localCommitted.length;
}

export function mergeConversationMessagesFromServer(
  local: ConversationMessageRow[],
  server: ConversationMessageRow[]
): ConversationMessageRow[] {
  const pending = local.filter((m) => isPendingConversationMessage(m.id));
  const serverIds = new Set(server.map((m) => m.id));
  const unmatchedPending = pending.filter((m) => {
    const text = (m.content ?? "").trim();
    return !server.some(
      (s) =>
        s.role === m.role &&
        (s.content ?? "").trim() === text &&
        Math.abs(new Date(s.created_at).getTime() - new Date(m.created_at).getTime()) < 120_000
    );
  });
  const merged = [...server, ...unmatchedPending];
  merged.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  return merged.filter(isRenderableTranscriptMessage) as ConversationMessageRow[];
}
