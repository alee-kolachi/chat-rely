import type { ComponentProps, ReactNode } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

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
    <footer className="bg-ds-surface/95 border-ds-outline fixed right-0 bottom-0 left-0 z-40 flex h-16 items-center justify-between gap-4 border-t px-4 backdrop-blur-sm md:left-64 md:px-8">
      <div className="flex min-w-0 items-center gap-3">
        {backHref ? (
          <Link
            href={backHref}
            className="text-ds-on-surface-variant hover:text-ds-on-surface inline-flex items-center gap-1.5 rounded-ds-md px-3 py-2 text-xs font-semibold tracking-wide uppercase transition-colors"
          >
            ← {backLabel}
          </Link>
        ) : (
          <span />
        )}
      </div>
      {tertiary ? <div className="hidden shrink-0 sm:block">{tertiary}</div> : null}
      <div className="flex shrink-0 items-center gap-3">
        {primaryAsButton ? (
          <button
            type="button"
            onClick={onPrimaryClick}
            disabled={primaryDisabled}
            className="bg-ds-primary text-ds-on-primary hover:bg-zinc-800 inline-flex items-center justify-center rounded-ds-md px-5 py-2.5 text-xs font-semibold tracking-wide uppercase transition-colors active:scale-[0.98] disabled:pointer-events-none disabled:opacity-45"
          >
            {primaryLabel}
          </button>
        ) : primaryDisabled || !primaryHref ? (
          <button
            type="button"
            disabled
            className="bg-ds-primary text-ds-on-primary inline-flex cursor-not-allowed items-center justify-center rounded-ds-md px-5 py-2.5 text-xs font-semibold tracking-wide uppercase opacity-45"
          >
            {primaryLabel}
          </button>
        ) : (
          <Link
            href={primaryHref}
            className="bg-ds-primary text-ds-on-primary hover:bg-zinc-800 inline-flex items-center justify-center rounded-ds-md px-5 py-2.5 text-xs font-semibold tracking-wide uppercase transition-colors active:scale-[0.98]"
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
  children,
}: {
  id?: string;
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-0">
      <label htmlFor={id} className={onboardingType.label}>
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
