"use client";

import { cn } from "@/lib/utils";

export function DemoPromptChips({
  prompts,
  disabled,
  onSelect,
}: {
  prompts: string[];
  disabled?: boolean;
  onSelect: (prompt: string) => void;
}) {
  if (!prompts.length) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {prompts.map((prompt) => (
        <button
          key={prompt}
          type="button"
          disabled={disabled}
          onClick={() => onSelect(prompt)}
          className={cn(
            "rounded-full border border-neutral-200 bg-white px-3 py-1.5 text-left text-[13px] text-neutral-700 transition-colors",
            "hover:border-neutral-300 hover:bg-neutral-50",
            disabled && "cursor-not-allowed opacity-50",
          )}
        >
          {prompt}
        </button>
      ))}
    </div>
  );
}
