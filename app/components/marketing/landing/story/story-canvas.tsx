import type { ReactNode } from "react";

type StoryCanvasProps = {
  label: string;
  children: ReactNode;
  className?: string;
};

/** Square story frame used across every landing scene. */
export function StoryCanvas({ label, children, className = "h-full w-full" }: StoryCanvasProps) {
  return (
    <svg viewBox="0 0 360 360" className={className} role="img" aria-label={label} fill="none">
      {children}
    </svg>
  );
}
