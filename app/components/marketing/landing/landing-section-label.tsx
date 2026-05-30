import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type LandingSectionLabelTone = "light" | "dark" | "primary";

type LandingSectionLabelProps = {
  children: ReactNode;
  tone?: LandingSectionLabelTone;
  /** Scroll-driven or custom foreground for border, icon, and text. */
  color?: string;
  className?: string;
};

const toneClasses: Record<
  LandingSectionLabelTone,
  { border: string; text: string; icon: string }
> = {
  light: {
    border: "border-black",
    text: "text-black",
    icon: "bg-black",
  },
  dark: {
    border: "border-white",
    text: "text-white",
    icon: "bg-white",
  },
  primary: {
    border: "border-white",
    text: "text-white",
    icon: "bg-white",
  },
};

export function LandingSectionLabel({
  children,
  tone = "light",
  color,
  className,
}: LandingSectionLabelProps) {
  const t = toneClasses[tone];

  return (
    <div
      className={cn("border-t-2 pt-8", !color && t.border, className)}
      style={color ? { borderColor: color } : undefined}
    >
      <p
        className={cn("mkt-font flex items-center gap-2.5 text-sm font-medium italic", !color && t.text)}
        style={color ? { color } : undefined}
      >
        <span
          className={cn("inline-block size-2.5 shrink-0", !color && t.icon)}
          style={color ? { backgroundColor: color } : undefined}
          aria-hidden
        />
        {children}
      </p>
    </div>
  );
}
