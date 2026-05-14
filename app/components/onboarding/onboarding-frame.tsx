import type { ReactNode } from "react";
import Link from "next/link";
import { ChatRelyWordmark } from "@/components/branding/chat-rely-wordmark";
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

export function OnboardingFrame({
  activeItem,
  stepLabel,
  completedItems = [],
  linkAgentId,
  children,
  footer,
}: {
  activeItem: OnboardingMenuItem;
  stepLabel: string;
  completedItems?: OnboardingMenuItem[];
  /** Preserves `?agentId=` on sidebar navigation between steps. */
  linkAgentId?: string | null;
  children: ReactNode;
  /** Docked at the bottom of the main column (inside scrolling layout) so the bar stays tappable on mobile. */
  footer?: ReactNode;
}) {
  return (
    <div className="bg-white text-ds-on-surface flex h-dvh max-h-dvh min-h-0 w-full max-w-[100vw] flex-col">
      <aside className="bg-ds-sidebar border-ds-outline fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r md:flex">
        <div className="border-ds-outline flex h-14 items-center border-b px-3">
          <ChatRelyWordmark
            href="/dashboard"
            iconClassName="h-6 w-auto"
            textClassName="text-lg font-semibold text-ds-on-surface"
          />
        </div>

        <div className="px-3 pt-5 pb-3">
          <div className="mb-1 text-sm font-semibold tracking-tight">Agent Setup</div>
          <p className="text-ds-on-surface-variant text-[11px] font-medium tracking-widest uppercase">5 Steps</p>
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
                  isActive && "border-ds-primary/35 bg-white !text-ds-primary font-semibold shadow-sm"
                )}
              >
                <span
                  className={cn(
                    "inline-flex size-4 items-center justify-center rounded-full text-[10px] leading-none",
                    isCompleted ? "bg-emerald-500 text-white" : "bg-zinc-200/70 text-transparent"
                  )}
                  aria-hidden
                >
                  ✓
                </span>
                {item}
              </Link>
            );
          })}
        </nav>

        <div className="border-ds-outline mt-auto border-t p-3">
          <button
            type="button"
            className="text-ds-on-surface-variant hover:bg-ds-outline/35 hover:text-ds-on-surface flex w-full items-center justify-center rounded-lg border border-transparent px-3 py-2 text-sm font-medium transition-colors"
          >
            Need Help?
          </button>
        </div>
      </aside>

      <div className="flex min-h-0 flex-1 flex-row overflow-x-hidden">
        <div className="flex min-h-0 min-w-0 flex-1 flex-col md:ml-64">
          <header className="bg-ds-surface border-ds-outline sticky top-0 z-20 flex h-14 min-h-14 shrink-0 items-center border-b px-4 sm:px-6">
            <span className="text-ds-on-surface-variant text-sm font-medium">{stepLabel}</span>
          </header>

          <main className="onboarding-main-surface flex min-h-0 flex-1 flex-col">
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain">{children}</div>
            {footer ? (
              <div className="relative z-50 w-full shrink-0">{footer}</div>
            ) : null}
          </main>
        </div>
      </div>
    </div>
  );
}
