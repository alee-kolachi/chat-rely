import type { ReactNode } from "react";

export function OnboardingFrame({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto flex min-h-full max-w-lg flex-1 flex-col justify-center px-6 py-12">
      {children}
    </div>
  );
}
