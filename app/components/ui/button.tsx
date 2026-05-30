import type { ButtonHTMLAttributes, ReactNode } from "react";
import { AppButton } from "@/components/ui/app-button";
import type { AppButtonSize, AppButtonVariant } from "@/lib/button-styles";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  variant?: AppButtonVariant;
  size?: AppButtonSize;
  selected?: boolean;
};

/** @deprecated Prefer `<AppButton>` or `appButtonClassName()` for new code. */
export function Button({
  className,
  variant = "default",
  size = "md",
  selected = false,
  children,
  ...props
}: ButtonProps) {
  return (
    <AppButton variant={variant} size={size} selected={selected} className={className} {...props}>
      {children}
    </AppButton>
  );
}
