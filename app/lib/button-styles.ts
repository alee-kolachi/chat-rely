import { cn } from "@/lib/utils";

export type AppButtonVariant = "default" | "primary" | "ghost" | "segment";
export type AppButtonSize = "sm" | "md";

type AppButtonClassOptions = {
  size?: AppButtonSize;
  selected?: boolean;
  className?: string;
};

/** Central button classes — keep action controls consistent across the app. */
export function appButtonClassName(
  variant: AppButtonVariant = "default",
  { size = "md", selected = false, className }: AppButtonClassOptions = {}
) {
  return cn(
    "ds-btn",
    variant === "default" && "ds-btn-default",
    variant === "primary" && "ds-btn-primary",
    variant === "ghost" && "ds-btn-ghost",
    variant === "segment" && "ds-btn-segment",
    selected && "ds-btn-selected",
    size === "sm" && "ds-btn-sm",
    className
  );
}
