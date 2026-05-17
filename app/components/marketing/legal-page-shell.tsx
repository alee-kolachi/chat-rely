import type { ReactNode } from "react";
import Link from "next/link";

export const LEGAL_LAST_UPDATED = "May 17, 2026";
export const LEGAL_SUPPORT_EMAIL = "support@chatrely.com";

const legalNav = [
  { label: "About", href: "/about" },
  { label: "Privacy", href: "/privacy" },
  { label: "Terms", href: "/terms" },
] as const;

export function LegalPageShell({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <main className="bg-ds-sidebar text-ds-on-surface flex-1 px-6 py-12 sm:py-16">
      <article className="mx-auto max-w-3xl">
        <header className="border-b border-ds-outline pb-8">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{title}</h1>
          {description ? (
            <p className="mt-3 text-base leading-relaxed text-ds-on-surface-variant">{description}</p>
          ) : null}
          <p className="mt-4 text-sm text-ds-text-muted">Last updated: {LEGAL_LAST_UPDATED}</p>
          <nav aria-label="Legal pages" className="mt-6 flex flex-wrap gap-2">
            {legalNav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-full border border-ds-outline bg-ds-surface px-3 py-1 text-xs font-semibold text-ds-on-surface-variant no-underline transition hover:border-ds-primary hover:text-ds-primary"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </header>

        <div className="mt-10 space-y-10">{children}</div>

        <footer className="mt-14 border-t border-ds-outline pt-8">
          <p className="text-sm leading-relaxed text-ds-on-surface-variant">
            Questions?{" "}
            <a href={`mailto:${LEGAL_SUPPORT_EMAIL}`} className="font-semibold text-ds-primary no-underline">
              {LEGAL_SUPPORT_EMAIL}
            </a>
          </p>
          <p className="mt-6">
            <Link href="/" className="text-sm font-semibold text-ds-primary no-underline">
              ← Back to home
            </Link>
          </p>
        </footer>
      </article>
    </main>
  );
}

export function LegalSection({
  id,
  title,
  children,
}: {
  id?: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24">
      <h2 className="text-xl font-semibold tracking-tight text-ds-on-surface">{title}</h2>
      <div className="mt-4 space-y-4 text-[0.9375rem] leading-relaxed text-ds-on-surface-variant">{children}</div>
    </section>
  );
}

export function LegalParagraph({ children }: { children: ReactNode }) {
  return <p>{children}</p>;
}

export function LegalList({ items }: { items: string[] }) {
  return (
    <ul className="list-disc space-y-2 pl-5">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}
