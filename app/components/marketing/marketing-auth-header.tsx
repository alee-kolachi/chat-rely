import Link from "next/link";
import { ChatRelyWordmark } from "@/components/branding/chat-rely-wordmark";

/** Minimal header for login/signup — logo home only (no duplicate marketing nav). */
export function MarketingAuthHeader() {
  return (
    <header className="z-10 flex w-full shrink-0 items-center justify-between px-6 py-4 md:px-8">
      <ChatRelyWordmark
        href="/"
        className="text-ds-primary gap-2 text-2xl font-bold tracking-tight"
        iconClassName="h-7 w-auto"
        textClassName="text-2xl font-bold text-ds-primary"
      />
      <Link
        href="/pricing"
        className="text-ds-on-surface-variant hover:text-ds-interactive-hover text-sm font-medium transition-colors"
      >
        Pricing
      </Link>
    </header>
  );
}
