"use client";

import { cn } from "@/lib/utils";
import { appButtonClassName } from "@/lib/button-styles";

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
            className={appButtonClassName("segment", {
              size: "sm",
              selected: preset === key,
            })}
          >
            {label}
          </button>
        ))}
        <button
          type="button"
          onClick={() => onPresetChange("custom")}
          className={appButtonClassName("segment", {
            size: "sm",
            selected: preset === "custom",
          })}
        >
          Custom
        </button>
      </div>
      {preset === "custom" ? (
        <div className="flex flex-wrap items-center gap-2">
          <label className="ds-app-label-muted font-medium">
            From{" "}
            <input
              type="date"
              value={customFrom}
              onChange={(e) => onCustomFromChange(e.target.value)}
              className="border-ds-outline ml-1 rounded-ds-md border px-2 py-1 text-sm"
            />
          </label>
          <label className="ds-app-label-muted font-medium">
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
