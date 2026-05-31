import { ESCALATED_CHAT_BANNER } from "@/lib/escalated-conversation";
import { cn } from "@/lib/utils";

export function EscalatedChatNotice({ className }: { className?: string }) {
  return (
    <p className={cn("text-ds-on-surface text-center text-xs leading-relaxed sm:text-sm", className)}>
      {ESCALATED_CHAT_BANNER}
    </p>
  );
}
