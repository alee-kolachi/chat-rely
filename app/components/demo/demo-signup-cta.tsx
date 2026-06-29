"use client";

import Link from "next/link";
import { DEMO_SIGNUP_URL } from "@/lib/demo-constants";
import { appButtonClassName } from "@/lib/button-styles";
import { cn } from "@/lib/utils";

export function DemoSignupCta({
  href = DEMO_SIGNUP_URL,
  variant = "primary",
  className,
}: {
  href?: string;
  variant?: "primary" | "header" | "inline" | "sticky";
  className?: string;
}) {
  const label = "Get started →";
  const primaryClass = appButtonClassName("primary", {
    className: cn(
      "inline-flex items-center justify-center no-underline",
      variant === "header" && "shrink-0 px-4 py-2.5",
      variant === "sticky" && "w-full shadow-ds-sm",
      className,
    ),
  });

  if (variant === "sticky") {
    return (
      <Link href={href} className={primaryClass}>
        {label}
      </Link>
    );
  }

  if (variant === "inline") {
    return (
      <div className={cn("flex justify-center py-2", className)}>
        <Link href={href} className={primaryClass}>
          {label}
        </Link>
      </div>
    );
  }

  return (
    <Link href={href} className={primaryClass}>
      {label}
    </Link>
  );
}
