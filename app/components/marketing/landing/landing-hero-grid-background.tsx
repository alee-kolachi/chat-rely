"use client";

import { useLayoutEffect, useState } from "react";
import { IsoGridPattern } from "@/components/marketing/iso-grid-pattern";

/** Isometric grid for md+ only: fades out before the hero copy so text stays readable. */
export function LandingHeroGridBackground() {
  const [layout, setLayout] = useState<{ height: number; mask: string } | null>(null);

  useLayoutEffect(() => {
    const measure = () => {
      if (!window.matchMedia("(min-width: 768px)").matches) {
        setLayout(null);
        return;
      }

      const section = document.querySelector<HTMLElement>("[data-hero-section]");
      const subcopy = document.querySelector<HTMLElement>("[data-hero-subcopy]");
      if (!section || !subcopy) return;

      const sectionRect = section.getBoundingClientRect();
      const subcopyRect = subcopy.getBoundingClientRect();
      const stacked = window.matchMedia("(max-width: 1023px)").matches;

      const height = stacked
        ? Math.max(160, subcopyRect.bottom - sectionRect.top + 8)
        : Math.max(200, sectionRect.height);

      const copyRightPct = ((subcopyRect.right - sectionRect.left) / sectionRect.width) * 100;
      const fadeEnd = Math.min(Math.max(100 - copyRightPct, 0), 100);
      const fadeStart = Math.max(fadeEnd - 10, 0);
      const mask = `linear-gradient(to left, #000 0%, #000 ${fadeStart}%, transparent ${fadeEnd}%)`;

      setLayout({ height, mask });
    };

    measure();

    const section = document.querySelector<HTMLElement>("[data-hero-section]");
    const subcopy = document.querySelector<HTMLElement>("[data-hero-subcopy]");
    const ro = new ResizeObserver(measure);
    if (section) ro.observe(section);
    if (subcopy) ro.observe(subcopy);

    window.addEventListener("resize", measure);
    document.fonts?.ready.then(measure).catch(() => undefined);

    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, []);

  if (layout === null) return null;

  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-x-0 top-0 z-0 hidden overflow-hidden opacity-[0.32] md:block"
      style={{
        height: layout.height,
        WebkitMaskImage: layout.mask,
        maskImage: layout.mask,
      }}
    >
      <IsoGridPattern id="hero-iso-grid" className="h-full w-full" preserveAspectRatio="xMaxYMin slice" />
    </div>
  );
}
