"use client";

import { ProductCardActions } from "@/components/chat/product-card-actions";
import { cn } from "@/lib/utils";
import type { ProductCard } from "@/lib/product-card";

function ProductCardImage({ product }: { product: ProductCard }) {
  const src = product.image_url?.trim();
  if (src) {
    return (
      <img
        src={src}
        alt=""
        className="bg-ds-sidebar aspect-square w-full object-cover"
        loading="eager"
        decoding="sync"
        fetchPriority="high"
      />
    );
  }
  return (
    <div
      className="bg-ds-sidebar text-ds-on-surface-variant flex aspect-square w-full items-center justify-center text-xs"
      aria-hidden
    >
      No image
    </div>
  );
}

/** Landing demos only: static cards, no scroll controls or scroll animation. */
export function LandingProductCarousel({
  products,
  className,
}: {
  products: ProductCard[];
  className?: string;
}) {
  if (products.length === 0) return null;

  return (
    <div className={cn("relative w-full min-w-0 overflow-hidden", className)}>
      <ul className="flex gap-3 py-1" aria-label="Products">
        {products.map((product) => (
          <li
            key={product.handle}
            className="border-ds-outline w-[168px] shrink-0 overflow-hidden rounded-xl border bg-white shadow-sm"
          >
            <ProductCardImage product={product} />
            <div className="px-2.5 py-2">
              <p className="text-ds-on-surface line-clamp-2 text-xs font-medium leading-snug">
                {product.title}
              </p>
              {product.price ? (
                <p className="text-ds-on-surface-variant mt-1 text-xs">{product.price}</p>
              ) : null}
              <ProductCardActions
                product={product}
                disabled
                onShowDetails={() => {}}
                onShowSimilar={() => {}}
                layout="column"
              />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function preloadLandingProductImages(products: ProductCard[]) {
  for (const product of products) {
    const src = product.image_url?.trim();
    if (!src) continue;
    const img = new Image();
    img.src = src;
  }
}
