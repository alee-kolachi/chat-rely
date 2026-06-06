import type { ReactNode } from "react";
import Link from "next/link";

export const LEGAL_LAST_UPDATED = "June 6, 2026";
export const COMPANY_CONTACT_EMAIL = "alee@chatrely.com";
export const LEGAL_SUPPORT_EMAIL = "support@chatrely.com";

const companyNav = [
  { label: "About", href: "/about" },
  { label: "Contact", href: "/contact" },
] as const;

type CompanyNavHref = (typeof companyNav)[number]["href"];

export function CompanyPageShell({
  title,
  description,
  showLastUpdated = false,
  activeHref,
  children,
}: {
  title: string;
  description?: string;
  showLastUpdated?: boolean;
  activeHref?: CompanyNavHref;
  children: ReactNode;
}) {
  return (
    <main className="mkt-font flex-1 bg-ds-sidebar px-6 py-12 text-ds-on-surface sm:py-16">
      <article className="mx-auto max-w-3xl">
        <header className="border-b border-ds-outline pb-8">
          <h1 className="mkt-display text-3xl sm:text-4xl">{title}</h1>
          {description ? (
            <p className="mkt-body mt-4 text-ds-on-surface-variant">{description}</p>
          ) : null}
          {showLastUpdated ? (
            <p className="mt-4 text-sm text-ds-text-muted">Last updated: {LEGAL_LAST_UPDATED}</p>
          ) : null}
          <nav aria-label="Company pages" className="mt-6 flex flex-wrap gap-2">
            {companyNav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                aria-current={activeHref === item.href ? "page" : undefined}
                className="rounded-full border border-ds-outline bg-ds-surface px-3 py-1 text-xs font-semibold text-ds-on-surface-variant no-underline transition hover:border-ds-primary hover:text-ds-primary aria-[current=page]:border-ds-primary aria-[current=page]:text-ds-primary"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </header>

        <div className="mt-10 space-y-12">{children}</div>

        <footer className="mt-14 border-t border-ds-outline pt-8">
          <p className="text-sm leading-relaxed text-ds-on-surface-variant">
            Questions?{" "}
            <a href={`mailto:${COMPANY_CONTACT_EMAIL}`} className="font-semibold text-ds-primary no-underline">
              {COMPANY_CONTACT_EMAIL}
            </a>
          </p>
          <p className="mt-4 text-sm text-ds-on-surface-variant">
            <Link href="/privacy" className="font-semibold text-ds-primary no-underline">
              Privacy Policy
            </Link>
            {" · "}
            <Link href="/terms" className="font-semibold text-ds-primary no-underline">
              Terms of Service
            </Link>
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

export function CompanySection({
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
      <h2 className="mkt-display text-xl sm:text-2xl">{title}</h2>
      <div className="mt-4 space-y-4 text-[0.9375rem] leading-relaxed text-ds-on-surface-variant">{children}</div>
    </section>
  );
}

export function CompanyParagraph({ children }: { children: ReactNode }) {
  return <p>{children}</p>;
}

export function CompanyList({ items }: { items: string[] }) {
  return (
    <ul className="space-y-2.5">
      {items.map((item) => (
        <li key={item} className="flex gap-3">
          <span className="mt-2 size-1.5 shrink-0 rounded-full bg-ds-primary" aria-hidden />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

export function CompanyHighlight({ children }: { children: ReactNode }) {
  return (
    <blockquote className="rounded-2xl border border-ds-outline bg-ds-surface px-5 py-4 text-base leading-relaxed text-ds-on-surface sm:px-6 sm:py-5 sm:text-[1.0625rem]">
      {children}
    </blockquote>
  );
}

export function CompanyValues({ items }: { items: { title: string; body: string }[] }) {
  return (
    <dl className="grid gap-4 sm:grid-cols-3">
      {items.map((item) => (
        <div key={item.title} className="rounded-xl border border-ds-outline bg-ds-surface px-4 py-4 sm:px-5 sm:py-5">
          <dt className="text-sm font-semibold text-ds-on-surface">{item.title}</dt>
          <dd className="mt-2 text-sm leading-relaxed">{item.body}</dd>
        </div>
      ))}
    </dl>
  );
}
