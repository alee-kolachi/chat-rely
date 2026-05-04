"use client";

import { cn } from "@/lib/utils";

export type RangePreset = "7d" | "30d" | "90d" | "365d" | "custom";

export const RANGE_PRESETS: { key: RangePreset; label: string }[] = [
  { key: "7d", label: "Last 7 days" },
  { key: "30d", label: "30 days" },
  { key: "90d", label: "3 months" },
  { key: "365d", label: "1 year" },
];

type DashboardRangePickerProps = {
  preset: RangePreset;
  onPresetChange: (p: RangePreset) => void;
  customFrom: string;
  customTo: string;
  onCustomFromChange: (v: string) => void;
  onCustomToChange: (v: string) => void;
  className?: string;
};

export function DashboardRangePicker({
  preset,
  onPresetChange,
  customFrom,
  customTo,
  onCustomFromChange,
  onCustomToChange,
  className,
}: DashboardRangePickerProps) {
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="border-ds-outline bg-ds-surface inline-flex w-fit flex-wrap items-center gap-1 rounded-ds-lg border p-1 shadow-sm">
        {RANGE_PRESETS.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => onPresetChange(key)}
            className={cn(
              "rounded-ds-md px-3 py-1.5 text-sm font-medium transition-colors",
              preset === key
                ? "bg-ds-primary text-ds-on-primary shadow-sm"
                : "text-ds-on-surface-variant hover:text-ds-on-surface"
            )}
          >
            {label}
          </button>
        ))}
        <button
          type="button"
          onClick={() => onPresetChange("custom")}
          className={cn(
            "rounded-ds-md px-3 py-1.5 text-sm font-medium transition-colors",
            preset === "custom"
              ? "bg-ds-primary text-ds-on-primary shadow-sm"
              : "text-ds-on-surface-variant hover:text-ds-on-surface"
          )}
        >
          Custom
        </button>
      </div>
      {preset === "custom" ? (
        <div className="flex flex-wrap items-center gap-2">
          <label className="text-ds-on-surface-variant text-xs font-medium">
            From{" "}
            <input
              type="date"
              value={customFrom}
              onChange={(e) => onCustomFromChange(e.target.value)}
              className="border-ds-outline ml-1 rounded-ds-md border px-2 py-1 text-sm"
            />
          </label>
          <label className="text-ds-on-surface-variant text-xs font-medium">
            To{" "}
            <input
              type="date"
              value={customTo}
              onChange={(e) => onCustomToChange(e.target.value)}
              className="border-ds-outline ml-1 rounded-ds-md border px-2 py-1 text-sm"
            />
          </label>
        </div>
      ) : null}
    </div>
  );
}
