"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";

const ctaBase =
  "inline-flex items-center justify-center rounded-lg px-5 py-3 text-sm font-medium text-white transition-opacity hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2";

export function DemoInstallCta({
  storeName,
  href,
  accentColor,
  variant = "primary",
  className,
}: {
  storeName: string;
  href: string;
  accentColor: string;
  variant?: "primary" | "header" | "inline" | "sticky";
  className?: string;
}) {
  const label = `Install on ${storeName} →`;

  if (variant === "sticky") {
    return (
      <Link
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(ctaBase, "w-full shadow-sm", className)}
        style={{ backgroundColor: accentColor }}
      >
        {label}
      </Link>
    );
  }

  if (variant === "inline") {
    return (
      <div className={cn("flex justify-center py-2", className)}>
        <Link
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className={ctaBase}
          style={{ backgroundColor: accentColor }}
        >
          {label}
        </Link>
      </div>
    );
  }

  return (
    <Link
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(ctaBase, variant === "header" ? "shrink-0 px-4 py-2.5" : "", className)}
      style={{ backgroundColor: accentColor }}
    >
      {label}
    </Link>
  );
}
