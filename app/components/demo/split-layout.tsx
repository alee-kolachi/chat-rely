"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function SplitLayout({
  pitch,
  widget,
  className,
}: {
  pitch: ReactNode;
  widget: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex min-h-screen flex-col lg:flex-row", className)}>
      <div className="flex min-h-[min(720px,85vh)] flex-1 flex-col items-center justify-center bg-neutral-100 px-4 py-8 sm:px-6 lg:w-[55%] lg:min-h-screen lg:py-10">
        {widget}
      </div>
      <div className="flex min-h-0 flex-col lg:w-[45%] lg:min-h-screen">{pitch}</div>
    </div>
  );
}
