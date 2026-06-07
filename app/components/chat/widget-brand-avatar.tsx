"use client";

import { useEffect, useRef, useState } from "react";
import { Bot } from "lucide-react";
import { brandChromeClasses } from "@/lib/brand-chrome";
import { cn } from "@/lib/utils";

type WidgetBrandChrome = ReturnType<typeof brandChromeClasses> | null;

export function WidgetBrandAvatar({
  logoUrl,
  logoPending,
  hasBrand,
  chrome,
  size,
  brandColorHex,
}: {
  logoUrl: string | null;
  logoPending: boolean;
  hasBrand: boolean;
  chrome: WidgetBrandChrome;
  size: "header" | "bubble" | "launcher" | "welcome";
  brandColorHex?: string | null;
}) {
  const [imageState, setImageState] = useState<"idle" | "loading" | "loaded" | "error">("idle");
  const imgRef = useRef<HTMLImageElement>(null);

  function bindLogoImage(node: HTMLImageElement | null): void {
    imgRef.current = node;
    if (!node || !logoUrl) return;
    if (node.complete && node.naturalHeight > 0) {
      setImageState("loaded");
      return;
    }
    setImageState("loading");
  }

  useEffect(() => {
    if (!logoUrl) {
      queueMicrotask(() => setImageState("idle"));
    }
  }, [logoUrl]);

  const launcherShellClass = cn(
    "relative flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-full border border-black/10 shadow-[0_10px_25px_rgba(15,23,42,0.22)] ring-4 ring-white",
    chrome?.fabIconClass
  );
  const launcherStyle = brandColorHex ? { backgroundColor: brandColorHex } : undefined;

  const headerShellClass = cn(
    "relative inline-flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-lg shadow-sm ring-1 ring-black/10",
    hasBrand && chrome
      ? chrome.lightBg
        ? "bg-black/[0.06]"
        : "bg-white/20"
      : "bg-ds-primary"
  );

  const fallbackBot = (
    <div
      className={cn(
        size === "header" &&
          "flex size-9 shrink-0 items-center justify-center rounded-lg shadow-sm ring-1 ring-black/10",
        size === "bubble" &&
          "border-ds-outline flex size-7 shrink-0 items-center justify-center rounded-full border bg-white shadow-sm",
        size === "welcome" &&
          "border-ds-outline flex aspect-square h-full min-h-16 w-auto shrink-0 items-center justify-center self-stretch rounded-xl border bg-white shadow-[0_2px_8px_rgba(15,23,42,0.08)]",
        size === "launcher" && "text-xl",
        size === "header" &&
          (hasBrand && chrome
            ? chrome.lightBg
              ? "bg-black/[0.06] text-ds-on-surface"
              : "bg-white/20 text-white"
            : "bg-ds-primary text-ds-on-primary")
      )}
    >
      {size === "launcher" ? (
        <span aria-hidden>💬</span>
      ) : (
        <Bot
          className={
            size === "header"
              ? "size-4"
              : size === "welcome"
                ? "text-ds-on-surface-variant size-6"
                : "text-ds-on-surface-variant size-3.5"
          }
          strokeWidth={1.8}
          aria-hidden
        />
      )}
    </div>
  );

  if (logoPending) {
    if (size === "launcher") {
      return (
        <div
          className={cn(launcherShellClass, "animate-pulse bg-black/10")}
          style={launcherStyle}
          aria-hidden
        />
      );
    }
    if (size === "header") {
      return <div className={cn(headerShellClass, "animate-pulse bg-black/10")} aria-hidden />;
    }
    if (size === "welcome") {
      return (
        <div
          className="border-ds-outline aspect-square h-full min-h-16 w-auto shrink-0 animate-pulse self-stretch rounded-xl border bg-ds-sidebar"
          aria-hidden
        />
      );
    }
    return (
      <div
        className="border-ds-outline size-7 shrink-0 animate-pulse rounded-full border bg-ds-sidebar"
        aria-hidden
      />
    );
  }

  if (!logoUrl || imageState === "error") {
    if (size === "launcher") {
      return (
        <div className={launcherShellClass} style={launcherStyle} aria-hidden>
          <span aria-hidden>💬</span>
        </div>
      );
    }
    return fallbackBot;
  }

  if (size === "launcher") {
    return (
      <div className={launcherShellClass} style={launcherStyle}>
        {imageState !== "loaded" ? (
          <div className="absolute inset-0 animate-pulse rounded-full bg-black/10" aria-hidden />
        ) : null}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          ref={bindLogoImage}
          src={logoUrl}
          alt=""
          className={cn("relative z-[1] size-8 object-contain transition-opacity", imageState === "loaded" ? "opacity-100" : "opacity-0")}
          referrerPolicy="no-referrer"
          onLoad={() => setImageState("loaded")}
          onError={() => setImageState("error")}
        />
      </div>
    );
  }

  const shellClass =
    size === "welcome"
      ? "border-ds-outline relative flex aspect-square h-full min-h-16 w-auto shrink-0 items-center justify-center self-stretch overflow-hidden rounded-xl border bg-white shadow-[0_2px_8px_rgba(15,23,42,0.08)]"
      : "border-ds-outline relative flex size-7 shrink-0 items-center justify-center overflow-hidden rounded-full border bg-white shadow-sm";

  const headerLogo = (
    <>
      {imageState !== "loaded" ? (
        <div className="absolute inset-0 animate-pulse rounded-lg bg-black/10" aria-hidden />
      ) : null}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        ref={bindLogoImage}
        src={logoUrl}
        alt=""
        className={cn(
          "relative z-[1] max-h-full max-w-full rounded-lg object-contain transition-opacity",
          imageState === "loaded" ? "opacity-100" : "opacity-0"
        )}
        width={36}
        height={36}
        referrerPolicy="no-referrer"
        onLoad={() => setImageState("loaded")}
        onError={() => setImageState("error")}
      />
    </>
  );

  if (size === "header") {
    return <div className={headerShellClass}>{headerLogo}</div>;
  }

  return (
    <div className={shellClass}>
      {imageState !== "loaded" ? (
        <div
          className={cn(
            "absolute inset-0 animate-pulse bg-black/10",
            size === "bubble" && "rounded-full",
            size === "welcome" && "rounded-xl"
          )}
          aria-hidden
        />
      ) : null}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        ref={bindLogoImage}
        src={logoUrl}
        alt=""
        className={cn(
          size === "welcome"
            ? "relative z-[1] size-full object-contain p-1.5 transition-opacity"
            : "relative z-[1] size-full object-contain p-0.5 transition-opacity",
          imageState === "loaded" ? "opacity-100" : "opacity-0"
        )}
        width={size === "welcome" ? 56 : 28}
        height={size === "welcome" ? 56 : 28}
        referrerPolicy="no-referrer"
        onLoad={() => setImageState("loaded")}
        onError={() => setImageState("error")}
      />
    </div>
  );
}

/** @deprecated Use WidgetBrandAvatar */
export const PlaygroundBrandAvatar = WidgetBrandAvatar;
