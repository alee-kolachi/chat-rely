import type { ReactNode } from "react";
import { OnboardingFrame } from "@/components/onboarding/onboarding-frame";

export default function OnboardingLayout({
  children,
}: {
  children: ReactNode;
}) {
  return <OnboardingFrame>{children}</OnboardingFrame>;
}
