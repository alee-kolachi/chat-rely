import Link from "next/link";
import { cn } from "@/lib/utils";
import { CHAT_RELY_LOGO_PATH } from "@/components/branding/chat-rely-wordmark";

/** Spacing for the embed-style strip under the composer (playground, appearance, widget preview). */
export const WIDGET_POWERED_BY_STRIP_CLASS =
  "bg-transparent px-5 pt-1 pb-[max(10px,env(safe-area-inset-bottom,0px))]";

/** Extra bottom padding on the composer when the powered-by strip is hidden (Pro / Scale). */
export const WIDGET_FOOTER_PADDING_WITHOUT_POWERED =
  "pb-[max(14px,env(safe-area-inset-bottom,0px))]";

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
      <span
        className={cn(
          "font-medium text-[#64748b]",
          compact ? "text-[10px] leading-tight" : "text-[11px]"
        )}
      >
        Powered by <span className="font-semibold text-[#64748b]">ChatRely</span>
      </span>
    </>
  );

  return (
    <div className={cn("flex items-center justify-center gap-1.5", className)}>
      {href ? (
        <Link
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-w-0 items-center justify-center gap-1.5 no-underline opacity-[0.66] transition-opacity hover:opacity-[0.84]"
        >
          {inner}
        </Link>
      ) : (
        <span className="inline-flex min-w-0 items-center justify-center gap-1.5 opacity-[0.66]">
          {inner}
        </span>
      )}
    </div>
  );
}
