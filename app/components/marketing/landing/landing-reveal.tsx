"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { useInView } from "@/hooks/use-in-view";

type LandingRevealProps = {
  children: ReactNode;
  className?: string;
  delayMs?: number;
};

export function LandingReveal({ children, className, delayMs = 0 }: LandingRevealProps) {
  const { ref, inView } = useInView<HTMLDivElement>();

  return (
    <div
      ref={ref}
      className={cn("mkt-reveal", inView && "mkt-reveal-visible", className)}
      style={{ transitionDelay: `${delayMs}ms` }}
    >
      {children}
    </div>
  );
}
