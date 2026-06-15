"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Check, Menu, X } from "lucide-react";
import { ChatRelyWordmark } from "@/components/branding/chat-rely-wordmark";
import { COMPANY_CONTACT_EMAIL } from "@/components/marketing/company-page-shell";
import { OnboardingIndexingProgress } from "@/components/onboarding/onboarding-indexing-progress";
import { useOnboardingIndexingStatus } from "@/lib/use-onboarding-indexing-status";
import { cn } from "@/lib/utils";

export const onboardingMenuItems = [
  "Agent Name",
  "Knowledge Base",
  "Connection",
  "Agent Preview",
  "Appearance & Tone",
] as const;

type OnboardingMenuItem = (typeof onboardingMenuItems)[number];

const onboardingItemRoutes: Record<OnboardingMenuItem, string> = {
  "Agent Name": "/onboarding",
  "Knowledge Base": "/onboarding/knowledge-base",
  Connection: "/onboarding/connection",
  "Appearance & Tone": "/onboarding/appearance-tone",
  "Agent Preview": "/onboarding/agent-preview",
};

function onboardingNavHref(route: string, linkAgentId: string | null | undefined) {
  if (!linkAgentId) return route;
  return `${route}?agentId=${encodeURIComponent(linkAgentId)}`;
}

export function OnboardingStepIndicator({
  completed,
  className,
}: {
  completed: boolean;
  className?: string;
}) {
  if (completed) {
    return (
      <span
        className={cn(
          "bg-ds-primary text-ds-on-primary inline-flex size-4 shrink-0 items-center justify-center rounded-full",
          className,
        )}
        aria-hidden
      >
        <Check className="size-2.5" strokeWidth={2.5} />
      </span>
    );
  }

  return (
    <span
      className={cn(
        "border-ds-outline inline-flex size-4 shrink-0 rounded-full border border-dashed",
        className,
      )}
      aria-hidden
    />
  );
}

export function OnboardingFrame({
  activeItem,
  stepLabel,
  completedItems = [],
  linkAgentId,
  hideIndexingBanner = false,
  children,
  footer,
}: {
  activeItem: OnboardingMenuItem;
  stepLabel: string;
  completedItems?: OnboardingMenuItem[];
  /** Preserves `?agentId=` on sidebar navigation between steps. */
  linkAgentId?: string | null;
  /** Step 2 shows crawl progress on the website card instead of the header bar. */
  hideIndexingBanner?: boolean;
  children: ReactNode;
  /** Docked at the bottom of the main column (inside scrolling layout) so the bar stays tappable on mobile. */
  footer?: ReactNode;
}) {
  const { snapshot, showBanner } = useOnboardingIndexingStatus(linkAgentId);
  const [isStepsOpen, setIsStepsOpen] = useState(false);
  const stepNumber = onboardingMenuItems.indexOf(activeItem) + 1;
  const totalSteps = onboardingMenuItems.length;

  useEffect(() => {
    if (!isStepsOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isStepsOpen]);

  const mobileStepsMenu = isStepsOpen ? (
    <div className="fixed inset-0 z-[200] md:hidden" role="dialog" aria-modal="true">
      <button
        type="button"
        aria-label="Close setup steps"
        className="absolute inset-0 bg-black/45 touch-manipulation"
        onClick={() => setIsStepsOpen(false)}
      />
      <aside className="border-ds-outline bg-ds-sidebar relative z-[1] h-full w-[min(84vw,320px)] overflow-y-auto border-r p-3 shadow-xl touch-manipulation">
        <div className="border-ds-outline mb-3 flex items-center justify-between border-b pb-3">
          <span className="ds-app-card-title">Agent setup</span>
          <button
            type="button"
            onClick={() => setIsStepsOpen(false)}
            className="text-ds-on-surface-variant hover:bg-ds-neutral hover:text-ds-on-surface touch-manipulation min-h-10 min-w-10 rounded-ds-md p-2 transition-colors"
            aria-label="Close setup steps"
          >
            <X className="size-4" strokeWidth={2} aria-hidden />
          </button>
        </div>

        <p className="text-ds-on-surface-variant mb-3 px-1 text-xs font-medium tracking-wide uppercase">
          Step {stepNumber} of {totalSteps}
        </p>

        <nav className="space-y-1">
          {onboardingMenuItems.map((item) => {
            const isActive = item === activeItem;
            const isCompleted = completedItems.includes(item);
            return (
              <Link
                key={item}
                href={onboardingNavHref(onboardingItemRoutes[item], linkAgentId)}
                onClick={() => setIsStepsOpen(false)}
                className={cn(
                  "mb-1 flex min-h-11 items-center gap-3 rounded-lg border border-transparent px-3 py-2 text-sm transition-all touch-manipulation",
                  "text-ds-on-surface-variant hover:bg-ds-outline/35 hover:text-ds-on-surface",
                  isActive && "border-ds-primary/35 bg-white !text-ds-primary font-semibold shadow-sm",
                )}
              >
                <OnboardingStepIndicator completed={isCompleted} />
                {item}
              </Link>
            );
          })}
        </nav>
      </aside>
    </div>
  ) : null;

  return (
    <div className="bg-white text-ds-on-surface flex h-dvh max-h-dvh min-h-0 w-full max-w-[100vw] flex-col">
      <aside className="bg-ds-sidebar border-ds-outline fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r md:flex">
        <div className="border-ds-outline flex h-14 items-center border-b px-3">
          <ChatRelyWordmark
            href={onboardingNavHref("/onboarding", linkAgentId)}
            iconClassName="h-6 w-auto"
            textClassName="text-lg font-semibold text-ds-on-surface"
          />
        </div>

        <div className="px-3 pt-5 pb-3">
          <div className="mb-1 text-sm font-semibold tracking-tight">Agent Setup</div>
          <p className="text-ds-on-surface-variant text-[11px] font-medium tracking-widest uppercase">
            {totalSteps} Steps
          </p>
        </div>

        <nav className="flex-1 px-2 pb-3">
          {onboardingMenuItems.map((item) => {
            const isActive = item === activeItem;
            const isCompleted = completedItems.includes(item);
            return (
              <Link
                key={item}
                href={onboardingNavHref(onboardingItemRoutes[item], linkAgentId)}
                className={cn(
                  "mb-1 flex items-center gap-3 rounded-lg border border-transparent px-3 py-2 text-sm transition-all",
                  "text-ds-on-surface-variant hover:bg-ds-outline/35 hover:text-ds-on-surface",
                  isActive && "border-ds-primary/35 bg-white !text-ds-primary font-semibold shadow-sm",
                )}
              >
                <OnboardingStepIndicator completed={isCompleted} />
                {item}
              </Link>
            );
          })}
        </nav>

        <div className="border-ds-outline mt-auto border-t p-3">
          <a
            href={`mailto:${COMPANY_CONTACT_EMAIL}?subject=${encodeURIComponent("ChatRely onboarding help")}`}
            className="text-ds-on-surface-variant hover:bg-ds-outline/35 hover:text-ds-on-surface flex w-full flex-col items-center justify-center rounded-lg border border-transparent px-3 py-2 text-sm font-medium transition-colors"
          >
            <span>Need help?</span>
            <span className="text-ds-on-surface-variant mt-0.5 text-[11px] font-normal">
              {COMPANY_CONTACT_EMAIL}
            </span>
          </a>
        </div>
      </aside>

      <div className="flex min-h-0 flex-1 flex-row overflow-x-hidden">
        <div className="flex min-h-0 min-w-0 flex-1 flex-col md:ml-64">
          <header className="bg-ds-surface border-ds-outline sticky top-0 z-20 shrink-0 border-b">
            <div className="flex h-14 min-h-14 items-center justify-between gap-2 px-3 sm:gap-4 sm:px-6">
              <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
                <button
                  type="button"
                  onClick={() => setIsStepsOpen(true)}
                  className="text-ds-on-surface-variant hover:bg-ds-neutral hover:text-ds-on-surface touch-manipulation flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-ds-md transition-colors md:hidden"
                  aria-label="Open setup steps"
                >
                  <Menu className="size-5" strokeWidth={2} aria-hidden />
                </button>
                <div className="min-w-0">
                  <p className="text-ds-on-surface-variant text-xs font-medium md:hidden">
                    Step {stepNumber} of {totalSteps}
                  </p>
                  <span className="text-ds-on-surface block truncate text-sm font-medium sm:text-base">
                    {stepLabel}
                  </span>
                </div>
              </div>
              {showBanner && !hideIndexingBanner ? (
                <OnboardingIndexingProgress snapshot={snapshot} variant="header" className="ml-auto shrink-0" />
              ) : null}
            </div>
            <div
              className="bg-ds-primary/10 h-1 md:hidden"
              role="progressbar"
              aria-valuenow={stepNumber}
              aria-valuemin={1}
              aria-valuemax={totalSteps}
              aria-label={`Setup progress, step ${stepNumber} of ${totalSteps}`}
            >
              <div
                className="bg-ds-primary h-full transition-[width] duration-300"
                style={{ width: `${(stepNumber / totalSteps) * 100}%` }}
              />
            </div>
          </header>

          <main className="onboarding-main-surface flex min-h-0 flex-1 flex-col">
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-4 sm:px-6">{children}</div>
            {footer ? (
              <div className="relative z-50 w-full shrink-0 pb-[max(0.75rem,env(safe-area-inset-bottom,0px))]">
                {footer}
              </div>
            ) : null}
          </main>
        </div>
      </div>

      {mobileStepsMenu && typeof document !== "undefined" ? createPortal(mobileStepsMenu, document.body) : null}
    </div>
  );
}
