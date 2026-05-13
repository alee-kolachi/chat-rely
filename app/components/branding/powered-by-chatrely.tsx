import Link from "next/link";
import { cn } from "@/lib/utils";
import { CHAT_RELY_LOGO_PATH } from "@/components/branding/chat-rely-wordmark";

type PoweredByChatRelyProps = {
  className?: string;
  /** Smaller icon + text (widget-style strip). */
  compact?: boolean;
  /** Wrap in a subtle marketing link. */
  href?: string;
};

/**
 * “Powered by ChatRely” with logo — used in dashboard playground preview to mirror embed branding.
 */
export function PoweredByChatRely({ className, compact, href = "https://chatrely.com" }: PoweredByChatRelyProps) {
  const inner = (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element -- static asset from /public */}
      <img
        src={CHAT_RELY_LOGO_PATH}
        alt=""
        className={cn("shrink-0 object-contain", compact ? "h-3.5 w-auto" : "h-4 w-auto")}
        width={4931}
        height={3503}
      />
      <span className={cn("text-ds-on-surface-variant font-medium", compact ? "text-[10px] leading-tight" : "text-[11px]")}>
        Powered by <span className="text-ds-on-surface font-semibold">ChatRely</span>
      </span>
    </>
  );

  return (
    <div
      className={cn(
        "flex items-center justify-center gap-1.5 bg-ds-sidebar/35 px-2 py-1.5",
        className
      )}
    >
      {href ? (
        <Link
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-w-0 items-center justify-center gap-1.5 no-underline transition-opacity hover:opacity-90"
        >
          {inner}
        </Link>
      ) : (
        <span className="inline-flex min-w-0 items-center justify-center gap-1.5">{inner}</span>
      )}
    </div>
  );
}
