"use client";

import { useState } from "react";
import type { ProductCard } from "@/lib/product-card";
import { DEMO_ACCENT_HEX } from "@/lib/demo-constants";
import { cn } from "@/lib/utils";

function productInitials(title: string): string {
  const words = title.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  if (words.length === 1) return words[0]!.slice(0, 2).toUpperCase();
  return `${words[0]!.charAt(0)}${words[1]!.charAt(0)}`.toUpperCase();
}

function ProductImageFallback({
  title,
  brandColorHex,
}: {
  title: string;
  brandColorHex?: string | null;
}) {
  const accent = brandColorHex?.trim() || DEMO_ACCENT_HEX;
  return (
    <div
      className="flex aspect-square w-full items-center justify-center px-2 text-center text-[11px] font-semibold leading-tight tracking-wide text-neutral-700"
      style={{ backgroundColor: `color-mix(in srgb, ${accent} 14%, #f4f4f5)` }}
      aria-hidden
    >
      {productInitials(title)}
    </div>
  );
}

function ProductImage({
  product,
  brandColorHex,
}: {
  product: ProductCard;
  brandColorHex?: string | null;
}) {
  const src = product.image_url?.trim();
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return <ProductImageFallback title={product.title} brandColorHex={brandColorHex} />;
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      className="aspect-square w-full bg-neutral-100 object-cover"
      loading="lazy"
      onError={() => setFailed(true)}
    />
  );
}

export function DemoProductCard({
  product,
  onSelect,
  disabled,
  className,
  compact = false,
  brandColorHex,
}: {
  product: ProductCard;
  onSelect?: (product: ProductCard) => void;
  disabled?: boolean;
  className?: string;
  compact?: boolean;
  brandColorHex?: string | null;
}) {
  const cardWidth = compact ? "w-[112px]" : "w-[140px]";
  const interactive = Boolean(onSelect) && !disabled;

  const body = (
    <>
      <ProductImage product={product} brandColorHex={brandColorHex} />
      <div className="p-2.5">
        <p className="line-clamp-2 text-[13px] font-medium leading-snug text-neutral-900">
          {product.title}
        </p>
        {product.price ? (
          <p className="mt-0.5 text-[12px] text-neutral-500">{product.price}</p>
        ) : null}
      </div>
    </>
  );

  if (interactive) {
    return (
      <button
        type="button"
        disabled={disabled}
        onClick={() => onSelect?.(product)}
        className={cn(
          cardWidth,
          "shrink-0 snap-start overflow-hidden rounded-xl border border-neutral-200/80 bg-white text-left shadow-sm transition-colors",
          "hover:border-neutral-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500",
          disabled && "cursor-not-allowed opacity-60",
          className,
        )}
      >
        {body}
      </button>
    );
  }

  return (
    <a
      href={product.url}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        cardWidth,
        "shrink-0 snap-start overflow-hidden rounded-xl border border-neutral-200/80 bg-white shadow-sm transition-colors hover:border-neutral-300",
        className,
      )}
    >
      {body}
    </a>
  );
}
