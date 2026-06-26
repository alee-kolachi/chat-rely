"use client";

import { DemoProductCard } from "@/components/demo/demo-product-card";
import type { ProductCard } from "@/lib/product-card";
import { cn } from "@/lib/utils";

export function DemoProductRow({
  products,
  onSelect,
  disabled,
  className,
  compact = false,
  brandColorHex,
}: {
  products: ProductCard[];
  onSelect?: (product: ProductCard) => void;
  disabled?: boolean;
  className?: string;
  compact?: boolean;
  brandColorHex?: string | null;
}) {
  if (!products.length) return null;

  return (
    <div
      className={cn(
        "flex gap-2.5 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        className,
      )}
      aria-label="Products"
    >
      {products.map((product) => (
        <DemoProductCard
          key={product.handle}
          product={product}
          onSelect={onSelect}
          disabled={disabled}
          compact={compact}
          brandColorHex={brandColorHex}
        />
      ))}
    </div>
  );
}
