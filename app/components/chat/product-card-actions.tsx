"use client";

import { ExternalLink, Info, Sparkles } from "lucide-react";

import { cn } from "@/lib/utils";
import type { ProductCard } from "@/lib/product-card";

export function ProductCardActions({
  product,
  disabled,
  onShowDetails,
  onShowSimilar,
  className,
  layout = "row",
}: {
  product: ProductCard;
  disabled?: boolean;
  onShowDetails: (product: ProductCard) => void;
  onShowSimilar: (product: ProductCard) => void;
  className?: string;
  layout?: "row" | "column";
}) {
  const buttonBase =
    layout === "column"
      ? "border-ds-outline/50 text-ds-on-surface hover:bg-[#e8e8e8] flex w-full items-center justify-center gap-1.5 rounded-md border bg-ds-muted px-2 py-2 text-[11px] font-medium no-underline transition-colors disabled:opacity-50"
      : "border-ds-outline/50 text-ds-on-surface hover:bg-[#e8e8e8] flex flex-1 items-center justify-center gap-1 rounded-md border bg-ds-muted px-1.5 py-1.5 text-[10px] font-medium no-underline transition-colors disabled:opacity-50 min-w-0";

  return (
    <div
      className={cn(
        layout === "column" ? "mt-3 flex w-full flex-col gap-1.5" : "mt-2 flex w-full gap-1",
        className
      )}
    >
      <button
        type="button"
        disabled={disabled}
        className={buttonBase}
        onClick={() => onShowDetails(product)}
      >
        <Info className="size-3 shrink-0" aria-hidden />
        Details
      </button>
      <button
        type="button"
        disabled={disabled}
        className={buttonBase}
        onClick={() => onShowSimilar(product)}
      >
        <Sparkles className="size-3 shrink-0" aria-hidden />
        Similar
      </button>
      {disabled ? (
        <button type="button" disabled className={buttonBase}>
          <ExternalLink className="size-3 shrink-0" aria-hidden />
          View
        </button>
      ) : (
        <a
          href={product.url}
          target="_blank"
          rel="noopener noreferrer"
          className={buttonBase}
        >
          <ExternalLink className="size-3 shrink-0" aria-hidden />
          View
        </a>
      )}
    </div>
  );
}
