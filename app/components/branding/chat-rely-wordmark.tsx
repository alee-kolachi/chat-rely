import Link from "next/link";
import { cn } from "@/lib/utils";

export const CHAT_RELY_LOGO_PATH = "/chat-rely.svg";

export type ChatRelyWordmarkProps = {
  className?: string;
  iconClassName?: string;
  textClassName?: string;
  showText?: boolean;
  href?: string;
  /** Black logo → light mark on dark backgrounds (e.g. dark footer). */
  invertLogo?: boolean;
};

export function ChatRelyWordmark({
  className,
  iconClassName,
  textClassName,
  showText = true,
  href,
  invertLogo = false,
}: ChatRelyWordmarkProps) {
  const icon = (
    // eslint-disable-next-line @next/next/no-img-element -- static SVG from /public
    <img
      src={CHAT_RELY_LOGO_PATH}
      alt=""
      className={cn("h-6 w-auto shrink-0 object-contain", invertLogo && "brightness-0 invert", iconClassName)}
      width={4931}
      height={3503}
    />
  );

  const label = showText ? (
    <span className={cn("truncate font-semibold tracking-tight", textClassName)}>ChatRely</span>
  ) : null;

  const merged = cn("inline-flex min-w-0 items-center gap-2", className);

  if (href) {
    return (
      <Link href={href} className={merged}>
        {icon}
        {label}
      </Link>
    );
  }

  return (
    <span className={merged}>
      {icon}
      {label}
    </span>
  );
}
