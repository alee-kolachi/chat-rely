import type { ReactNode } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export const onboardingMenuItems = [
  "Agent Name",
  "Knowledge Base",
  "Connection",
  "Appearance & Tone",
  "Agent Preview",
  "Installation",
] as const;

type OnboardingMenuItem = (typeof onboardingMenuItems)[number];

const onboardingItemRoutes: Record<OnboardingMenuItem, string> = {
  "Agent Name": "/onboarding",
  "Knowledge Base": "/onboarding/knowledge-base",
  Connection: "/onboarding/connection",
  "Appearance & Tone": "/onboarding/appearance-tone",
  "Agent Preview": "/onboarding/agent-preview",
  Installation: "/onboarding/installation",
};

export function OnboardingFrame({
  activeItem,
  stepLabel,
  completedItems = [],
  children,
}: {
  activeItem: OnboardingMenuItem;
  stepLabel: string;
  completedItems?: OnboardingMenuItem[];
  children: ReactNode;
}) {
  return (
    <div className="bg-white text-ds-on-surface flex h-dvh max-h-dvh min-h-0 overflow-hidden">
      <aside className="bg-ds-sidebar border-ds-outline fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r md:flex">
        <div className="border-ds-outline flex h-14 items-center gap-2 border-b px-3">
          <div className="bg-ds-primary text-ds-on-primary flex size-8 items-center justify-center rounded-lg text-sm font-bold">
            C
          </div>
          <span className="text-ds-on-surface text-sm font-semibold">ChatRely</span>
        </div>

        <div className="px-3 pt-5 pb-3">
          <div className="mb-1 text-sm font-semibold tracking-tight">Agent Setup</div>
          <p className="text-ds-on-surface-variant text-[11px] font-medium tracking-widest uppercase">6 Steps</p>
        </div>

        <nav className="flex-1 px-2 pb-3">
          {onboardingMenuItems.map((item) => {
            const isActive = item === activeItem;
            const isCompleted = completedItems.includes(item);
            return (
              <Link
                key={item}
                href={onboardingItemRoutes[item]}
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

      <div className="md:ml-64 flex min-h-0 min-w-0 flex-1 flex-col">
        <header className="bg-ds-surface border-ds-outline sticky top-0 z-20 flex h-14 items-center border-b px-6">
          <span className="text-ds-on-surface-variant text-sm font-medium">{stepLabel}</span>
        </header>

        <main className="onboarding-main-surface flex min-h-0 flex-1 flex-col overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
