import {
  buildEscalatedChatBanner,
  type EscalationHandoffContext,
  ESCALATED_CHAT_BANNER,
} from "@/lib/escalated-conversation";
import { cn } from "@/lib/utils";

export function EscalatedChatNotice({
  className,
  handoff,
}: {
  className?: string;
  handoff?: EscalationHandoffContext | null;
}) {
  const text = handoff ? buildEscalatedChatBanner(handoff) : ESCALATED_CHAT_BANNER;
  return (
    <p className={cn("text-ds-on-surface text-center text-xs leading-relaxed sm:text-sm", className)}>
      {text}
    </p>
  );
}
