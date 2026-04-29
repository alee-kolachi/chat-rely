import Link from "next/link";
import { cn } from "@/lib/utils";

type KnowledgeTabKey = "website" | "files" | "text-snippet" | "q-and-a";

type KnowledgeSubnavProps = {
  active: KnowledgeTabKey;
};

const tabs: Array<{ key: KnowledgeTabKey; href: string; label: string }> = [
  { key: "website", href: "/knowledge/website", label: "Website" },
  { key: "files", href: "/knowledge/files", label: "Files" },
  { key: "text-snippet", href: "/knowledge/text-snippet", label: "Text snippets" },
  { key: "q-and-a", href: "/knowledge/q-and-a", label: "Q&A" },
];

export function KnowledgeSubnav({ active }: KnowledgeSubnavProps) {
  return (
    <div className="border-ds-outline bg-ds-surface/95 border-b backdrop-blur-sm">
      <nav className="mx-auto flex h-14 max-w-[1200px] items-end gap-6 px-4 md:gap-8 md:px-8">
        {tabs.map((tab) => (
          <Link
            key={tab.key}
            href={tab.href}
            className={cn(
              "mb-0 border-b-2 border-transparent px-0.5 pb-3 text-sm transition-colors",
              tab.key === active
                ? "text-ds-primary border-ds-primary font-semibold"
                : "text-ds-on-surface-variant hover:text-ds-on-surface font-medium"
            )}
          >
            {tab.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
