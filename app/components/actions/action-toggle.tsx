"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

type ActionToggleProps = {
  /** Controlled value when set. */
  checked?: boolean;
  defaultChecked?: boolean;
  disabled?: boolean;
  /** Saving in progress — shows feedback and blocks extra clicks. */
  pending?: boolean;
  label?: string;
  size?: "sm" | "md";
  className?: string;
  onChange?: (next: boolean) => void;
};

export function ActionToggle({
  checked: checkedProp,
  defaultChecked = false,
  disabled,
  pending = false,
  label,
  size = "sm",
  className,
  onChange,
}: ActionToggleProps) {
  const [internal, setInternal] = useState(defaultChecked);
  const isControlled = checkedProp !== undefined;
  const checked = isControlled ? Boolean(checkedProp) : internal;
  const isDisabled = Boolean(disabled) || pending;

  const dims =
    size === "md"
      ? { track: "h-6 w-11", thumb: "size-5" }
      : { track: "h-5 w-9", thumb: "size-4" };

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-busy={pending}
      aria-label={
        pending ? `${label ?? "Toggle action"}, saving` : (label ?? "Toggle action")
      }
      disabled={isDisabled}
      onClick={() => {
        if (isDisabled) return;
        const next = !checked;
        if (!isControlled) setInternal(next);
        onChange?.(next);
      }}
      className={cn(
        "inline-flex shrink-0 items-center rounded-full p-0.5 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ds-primary",
        dims.track,
        checked ? "justify-end bg-ds-primary" : "justify-start bg-ds-outline",
        pending && "cursor-wait opacity-90",
        isDisabled && !pending && "cursor-not-allowed opacity-50",
        className
      )}
    >
      <span
        aria-hidden
        className={cn(
          "relative block rounded-full bg-white shadow-sm",
          dims.thumb,
          pending && "animate-pulse"
        )}
      >
        {pending ? (
          <span className="border-ds-primary/30 absolute inset-0 rounded-full border-2 border-t-ds-primary animate-spin" />
        ) : null}
      </span>
    </button>
  );
}
