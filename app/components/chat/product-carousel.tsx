"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

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
        loading="lazy"
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

export function ProductCarousel({
  products,
  disabled,
  onShowDetails,
  onShowSimilar,
  className,
}: {
  products: ProductCard[];
  disabled?: boolean;
  onShowDetails: (product: ProductCard) => void;
  onShowSimilar: (product: ProductCard) => void;
  className?: string;
}) {
  const scrollerRef = useRef<HTMLUListElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateScrollHints = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const maxScroll = el.scrollWidth - el.clientWidth;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(maxScroll - el.scrollLeft > 4);
  }, []);

  useEffect(() => {
    updateScrollHints();
    const el = scrollerRef.current;
    if (!el) return;
    el.addEventListener("scroll", updateScrollHints, { passive: true });
    const observer = new ResizeObserver(updateScrollHints);
    observer.observe(el);
    return () => {
      el.removeEventListener("scroll", updateScrollHints);
      observer.disconnect();
    };
  }, [products, updateScrollHints]);

  const scrollByPage = (direction: "left" | "right") => {
    const el = scrollerRef.current;
    if (!el) return;
    const amount = Math.max(160, Math.floor(el.clientWidth * 0.85));
    el.scrollBy({ left: direction === "left" ? -amount : amount, behavior: "smooth" });
  };

  if (products.length === 0) return null;

  return (
    <div className={cn("relative w-full min-w-0", className)}>
      {canScrollLeft ? (
        <button
          type="button"
          className="border-ds-outline bg-ds-surface/95 text-ds-on-surface absolute left-0 top-1/2 z-10 flex size-7 -translate-y-1/2 items-center justify-center rounded-full border shadow-sm"
          aria-label="Scroll products left"
          onClick={() => scrollByPage("left")}
        >
          <ChevronLeft className="size-4" />
        </button>
      ) : null}
      {canScrollRight ? (
        <button
          type="button"
          className="border-ds-outline bg-ds-surface/95 text-ds-on-surface absolute right-0 top-1/2 z-10 flex size-7 -translate-y-1/2 items-center justify-center rounded-full border shadow-sm"
          aria-label="Scroll products right"
          onClick={() => scrollByPage("right")}
        >
          <ChevronRight className="size-4" />
        </button>
      ) : null}
      <ul
        ref={scrollerRef}
        className={cn(
          "flex snap-x snap-mandatory gap-3 overflow-x-auto py-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
          canScrollLeft ? "pl-8" : "",
          canScrollRight ? "pr-8" : ""
        )}
        aria-label="Products"
      >
        {products.map((product) => (
          <li
            key={product.handle}
            className="border-ds-outline w-[168px] shrink-0 snap-start overflow-hidden rounded-xl border bg-white shadow-sm"
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
                disabled={disabled}
                onShowDetails={onShowDetails}
                onShowSimilar={onShowSimilar}
                layout="column"
              />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
