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

function ProductDetailSpecRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2 text-xs leading-snug">
      <span className="text-ds-on-surface-variant w-14 shrink-0">{label}</span>
      <span className="text-ds-on-surface min-w-0">{value}</span>
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
  const descriptionPoints =
    product.description_points && product.description_points.length > 0
      ? product.description_points
      : null;

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
          <div
            className={cn(
              "bg-ds-sidebar aspect-square w-full overflow-hidden",
              embedded ? "max-h-72" : "max-h-56",
            )}
          >
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
        <div
          className={cn(
            "bg-ds-sidebar text-ds-on-surface-variant flex aspect-square w-full items-center justify-center text-sm",
            embedded ? "max-h-72" : "max-h-56",
          )}
        >
          No image
        </div>
      )}
      <div className="pt-2">
        <p className="text-ds-on-surface text-sm font-semibold leading-snug">{product.title}</p>
        {product.price ? (
          <p className="text-ds-on-surface mt-1 text-sm font-medium">{product.price}</p>
        ) : null}
        {(product.vendor || product.sku) && (
          <dl className="border-ds-outline/60 mt-2 space-y-1 border-t pt-2">
            {product.vendor ? <ProductDetailSpecRow label="Brand" value={product.vendor} /> : null}
            {product.product_type ? (
              <ProductDetailSpecRow label="Type" value={product.product_type} />
            ) : null}
            {product.sku ? <ProductDetailSpecRow label="SKU" value={product.sku} /> : null}
          </dl>
        )}
        {descriptionPoints ? (
          <div className="mt-3">
            <p className="text-ds-on-surface text-xs font-semibold uppercase tracking-wide">Details</p>
            <ul className="text-ds-on-surface mt-1.5 list-disc space-y-1 pl-4 text-sm leading-relaxed">
              {descriptionPoints.map((point) => (
                <li key={point}>{point}</li>
              ))}
            </ul>
          </div>
        ) : product.description ? (
          <div className="mt-3">
            <p className="text-ds-on-surface text-xs font-semibold uppercase tracking-wide">Details</p>
            <p className="text-ds-on-surface mt-1.5 text-sm leading-relaxed">{product.description}</p>
          </div>
        ) : null}
        {product.options?.map((option) => (
          <div key={option.name} className="mt-3">
            <p className="text-ds-on-surface text-xs font-semibold uppercase tracking-wide">
              {option.name}
            </p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {option.values.map((value) => (
                <span
                  key={value}
                  className="border-ds-outline text-ds-on-surface rounded-full border bg-ds-muted px-2.5 py-0.5 text-[11px] font-medium"
                >
                  {value}
                </span>
              ))}
            </div>
          </div>
        ))}
        <ProductCardActions
          product={product}
          disabled={disabled}
          onShowDetails={onShowDetails}
          onShowSimilar={onShowSimilar}
          layout="column"
          hideDetails
        />
      </div>
    </div>
  );
}
