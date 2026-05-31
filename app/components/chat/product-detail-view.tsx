"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { ProductCardActions } from "@/components/chat/product-card-actions";
import { cn } from "@/lib/utils";
import type { ProductCard, ProductDetail } from "@/lib/product-card";

function ProductDetailThumbs({
  images,
  activeIndex,
  onSelect,
}: {
  images: string[];
  activeIndex: number;
  onSelect: (index: number) => void;
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
  }, [images, updateScrollHints]);

  const scrollByPage = (direction: "left" | "right") => {
    const el = scrollerRef.current;
    if (!el) return;
    const amount = Math.max(120, Math.floor(el.clientWidth * 0.85));
    el.scrollBy({ left: direction === "left" ? -amount : amount, behavior: "smooth" });
  };

  return (
    <div className="relative w-full min-w-0 pt-2">
      {canScrollLeft ? (
        <button
          type="button"
          className="border-ds-outline bg-ds-surface/95 text-ds-on-surface absolute left-0 top-1/2 z-10 flex size-7 -translate-y-1/2 items-center justify-center rounded-full border shadow-sm"
          aria-label="Scroll images left"
          onClick={() => scrollByPage("left")}
        >
          <ChevronLeft className="size-4" />
        </button>
      ) : null}
      {canScrollRight ? (
        <button
          type="button"
          className="border-ds-outline bg-ds-surface/95 text-ds-on-surface absolute right-0 top-1/2 z-10 flex size-7 -translate-y-1/2 items-center justify-center rounded-full border shadow-sm"
          aria-label="Scroll images right"
          onClick={() => scrollByPage("right")}
        >
          <ChevronRight className="size-4" />
        </button>
      ) : null}
      <ul
        ref={scrollerRef}
        className={cn(
          "flex snap-x snap-mandatory gap-2 overflow-x-auto py-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
          canScrollLeft ? "pl-8" : "",
          canScrollRight ? "pr-8" : ""
        )}
        aria-label="Product images"
      >
        {images.map((url, index) => (
          <li key={`${url}-${index}`} className="shrink-0 snap-start">
            <button
              type="button"
              className={cn(
                "size-14 overflow-hidden rounded-md border",
                index === activeIndex ? "border-ds-primary" : "border-ds-outline"
              )}
              onClick={() => onSelect(index)}
              aria-label={`Show image ${index + 1}`}
            >
              <img src={url} alt="" className="h-full w-full object-cover" loading="lazy" />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function ProductDetailView({
  product,
  disabled,
  onShowDetails,
  onShowSimilar,
  className,
  embedded,
}: {
  product: ProductDetail;
  disabled?: boolean;
  onShowDetails: (product: ProductCard) => void;
  onShowSimilar: (product: ProductCard) => void;
  className?: string;
  embedded?: boolean;
}) {
  const images =
    product.image_urls.length > 0
      ? product.image_urls
      : product.image_url
        ? [product.image_url]
        : [];
  const [activeIndex, setActiveIndex] = useState(0);
  const active = images[activeIndex] ?? null;

  return (
    <div
      className={cn(
        "w-full min-w-0",
        embedded ? "" : "mt-3 overflow-hidden rounded-xl border border-ds-outline bg-white shadow-sm",
        className
      )}
    >
      {images.length > 0 ? (
        <div>
          <div className="bg-ds-sidebar aspect-square max-h-56 w-full overflow-hidden">
            {active ? (
              <img src={active} alt="" className="h-full w-full object-cover" loading="lazy" />
            ) : null}
          </div>
          {images.length > 1 ? (
            <ProductDetailThumbs
              images={images}
              activeIndex={activeIndex}
              onSelect={setActiveIndex}
            />
          ) : null}
        </div>
      ) : (
        <div className="bg-ds-sidebar text-ds-on-surface-variant flex aspect-square max-h-56 w-full items-center justify-center text-sm">
          No image
        </div>
      )}
      <div className="pt-2">
        <p className="text-ds-on-surface text-sm font-semibold leading-snug">{product.title}</p>
        {product.price ? (
          <p className="text-ds-on-surface-variant mt-1 text-sm">{product.price}</p>
        ) : null}
        <ProductCardActions
          product={product}
          disabled={disabled}
          onShowDetails={onShowDetails}
          onShowSimilar={onShowSimilar}
          layout="column"
        />
      </div>
    </div>
  );
}
