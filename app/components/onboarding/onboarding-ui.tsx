import type { ComponentProps, ReactNode } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

function OnboardingBackChevron({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="m15 18-6-6 6-6" />
    </svg>
  );
}

/** Shared typography + spacing for all onboarding main content */
export const onboardingType = {
  kicker: "text-ds-on-surface-variant text-[11px] font-semibold uppercase tracking-[0.18em]",
  title: "text-ds-on-surface text-2xl font-semibold tracking-tight md:text-3xl",
  subtitle: "text-ds-on-surface-variant mt-2 max-w-2xl text-sm leading-relaxed md:text-base",
  sectionLabel: "text-ds-on-surface text-sm font-semibold",
  body: "text-ds-on-surface-variant text-sm leading-relaxed md:text-base",
  label: "text-ds-on-surface mb-1.5 block text-xs font-semibold",
  hint: "text-ds-on-surface-variant mt-1.5 text-xs leading-relaxed",
} as const;

export function OnboardingPageHeader({
  kicker,
  title,
  subtitle,
  className,
}: {
  kicker?: string;
  title: string;
  subtitle?: string;
  className?: string;
}) {
  return (
    <header className={cn("mb-8 md:mb-10", className)}>
      {kicker ? <p className={onboardingType.kicker}>{kicker}</p> : null}
      <h1 className={cn(onboardingType.title, kicker && "mt-2")}>{title}</h1>
      {subtitle ? <p className={onboardingType.subtitle}>{subtitle}</p> : null}
    </header>
  );
}

export function OnboardingSectionCard({
  children,
  className,
  padding = "p-6 md:p-8",
}: {
  children: ReactNode;
  className?: string;
  padding?: string;
}) {
  return (
    <section
      className={cn(
        "border-ds-outline rounded-ds-lg border bg-ds-surface shadow-sm",
        padding,
        className
      )}
    >
      {children}
    </section>
  );
}

export function OnboardingStickyFooter({
  backHref,
  backLabel = "Back",
  primaryHref,
  primaryLabel,
  primaryAsButton,
  onPrimaryClick,
  primaryDisabled,
  tertiary,
}: {
  backHref?: string;
  backLabel?: string;
  primaryHref?: string;
  primaryLabel: string;
  primaryAsButton?: boolean;
  onPrimaryClick?: () => void;
  /** When true, primary renders as disabled button (e.g. validation). */
  primaryDisabled?: boolean;
  tertiary?: ReactNode;
}) {
  return (
    <footer className="bg-ds-surface/95 border-ds-outline fixed right-0 bottom-0 left-0 z-40 flex min-h-16 w-full flex-wrap items-center justify-between gap-x-3 gap-y-2 border-t px-3 py-3 backdrop-blur-sm pb-[max(0.75rem,env(safe-area-inset-bottom,0px))] pt-3 md:left-64 md:h-16 md:flex-nowrap md:gap-4 md:px-8 md:py-0 md:pb-0 md:pt-0">
      <div className="order-1 flex min-w-0 shrink items-center">
        {backHref ? (
          <Link
            href={backHref}
            className="text-ds-on-surface-variant hover:text-ds-on-surface inline-flex min-w-0 items-center gap-1.5 rounded-ds-md px-2 py-2 text-[11px] font-semibold tracking-wide uppercase transition-colors sm:gap-2 sm:px-3 sm:text-xs"
          >
            <OnboardingBackChevron className="size-4 shrink-0" />
            <span className="leading-none">{backLabel}</span>
          </Link>
        ) : (
          <span />
        )}
      </div>
      {tertiary ? <div className="order-3 hidden w-full shrink-0 sm:order-2 sm:block sm:w-auto">{tertiary}</div> : null}
      <div className="order-2 flex shrink-0 items-center justify-end sm:order-3">
        {primaryAsButton ? (
          <button
            type="button"
            onClick={onPrimaryClick}
            disabled={primaryDisabled}
            className="bg-ds-primary text-ds-on-primary hover:bg-ds-secondary inline-flex max-w-full items-center justify-center rounded-ds-md px-3 py-2 text-[10px] font-semibold tracking-wide uppercase transition-colors active:scale-[0.98] disabled:pointer-events-none disabled:opacity-45 sm:px-5 sm:py-2.5 sm:text-xs"
          >
            {primaryLabel}
          </button>
        ) : primaryDisabled || !primaryHref ? (
          <button
            type="button"
            disabled
            className="bg-ds-primary text-ds-on-primary inline-flex max-w-full cursor-not-allowed items-center justify-center rounded-ds-md px-3 py-2 text-[10px] font-semibold tracking-wide uppercase opacity-45 sm:px-5 sm:py-2.5 sm:text-xs"
          >
            {primaryLabel}
          </button>
        ) : (
          <Link
            href={primaryHref}
            className="bg-ds-primary text-ds-on-primary hover:bg-ds-secondary inline-flex max-w-full items-center justify-center rounded-ds-md px-3 py-2 text-[10px] font-semibold tracking-wide uppercase transition-colors active:scale-[0.98] sm:px-5 sm:py-2.5 sm:text-xs"
          >
            {primaryLabel}
          </Link>
        )}
      </div>
    </footer>
  );
}

export function OnboardingFieldRow({
  id,
  label,
  hint,
  labelClassName,
  children,
}: {
  id?: string;
  label: string;
  hint?: string;
  labelClassName?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-0">
      <label htmlFor={id} className={cn(onboardingType.label, labelClassName)}>
        {label}
      </label>
      {children}
      {hint ? <p className={onboardingType.hint}>{hint}</p> : null}
    </div>
  );
}

export function OnboardingInput({ className, ...props }: ComponentProps<"input">) {
  return (
    <input
      className={cn(
        "border-ds-outline focus:border-ds-primary focus:ring-ds-primary/15 placeholder:text-ds-on-surface-variant/70 w-full rounded-ds-md border bg-white px-4 py-3 text-sm outline-none transition-[box-shadow,border-color] focus:ring-2",
        className
      )}
      {...props}
    />
  );
}

export function OnboardingStatusBlock({
  variant,
  title,
  description,
  children,
}: {
  variant: "processing" | "success" | "pending" | "neutral";
  title: string;
  description?: string;
  children?: ReactNode;
}) {
  const styles = {
    processing: "border-ds-outline bg-ds-sidebar",
    success: "border-emerald-200 bg-emerald-50/60",
    pending: "border-dashed border-ds-outline bg-ds-sidebar/80",
    neutral: "border-ds-outline bg-ds-sidebar",
  }[variant];

  return (
    <div className={cn("rounded-ds-md border p-4", styles)}>
      <p className="text-ds-on-surface text-sm font-semibold">{title}</p>
      {description ? <p className="text-ds-on-surface-variant mt-1 text-xs leading-relaxed">{description}</p> : null}
      {children}
    </div>
  );
}

/** Main content column — consistent max width and bottom padding for sticky footer */
export function OnboardingMainColumn({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("mx-auto w-full max-w-3xl px-4 pb-24 pt-8 md:px-8 md:pb-28 md:pt-10", className)}>
      {children}
    </div>
  );
}

export function OnboardingWideColumn({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("mx-auto w-full max-w-6xl px-4 pb-24 pt-8 md:px-8 md:pb-28 md:pt-10", className)}>
      {children}
    </div>
  );
}
