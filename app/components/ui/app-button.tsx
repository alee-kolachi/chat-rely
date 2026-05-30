import Link from "next/link";
import type { ComponentPropsWithoutRef, ReactNode } from "react";
import {
  appButtonClassName,
  type AppButtonSize,
  type AppButtonVariant,
} from "@/lib/button-styles";

type AppButtonCommonProps = {
  variant?: AppButtonVariant;
  size?: AppButtonSize;
  selected?: boolean;
  className?: string;
  children: ReactNode;
};

export function AppButton({
  variant = "default",
  size = "md",
  selected = false,
  className,
  children,
  ...props
}: AppButtonCommonProps & ComponentPropsWithoutRef<"button">) {
  return (
    <button
      type="button"
      className={appButtonClassName(variant, { size, selected, className })}
      {...props}
    >
      {children}
    </button>
  );
}

export function AppButtonLink({
  variant = "default",
  size = "md",
  selected = false,
  className,
  children,
  href,
  ...props
}: AppButtonCommonProps & ComponentPropsWithoutRef<typeof Link> & { href: string }) {
  return (
    <Link
      href={href}
      className={appButtonClassName(variant, { size, selected, className })}
      {...props}
    >
      {children}
    </Link>
  );
}
