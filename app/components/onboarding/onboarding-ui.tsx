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

/**
 * Two-column onboarding steps: `<main>` in OnboardingFrame must scroll on mobile.
 * `flex-1 min-h-0` + `overflow-hidden` below `lg` clips content instead of growing scroll height.
 */
export const onboardingSplitRoot = cn(
  "max-w-6xl flex w-full flex-col max-lg:flex-none max-lg:min-h-min pt-2 md:pt-4",
  "lg:min-h-0 lg:flex-1 lg:h-full lg:max-h-full lg:items-center lg:justify-center"
);

/** Same as onboardingSplitRoot but `lg:items-stretch` (e.g. appearance + long forms). */
export const onboardingSplitRootStretch = cn(
  "max-w-6xl flex w-full flex-col max-lg:flex-none max-lg:min-h-min pt-2 md:pt-4",
  "lg:min-h-0 lg:flex-1 lg:h-full lg:max-h-full lg:items-stretch lg:justify-center"
);

export const onboardingSplitBody = cn(
  "relative flex w-full min-w-0 flex-col max-lg:flex-none max-lg:min-h-min",
  "lg:min-h-0 lg:flex-1 lg:h-full lg:items-center lg:justify-center"
);

/** White shell: mobile does not clip so full column stack adds to main scroll; desktop restores clip + radius. */
export const onboardingSplitCard = cn(
  "border-ds-outline w-full rounded-2xl border bg-white shadow-[0_20px_55px_rgba(15,23,42,0.06)]",
  "max-lg:min-h-min max-lg:overflow-visible",
  "lg:h-full lg:min-h-0 lg:overflow-hidden lg:rounded-[28px]"
);

export const onboardingSplitGrid = cn(
  "flex w-full min-w-0 flex-col max-lg:min-h-min",
  "lg:grid lg:h-full lg:min-h-0 lg:grid-cols-2"
);

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
  /** Busy state (e.g. saving): not `disabled`, so taps still reach the control; parent should no-op via refs. */
  primaryPending,
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
  primaryPending?: boolean;
  tertiary?: ReactNode;
}) {
  const controlClass =
    "touch-manipulation cursor-pointer inline-flex max-w-full min-h-11 min-w-[2.75rem] items-center justify-center rounded-ds-md px-4 py-2.5 text-[11px] font-semibold tracking-wide uppercase transition-colors [-webkit-tap-highlight-color:transparent] sm:min-h-0 sm:px-5 sm:py-2.5 sm:text-xs";
  const backClass =
    "touch-manipulation text-ds-on-surface-variant hover:text-ds-on-surface inline-flex min-h-11 min-w-0 items-center gap-1.5 rounded-ds-md px-3 py-2 text-[11px] font-semibold tracking-wide uppercase transition-colors [-webkit-tap-highlight-color:transparent] sm:min-h-0 sm:gap-2 sm:px-3 sm:text-xs";

  return (
    <footer
      className={cn(
        "bg-ds-surface/95 border-ds-outline pointer-events-auto relative z-10 flex w-full shrink-0 flex-wrap items-center justify-between gap-x-3 gap-y-2 border-t px-3 py-2.5 shadow-[0_-6px_24px_rgba(15,23,42,0.06)]",
        "min-h-[3.25rem] pb-[max(0.5rem,env(safe-area-inset-bottom,0px))] pt-2.5",
        "md:h-16 md:flex-nowrap md:gap-4 md:px-8 md:py-0 md:pb-[max(0.75rem,env(safe-area-inset-bottom,0px))] md:pt-0"
      )}
    >
      <div className="order-1 flex min-w-0 shrink items-center">
        {backHref ? (
          <Link href={backHref} className={backClass}>
            <OnboardingBackChevron className="size-4 shrink-0" />
            <span className="leading-none">{backLabel}</span>
          </Link>
        ) : (
          <span />
        )}
      </div>
      {tertiary ? (
        <div className="order-3 w-full shrink-0 sm:order-2 sm:w-auto [&:empty]:hidden">{tertiary}</div>
      ) : null}
      <div className="order-2 flex shrink-0 items-center justify-end sm:order-3">
        {primaryAsButton ? (
          <button
            type="button"
            disabled={!!primaryDisabled}
            aria-busy={primaryPending ? true : undefined}
            onClick={() => {
              if (primaryDisabled || !onPrimaryClick) return;
              onPrimaryClick();
            }}
            className={cn(
              controlClass,
              "relative isolate z-[1] bg-ds-primary text-ds-on-primary hover:bg-ds-secondary",
              "disabled:opacity-45 disabled:cursor-not-allowed",
              primaryPending && "cursor-wait opacity-80"
            )}
          >
            {primaryLabel}
          </button>
        ) : primaryDisabled || !primaryHref ? (
          <button
            type="button"
            disabled
            className={cn(controlClass, "bg-ds-primary text-ds-on-primary cursor-not-allowed opacity-45")}
          >
            {primaryLabel}
          </button>
        ) : (
          <a
            href={primaryHref}
            className={cn(controlClass, "bg-ds-primary text-ds-on-primary hover:bg-ds-secondary")}
          >
            {primaryLabel}
          </a>
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

/** Desktop: room above in-flow footer. Mobile: small tail — frame reserves space for the docked bar. */
const onboardingMainBottomPad = "max-md:pb-6 md:pb-[max(6.5rem,calc(4.5rem+env(safe-area-inset-bottom,0px)))] md:pb-28";

/** Main content column — consistent max width and bottom padding for sticky footer */
export function OnboardingMainColumn({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("mx-auto w-full min-w-0 max-w-3xl px-4 pt-8 md:px-8 md:pt-10", className, onboardingMainBottomPad)}>
      {children}
    </div>
  );
}

export function OnboardingWideColumn({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("mx-auto w-full min-w-0 max-w-6xl px-4 pt-8 md:px-8 md:pt-10", className, onboardingMainBottomPad)}>
      {children}
    </div>
  );
}
