"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function SplitLayout({
  pitch,
  widget,
  widgetColumnClassName = "demo-page-widget-column",
  className,
}: {
  pitch: ReactNode;
  widget: ReactNode;
  widgetColumnClassName?: string;
  className?: string;
}) {
  return (
    <div className={cn("flex min-h-screen flex-col lg:flex-row", className)}>
      <div
        className={cn(
          "flex min-h-[min(720px,85vh)] flex-1 flex-col items-center justify-center px-4 py-8 sm:px-6 lg:w-[55%] lg:min-h-screen lg:py-10",
          widgetColumnClassName,
        )}
      >
        {widget}
      </div>
      <div className="flex min-h-0 flex-col lg:w-[45%] lg:min-h-screen">{pitch}</div>
    </div>
  );
}
