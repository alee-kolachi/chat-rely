"use client";

import { createPortal } from "react-dom";
import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export type InfoHintPlacement = "top" | "right";

type InfoHintProps = {
  text: string;
  /** Accessible name for the control (e.g. field or pricing row label). */
  labelFor: string;
  placement?: InfoHintPlacement;
  /** Use on dark / highlighted surfaces (e.g. Standard plan card). */
  highlighted?: boolean;
  className?: string;
};

/**
 * Info (i) control — shows guidance on hover and keyboard focus.
 */
export function InfoHint({
  text,
  labelFor,
  placement = "top",
  highlighted = false,
  className,
}: InfoHintProps) {
  const btnRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [rect, setRect] = useState<DOMRect | null>(null);

  const measure = useCallback(() => {
    const el = btnRef.current;
    if (!el) return;
    setRect(el.getBoundingClientRect());
  }, []);

  const show = useCallback(() => {
    measure();
    setOpen(true);
  }, [measure]);

  const hide = useCallback(() => {
    setOpen(false);
    setRect(null);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onReposition = () => {
      measure();
    };
    window.addEventListener("scroll", hide, true);
    window.addEventListener("resize", onReposition);
    return () => {
      window.removeEventListener("scroll", hide, true);
      window.removeEventListener("resize", onReposition);
    };
  }, [open, hide, measure]);

  const btnCls = highlighted
    ? "text-white/70 hover:text-white focus-visible:ring-white/80"
    : "text-ds-on-surface-variant hover:text-ds-primary focus-visible:ring-ds-primary";

  const bubbleBase =
    "pointer-events-none fixed z-[99999] w-max max-w-[min(20rem,calc(100vw-1.5rem))] rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-left text-sm leading-snug text-zinc-800 shadow-xl";

  return (
    <>
      <span className={cn("relative ml-0.5 inline-flex shrink-0 align-middle", className)}>
        <button
          ref={btnRef}
          type="button"
          onPointerEnter={show}
          onPointerLeave={hide}
          onFocus={show}
          onBlur={hide}
          className={cn(
            "inline-flex size-5 cursor-pointer items-center justify-center rounded-full outline-none focus-visible:ring-2",
            btnCls,
          )}
          aria-label={`More about ${labelFor}`}
        >
          <svg viewBox="0 0 20 20" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
            <circle cx="10" cy="10" r="7.25" />
            <path strokeLinecap="round" d="M10 14V9.25M10 6.75h.01" />
          </svg>
        </button>
      </span>
      {open && rect && typeof document !== "undefined"
        ? createPortal(
            <span
              role="tooltip"
              className={bubbleBase}
              style={
                placement === "right"
                  ? {
                      left: rect.right + 10,
                      top: rect.top + rect.height / 2,
                      transform: "translateY(-50%)",
                    }
                  : {
                      left: rect.left + rect.width / 2,
                      top: rect.top - 10,
                      transform: "translate(-50%, -100%)",
                    }
              }
            >
              {text}
            </span>,
            document.body,
          )
        : null}
    </>
  );
}
