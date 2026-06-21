"use client";

import { useEffect, useState } from "react";
import { sanitizeDemoLogoUrl, storeInitials } from "@/lib/demo-store-logo";
import { DEMO_ACCENT_HEX } from "@/lib/demo-constants";
import { cn } from "@/lib/utils";

export function DemoStoreLogo({
  displayName,
  logoUrl,
  brandColorHex,
  size = "pitch",
  className,
}: {
  displayName: string;
  logoUrl?: string | null;
  brandColorHex?: string | null;
  size?: "pitch" | "header";
  className?: string;
}) {
  const accent = brandColorHex?.trim() || DEMO_ACCENT_HEX;
  const safeUrl = sanitizeDemoLogoUrl(logoUrl);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [safeUrl]);

  const pitchClass = "h-16 w-16 rounded-2xl sm:h-20 sm:w-20";
  const headerClass = "h-[19px] w-auto max-w-[19px] rounded-sm object-contain";
  const fallbackPitch =
    "flex h-16 w-16 items-center justify-center rounded-2xl border border-black/[0.06] text-xl font-semibold text-neutral-700 shadow-sm sm:h-20 sm:w-20 sm:text-2xl";
  const fallbackHeader =
    "flex h-[19px] w-[19px] items-center justify-center rounded-sm text-[9px] font-semibold text-neutral-700";

  if (!safeUrl || failed) {
    return (
      <div
        className={cn(size === "pitch" ? fallbackPitch : fallbackHeader, className)}
        style={{ backgroundColor: `color-mix(in srgb, ${accent} 16%, #f4f4f5)` }}
        aria-hidden
      >
        {storeInitials(displayName)}
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={safeUrl}
      alt=""
      className={cn(
        size === "pitch"
          ? cn(pitchClass, "border border-black/[0.06] bg-white object-contain p-1.5 shadow-sm")
          : headerClass,
        className,
      )}
      onError={() => setFailed(true)}
    />
  );
}
