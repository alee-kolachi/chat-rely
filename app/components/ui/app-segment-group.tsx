"use client";

import type { ReactNode } from "react";
import { appButtonClassName } from "@/lib/button-styles";
import { cn } from "@/lib/utils";

type AppSegmentGroupProps = {
  "aria-label"?: string;
  "aria-labelledby"?: string;
  className?: string;
  /** Single choice (radiogroup) or multi toggle (group). */
  mode?: "single" | "multiple";
  children: ReactNode;
};

export function AppSegmentGroup({
  "aria-label": ariaLabel,
  "aria-labelledby": ariaLabelledBy,
  className,
  mode = "single",
  children,
}: AppSegmentGroupProps) {
  return (
    <div
      role={mode === "multiple" ? "group" : "radiogroup"}
      aria-label={ariaLabel}
      aria-labelledby={ariaLabelledBy}
      className={cn(
        "border-ds-outline bg-ds-sidebar inline-flex w-full max-w-full flex-col gap-1 rounded-ds-md border p-1 sm:w-fit sm:flex-row sm:flex-wrap sm:gap-1",
        className
      )}
    >
      {children}
    </div>
  );
}

type AppSegmentOptionProps = {
  selected: boolean;
  onSelect: () => void;
  children: ReactNode;
  className?: string;
  /** Use for multi-select toggles inside a group. */
  toggle?: boolean;
};

export function AppSegmentOption({
  selected,
  onSelect,
  children,
  className,
  toggle = false,
}: AppSegmentOptionProps) {
  return (
    <button
      type="button"
      role={toggle ? undefined : "radio"}
      aria-checked={toggle ? undefined : selected}
      aria-pressed={toggle ? selected : undefined}
      onClick={onSelect}
      className={appButtonClassName("segment", {
        size: "sm",
        selected,
        className: cn("w-full sm:w-auto sm:min-w-[3.25rem]", !toggle && "sm:flex-1 sm:min-w-[5.5rem]", className),
      })}
    >
      {children}
    </button>
  );
}

type AppSegmentGroupSimpleProps<T extends string> = {
  value: T;
  onChange: (value: T) => void;
  options: ReadonlyArray<{ value: T; label: string }>;
  "aria-label"?: string;
  "aria-labelledby"?: string;
  className?: string;
};

export function AppSegmentGroupSimple<T extends string>({
  value,
  onChange,
  options,
  "aria-label": ariaLabel,
  "aria-labelledby": ariaLabelledBy,
  className,
}: AppSegmentGroupSimpleProps<T>) {
  return (
    <AppSegmentGroup aria-label={ariaLabel} aria-labelledby={ariaLabelledBy} className={className}>
      {options.map((option) => (
        <AppSegmentOption
          key={option.value}
          selected={value === option.value}
          onSelect={() => onChange(option.value)}
        >
          {option.label}
        </AppSegmentOption>
      ))}
    </AppSegmentGroup>
  );
}
