"use client";

import { useEffect, useRef, useState } from "react";

export function useScrollProgress<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    let frame = 0;

    const update = () => {
      frame = 0;
      const el = ref.current;
      if (!el) return;

      const viewport = window.innerHeight;
      const scrollable = el.offsetHeight - viewport;
      if (scrollable <= 0) {
        setProgress(0);
        return;
      }

      const docTop = el.getBoundingClientRect().top + window.scrollY;
      const scrollY = window.scrollY;

      if (scrollY <= docTop) {
        setProgress(0);
        return;
      }
      if (scrollY >= docTop + scrollable) {
        setProgress(1);
        return;
      }

      setProgress((scrollY - docTop) / scrollable);
    };

    const onScroll = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  return { ref, progress };
}
