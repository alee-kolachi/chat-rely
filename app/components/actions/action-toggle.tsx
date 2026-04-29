"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

type ActionToggleProps = {
  defaultChecked: boolean;
  disabled?: boolean;
  label?: string;
  size?: "sm" | "md";
  onChange?: (next: boolean) => void;
};

export function ActionToggle({
  defaultChecked,
  disabled,
  label,
  size = "sm",
  onChange,
}: ActionToggleProps) {
  const [checked, setChecked] = useState(defaultChecked);
  const isDisabled = Boolean(disabled);

  const dims =
    size === "md"
      ? { track: "h-6 w-11", thumb: "h-5 w-5", on: "translate-x-5" }
      : { track: "h-5 w-9", thumb: "h-4 w-4", on: "translate-x-4" };

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label ?? "Toggle action"}
      disabled={isDisabled}
      onClick={() => {
        if (isDisabled) return;
        const next = !checked;
        setChecked(next);
        onChange?.(next);
      }}
      className={cn(
        "flex items-center rounded-full p-[2px] transition-colors",
        dims.track,
        checked ? "bg-ds-primary" : "bg-ds-outline",
        isDisabled && "cursor-not-allowed opacity-50"
      )}
    >
      <span
        className={cn(
          "rounded-full bg-white shadow-sm transition-transform",
          dims.thumb,
          checked ? dims.on : "translate-x-0"
        )}
      />
    </button>
  );
}
