import Link from "next/link";

const FOOTER_LINKS = [
  { label: "Pricing", href: "/pricing" },
  { label: "Privacy", href: "/privacy" },
  { label: "Terms", href: "/terms" },
  { label: "Contact", href: "/contact" },
] as const;

type MarketingSiteFooterProps = {
  variant?: "auth" | "marketing";
};

export function MarketingSiteFooter({ variant = "marketing" }: MarketingSiteFooterProps) {
  const linkClass =
    variant === "auth"
      ? "text-ds-on-surface-variant hover:text-ds-interactive-hover ds-app-kicker font-bold transition-colors"
      : "text-xs font-semibold uppercase tracking-widest text-zinc-500 transition hover:text-zinc-900";

  const wrapClass =
    variant === "auth"
      ? "w-full shrink-0 border-t border-zinc-200/50 bg-transparent py-4 md:py-5"
      : "border-t border-zinc-200 bg-zinc-50 px-6 py-12";

  const innerClass =
    variant === "auth"
      ? "mx-auto flex max-w-5xl flex-col items-center justify-between gap-4 px-8 md:flex-row"
      : "mx-auto flex max-w-7xl flex-col items-center justify-between gap-8 md:flex-row";

  return (
    <footer className={wrapClass}>
      <div className={innerClass}>
        <p className={variant === "auth" ? "ds-app-kicker font-bold" : "text-xs text-zinc-500"}>
          © 2026 ChatRely
        </p>
        <nav className="flex flex-wrap justify-center gap-6 md:gap-8">
          {FOOTER_LINKS.map((item) => (
            <Link key={item.label} href={item.href} className={linkClass}>
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  );
}
