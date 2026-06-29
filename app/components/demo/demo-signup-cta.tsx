"use client";

import { DEMO_SIGNUP_URL } from "@/lib/demo-constants";
import { cn } from "@/lib/utils";

const ctaBase =
  "touch-manipulation inline-flex items-center justify-center rounded-lg px-5 py-3 text-sm font-medium text-white transition-opacity hover:opacity-90 active:opacity-80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2";

export function DemoSignupCta({
  href = DEMO_SIGNUP_URL,
  accentColor,
  variant = "primary",
  className,
}: {
  href?: string;
  accentColor: string;
  variant?: "primary" | "header" | "inline" | "sticky";
  className?: string;
}) {
  const label = "Get started →";

  if (variant === "sticky") {
    return (
      <a
        href={href}
        className={cn(ctaBase, "w-full shadow-sm", className)}
        style={{ backgroundColor: accentColor }}
      >
        {label}
      </a>
    );
  }

  if (variant === "inline") {
    return (
      <div className={cn("flex justify-center py-2", className)}>
        <a href={href} className={ctaBase} style={{ backgroundColor: accentColor }}>
          {label}
        </a>
      </div>
    );
  }

  return (
    <a
      href={href}
      className={cn(ctaBase, variant === "header" ? "shrink-0 px-4 py-2.5" : "", className)}
      style={{ backgroundColor: accentColor }}
    >
      {label}
    </a>
  );
}
