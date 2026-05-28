"use client";

export const CHATRELY_LAST_AUTH_USER_ID_KEY = "chatrely:last-auth-user-id";

/** Remove persisted dashboard / onboarding / playground state so a new login never reuses the prior account's ids. */
export function clearChatrelyClientAccountCaches() {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(CHATRELY_LAST_AUTH_USER_ID_KEY);
    window.localStorage.removeItem("chatrely:dashboard:selected-agent-id");
    window.localStorage.removeItem("chatrely.onboarding.agentId");
    const lsRemove: string[] = [];
    for (let i = 0; i < window.localStorage.length; i++) {
      const k = window.localStorage.key(i);
      if (k?.startsWith("knowledge.sort.")) lsRemove.push(k);
    }
    lsRemove.forEach((k) => window.localStorage.removeItem(k));

    const ssRemove: string[] = [];
    for (let i = 0; i < window.sessionStorage.length; i++) {
      const k = window.sessionStorage.key(i);
      if (k?.startsWith("chatrely.playground-chat.")) ssRemove.push(k);
    }
    ssRemove.forEach((k) => window.sessionStorage.removeItem(k));
  } catch {
    /* ignore quota / private mode */
  }
}
