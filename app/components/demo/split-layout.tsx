"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function SplitLayout({
  pitch,
  widget,
  widgetColumnBackground,
  className,
}: {
  pitch: ReactNode;
  widget: ReactNode;
  widgetColumnBackground?: string;
  className?: string;
}) {
  return (
    <div className={cn("flex min-h-screen flex-col lg:flex-row", className)}>
      <div
        className="flex min-h-[min(720px,85vh)] flex-1 flex-col items-center justify-center px-4 py-8 sm:px-6 lg:w-[55%] lg:min-h-screen lg:py-10"
        style={
          widgetColumnBackground
            ? { backgroundColor: widgetColumnBackground }
            : undefined
        }
      >
        {widget}
      </div>
      <div className="flex min-h-0 flex-col lg:w-[45%] lg:min-h-screen">{pitch}</div>
    </div>
  );
}
