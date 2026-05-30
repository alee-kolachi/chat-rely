import Link from "next/link";
import { ChatRelyWordmark } from "@/components/branding/chat-rely-wordmark";

const columns = [
  {
    title: "Product",
    links: [
      { label: "Overview", href: "/#product" },
      { label: "Pricing", href: "/pricing" },
      { label: "Playground", href: "/signup" },
      { label: "Get started", href: "/signup" },
    ],
  },
  {
    title: "Resources",
    links: [
      { label: "About", href: "/about" },
      { label: "Privacy", href: "/privacy" },
      { label: "Terms", href: "/terms" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "Contact", href: "/contact" },
      { label: "Log in", href: "/login" },
    ],
  },
] as const;

export function LandingFooter() {
  return (
    <footer className="mkt-font border-t border-ds-outline bg-ds-surface px-6 py-16 sm:py-20">
      <div className="mx-auto max-w-[1100px]">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,2fr)]">
          <div>
            <ChatRelyWordmark
              textClassName="text-xl font-medium tracking-tight text-ds-on-surface"
              iconClassName="h-7 w-auto"
            />
            <p className="mt-6 text-sm text-ds-on-surface-variant">© 2026 ChatRely</p>
            <a
              href="mailto:support@chatrely.com"
              className="mt-4 inline-block text-sm text-ds-on-surface-variant hover:text-ds-on-surface"
            >
              support@chatrely.com
            </a>
          </div>

          <div className="grid gap-10 sm:grid-cols-3">
            {columns.map((column) => (
              <div key={column.title}>
                <h4 className="text-xs font-medium uppercase tracking-[0.14em] text-ds-on-surface-variant">
                  {column.title}
                </h4>
                <ul className="mt-4 space-y-3">
                  {column.links.map((link) => (
                    <li key={link.label}>
                      {"external" in link && link.external ? (
                        <a
                          href={link.href}
                          className="text-sm text-ds-on-surface-variant transition hover:text-ds-on-surface"
                        >
                          {link.label}
                        </a>
                      ) : (
                        <Link
                          href={link.href}
                          className="text-sm text-ds-on-surface-variant transition hover:text-ds-on-surface"
                        >
                          {link.label}
                        </Link>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
