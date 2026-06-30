"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Bot } from "lucide-react";
import { WIDGET_BORDER_RADIUS_DEFAULT } from "@/lib/widget-shape";
import { brandChromeClasses } from "@/lib/brand-chrome";
import { cn } from "@/lib/utils";

type WidgetBrandChrome = ReturnType<typeof brandChromeClasses> | null;

function WidgetLauncherChatIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="size-8" width={32} height={32}>
      <path
        fill="#ffffff"
        fillRule="evenodd"
        clipRule="evenodd"
        d="M13.0867 21.3877L13.6288 20.4718C14.0492 19.7614 14.2595 19.4062 14.5972 19.2098C14.9349 19.0134 15.36 19.0061 16.2104 18.9915C17.4658 18.9698 18.2531 18.8929 18.9134 18.6194C20.1386 18.1119 21.1119 17.1386 21.6194 15.9134C22 14.9946 22 13.8297 22 11.5V10.5C22 7.22657 22 5.58985 21.2632 4.38751C20.8509 3.71473 20.2853 3.14908 19.6125 2.7368C18.4101 2 16.7734 2 13.5 2H10.5C7.22657 2 5.58985 2 4.38751 2.7368C3.71473 3.14908 3.14908 3.71473 2.7368 4.38751C2 5.58985 2 7.22657 2 10.5V11.5C2 13.8297 2 14.9946 2.3806 15.9134C2.88807 17.1386 3.86144 18.1119 5.08658 18.6194C5.74689 18.8929 6.53422 18.9698 7.78958 18.9915C8.63992 19.0061 9.06509 19.0134 9.40279 19.2098C9.74049 19.4063 9.95073 19.7614 10.3712 20.4718L10.9133 21.3877C11.3965 22.204 12.6035 22.204 13.0867 21.3877ZM7.5 9.71476C7.5 11.4673 9.6633 13.3304 10.9901 14.3082C11.4442 14.6429 11.6713 14.8103 12 14.8103C12.3287 14.8103 12.5558 14.643 13.0099 14.3082C14.3367 13.3304 16.5 11.4674 16.5 9.71474C16.5 7.03758 14.0249 6.03806 12 8.10614C9.97507 6.03806 7.5 7.03758 7.5 9.71476Z"
      />
    </svg>
  );
}

function WidgetLauncherAttentionPreview({ animationKey }: { animationKey: number }) {
  return (
    <span
      key={animationKey}
      className="widget-preview-launcher-attention"
      aria-hidden
    />
  );
}

function LauncherPreviewShell({
  chrome,
  brandColorHex,
  borderRadius = WIDGET_BORDER_RADIUS_DEFAULT,
  animationEnabled = true,
  animationKey = 0,
  children,
  pending = false,
}: {
  chrome: WidgetBrandChrome;
  brandColorHex?: string | null;
  borderRadius?: number;
  animationEnabled?: boolean;
  animationKey?: number;
  children?: ReactNode;
  pending?: boolean;
}) {
  const launcherStyle = {
    ...(brandColorHex ? { backgroundColor: brandColorHex } : {}),
    borderRadius: `${borderRadius}px`,
    ["--widget-preview-radius" as string]: `${borderRadius}px`,
    ["--widget-preview-accent" as string]: brandColorHex ?? "#831c91",
  };

  return (
    <div
      className={cn(
        "widget-preview-launcher relative flex size-14 shrink-0 items-center justify-center border border-black/10 shadow-[0_10px_25px_rgba(15,23,42,0.22)] ring-4 ring-white",
        pending && "animate-pulse bg-black/10",
        chrome?.fabIconClass
      )}
      style={launcherStyle}
      aria-hidden
    >
      {animationEnabled && !pending ? (
        <WidgetLauncherAttentionPreview animationKey={animationKey} />
      ) : null}
      <span
        className="widget-preview-launcher-surface"
        style={{ borderRadius: `${borderRadius}px` }}
      >
        {children}
      </span>
    </div>
  );
}

export function WidgetBrandAvatar({
  logoUrl,
  logoPending,
  hasBrand,
  chrome,
  size,
  brandColorHex,
  borderRadius = WIDGET_BORDER_RADIUS_DEFAULT,
  animationEnabled = true,
  animationKey = 0,
}: {
  logoUrl: string | null;
  logoPending: boolean;
  hasBrand: boolean;
  chrome: WidgetBrandChrome;
  size: "header" | "bubble" | "launcher" | "welcome";
  brandColorHex?: string | null;
  borderRadius?: number;
  animationEnabled?: boolean;
  animationKey?: number;
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

  const headerShellClass = cn(
    "relative inline-flex h-[19px] shrink-0 items-center justify-center overflow-hidden",
    hasBrand && chrome ? "" : "size-9 rounded-lg bg-ds-primary shadow-sm ring-1 ring-black/10"
  );

  const welcomeShellClass =
    "relative flex size-11 shrink-0 items-center justify-center overflow-hidden";

  const bubbleShellClass =
    "border-ds-outline relative flex size-7 shrink-0 items-center justify-center overflow-hidden rounded-full border bg-white shadow-sm";

  if (size === "launcher") {
    return (
      <LauncherPreviewShell
        chrome={chrome}
        brandColorHex={brandColorHex}
        borderRadius={borderRadius}
        animationEnabled={animationEnabled}
        animationKey={animationKey}
        pending={logoPending}
      >
        <WidgetLauncherChatIcon />
      </LauncherPreviewShell>
    );
  }

  if (!logoUrl || imageState === "error") {
    if (size === "header") {
      return null;
    }
    return (
      <div className={size === "welcome" ? welcomeShellClass : bubbleShellClass}>
        <Bot
          className={
            size === "welcome"
              ? "text-ds-on-surface-variant size-6"
              : "text-ds-on-surface-variant size-3.5"
          }
          strokeWidth={1.8}
          aria-hidden
        />
      </div>
    );
  }

  if (logoPending) {
    if (size === "header") {
      return <div className={cn(headerShellClass, "w-[15px] animate-pulse bg-black/10")} aria-hidden />;
    }
    if (size === "welcome") {
      return (
        <div
          className="border-ds-outline size-11 shrink-0 animate-pulse rounded-[10px] border bg-ds-sidebar"
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

  const shellClass = size === "welcome" ? welcomeShellClass : bubbleShellClass;

  const headerLogo = (
    <>
      {imageState !== "loaded" ? (
        <div className="h-[19px] w-[19px] animate-pulse rounded bg-black/10" aria-hidden />
      ) : null}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        ref={bindLogoImage}
        src={logoUrl}
        alt=""
        className={cn(
          "block h-[19px] w-auto max-w-none object-contain transition-opacity",
          imageState === "loaded" ? "opacity-100" : "opacity-0"
        )}
        height={19}
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
            ? "relative z-[1] size-full rounded-lg object-contain transition-opacity"
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
