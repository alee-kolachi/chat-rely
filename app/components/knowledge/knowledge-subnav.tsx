import Link from "next/link";

type KnowledgeTabKey = "website" | "files" | "text-snippet" | "q-and-a";

type KnowledgeSubnavProps = {
  active: KnowledgeTabKey;
};

const tabs: Array<{ key: KnowledgeTabKey; href: string; label: string }> = [
  { key: "website", href: "/knowledge/website", label: "Website" },
  { key: "files", href: "/knowledge/files", label: "Files" },
  { key: "text-snippet", href: "/knowledge/text-snippet", label: "Text Snippets" },
  { key: "q-and-a", href: "/knowledge/q-and-a", label: "Q&A" },
];

export function KnowledgeSubnav({ active }: KnowledgeSubnavProps) {
  return (
    <div className="border-ds-outline border-b bg-white px-8">
      <nav className="flex h-14 items-end gap-8">
        {tabs.map((tab) => (
          <Link
            key={tab.key}
            href={tab.href}
            className={
              tab.key === active
                ? "border-ds-primary text-ds-on-surface border-b-2 px-1 pb-3 text-sm font-bold"
                : "text-ds-on-surface-variant hover:text-ds-on-surface px-1 pb-3 text-sm font-medium transition-colors"
            }
          >
            {tab.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
